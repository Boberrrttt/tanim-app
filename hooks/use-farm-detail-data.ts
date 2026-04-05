import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { getFarms } from '@/services/farm.service';
import { getUserData } from '@/services/token.service';
import { getSoilHealth } from '@/services/soil-health.service';
import { predict } from '@/services/ml.service';
import { GetWeatherToday } from '@/services/weather.service';
import { swrKeys } from '@/constants/swr-keys';
import type { IFarm } from '@/types/farm.types';
import type { ISoilHealth } from '@/types/soil-health.types';

const sharedSwrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 2,
} as const;

export interface CropProbability {
  crop_class: string;
  probability: number;
}

export interface WeatherDataShape {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  temperature: number;
  feels_like?: number;
  humidity: number;
  pressure?: number;
  description: string;
  wind_speed: number;
  wind_direction?: number;
  visibility?: number;
  timestamp?: number;
}

function soilFingerprint(soil: ISoilHealth): string {
  return [
    soil.nitrogen,
    soil.phosphorus,
    soil.potassium,
    soil.ph,
    soil.salinity,
    soil.temperature,
    soil.moisture,
  ].join('|');
}

/**
 * Parallel SWR streams for farm detail: farms list, soil, weather (lat/lon), ML prediction.
 * Cached keys match farmer index (`farmsList`) so list → detail avoids duplicate farm fetches.
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

  const soilSWR = useSWR(
    farmId ? swrKeys.soilForFarm(farmId) : null,
    () => getSoilHealth({ farm_id: farmId! }),
    { ...sharedSwrOptions, dedupingInterval: 30_000 }
  );

  const farm = useMemo(() => {
    const list = farmsSWR.data?.data as IFarm[] | undefined;
    if (!farmId || !list?.length) return null;
    return list.find((f) => f.farm_id === farmId) ?? null;
  }, [farmsSWR.data, farmId]);

  const soilHealth = useMemo(() => {
    const arr = soilSWR.data?.data as ISoilHealth[] | undefined;
    return arr?.[0] ?? null;
  }, [soilSWR.data]);

  const lat = farm?.latitude;
  const lon = farm?.longitude;
  const hasCoords = lat != null && lon != null;

  const weatherSWR = useSWR(
    farmId && hasCoords ? swrKeys.weatherAt(lat!, lon!) : null,
    () => GetWeatherToday(lat!, lon!),
    { ...sharedSwrOptions, dedupingInterval: 10 * 60_000 }
  );

  const fp = soilHealth ? soilFingerprint(soilHealth) : null;

  const predictSWR = useSWR(
    farmId && fp ? swrKeys.mlPredict(farmId, fp) : null,
    async () => {
      const s = soilHealth!;
      const features = [
        s.nitrogen,
        s.phosphorus,
        s.potassium,
        s.ph,
        s.salinity,
        s.temperature,
        s.moisture,
      ];
      return predict(
        features,
        farmId!,
        hasCoords ? lat! : undefined,
        hasCoords ? lon! : undefined
      );
    },
    { ...sharedSwrOptions, dedupingInterval: 60_000 }
  );

  const topCrops = useMemo((): CropProbability[] => {
    if (!predictSWR.data) return [];
    const raw = predictSWR.data as { data?: { probabilities?: CropProbability[] }; probabilities?: CropProbability[] };
    const inner = raw?.data ?? raw;
    const probs = inner?.probabilities ?? [];
    const sorted = [...probs].sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
    return sorted.slice(0, 3);
  }, [predictSWR.data]);

  const weather = useMemo((): WeatherDataShape | null => {
    const w = weatherSWR.data as { data?: WeatherDataShape } | WeatherDataShape | undefined;
    if (!w) return null;
    return (w as { data?: WeatherDataShape }).data ?? (w as WeatherDataShape);
  }, [weatherSWR.data]);

  const pageReady =
    !!farmId &&
    !farmsSWR.isLoading &&
    !soilSWR.isLoading &&
    (!hasCoords || !weatherSWR.isLoading) &&
    (!soilHealth || !predictSWR.isLoading);

  const farmsError = farmsSWR.error;

  return {
    farm,
    soilHealth,
    weather,
    topCrops,
    farmsError,
    /** True only when there is no cached data yet (avoids flashing loader on revalidate). */
    isInitialLoading: !!farmId && !pageReady,
    isValidating:
      farmsSWR.isValidating ||
      soilSWR.isValidating ||
      weatherSWR.isValidating ||
      predictSWR.isValidating,
    mutate: {
      farms: farmsSWR.mutate,
      soil: soilSWR.mutate,
      weather: weatherSWR.mutate,
      predict: predictSWR.mutate,
    },
  };
}
