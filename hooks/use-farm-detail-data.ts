import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  type FarmingSessionRow,
  type FarmingSessionSoilSnapshot,
} from '@/services/farming-session.service';
import { getUserData } from '@/services/token.service';
import type { PendingSoilSnapshot } from '@/services/ml.service';
import {
  fetchFarmsWithOfflinePersist,
  fetchFarmingSessionWithOfflinePersist,
  fetchPendingSoilWithOfflinePersist,
  fetchWeatherWithOfflinePersist,
  pendingSnapshotAppliesToFarm,
} from '@/services/offline-sync.service';
import {
  getSoilHealth,
  parseSoilHealthRows,
  pickSoilRowForDisplay,
} from '@/services/soil-health.service';
import { swrKeys } from '@/constants/swr-keys';
import type { IFarm } from '@/types/farm.types';
import type { ISoilHealth } from '@/types/soil-health.types';
import { normalizeFertilizerPredictData, type FertilizerPredictData } from '@/services/ml.service';
import {
  DEMO_FARM,
  DEMO_SOIL,
  DEMO_TOP_CROPS,
  DEMO_WEATHER,
  DEMO_SOIL_FEATURES,
  isDemoFarmId,
} from '@/constants/demo-farm';

const sharedSwrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 2,
  /** Keep last successful payload visible while revalidating or after transient errors. */
  keepPreviousData: true,
} as const;

/** Optional dev/default location when farm + ML pending have no coordinates (Expo public env). */
function envCoord(raw: string | undefined): number | undefined {
  if (raw == null || !String(raw).trim()) return undefined;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : undefined;
}

const WEATHER_FALLBACK_LAT = envCoord(process.env.EXPO_PUBLIC_WEATHER_FALLBACK_LAT);
const WEATHER_FALLBACK_LON = envCoord(process.env.EXPO_PUBLIC_WEATHER_FALLBACK_LON);

/** Map ML pending `soil` (+ EC) into the same shape as API soil health rows. */
function pendingSoilToISoilHealth(
  farmId: string,
  snap: PendingSoilSnapshot
): ISoilHealth {
  const { soil, fertilizer_inputs } = snap;
  const salinity =
    fertilizer_inputs?.ec != null && Number.isFinite(fertilizer_inputs.ec)
      ? fertilizer_inputs.ec
      : soil.salinity;
  return {
    farm_id: farmId,
    nitrogen: soil.nitrogen,
    phosphorus: soil.phosphorus,
    potassium: soil.potassium,
    ph: soil.ph,
    salinity,
    temperature: soil.temperature,
    moisture: soil.moisture,
  };
}

function sessionSoilToISoilHealth(
  farmId: string,
  snap: FarmingSessionSoilSnapshot
): ISoilHealth {
  return {
    farm_id: farmId,
    nitrogen: Number(snap.nitrogen),
    phosphorus: Number(snap.phosphorus),
    potassium: Number(snap.potassium),
    ph: Number(snap.ph),
    salinity: Number(snap.salinity),
    temperature: Number(snap.temperature),
    moisture: Number(snap.moisture),
  };
}

export interface CropProbability {
  crop_class: string;
  probability: number;
}

export type { WeatherDataShape } from '@/services/weather.service';

function isActiveSession(row: FarmingSessionRow | null | undefined): row is FarmingSessionRow {
  return row != null && typeof row.farm_id === 'string' && row.farm_id.length > 0;
}

/**
 * Lat/lng from ML `POST /predict` body stored on `GET /pending/soil` as `request_payload`.
 * Only used when the pending snapshot is for this farm (or has no farm_id).
 */
