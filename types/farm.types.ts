export interface IFarm {
  farm_id: string;
  farm_name: string;
  farm_location: {
    latitude: number;
    longitude: number;
  };
  farm_measurement: number;
}
