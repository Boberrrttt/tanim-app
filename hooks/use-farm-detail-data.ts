import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { getFarms } from '@/services/farm.service';
import {
  getFarmingSession,
  type FarmingSessionRow,
  type FarmingSessionSoilSnapshot,
} from '@/services/farming-session.service';
import { getUserData } from '@/services/token.service';
import {
  getPendingSoil,
  type PendingSoilSnapshot,
} from '@/services/ml.service';
import { GetWeatherToday } from '@/services/weather.service';
import { swrKeys } from '@/constants/swr-keys';
import type { IFarm } from '@/types/farm.types';
import type { ISoilHealth } from '@/types/soil-health.types';
import { normalizeFertilizerPredictData, type FertilizerPredictData } from '@/services/ml.service';

const sharedSwrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 2,
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
 * Soil / crops / fertilizer: either **pinned** `GET /farm/farming/{farmId}` (no ML pending)
 * or **live** `GET {ML}/pending/soil`.
 */
export function useFarmDetailData(farmId: string | undefined) {
  const [farmerId, setFarmerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getUserData();
      if (!cancelled) setFarmerId(user?.farmer_id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const farmsSWR = useSWR(
    farmId && farmerId ? swrKeys.farmsList(farmerId) : null,
    () => getFarms(farmerId!),
    { ...sharedSwrOptions, dedupingInterval: 60_000 }
  );

  const farm = useMemo(() => {
    const list = farmsSWR.data?.data as IFarm[] | undefined;
    if (!farmId || !list?.length) return null;
    return list.find((f) => f.farm_id === farmId) ?? null;
  }, [farmsSWR.data, farmId]);

  const farmingSessionSWR = useSWR(
    farmId ? swrKeys.farmingSession(farmId) : null,
    () => getFarmingSession(farmId!),
    { ...sharedSwrOptions, dedupingInterval: 30_000 }
  );

  const sessionRow = farmingSessionSWR.data?.data;
  const farmingSessionActive = isActiveSession(sessionRow);

  /** Fetch whenever a farm is open so `request_payload.lat/lng` can drive weather (even during an active session). */
  const pendingSoilSWR = useSWR(
    farmId ? swrKeys.pendingSoil() : null,
    () => getPendingSoil(),
    {
      ...sharedSwrOptions,
      dedupingInterval: 0,
      refreshInterval: farmingSessionActive ? 0 : 20_000,
    }
  );

  const { soilHealthForDisplay, soilHealthFromPending, soilHealthFromFarmingSession } =
    useMemo(() => {
      if (!farmId) {
        return {
          soilHealthForDisplay: null as ISoilHealth | null,
          soilHealthFromPending: false,
          soilHealthFromFarmingSession: false,
        };
      }
      if (farmingSessionActive && sessionRow?.soil_snapshot) {
        return {
          soilHealthForDisplay: sessionSoilToISoilHealth(farmId, sessionRow.soil_snapshot),
          soilHealthFromPending: false,
          soilHealthFromFarmingSession: true,
        };
      }
      const pending = pendingSoilSWR.data;
      if (!pending?.ok || !pending.data) {
        return {
          soilHealthForDisplay: null,
          soilHealthFromPending: false,
          soilHealthFromFarmingSession: false,
        };
      }
      return {
        soilHealthForDisplay: pendingSoilToISoilHealth(farmId, pending.data),
        soilHealthFromPending: true,
        soilHealthFromFarmingSession: false,
      };
    }, [farmId, farmingSessionActive, sessionRow, pendingSoilSWR.data]);

  const topCrops = useMemo((): CropProbability[] => {
    if (farmingSessionActive && sessionRow?.top_crop_probabilities?.length) {
      return sessionRow.top_crop_probabilities.map(({ crop_class, probability }) => ({
        crop_class,
        probability,
      }));
    }
    const r = pendingSoilSWR.data;
    if (!r?.ok || !r.data) return [];
    const top = r.data.probabilities_top_3 ?? [];
    return top.map(({ crop_class, probability }) => ({
      crop_class,
      probability,
    }));
  }, [farmingSessionActive, sessionRow, pendingSoilSWR.data]);

  /** Raw ML `features` from pending soil (for API soil_health_test on start farming). */
  const pendingSoilFeatures = useMemo((): number[] | undefined => {
    if (farmingSessionActive) return undefined;
    const r = pendingSoilSWR.data;
    if (!r?.ok || !r.data) return undefined;
    const f = r.data.features;
    if (!Array.isArray(f) || f.length < 6) return undefined;
    return f.map((x) => Number(x));
  }, [farmingSessionActive, pendingSoilSWR.data]);

  const pendingSoilReceivedAt = useMemo((): string | null => {
    if (farmingSessionActive && sessionRow?.soil_snapshot?.received_at) {
      return sessionRow.soil_snapshot.received_at ?? null;
    }
    if (farmingSessionActive) return null;
    const r = pendingSoilSWR.data;
    if (!r?.ok || !r.data?.received_at) return null;
    return r.data.received_at;
  }, [farmingSessionActive, sessionRow, pendingSoilSWR.data]);

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
    farmId && pendingSoilSWR.data?.ok ? pendingSoilSWR.data.data : undefined;
  const modelCoords = coordsFromPendingSnapshot(farmId, pendingSnapForCoords);

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
    farmId && hasCoords ? swrKeys.weatherAt(lat, lon) : null,
    () => GetWeatherToday(lat, lon),
    { ...sharedSwrOptions, dedupingInterval: 10 * 60_000 }
  );

  const pageReady =
    !!farmId &&
    !farmsSWR.isLoading &&
    !farmingSessionSWR.isLoading &&
    (!hasCoords || !weatherSWR.isLoading) &&
    (farmingSessionActive ? true : !pendingSoilSWR.isLoading);

  const farmsError = farmsSWR.error;

  return {
    farmerId,
    farm,
    soilHealthForDisplay,
    /** True when values come from ML `GET /pending/soil`. */
    soilHealthFromPending,
    /** True when values come from saved `GET /farm/farming/{farmId}`. */
    soilHealthFromFarmingSession,
    farmingSessionActive,
    pinnedFertilizerData,
    pinnedSelectedCrop,
    farmingSessionCycleStartYmd,
    farmingStartedAt,
    pendingSoilReceivedAt,
    pendingSoilFeatures,
    weather: weatherSWR.data ?? null,
    /** Lat/lon passed to the weather API (pending payload, farm row, then optional env fallback). */
    weatherCoords: hasCoords ? ({ lat, lon } as const) : null,
    /** False when no coordinates: weather request is skipped (set EXPO_PUBLIC_WEATHER_FALLBACK_LAT/LON for dev). */
    hasWeatherCoords: hasCoords,
    /** Set when the weather request failed (network, 4xx/5xx, or invalid API key on server). */
    weatherError: weatherSWR.error ?? null,
    weatherLoading: hasCoords && weatherSWR.isLoading,
    topCrops,
    farmsError,
    isInitialLoading: !!farmId && !pageReady,
    isValidating:
      farmsSWR.isValidating ||
      farmingSessionSWR.isValidating ||
      weatherSWR.isValidating ||
      pendingSoilSWR.isValidating,
    mutate: {
      farms: farmsSWR.mutate,
      weather: weatherSWR.mutate,
      pendingSoil: pendingSoilSWR.mutate,
      farmingSession: farmingSessionSWR.mutate,
    },
  };
}
