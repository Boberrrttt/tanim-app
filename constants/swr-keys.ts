/** Stable SWR cache keys shared across screens (dedupe + avoid redundant fetches). */

export const swrKeys = {
  farmsList: (farmerId: string) => ['farm', 'list', farmerId] as const,
  soilForFarm: (farmId: string) => ['farm', 'soil', farmId] as const,
  weatherAt: (lat: number, lon: number) => ['weather', lat, lon] as const,
  mlPredict: (farmId: string, soilFingerprint: string) =>
    ['ml', 'predict', farmId, soilFingerprint] as const,
} as const;
