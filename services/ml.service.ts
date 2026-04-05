import axios from "axios";
import { Platform } from "react-native";

import apiClient, { isAbortLikeError } from "./api";

const ML_BASE_URL = (process.env.EXPO_PUBLIC_ML_API_URL ?? "").replace(/\/$/, "");

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

export interface FertilizerProbabilityItem {
  fertilizer_class: string;
  probability: number;
}

export interface FertilizerPredictData {
  prediction: string;
  probabilities?: FertilizerProbabilityItem[];
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
  temperature: number;
  ec: number;
  moisture: number;
  farm_id?: string;
}

/** Coerce API/legacy values (e.g. buggy soil payload with numbers as `[n]`) to finite floats. */
function toFertFloat(value: unknown): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const predictFertilizer = async (
  input: FertilizerPredictInput,
  options?: { signal?: AbortSignal }
) => {
  const body: FertilizerPredictInput = {
    nitrogen: toFertFloat(input.nitrogen),
    phosphorus: toFertFloat(input.phosphorus),
    potassium: toFertFloat(input.potassium),
    ph: toFertFloat(input.ph),
    temperature: toFertFloat(input.temperature),
    ec: toFertFloat(input.ec),
    moisture: toFertFloat(input.moisture),
  };
  if (input.farm_id != null && input.farm_id !== "") {
    body.farm_id = input.farm_id;
  }
  if (!ML_BASE_URL) {
    const err = new Error(
      "EXPO_PUBLIC_ML_API_URL is not set — fertilizer prediction needs the ML service base URL."
    );
    if (__DEV__) console.warn(err.message);
    throw err;
  }
  const url = `${ML_BASE_URL}/predict/fertilizer`;
  try {
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
      console.log("[ML] POST /predict/fertilizer error:", ax?.message, {
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

export const predict = async (
  features: number[],
  farmId?: string,
  lat?: number,
  lng?: number
) => {
  try {
    const validFeatures = toValidFeatures(features);
    const body: {
      features: number[];
      farm_id?: string;
      lat?: number;
      lng?: number;
    } = {
      features: validFeatures,
    };
    if (farmId) body.farm_id = farmId;
    if (lat !== undefined && lng !== undefined) {
      body.lat = lat;
      body.lng = lng;
    }
    // Match FastAPI route `POST /ml/` (trailing slash); `/ml` triggers 307 and can break POST bodies.
    const response = await apiClient.post("/ml/", body, { timeout: 0 });
    if (__DEV__) {
      console.log("[ML] POST /ml/ response:", JSON.stringify(response.data));
    }
    return response.data;
  } catch (error: unknown) {
    const ax = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    if (__DEV__) {
      console.log("[ML] POST /ml/ error:", ax?.message, {
        status: ax?.response?.status,
        data: ax?.response?.data,
      });
    }
    console.error("Error predicting:", error);
    throw error;
  }
};
