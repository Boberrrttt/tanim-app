/** Stable SWR cache keys shared across screens (dedupe + avoid redundant fetches). */

export const swrKeys = {
  farmsList: (farmerId: string) => ['farm', 'list', farmerId] as const,
  soilForFarm: (farmId: string) => ['farm', 'soil', farmId] as const,
  weatherAt: (lat: number, lon: number) => ['weather', lat, lon] as const,
  /** Same coords as `weatherAt` but scoped by farm so SWR + offline rows aren’t shared across farms. */
  weatherForFarm: (farmId: string, lat: number, lon: number) =>
    ['weather', 'farm', farmId, lat, lon] as const,
  mlPredict: (farmId: string, soilFingerprint: string) =>
    ['ml', 'predict', farmId, soilFingerprint] as const,
  /** Latest ML pending snapshot for this farm (no device copy; server soil is `soilForFarm`). */
  pendingSoil: (farmId: string) => ['ml', 'pending-soil', farmId] as const,
  /** Pinned farming snapshot from tanim-api (disables ML pending for that farm). */
  farmingSession: (farmId: string) => ['farm', 'farming-session', farmId] as const,
  farmingSessionsByFarmer: (farmerId: string) =>
    ['farm', 'farming-sessions', farmerId] as const,
} as const;
