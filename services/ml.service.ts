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
    const response = await apiClient.post("/ml", body, { timeout: 0 });
    return response.data;
  } catch (error) {
    console.error("Error predicting:", error);
    throw error;
  }
};
