export interface ISoilHealth {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    ph: number;
    salinity: number;
    temperature: number;
    moisture: number;
    farm_id: string;
    test_id?: string;
    created_at?: string;
    updated_at?: string | null;
}
