/** Stable SWR cache keys shared across screens (dedupe + avoid redundant fetches). */

export const swrKeys = {
  farmsList: (farmerId: string) => ['farm', 'list', farmerId] as const,
  soilForFarm: (farmId: string) => ['farm', 'soil', farmId] as const,
  weatherAt: (lat: number, lon: number) => ['weather', lat, lon] as const,
  mlPredict: (farmId: string, soilFingerprint: string) =>
    ['ml', 'predict', farmId, soilFingerprint] as const,
  /** Latest ESP/cached snapshot on ML service (global slot, not per farm). */
  pendingSoil: () => ['ml', 'pending-soil'] as const,
  /** Pinned farming snapshot from tanim-api (disables ML pending for that farm). */
  farmingSession: (farmId: string) => ['farm', 'farming-session', farmId] as const,
  farmingSessionsByFarmer: (farmerId: string) =>
    ['farm', 'farming-sessions', farmerId] as const,
} as const;
