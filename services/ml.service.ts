import axios from "axios";
import { Platform } from "react-native";
import { mutate } from "swr";

import { swrKeys } from "@/constants/swr-keys";
import { isAbortLikeError } from "./api";

function revalidatePendingSoilSWR(): void {
  void mutate(swrKeys.pendingSoil());
}

const EXPO_ML_RAW = (process.env.EXPO_PUBLIC_ML_API_URL ?? "").trim();

/**
 * Normalize `EXPO_PUBLIC_ML_API_URL` to the **tanim-model FastAPI root** only.
 * Strips trailing slashes and a mistaken trailing `/api/v1` (that host is for tanim-app → tanim-api, not ML).
 */
export function normalizePublicOrigin(url: string): string {
  let u = url.replace(/\/+$/, "");
  if (u.endsWith("/api/v1")) {
    u = u.slice(0, -"/api/v1".length).replace(/\/+$/, "");
  }
  return u;
}

/** ML service root: all crop/pending/fertilizer calls use axios against this host only (never tanim-api). */
function getMlRoot(): string {
  return normalizePublicOrigin(EXPO_ML_RAW);
}

const nativeAdapter: ("fetch" | "xhr")[] = ["fetch", "xhr"];

function mlAxiosConfig(signal?: AbortSignal) {
  return {
    timeout: 0 as const,
    signal,
    ...(Platform.OS !== "web" ? { adapter: nativeAdapter } : {}),
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
  };
}

export interface FertilizerApplicationItem {
  bags_per_ha: number;
  fertilizer: string;
}

export interface FertilizerApplicationOption {
  first_application: FertilizerApplicationItem[];
  second_application: FertilizerApplicationItem[];
}

export interface FertilizerModeOfApplication {
  first_application: string;
  second_application: string;
  organic_fertilizer: string;
}

export interface FertilizerTimelinePhase {
  name: string;
  day_start: number;
  day_end: number;
  description: string;
}

/** Growth phases + lengths from `POST /predict/fertilizer` (tanim-model `build_farming_timeline`). */
export interface FertilizerFarmingTimeline {
  template_id: string;
  total_days: number;
  phases: FertilizerTimelinePhase[];
  planting_window_note?: string;
  /** ISO YYYY-MM-DD when the client sent `cycle_start_date` (e.g. from pending soil `received_at`). */
  cycle_start_date?: string;
}

/** `data` from successful `POST /predict/fertilizer` on tanim-model. */
export interface FertilizerPredictData {
  crop: string;
  soil_ph: number;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  fertilizer_recommendation_rate: string;
  organic_fertilizer: string;
  option_1: FertilizerApplicationOption;
  option_2: FertilizerApplicationOption;
  mode_of_application: FertilizerModeOfApplication;
  /** Present when ML service includes `build_farming_timeline` in the payload. */
  farming_timeline?: FertilizerFarmingTimeline;
}

export interface FertilizerPredictResponse {
  status: string;
  message?: string;
  data?: FertilizerPredictData;
}

/** Body for `POST {EXPO_PUBLIC_ML_API_URL}/predict/fertilizer` (tanim-model `FertilizerPredictRequest`). */
export interface FertilizerPredictInput {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  crop: string;
  farm_id?: string;
  /** ISO YYYY-MM-DD; server echoes in `farming_timeline.cycle_start_date`. */
  cycle_start_date?: string;
}

/** Coerce API/legacy values (e.g. buggy soil payload with numbers as `[n]`) to finite floats. */
function toFertFloat(value: unknown): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Verbatim crop LightGBM output (same shape as `CropService.predict` / POST `data.crop_model`). */
export interface PendingSoilCropModel {
  prediction: string;
  probabilities: { crop_class: string; probability: number }[];
  top_3: { crop_class: string; probability: number }[];
}

