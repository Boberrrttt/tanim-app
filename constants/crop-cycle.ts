/**
 * Growth cycles for UI calendars. Day 1 = planting or field transplant (not seed in tray).
 *
 * Calibrated from public agronomy references (mid-range typical cultivars). Verify against
 * your seed tag, local extension, and climate.
 *
 * References consulted:
 * - Rice: IRRI Rice Knowledge Bank (growth duration by variety class; transplant-to-maturity)
 * - Corn: Purdue Extension / agronomy guides (grain stages; sweet corn ~60–100 d from seed)
 * - Tomato: Cornell Garden-Based Learning, USU Extension (65–85 d from transplant)
 * - Eggplant: Clemson HGIC, MU Extension (≈50–80 d from transplant by cultivar)
 * - Potato: Illinois Extension Hort Answers, regional guides (≈75–120+ d by type)
 * - Cabbage: MSU / SDSU Extension (≈45–90 d from transplant)
 * - Cotton: Cotton.org ACE, UGA extension (≈150–180 d planting to harvest-ready)
 * - Tobacco: FAO crop information, field guides (≈90–120 d transplant to harvest)
 * - Sugarcane: FAO, UF-IFAS EDIS, Growables (plant crop commonly 12–18 mo; ~15 mo norm)
 */

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

const DEFAULT_CYCLE: CropCycleMeta = {
  totalDays: 85,
  phases: [
    { name: 'Establishment', dayStart: 1, dayEnd: 12, description: 'Germination and early root growth' },
    { name: 'Vegetative', dayStart: 13, dayEnd: 38, description: 'Leaf and canopy development' },
    { name: 'Reproductive', dayStart: 39, dayEnd: 58, description: 'Flowering and early fruit or grain set' },
    { name: 'Maturation', dayStart: 59, dayEnd: 78, description: 'Sizing and ripening' },
    { name: 'Harvest', dayStart: 79, dayEnd: 85, description: 'Ready to harvest' },
  ],
  plantingWindowNote: 'Generic template — match days-to-maturity on your seed or transplant label.',
};

