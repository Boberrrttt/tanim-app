import type { IFarm } from '@/types/farm.types';
import type { ISoilHealth } from '@/types/soil-health.types';
import type { WeatherDataShape } from '@/services/weather.service';
import type { FertilizerPredictData } from '@/services/ml.service';

/** Login that unlocks the client-only demo farm (stored as `UserData.demoFarmAccess`). */
export const DEMO_FARM_USERNAME = 'farmer';
export const DEMO_FARM_PASSWORD = '123456';

/** Stable id — not a real server farm; client-only demo. */
export const DEMO_FARM_ID = 'tanim-demo-farm';

export function isDemoFarmId(id: string | undefined): boolean {
  return id === DEMO_FARM_ID;
}

export const DEMO_FARM: IFarm = {
  farm_id: DEMO_FARM_ID,
  farm_name: 'Demo Farm',
  farm_location: 'Sample plot (offline data)',
  latitude: 14.5995,
  longitude: 120.9842,
  farm_measurement: 2.5,
};

/** Shown in lists next to the demo row. */
export const DEMO_FARM_BADGE = 'Sample data · offline';

export const DEMO_SOIL: ISoilHealth = {
  farm_id: DEMO_FARM_ID,
  nitrogen: 72,
  phosphorus: 48,
  potassium: 210,
  ph: 6.2,
  salinity: 1.1,
  temperature: 28,
  moisture: 58,
};

/** Matches typical ML feature length for “start farming” body (demo only). */
export const DEMO_SOIL_FEATURES = [72, 48, 210, 6.2, 1.1, 28, 58].slice(0, 6);

export const DEMO_TOP_CROPS: { crop_class: string; probability: number }[] = [
  { crop_class: 'Rice', probability: 0.42 },
  { crop_class: 'Corn', probability: 0.31 },
  { crop_class: 'Tomato', probability: 0.18 },
];

/** Kelvin (same shape as tanim-api weather). */
export const DEMO_WEATHER: WeatherDataShape = {
  city: 'Manila',
  country: 'PH',
  latitude: DEMO_FARM.latitude!,
  longitude: DEMO_FARM.longitude!,
  temperature: 302.5,
  feels_like: 304,
  humidity: 72,
  pressure: 1010,
  description: 'partly cloudy',
  wind_speed: 14,
  wind_direction: 220,
  visibility: 10000,
  timestamp: Date.now(),
};

function demoTimeline(cropLabel: string): NonNullable<FertilizerPredictData['farming_timeline']> {
  return {
    template_id: 'demo-template',
    total_days: 120,
    phases: [
      {
        name: 'Land preparation',
        day_start: 1,
        day_end: 14,
        description: `Sample phase for ${cropLabel}: prepare beds and basal feeding.`,
      },
      {
        name: 'Vegetative growth',
        day_start: 15,
        day_end: 60,
        description: 'Active growth and tillering / canopy build-up.',
      },
      {
        name: 'Flowering & filling',
        day_start: 61,
        day_end: 100,
        description: 'Reproductive stage; watch water and nutrients.',
      },
      {
        name: 'Ripening',
        day_start: 101,
        day_end: 120,
        description: 'Finish cycle; plan harvest window.',
      },
    ],
    planting_window_note: 'Demo only — dates are illustrative.',
  };
}

function baseFertilizer(crop: string): FertilizerPredictData {
  return {
    crop,
    soil_ph: 6.2,
    nitrogen: 'Medium',
    phosphorus: 'Medium',
    potassium: 'High',
    fertilizer_recommendation_rate: '90-60-60 kg/ha (demo)',
    organic_fertilizer: 'Compost or manure 5 t/ha before tillage (demo)',
    option_1: {
      first_application: [
        { fertilizer: 'Complete 14-14-14', bags_per_ha: 4 },
        { fertilizer: 'Urea 46-0-0', bags_per_ha: 1.5 },
      ],
      second_application: [
        { fertilizer: 'Urea 46-0-0', bags_per_ha: 2 },
      ],
    },
    option_2: {
      first_application: [
        { fertilizer: 'Organic blend (demo)', bags_per_ha: 8 },
      ],
      second_application: [
        { fertilizer: 'Split urea (demo)', bags_per_ha: 1.8 },
      ],
    },
    mode_of_application: {
      first_application: 'Broadcast and incorporate before planting (demo).',
      second_application: 'Topdress at tillering / knee-high (demo).',
      organic_fertilizer: 'Incorporate with last harrow (demo).',
    },
    farming_timeline: demoTimeline(crop),
  };
}

const demoByCrop: Record<string, FertilizerPredictData> = {
  Rice: baseFertilizer('Rice'),
  Corn: baseFertilizer('Corn'),
  Tomato: baseFertilizer('Tomato'),
};

export function getDemoFertilizerForCrop(cropClass: string): FertilizerPredictData | null {
  const direct = demoByCrop[cropClass];
  if (direct) return direct;
  return baseFertilizer(cropClass);
}