/** Body accepted by `POST /predict` (stored on pending snapshot as `request_payload`). */
export interface PendingSoilRequestPayload {
  features: number[];
  farm_id?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/** Exact successful `POST /predict` JSON (stored on pending snapshot as `predict_response`). */
export interface PendingSoilPredictResponse {
  status: string;
  message: string;
  data: {
    prediction: string;
    npk_levels: Record<string, string>;
    probabilities: { crop_class: string; probability: number }[];
  };
}

/** Snapshot from ML `GET /pending/soil` (`data` field when status is success). */
export interface PendingSoilSnapshot {
  received_at: string;
  sequence: number;
  features: number[];
  /** Parsed `POST /predict` body for this reading. */
  request_payload?: PendingSoilRequestPayload;
  /** Same object returned by `POST /predict` for this reading. */
  predict_response?: PendingSoilPredictResponse;
  /** Present when `POST /predict` included `farm_id`. */
  farm_id?: string;
  prediction: string;
  npk_levels: Record<string, string>;
  /** All crop classes, sorted by probability (desc). */
  probabilities: { crop_class: string; probability: number }[];
  probabilities_top_3: { crop_class: string; probability: number }[];
  /** Redundant copy of model output for clients that want a single nested block. */
  crop_model?: PendingSoilCropModel;
  soil: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    ph: number;
    salinity: number;
    temperature: number;
    moisture: number;
  };
  fertilizer_inputs: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    ph: number;
    temperature: number;
    ec: number;
    moisture: number;
  };
}

export type PendingSoilResult =
  | { ok: true; data: PendingSoilSnapshot }
  | { ok: false; waiting: true };

/**
 * Log ML `features[]` in the same order as `app/(tabs)/farmer/[id].tsx` Soil Health cards:
 * Nitrogen, Phosphorus, Potassium, Salinity, pH, Moisture.
 *
 * Vector layout matches tanim-model: [0]=N, [1]=P, [2]=K, [3]=pH, [4]=temperature, [5]=moisture, [6]=EC (dS/m).
 */
function logPendingSnapshotSoilHealthOrder(d: PendingSoilSnapshot): void {
  const f = Array.isArray(d.features) ? d.features.map((x) => Number(x)) : [];
  const at = (i: number): number | null =>
    i < f.length && Number.isFinite(f[i]) ? f[i]! : null;

  const salinity =
    f.length > 6 && at(6) != null
      ? at(6)!
      : (d.fertilizer_inputs?.ec ?? d.soil?.salinity ?? 0);

  const lines: string[] = [
    `Nitrogen: ${at(0) ?? '—'} mg/kg  (features[0])`,
    `Phosphorus: ${at(1) ?? '—'} mg/kg  (features[1])`,
    `Potassium: ${at(2) ?? '—'} mg/kg  (features[2])`,
    `Salinity: ${salinity} dS/m  (${f.length > 6 ? 'features[6] EC' : 'soil/fertilizer_inputs (no features[6])'})`,
    `pH: ${at(3) ?? '—'}  (features[3])`,
    `Moisture: ${at(5) ?? '—'} %  (features[5])`,
  ];
  const temp = at(4);
  if (temp != null) {
    lines.push(`Temperature: ${temp} °C  (features[4], not a Soil Health card on farm screen)`);
  }

  console.log(
    `[ML] GET /pending/soil — values in farm Soil Health UI order:\n${lines.map((l) => `  ${l}`).join('\n')}`
  );
  console.log('[ML] GET /pending/soil — raw features[]', f);
}

function requireMlRoot(): void {
  if (!getMlRoot()) {
    const err = new Error(
      "Set EXPO_PUBLIC_ML_API_URL to your tanim-model root (e.g. https://host:8001), not EXPO_PUBLIC_API_URL."
    );
    if (__DEV__) console.warn(err.message);
    throw err;
  }
}

/**
 * Read the ML global pending cache: **GET `{EXPO_PUBLIC_ML_API_URL}/pending/soil`** on tanim-model only.
 * 404 → `{ ok: false, waiting: true }`.
 */
