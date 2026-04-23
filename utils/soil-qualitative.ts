/**
 * Qualitative labels aligned with Bureau of Soils and Water Management (BSWM) soil
 * test interpretation: N as % organic matter, P (ppm with pH-based BSWM bands), K in ppm, pH class.
 * Values not in the published table (salinity, moisture, temp, ambiguous N) use simple estimated bands.
 */

import type { ISoilHealth } from '@/types/soil-health.types';

export type BswmNutrientClass = 'Low' | 'Medium' | 'High';
export type SalinityClass = BswmNutrientClass;
export type MoistureClass = BswmNutrientClass;
export type TemperatureClass = BswmNutrientClass;

const PH_P_METHOD = 7.3; // threshold for which P (ppm) band table applies — BSWM-style

function tier3(
  v: number,
  lowMax: number,
  medMax: number
): BswmNutrientClass {
  if (v <= lowMax) return 'Low';
  if (v <= medMax) return 'Medium';
  return 'High';
}

/** BSWM: organic matter (%) — N row in the reference. */
export function categorizeOrganicMatter(om: number): BswmNutrientClass {
  return tier3(om, 1.7, 3.0);
}

/**
 * pH: same three BSWM-style bands as other metrics (Low / Medium / High).
 * Boundaries: &lt;6.6 low, 6.6–7.0 medium, &gt;7.0 high (reaction class from BSWM).
 */
export function categorizePh(ph: number): BswmNutrientClass {
  if (ph < 6.6) return 'Low';
  if (ph <= 7.0) return 'Medium';
  return 'High';
}

/** P (ppm): BSWM-style bands; thresholds differ for pH below vs at/above `PH_P_METHOD`. */
export function categorizePhosphorus(ppm: number, ph: number): BswmNutrientClass {
  if (ph < PH_P_METHOD) {
    return tier3(ppm, 10, 20);
  }
  return tier3(ppm, 7, 25);
}

/** K (ppm). */
export function categorizePotassium(ppm: number): BswmNutrientClass {
  return tier3(ppm, 117, 235);
}

/**
 * N field may be % OM (BSWM), 0–100 index from a sensor, or a larger ppm value.
 * If 0 &lt; n ≤ 6.5 → treat as % organic matter. Otherwise use estimated tiers.
 */
export function categorizeNitrogen(n: number): BswmNutrientClass {
  if (n > 0 && n <= 6.5) {
    return categorizeOrganicMatter(n);
  }
  if (n > 6.5 && n <= 100) {
    if (n < 35) return 'Low';
    if (n < 70) return 'Medium';
    return 'High';
  }
  if (n > 100) {
    return tier3(n, 40, 100);
  }
  return 'Low';
}

/** Not in BSWM table — dS/m (e.g. NMSU / FAO style: &lt;1.5 very low, 1.5–4 moderate, &gt;4 high stress). Simplified. */
export function categorizeSalinity(ecDsM: number): SalinityClass {
  if (ecDsM < 2) return 'Low';
  if (ecDsM < 4) return 'Medium';
  return 'High';
}

/** Volumetric or relative % — estimated field-comfort bands. */
export function categorizeMoisture(moisturePercent: number): MoistureClass {
  if (moisturePercent < 25) return 'Low';
  if (moisturePercent < 60) return 'Medium';
  return 'High';
}

/** Soil/ambient temperature (°C) — estimated comfort bands, not in BSWM. */
export function categorizeSoilTemperature(celsius: number): TemperatureClass {
  if (celsius < 18) return 'Low';
  if (celsius < 32) return 'Medium';
  return 'High';
}

export function soilHealthQualitative(health: ISoilHealth) {
  const { nitrogen, phosphorus, potassium, ph, salinity, moisture, temperature } = health;
  const n = categorizeNitrogen(Number(nitrogen));
  const p = categorizePhosphorus(Number(phosphorus), Number(ph));
  const k = categorizePotassium(Number(potassium));
  const phClass = categorizePh(ph);
  return {
    nitrogen: n,
    phosphorus: p,
    potassium: k,
    ph: phClass,
    salinity: categorizeSalinity(Number(salinity)),
    moisture: categorizeMoisture(Number(moisture)),
    temperature: categorizeSoilTemperature(Number(temperature)),
  };
}

/**
 * Progress bar width (0–100) from the qualitative label only — not raw sensor numbers.
 * Low / Medium / High (and Good) map to ~33% / ~67% / 100%.
 */
export function qualitativeProgressPercent(status: string): number {
  const s = String(status).trim().toLowerCase();
  if (s === 'low') return 33;
  if (s === 'medium' || s === 'moderate') return 67;
  if (s === 'high' || s === 'good') return 100;
  return 50;
}
