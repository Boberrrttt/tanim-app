/**
 * Crop growth cycles for the FarmingTimeline UI. Day 1 = field planting or transplant.
 *
 * Vocabulary aligns with USTP RSL workbook **Crops Planted** (Consolidated Soil Info RSL xlsx);
 * `totalDays` and phase spans follow agronomy references: IRRI rice growth handbooks (short <120 d,
 * medium 120–140 d), FAO cassava / sugarcane guides, USDA–NASS and extension corn/tomato DTM ranges,
 * not spreadsheet columns.
 * All templates use four UI phases: Sowing, Vegetative, Flowering, Harvest (some “Flowering” labels are
 * agronomic shorthand, e.g. sugarcane ripening — see per-template notes).
 *
 * @see Appendix A/B in project plan `csv-aligned_crop_timelines_0339dc8d.plan.md` (reference only)
 */

import {
  resolveCropToTemplateId,
  type TimelineTemplateId,
} from '@/constants/crop-cycle-aliases';

export type { TimelineTemplateId } from '@/constants/crop-cycle-aliases';

export type CropPhaseDef = {
  name: string;
  dayStart: number;
  dayEnd: number;
  description: string;
};

export type CropCycleMeta = {
  totalDays: number;
  phases: CropPhaseDef[];
  plantingWindowNote?: string;
};

const PHASE_NAMES = ['Sowing', 'Vegetative', 'Flowering', 'Harvest'] as const;

function fourPhaseMeta(
  totalDays: number,
  spans: readonly [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]],
  descriptions: readonly [string, string, string, string],
  plantingWindowNote?: string
): CropCycleMeta {
  const phases: CropPhaseDef[] = PHASE_NAMES.map((name, i) => ({
    name,
    dayStart: spans[i][0],
    dayEnd: spans[i][1],
    description: descriptions[i],
  }));
  return { totalDays, phases, plantingWindowNote };
}

