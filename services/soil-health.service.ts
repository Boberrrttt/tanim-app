import apiClient, { isAbortLikeError } from './api';
import type { ISoilHealth } from '@/types/soil-health.types';
import type { PendingSoilSnapshot } from './ml.service';

export interface GetSoilHealthProps {
    farm_id: string;
    signal?: AbortSignal;
}

/** API success payload: `data` is a list of soil test rows, newest first. */
export function parseSoilHealthRows(
  body: unknown,
  /** When set, drops any row not for this farm (safety; GET is already scoped by farm). */
  selectedFarmId?: string
): ISoilHealth[] {
  const raw = body as { data?: unknown[] } | null;
  const data = raw?.data;
  if (!Array.isArray(data)) return [];
  const want = selectedFarmId != null ? String(selectedFarmId) : null;
  return data.filter(
    (r): r is ISoilHealth =>
      r != null &&
      typeof r === 'object' &&
      typeof (r as ISoilHealth).farm_id === 'string' &&
      (want == null || String((r as ISoilHealth).farm_id) === want) &&
      typeof (r as ISoilHealth).nitrogen === 'number'
  );
}

/** Prefer today's row (UTC date of `created_at`); else most recent. Only uses rows for `selectedFarmId`. */
export function pickSoilRowForDisplay(selectedFarmId: string, rows: ISoilHealth[]): ISoilHealth | null {
  const want = String(selectedFarmId);
  const forFarm = rows.filter((r) => String(r.farm_id) === want);
  if (forFarm.length === 0) return null;
  const todayUtc = new Date().toISOString().slice(0, 10);
  for (const r of forFarm) {
    const d = r.created_at?.slice(0, 10);
    if (d === todayUtc) return { ...r, farm_id: selectedFarmId };
  }
  return { ...forFarm[0], farm_id: selectedFarmId };
}

/**
 * Soil metrics from ML pending data only — never include `snap.farm_id` here; the caller
 * must pass the selected screen farm id when calling `upsertSoilHealthToday`.
 * EC overrides salinity when present.
 */
export function pendingSnapshotToSoilMetrics(
  snap: PendingSoilSnapshot
): Omit<ISoilHealth, 'farm_id' | 'test_id' | 'created_at' | 'updated_at'> {
  const { soil, fertilizer_inputs } = snap;
  const salinity =
    fertilizer_inputs?.ec != null && Number.isFinite(fertilizer_inputs.ec)
      ? fertilizer_inputs.ec
      : soil.salinity;
  return {
    nitrogen: soil.nitrogen,
    phosphorus: soil.phosphorus,
    potassium: soil.potassium,
    ph: soil.ph,
    salinity,
    temperature: soil.temperature,
    moisture: soil.moisture,
  };
}

export const getSoilHealth = async ({ farm_id, signal }: GetSoilHealthProps) => {
    try {
        const id = encodeURIComponent(farm_id);
        const response = await apiClient.get(`/test/${id}`, { signal });
        if (__DEV__) {
            const rows = (response.data as { data?: unknown[] })?.data;
            const n = Array.isArray(rows) ? rows.length : -1;
            console.log(
                `[SoilHealth] GET /test/${farm_id} → ${n} record(s).`,
                n > 0 ? response.data : '(empty)',
            );
        }
        return response.data;
    } catch (error) {
        if (!isAbortLikeError(error)) {
            console.error('Error fetching soil health:', error);
        }
        throw error;
    }
};

/**
 * Create or update the `soil_health_test` row for the current UTC day (one row per farm per day).
 * `selectedFarmId` is always the farm the user is viewing (route / farm list) — not ML `data.farm_id`.
 */
export async function upsertSoilHealthToday(
  selectedFarmId: string,
  metrics: Omit<ISoilHealth, 'farm_id' | 'test_id' | 'created_at' | 'updated_at'>,
  options?: { signal?: AbortSignal }
) {
  const body: Omit<ISoilHealth, 'test_id' | 'created_at' | 'updated_at'> = {
    ...metrics,
    farm_id: selectedFarmId,
  };
  const response = await apiClient.put('/test/upsert', body, { signal: options?.signal });
  return response.data;
}