function coordsFromPendingSnapshot(
  farmId: string | undefined,
  snap: PendingSoilSnapshot | undefined
): { lat: number; lon: number } | null {
  if (!farmId || !snap) return null;
  const fid = snap.farm_id;
  if (fid != null && String(fid).trim() !== '' && String(fid) !== String(farmId)) {
    return null;
  }
  const p = snap.request_payload;
  if (!p) return null;
  const lat = p.lat != null ? Number(p.lat) : NaN;
  const lonRaw = p.lng ?? p.longitude;
  const lon = lonRaw != null ? Number(lonRaw) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

/**
 * Farm detail: weather + farms list.
 * Soil: **pinned** `GET /farm/farming/{farmId}` when a session exists. With an active session, **no ML** and
 * **no** `soil_health_test` upsert from pending. Otherwise: **live** `GET {ML}/pending/soil` (synced via
 * `PUT /test/upsert`), else **fallback** `GET /test/{farmId}`.
 */
export function useFarmDetailData(farmId: string | undefined) {
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [userDemoFarmAccess, setUserDemoFarmAccess] = useState<boolean | null>(null);

  const isDemoRoute = Boolean(farmId && isDemoFarmId(farmId));
  const demoMode = isDemoRoute && userDemoFarmAccess === true;
  const demoAccessDenied = isDemoRoute && userDemoFarmAccess === false;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getUserData();
      if (!cancelled) {
        setFarmerId(user?.farmer_id ?? null);
        setUserDemoFarmAccess(user?.demoFarmAccess === true ? true : false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const farmsSWR = useSWR(
    farmId && farmerId && !isDemoRoute ? swrKeys.farmsList(farmerId) : null,
    () => fetchFarmsWithOfflinePersist(farmerId!),
    { ...sharedSwrOptions, dedupingInterval: 60_000 }
  );

  const farm = useMemo(() => {
    if (demoMode && farmId) return DEMO_FARM;
    const list = farmsSWR.data?.data as IFarm[] | undefined;
    if (!farmId || !list?.length) return null;
    return list.find((f) => f.farm_id === farmId) ?? null;
  }, [farmsSWR.data, farmId, demoMode]);

  /** For `soil_health_test` + pending ML, always the selected farm (list row id, else route). */
  const selectedFarmId = farmId ? (farm?.farm_id ?? farmId) : undefined;

  const farmingSessionSWR = useSWR(
    farmId && !isDemoRoute ? swrKeys.farmingSession(farmId) : null,
    () => fetchFarmingSessionWithOfflinePersist(farmId!),
    { ...sharedSwrOptions, dedupingInterval: 30_000 }
  );

  const sessionRow = farmingSessionSWR.data?.data;
  const farmingSessionActive = isActiveSession(sessionRow);
  /** Wait for session response so we do not call the ML server or upsert soil before knowing a session exists. */
  const sessionCheckComplete = !farmingSessionSWR.isLoading;
  /** While a farming session is active: no `GET /pending/soil`, no `soil_health_test` upsert from that path. */
  const shouldFetchPendingSoil =
    Boolean(selectedFarmId) &&
    !isDemoRoute &&
    sessionCheckComplete &&
    !farmingSessionActive;

  /** No need to load `soil_health_test` list when the session already pins a soil snapshot. */
  const skipSoilListFetch =
    demoMode ||
    demoAccessDenied ||
    (farmingSessionActive && Boolean(sessionRow?.soil_snapshot));

  const pendingSoilSWR = useSWR(
    shouldFetchPendingSoil ? swrKeys.pendingSoil(selectedFarmId!) : null,
    () => fetchPendingSoilWithOfflinePersist(selectedFarmId!),
    {
      ...sharedSwrOptions,
      dedupingInterval: 0,
      refreshInterval: 20_000,
    }
  );

  const soilFromApiSWR = useSWR(
    selectedFarmId && !isDemoRoute && !skipSoilListFetch
      ? swrKeys.soilForFarm(selectedFarmId)
      : null,
    async () => {
      const res = await getSoilHealth({ farm_id: selectedFarmId! });
      return parseSoilHealthRows(res, selectedFarmId);
    },
    { ...sharedSwrOptions, dedupingInterval: 60_000 }
  );

  const { soilHealthForDisplay, soilHealthFromPending, soilHealthFromFarmingSession, soilHealthFromApi } =
    useMemo(() => {
      if (!farmId || !selectedFarmId) {
        return {
          soilHealthForDisplay: null as ISoilHealth | null,
          soilHealthFromPending: false,
          soilHealthFromFarmingSession: false,
          soilHealthFromApi: false,
        };
      }
      if (demoAccessDenied) {
        return {
          soilHealthForDisplay: null,
          soilHealthFromPending: false,
          soilHealthFromFarmingSession: false,
          soilHealthFromApi: false,
        };
      }
      if (demoMode) {
        return {
          soilHealthForDisplay: DEMO_SOIL,
          soilHealthFromPending: true,
          soilHealthFromFarmingSession: false,
          soilHealthFromApi: false,
        };
      }
      if (farmingSessionActive && sessionRow?.soil_snapshot) {
        return {
          soilHealthForDisplay: sessionSoilToISoilHealth(selectedFarmId, sessionRow.soil_snapshot),
          soilHealthFromPending: false,
          soilHealthFromFarmingSession: true,
          soilHealthFromApi: false,
        };
      }
      const pending = pendingSoilSWR.data;
      if (pending?.ok && pending.data && pendingSnapshotAppliesToFarm(pending.data, selectedFarmId)) {
        return {
          soilHealthForDisplay: pendingSoilToISoilHealth(selectedFarmId, pending.data),
          soilHealthFromPending: true,
          soilHealthFromFarmingSession: false,
          soilHealthFromApi: false,
        };
      }
      const fromApi = pickSoilRowForDisplay(selectedFarmId, soilFromApiSWR.data ?? []);
      if (fromApi) {
        return {
          soilHealthForDisplay: fromApi,
          soilHealthFromPending: false,
          soilHealthFromFarmingSession: false,
          soilHealthFromApi: true,
        };
      }
      return {
        soilHealthForDisplay: null,
        soilHealthFromPending: false,
        soilHealthFromFarmingSession: false,
        soilHealthFromApi: false,
      };
    }, [
      farmId,
      selectedFarmId,
      demoAccessDenied,
      demoMode,
      farmingSessionActive,
      sessionRow,
      pendingSoilSWR.data,
      soilFromApiSWR.data,
    ]);

  const topCrops = useMemo((): CropProbability[] => {
    if (demoAccessDenied) return [];
    if (demoMode) return DEMO_TOP_CROPS;
    if (farmingSessionActive) {
      if (sessionRow?.top_crop_probabilities?.length) {
        return sessionRow.top_crop_probabilities.map(({ crop_class, probability }) => ({
          crop_class,
          probability,
        }));
      }
      return [];
    }
    const r = pendingSoilSWR.data;
    if (
      !selectedFarmId ||
      !r?.ok ||
      !r.data ||
      !pendingSnapshotAppliesToFarm(r.data, selectedFarmId)
    ) {
      return [];
    }
    const top = r.data.probabilities_top_3 ?? [];
    return top.map(({ crop_class, probability }) => ({
      crop_class,
      probability,
    }));
  }, [demoAccessDenied, demoMode, farmingSessionActive, sessionRow, pendingSoilSWR.data, selectedFarmId]);

  /** Raw ML `features` from pending soil (for API soil_health_test on start farming). */
  const pendingSoilFeatures = useMemo((): number[] | undefined => {
    if (!farmId || !selectedFarmId) return undefined;
    if (demoAccessDenied) return undefined;
    if (demoMode) return DEMO_SOIL_FEATURES;
    if (farmingSessionActive) return undefined;
    const r = pendingSoilSWR.data;
    if (!r?.ok || !r.data || !pendingSnapshotAppliesToFarm(r.data, selectedFarmId)) return undefined;
    const f = r.data.features;
    if (!Array.isArray(f) || f.length < 6) return undefined;
    return f.map((x) => Number(x));
  }, [demoAccessDenied, demoMode, farmingSessionActive, pendingSoilSWR.data, farmId, selectedFarmId]);

  const pendingSoilReceivedAt = useMemo((): string | null => {
    if (!farmId || !selectedFarmId) return null;
    if (demoAccessDenied) return null;
    if (demoMode) return new Date().toISOString();
    if (farmingSessionActive && sessionRow?.soil_snapshot?.received_at) {
      return sessionRow.soil_snapshot.received_at ?? null;
    }
    if (farmingSessionActive) return null;
    const r = pendingSoilSWR.data;
    if (!r?.ok || !r.data?.received_at || !pendingSnapshotAppliesToFarm(r.data, selectedFarmId)) return null;
    return r.data.received_at;
  }, [demoAccessDenied, demoMode, farmingSessionActive, sessionRow, pendingSoilSWR.data, farmId, selectedFarmId]);

  const pinnedFertilizerData: FertilizerPredictData | null = useMemo(() => {
    if (!farmingSessionActive || !sessionRow?.fertilizer_recommendation) return null;
    return normalizeFertilizerPredictData(
      sessionRow.fertilizer_recommendation as FertilizerPredictData
    );
  }, [farmingSessionActive, sessionRow]);

  const pinnedSelectedCrop =
    farmingSessionActive && sessionRow?.selected_crop ? sessionRow.selected_crop : null;

  /** Saved Day 1 for the crop calendar when a session exists (from `POST /farm/farming`). */
  const farmingSessionCycleStartYmd =
    farmingSessionActive && sessionRow?.cycle_start_date?.trim()
      ? sessionRow.cycle_start_date.trim()
      : null;

  const farmingStartedAt =
    farmingSessionActive && sessionRow?.started_at ? sessionRow.started_at : null;

  const pendingSnapForCoords =
    !farmingSessionActive && selectedFarmId && pendingSoilSWR.data?.ok
      ? pendingSoilSWR.data.data
      : undefined;
  const modelCoords = coordsFromPendingSnapshot(selectedFarmId, pendingSnapForCoords);

  const farmLatRaw = farm?.latitude != null ? Number(farm.latitude) : NaN;
  const farmLonRaw = farm?.longitude != null ? Number(farm.longitude) : NaN;
  const farmLat = Number.isFinite(farmLatRaw) ? farmLatRaw : undefined;
  const farmLon = Number.isFinite(farmLonRaw) ? farmLonRaw : undefined;

  const lat =
    (modelCoords && Number.isFinite(modelCoords.lat) ? modelCoords.lat : undefined) ??
    farmLat ??
    WEATHER_FALLBACK_LAT ??
    NaN;
  const lon =
    (modelCoords && Number.isFinite(modelCoords.lon) ? modelCoords.lon : undefined) ??
    farmLon ??
    WEATHER_FALLBACK_LON ??
    NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  const weatherSWR = useSWR(
    farmId && hasCoords && !demoMode ? swrKeys.weatherForFarm(farmId, lat, lon) : null,
    () => fetchWeatherWithOfflinePersist(farmId!, lat, lon),
    { ...sharedSwrOptions, dedupingInterval: 10 * 60_000 }
  );

  const pageReady =
    isDemoRoute && userDemoFarmAccess === null
      ? false
      : demoMode
        ? !!farmId
        : demoAccessDenied
          ? !!farmId
          : !!farmId &&
            !farmsSWR.isLoading &&
            !farmingSessionSWR.isLoading &&
            (!hasCoords || !weatherSWR.isLoading) &&
            (farmingSessionActive ? true : !pendingSoilSWR.isLoading) &&
            !soilFromApiSWR.isLoading;

  const farmsError = isDemoRoute ? undefined : farmsSWR.error;

  const weatherOut = demoMode ? DEMO_WEATHER : (weatherSWR.data ?? null);
  const weatherLoadingOut = demoMode ? false : hasCoords && weatherSWR.isLoading;
  const weatherErrorOut = demoMode ? null : weatherSWR.error ?? null;

  return {
    farmerId,
    demoMode,
    demoAccessDenied,
    farm,
    /** Canonical farm id for soil + ML (list row, else route) — use for `farm_id` in API calls. */
    selectedFarmId,
    soilHealthForDisplay,
    /** True when values come from ML `GET /pending/soil`. */
    soilHealthFromPending,
    /** True when values come from saved `GET /farm/farming/{farmId}`. */
    soilHealthFromFarmingSession,
    /** True when values come from tanim-api `soil_health_test` (no live ML, no active session). */
    soilHealthFromApi,
    farmingSessionActive,
    pinnedFertilizerData,
    pinnedSelectedCrop,
    farmingSessionCycleStartYmd,
    farmingStartedAt,
    pendingSoilReceivedAt,
    pendingSoilFeatures,
    weather: weatherOut,
    /** Lat/lon passed to the weather API (pending payload, farm row, then optional env fallback). */
    weatherCoords: demoMode
      ? ({ lat: DEMO_WEATHER.latitude, lon: DEMO_WEATHER.longitude } as const)
      : hasCoords
        ? ({ lat, lon } as const)
        : null,
    /** False when no coordinates: weather request is skipped (set EXPO_PUBLIC_WEATHER_FALLBACK_LAT/LON for dev). */
    hasWeatherCoords: demoMode ? true : hasCoords,
    /** Set when the weather request failed (network, 4xx/5xx, or invalid API key on server). */
    weatherError: weatherErrorOut,
    weatherLoading: weatherLoadingOut,
    topCrops,
    farmsError,
    isInitialLoading: !!farmId && !pageReady,
    isValidating:
      farmsSWR.isValidating ||
      farmingSessionSWR.isValidating ||
      weatherSWR.isValidating ||
      pendingSoilSWR.isValidating ||
      soilFromApiSWR.isValidating,
    mutate: {
      farms: farmsSWR.mutate,
      weather: weatherSWR.mutate,
      pendingSoil: pendingSoilSWR.mutate,
      farmingSession: farmingSessionSWR.mutate,
      soilFromApi: soilFromApiSWR.mutate,
    },
  };
}