export const TIMELINE_TEMPLATES: Record<TimelineTemplateId, CropCycleMeta> = {
  DEFAULT: fourPhaseMeta(
    85,
    [
      [1, 12],
      [13, 38],
      [39, 58],
      [59, 85],
    ],
    [
      'Establishment from seed or transplant.',
      'Leaf and canopy development.',
      'Flowering and early fruit or grain set.',
      'Sizing, ripening, and harvest readiness.',
    ],
    'Generic template — match days-to-maturity on your seed or transplant label.'
  ),

  CEREAL: fourPhaseMeta(
    110,
    [
      [1, 15],
      [16, 61],
      [62, 82],
      [83, 110],
    ],
    [
      'Emergence and early vegetative growth.',
      'Stalk and leaf development until near reproductive stage.',
      'Pollination and reproductive window (e.g. tassel/silk for maize).',
      'Grain fill through physiological maturity / harvest moisture.',
    ],
    'Sweet corn is often shorter (~60–100 d); grain hybrids commonly ~100–115 d — check RM on bag.'
  ),

  RICE: fourPhaseMeta(
    125,
    [
      [1, 33],
      [34, 76],
      [77, 108],
      [109, 125],
    ],
    [
      'Establishment, rooting, and tillering.',
      'Active tillering and vegetative growth.',
      'Panicle development through heading and flowering.',
      'Ripening, grain fill, and harvest timing.',
    ],
    'IRRI-style brackets: short <120 d, medium 120–140 d, long 160+ d — this template ~125 d (medium-short); adjust for cultivar and transplant vs DSR.'
  ),

  WHEAT: fourPhaseMeta(
    115,
    [
      [1, 15],
      [16, 65],
      [66, 95],
      [96, 115],
    ],
    [
      'Emergence and early tillering.',
      'Tillering, stem elongation, and boot stage.',
      'Heading, anthesis, and early grain fill.',
      'Dough, maturity, and harvest readiness.',
    ],
    'Spring wheat commonly ~90–140 d from planting; variety maturity class matters.'
  ),

  TOMATO: fourPhaseMeta(
    75,
    [
      [1, 7],
      [8, 28],
      [29, 50],
      [51, 75],
    ],
    [
      'Transplant establishment.',
      'Vine and leaf growth.',
      'Bloom and fruit set.',
      'Fruit development, sizing, and harvest picks.',
    ],
    'Packet “days to maturity” is usually from transplant; early types ~65 d, late ~85 d.'
  ),

  EGGPLANT: fourPhaseMeta(
    72,
    [
      [1, 12],
      [13, 32],
      [33, 48],
      [49, 72],
    ],
    [
      'Transplant establishment and rooting.',
      'Branching and canopy build.',
      'Bloom and fruit set.',
      'Fruit enlargement and repeated harvest.',
    ],
    'Cultivars range ~50–80 d after transplant; warm nights help fruit set.'
  ),

  POTATO: fourPhaseMeta(
    100,
    [
      [1, 20],
      [21, 50],
      [51, 70],
      [71, 100],
    ],
    [
      'Emergence and stolon setup.',
      'Canopy closure and vegetative growth.',
      'Tuber initiation and early bulking.',
      'Tuber bulking, senescence, skin set, and harvest.',
    ],
    'Early varieties ~75–90 d; maincrop often 90–120 d — check your variety class.'
  ),

  CABBAGE: fourPhaseMeta(
    68,
    [
      [1, 12],
      [13, 35],
      [36, 55],
      [56, 68],
    ],
    [
      'Transplant establishment.',
      'Leaf frame before head.',
      'Head formation and firming.',
      'Maturation and harvest when head is firm.',
    ],
    'Fast cultivars ~55–65 d from transplant; storage types run longer.'
  ),

  COTTON: fourPhaseMeta(
    165,
    [
      [1, 35],
      [36, 75],
      [76, 120],
      [121, 165],
    ],
    [
      'Emergence through early vegetative nodes.',
      'Square formation and vegetative peak.',
      'Bloom, boll set, and early boll development.',
      'Boll fill, open boll, and defoliation/harvest timing.',
    ],
    '~150–180 d planting to harvest-ready; heat units (DD60s) often matter more than calendar days.'
  ),

  TOBACCO: fourPhaseMeta(
    110,
    [
      [1, 20],
      [21, 55],
      [56, 80],
      [81, 110],
    ],
    [
      'Rooting after transplant.',
      'Rapid leaf expansion (grand growth).',
      'Topping, suckering, and ripening prep.',
      'Leaf ripening, harvest, and curing window.',
    ],
    'FAO cites ~90–120 d frost-free after transplant; follow local rules and varieties.'
  ),

  SUGARCANE: fourPhaseMeta(
    450,
    [
      [1, 60],
      [61, 300],
      [301, 390],
      [391, 450],
    ],
    [
      'Shoot emergence, establishment, and early tillers.',
      'Tillering through grand growth and stalk elongation.',
      'Ripening phase — sucrose accumulation (UI label “Flowering” is shorthand; flowering is usually avoided).',
      'Harvest window for plant crop (~12–18 mo typical; region-dependent).',
    ],
    'FAO / regional guides: plant crop often 12–18 months (many areas ~15–16 mo optimum age).'
  ),

  CUCURBIT: fourPhaseMeta(
    70,
    [
      [1, 10],
      [11, 35],
      [36, 55],
      [56, 70],
    ],
    [
      'Emergence and vine/runner establishment.',
      'Vegetative growth and canopy development.',
      'Bloom and fruit set.',
      'Fruit sizing and harvest.',
    ],
    'Most cucurbits ~50–70 d to first harvest depending on variety and climate.'
  ),

  LEAFY: fourPhaseMeta(
    45,
    [
      [1, 8],
      [9, 22],
      [23, 32],
      [33, 45],
    ],
    [
      'Germination or transplant establishment.',
      'Rapid leaf production.',
      'Late vegetative / pre-bolt (if applicable).',
      'Harvest window for leaves or young shoots.',
    ],
    'Fast crops — timing varies sharply with heat, day length, and cultivar.'
  ),

  LEGUME: fourPhaseMeta(
    75,
    [
      [1, 10],
      [11, 40],
      [41, 58],
      [59, 75],
    ],
    [
      'Emergence and nodulation establishment.',
      'Vegetative growth and canopy.',
      'Flowering and pod or nut formation.',
      'Grain/pod fill and harvest.',
    ],
    'Compromise template: bush beans faster, peanuts longer — verify for your legume.'
  ),

  OKRA: fourPhaseMeta(
    60,
    [
      [1, 8],
      [9, 30],
      [31, 45],
      [46, 60],
    ],
    [
      'Emergence and early growth.',
      'Vegetative growth in warm conditions.',
      'Flowering and pod set.',
      'Repeated pod harvest while tender.',
    ],
    'Many cultivars ~50–60 d from planting in warm weather.'
  ),

  ROOT_BULB: fourPhaseMeta(
    85,
    [
      [1, 12],
      [13, 45],
      [46, 65],
      [66, 85],
    ],
    [
      'Emergence and root establishment.',
      'Vegetative tops and root enlargement.',
      'Bulking and maturity indicators.',
      'Harvest when size and quality targets are met.',
    ],
    'Onions and long-season roots may exceed this — use variety guidance.'
  ),

  GINGER: fourPhaseMeta(
    270,
    [
      [1, 45],
      [46, 150],
      [151, 220],
      [221, 270],
    ],
    [
      'Rhizome sprouting and shoot establishment.',
      'Strong vegetative growth.',
      'Rhizome expansion and maturation.',
      'Senescence cues and harvest of mature rhizomes.',
    ],
    'Often ~8–10 months to mature rhizome in the tropics.'
  ),

  CAMOTE: fourPhaseMeta(
    110,
    [
      [1, 18],
      [19, 50],
      [51, 82],
      [83, 110],
    ],
    [
      'Slip/root establishment and vine growth.',
      'Canopy development.',
      'Tuber initiation and early bulking.',
      'Tuber bulking and harvest before heavy frost.',
    ],
    'Sweet potato commonly ~100–120 d from planting; taro (gabi) often longer — template centers ~110 d.'
  ),

  CASSAVA: fourPhaseMeta(
    330,
    [
      [1, 33],
      [34, 132],
      [133, 264],
      [265, 330],
    ],
    [
      'Establishment and early vegetative growth.',
      'Strong vegetative growth and starch accumulation start.',
      'Storage root bulking.',
      'Harvest window — FAO / CARDI: many systems 9–12 mo; roots can be held longer for industrial starch.',
    ],
    'Harvest age strongly affects yield and starch — template ~11 mo (330 d); verify for your variety.'
  ),

  STRAWBERRY: fourPhaseMeta(
    90,
    [
      [1, 14],
      [15, 45],
      [46, 70],
      [71, 90],
    ],
    [
      'Planting and crown establishment.',
      'Runner and leaf development.',
      'Flowering and fruit set (system-dependent).',
      'Harvest period — highly dependent on June-bearing vs day-neutral systems.',
    ],
    'June-bearing types often little fruit in year one; day-neutral may fruit sooner — template is approximate.'
  ),

  PINEAPPLE: fourPhaseMeta(
    540,
    [
      [1, 120],
      [121, 300],
      [301, 480],
      [481, 540],
    ],
    [
      'Establishment from slips, suckers, or crowns.',
      'Vegetative growth and plant sizing.',
      'Induction/flowering and fruit development (region and practice dependent).',
      'Fruit maturation and harvest (~18 mo lower end; often longer).',
    ],
    'First harvest commonly ~18–24+ months from planting depending on propagation and induction.'
  ),

  ADLAI: fourPhaseMeta(
    120,
    [
      [1, 25],
      [26, 70],
      [71, 100],
      [101, 120],
    ],
    [
      'Emergence and early tillering.',
      'Vegetative growth.',
      'Reproductive development and grain fill.',
      'Maturity and harvest.',
    ],
    'Philippine extension often cites ~120 days or ~4–5 months; adjust for cultivar.'
  ),

  FORAGE_GRASS: fourPhaseMeta(
    120,
    [
      [1, 30],
      [31, 75],
      [76, 100],
      [101, 120],
    ],
    [
      'Establishment after planting or ratoon.',
      'Vegetative regrowth and tillering.',
      'Pre-cut vegetative peak.',
      'Cut-and-carry or grazing cycle end — management-driven, not fixed biology.',
    ],
    'Illustrative regrowth cycle; actual rotation depends on grazing or cutting schedule.'
  ),

  PERENNIAL_YEAR1: fourPhaseMeta(
    365,
    [
      [1, 90],
      [91, 210],
      [211, 320],
      [321, 365],
    ],
    [
      'Planting and establishment.',
      'Vegetative framework and root system building.',
      'Pre-productive growth or first reproductive cycle (species-dependent).',
      'Late establishment year — not a real “harvest” calendar for all trees.',
    ],
    'ILLUSTRATIVE ONLY: trees and plantation crops differ widely — use species-specific local guidance.'
  ),
};

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Example planting date for demos/tests: first day of next calendar month.
 * Farm details uses today as Day 1 when previewing a crop (`cycle_start_date` on fertilizer predict).
 */
export function getDefaultPlannedPlantingDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
}

/** Inclusive calendar end: day `totalDays` of the cycle falls on this date when day 1 is `start`. */
export function getCycleEndDate(start: Date, totalDays: number): Date {
  return addDays(start, totalDays - 1);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Position in the crop cycle relative to `reference` (default: today).
 * - `0` — before planned planting (no field days yet)
 * - `1` … `totalDays` — day of cycle (day 1 = plant date)
 * - `totalDays + 1` — calendar is after the last day of the modeled cycle
 */
export function getCurrentCycleDay(
  cycleStart: Date,
  totalDays: number,
  reference: Date = new Date()
): number {
  const t = startOfDay(reference).getTime();
  const s = startOfDay(cycleStart).getTime();
  if (t < s) return 0;
  const diffDays = Math.floor((t - s) / 86400000) + 1;
  if (diffDays > totalDays) return totalDays + 1;
  return diffDays;
}

export function formatTimelineDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getCropCycleMeta(cropName: string): CropCycleMeta {
  const id = resolveCropToTemplateId(cropName);
  return TIMELINE_TEMPLATES[id];
}
