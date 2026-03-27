import apiClient from "./api";

const toValidFeatures = (features: number[]): number[] =>
  features.map((v) => {
    const n = Array.isArray(v) ? Number((v as unknown[])[0]) : Number(v);
    return Number.isFinite(n) ? n : 0;
  });

export const predict = async (features: number[], farmId?: string) => {
  try {
    const validFeatures = toValidFeatures(features);
    const body: { features: number[]; farm_id?: string } = {
      features: validFeatures,
    };
    if (farmId) body.farm_id = farmId;
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