const CROP_CYCLES: Record<string, CropCycleMeta> = {
  corn: {
    totalDays: 105,
    phases: [
      { name: 'Emergence', dayStart: 1, dayEnd: 14, description: 'Germination through early leaf stages (VE–V4)' },
      { name: 'Vegetative', dayStart: 15, dayEnd: 58, description: 'Stalk and leaf growth until near tassel' },
      { name: 'Tassel & silk', dayStart: 59, dayEnd: 78, description: 'Pollination window; critical for grain set' },
      { name: 'Grain fill', dayStart: 79, dayEnd: 99, description: 'Kernel dough to dent; moisture still high' },
      { name: 'Maturity', dayStart: 100, dayEnd: 105, description: 'Black layer / harvest moisture for grain corn' },
    ],
    plantingWindowNote:
      'Sweet corn is often shorter (~60–100 d); field/grain hybrids often 100–120+ d — check RM on bag.',
  },
  eggplant: {
    totalDays: 72,
    phases: [
      { name: 'Establishment', dayStart: 1, dayEnd: 12, description: 'Transplant shock recovery and rooting' },
      { name: 'Vegetative', dayStart: 13, dayEnd: 32, description: 'Branching and canopy build' },
      { name: 'Flowering', dayStart: 33, dayEnd: 48, description: 'Bloom and fruit set' },
      { name: 'Fruiting', dayStart: 49, dayEnd: 63, description: 'Fruit enlargement' },
      { name: 'Harvest', dayStart: 64, dayEnd: 72, description: 'Repeated picks as fruits reach market size' },
    ],
    plantingWindowNote: 'Cultivars range ~50–80 d after transplant; warm nights (>15°C) help fruit set.',
  },
  tobacco: {
    totalDays: 110,
    phases: [
      { name: 'Establishment', dayStart: 1, dayEnd: 20, description: 'Rooting after transplant' },
      { name: 'Vegetative', dayStart: 21, dayEnd: 55, description: 'Rapid leaf expansion (grand growth)' },
      { name: 'Topping & suckering', dayStart: 56, dayEnd: 80, description: 'Flower removal and sucker control' },
      { name: 'Ripening', dayStart: 81, dayEnd: 100, description: 'Leaf color and body for curing type' },
      { name: 'Harvest', dayStart: 101, dayEnd: 110, description: 'Priming or stalk harvest per local practice' },
    ],
    plantingWindowNote: 'FAO cites ~90–120 d frost-free after transplant; follow local rules and varieties.',
  },
  rice: {
    totalDays: 120,
    phases: [
      { name: 'Establishment', dayStart: 1, dayEnd: 30, description: 'Tillering and root system development' },
      { name: 'Vegetative', dayStart: 31, dayEnd: 70, description: 'Active tillering; N management critical' },
      { name: 'Reproductive', dayStart: 71, dayEnd: 100, description: 'Panicle initiation through heading' },
      { name: 'Ripening', dayStart: 101, dayEnd: 115, description: 'Grain filling and moisture drop' },
      { name: 'Harvest', dayStart: 116, dayEnd: 120, description: 'Combine or manual at target moisture' },
    ],
    plantingWindowNote:
      'IRRI: short types ~100–120 d, medium ~120–140 d, long 160+ from seeding/transplant — adjust for cultivar.',
  },
  tomato: {
    totalDays: 75,
    phases: [
      { name: 'Establishment', dayStart: 1, dayEnd: 7, description: 'Transplant establishment' },
      { name: 'Vegetative', dayStart: 8, dayEnd: 28, description: 'Vine and leaf growth' },
      { name: 'Flowering', dayStart: 29, dayEnd: 50, description: 'Bloom and fruit set' },
      { name: 'Fruiting', dayStart: 51, dayEnd: 68, description: 'Fruit development and sizing' },
      { name: 'Harvest', dayStart: 69, dayEnd: 75, description: 'First picks; indeterminates keep producing' },
    ],
    plantingWindowNote: 'Packet “days to maturity” is usually from transplant; early types ~65 d, late ~85 d.',
  },
  sugarcane: {
    totalDays: 450,
    phases: [
      { name: 'Germination', dayStart: 1, dayEnd: 60, description: 'Shoot emergence and early tillers' },
      { name: 'Tillering', dayStart: 61, dayEnd: 150, description: 'Stool building; stand establishment' },
      { name: 'Grand growth', dayStart: 151, dayEnd: 300, description: 'Rapid stalk elongation and dry matter' },
      { name: 'Ripening', dayStart: 301, dayEnd: 390, description: 'Sucrose accumulation; avoid late drought stress' },
      { name: 'Harvest', dayStart: 391, dayEnd: 450, description: 'Plant crop ~12–18 mo globally; ratoon resets cycle' },
    ],
    plantingWindowNote:
      'FAO / regional guides: plant crop often 12–18 months (many areas ~15–16 mo optimum age).',
  },
  cabbage: {
    totalDays: 68,
    phases: [
      { name: 'Establishment', dayStart: 1, dayEnd: 12, description: 'Transplant rooting' },
      { name: 'Vegetative', dayStart: 13, dayEnd: 35, description: 'Leaf frame before head' },
      { name: 'Heading', dayStart: 36, dayEnd: 55, description: 'Head formation and firming' },
      { name: 'Maturation', dayStart: 56, dayEnd: 63, description: 'Dense head; watch splitting in heat' },
      { name: 'Harvest', dayStart: 64, dayEnd: 68, description: 'Cut when head is firm' },
    ],
    plantingWindowNote: 'Fast cultivars ~55–65 d from transplant; storage types run longer.',
  },
  cotton: {
    totalDays: 165,
    phases: [
      { name: 'Stand', dayStart: 1, dayEnd: 35, description: 'Emergence through early nodes' },
      { name: 'Squaring', dayStart: 36, dayEnd: 75, description: 'Square formation and vegetative peak' },
      { name: 'Flowering', dayStart: 76, dayEnd: 120, description: 'Bloom, boll set, heat-unit driven' },
      { name: 'Boll fill', dayStart: 121, dayEnd: 155, description: 'Fiber and seed development' },
      { name: 'Harvest', dayStart: 156, dayEnd: 165, description: 'Defoliate when most bolls open; ~150–180 d typical' },
    ],
    plantingWindowNote: 'Industry guides cite ~150–180 d planting to harvest-ready; driven by DD60s and variety.',
  },
  potato: {
    totalDays: 100,
    phases: [
      { name: 'Sprouting', dayStart: 1, dayEnd: 20, description: 'Emergence and stolon setup' },
      { name: 'Vegetative', dayStart: 21, dayEnd: 50, description: 'Canopy closure' },
      { name: 'Tuber initiation', dayStart: 51, dayEnd: 70, description: 'Tuber set; critical moisture' },
      { name: 'Bulking', dayStart: 71, dayEnd: 94, description: 'Tuber enlargement' },
      { name: 'Harvest', dayStart: 95, dayEnd: 100, description: 'Vine senescence; skin set before dig' },
    ],
    plantingWindowNote: 'Early varieties ~75–90 d; maincrop often 90–120 d — check your variety class.',
  },
};

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Example planting date for the calendar: first day of next calendar month.
 * Avoids anchoring every crop to “today”, which is rarely the real plant date.
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

function resolveCropKey(crop: string): string {
  const cropLower = crop.toLowerCase();
  const key = Object.keys(CROP_CYCLES).find((k) => cropLower.includes(k));
  return key ?? 'default';
}

export function getCropCycleMeta(cropName: string): CropCycleMeta {
  const key = resolveCropKey(cropName);
  if (key === 'default') return DEFAULT_CYCLE;
  return CROP_CYCLES[key] ?? DEFAULT_CYCLE;
}
