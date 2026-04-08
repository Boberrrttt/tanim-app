import apiClient, { isAbortLikeError } from './api';
import type { FertilizerPredictData } from './ml.service';

export interface CropProbability {
  crop_class: string;
  probability: number;
}

/** Saved soil scalars (+ optional metadata) at “Start farming”. */
export interface FarmingSessionSoilSnapshot {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  salinity: number;
  temperature: number;
  moisture: number;
  /** Original ML pending `received_at` when available */
  received_at?: string | null;
}

export interface FarmingSessionRow {
  farm_id: string;
  farmer_id: string;
  started_at: string;
  selected_crop: string;
  soil_snapshot: FarmingSessionSoilSnapshot;
  fertilizer_recommendation: FertilizerPredictData;
  top_crop_probabilities?: CropProbability[] | null;
  cycle_start_date?: string | null;
  farm_name?: string;
}

export interface StartFarmingSessionPayload {
  farm_id: string;
  farmer_id: string;
  selected_crop: string;
  soil_snapshot: FarmingSessionSoilSnapshot;
  fertilizer_recommendation: FertilizerPredictData;
  top_crop_probabilities: CropProbability[];
  cycle_start_date?: string;
  /** When both are set, API updates `farm.latitude` / `farm.longitude` for this farm. */
  latitude?: number;
  longitude?: number;
  /**
   * ML `features` [N,P,K,pH,temp,moisture,EC?] — API writes `soil_health_test` from this when present.
   */
  features?: number[];
}

type ApiEnvelope<T> = { status: string; message?: string; data: T };

export async function getFarmingSession(
  farmId: string,
  options?: { signal?: AbortSignal }
): Promise<ApiEnvelope<FarmingSessionRow | null>> {
  try {
    const response = await apiClient.get<ApiEnvelope<FarmingSessionRow | null>>(
      `/farm/farming/${encodeURIComponent(farmId)}`,
      { signal: options?.signal }
    );
    return response.data;
  } catch (error: unknown) {
    if (isAbortLikeError(error)) throw error;
    console.error('Error fetching farming session:', error);
    throw error;
  }
}

export async function getFarmingSessionsByFarmer(
  farmerId: string,
  options?: { signal?: AbortSignal }
): Promise<ApiEnvelope<(FarmingSessionRow & { farm_name?: string })[]>> {
  try {
    const response = await apiClient.get<
      ApiEnvelope<(FarmingSessionRow & { farm_name?: string })[]>
    >(`/farm/farming/by-farmer/${encodeURIComponent(farmerId)}`, {
      signal: options?.signal,
    });
    return response.data;
  } catch (error: unknown) {
    if (isAbortLikeError(error)) throw error;
    console.error('Error fetching farming sessions list:', error);
    throw error;
  }
}

export async function startFarmingSession(
  payload: StartFarmingSessionPayload,
  options?: { signal?: AbortSignal }
): Promise<ApiEnvelope<FarmingSessionRow>> {
  const response = await apiClient.post<ApiEnvelope<FarmingSessionRow>>(
    '/farm/farming/start',
    payload,
    { signal: options?.signal }
  );
  return response.data;
}

export async function cancelFarmingSession(
  farmId: string,
  farmerId: string,
  options?: { signal?: AbortSignal }
): Promise<ApiEnvelope<{ removed: boolean }>> {
  const response = await apiClient.delete<ApiEnvelope<{ removed: boolean }>>(
    `/farm/farming/${encodeURIComponent(farmId)}`,
    {
      params: { farmer_id: farmerId },
      signal: options?.signal,
    }
  );
  return response.data;
}