export const getPendingSoil = async (options?: {
  signal?: AbortSignal;
}): Promise<PendingSoilResult> => {
  requireMlRoot();

  const parseSuccess = (data: unknown): PendingSoilResult => {
    const body = data as { status?: string; data?: PendingSoilSnapshot };
    if (body?.status === "success" && body.data) {
      if (__DEV__) {
        const d = body.data;
        logPendingSnapshotSoilHealthOrder(d);
        console.log("[ML] GET /pending/soil ok", {
          received_at: d.received_at,
          sequence: d.sequence,
          farm_id: d.farm_id,
          prediction: d.prediction,
          soil: d.soil,
          top3: d.probabilities_top_3?.slice(0, 3),
          rawKeys: Object.keys(d),
        });
      }
      return { ok: true, data: body.data };
    }
    if (__DEV__) {
      console.log("[ML] GET /pending/soil unexpected shape", data);
    }
    return { ok: false, waiting: true };
  };

  try {
    const url = `${getMlRoot()}/pending/soil`;
    const response = await axios.get<{ status: string; data: PendingSoilSnapshot }>(
      url,
      mlAxiosConfig(options?.signal)
    );
    return parseSuccess(response.data);
  } catch (error: unknown) {
    if (isAbortLikeError(error)) throw error;
    const ax = error as { response?: { status?: number; data?: unknown } };
    if (ax.response?.status === 404) {
      return { ok: false, waiting: true };
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (__DEV__) console.log("[ML] GET /pending/soil error:", msg);
    console.error("Error fetching pending soil:", error);
    throw error;
  }
};

export const clearPendingSoil = async (options?: {
  signal?: AbortSignal;
}): Promise<{ cleared: boolean }> => {
  requireMlRoot();

  const url = `${getMlRoot()}/pending/soil`;
  const response = await axios.delete<{
    status: string;
    cleared?: boolean;
  }>(url, mlAxiosConfig(options?.signal));
  const out = { cleared: Boolean(response.data?.cleared) };
  revalidatePendingSoilSWR();
  return out;
};

export const predictFertilizer = async (
  input: FertilizerPredictInput,
  options?: { signal?: AbortSignal }
) => {
  const body: Record<string, string | number> = {
    nitrogen: toFertFloat(input.nitrogen),
    phosphorus: toFertFloat(input.phosphorus),
    potassium: toFertFloat(input.potassium),
    ph: toFertFloat(input.ph),
    crop: String(input.crop ?? "").trim(),
  };
  if (input.farm_id != null && input.farm_id !== "") {
    body.farm_id = input.farm_id;
  }
  if (input.cycle_start_date != null && String(input.cycle_start_date).trim() !== "") {
    body.cycle_start_date = String(input.cycle_start_date).trim();
  }

  requireMlRoot();

  try {
    const url = `${getMlRoot()}/predict/fertilizer`;
    const response = await axios.post<FertilizerPredictResponse>(
      url,
      body,
      mlAxiosConfig(options?.signal)
    );
    if (__DEV__) {
      console.log(
        "[ML] POST /predict/fertilizer response:",
        JSON.stringify(response.data)
      );
    }
    return response.data;
  } catch (error: unknown) {
    if (isAbortLikeError(error)) throw error;
    const ax = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    if (__DEV__) {
      console.log("[ML] POST fertilizer error:", ax?.message, {
        status: ax?.response?.status,
        data: ax?.response?.data,
      });
    }
    console.error("Error predicting fertilizer:", error);
    throw error;
  }
};

const toValidFeatures = (features: number[]): number[] =>
  features.map((v) => {
    const n = Array.isArray(v) ? Number((v as unknown[])[0]) : Number(v);
    return Number.isFinite(n) ? n : 0;
  });

/** Crop inference: **POST `{EXPO_PUBLIC_ML_API_URL}/predict`** on tanim-model only. */
export const predict = async (
  features: number[],
  farmId?: string,
  lat?: number,
  lng?: number
) => {
  requireMlRoot();

  const validFeatures = toValidFeatures(features);
  const payload: {
    features: number[];
    farm_id?: string;
    lat?: number;
    lng?: number;
  } = {
    features: validFeatures,
  };
  if (farmId) payload.farm_id = farmId;
  if (lat != null && Number.isFinite(lat)) payload.lat = lat;
  if (lng != null && Number.isFinite(lng)) payload.lng = lng;

  try {
    const url = `${getMlRoot()}/predict`;
    const response = await axios.post(url, payload, {
      ...mlAxiosConfig(),
      timeout: 0,
    });
    if (__DEV__) {
      console.log("[ML] POST /predict response:", JSON.stringify(response.data));
    }
    revalidatePendingSoilSWR();
    return response.data;
  } catch (error: unknown) {
    if (isAbortLikeError(error)) throw error;
    const ax = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    if (__DEV__) {
      console.log("[ML] POST predict error:", ax?.message, {
        status: ax?.response?.status,
        data: ax?.response?.data,
      });
    }
    console.error("Error predicting:", error);
    throw error;
  }
};
