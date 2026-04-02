export interface IFarm {
  farm_id: string;
  farm_name: string;
  /** Street address; optional. */
  farm_location?: string | null;
  /** WGS84; optional. */
  latitude?: number | null;
  longitude?: number | null;
  farm_measurement: number;
}
