/**
 * Normalized RSL **Crops Planted** labels → timeline template id.
 * Typos from the workbook (Coonut, Ampalya, Radush) normalize before lookup.
 */

export type TimelineTemplateId =
  | 'DEFAULT'
  | 'CEREAL'
  | 'RICE'
  | 'WHEAT'
  | 'TOMATO'
  | 'EGGPLANT'
  | 'POTATO'
  | 'CABBAGE'
  | 'COTTON'
  | 'TOBACCO'
  | 'SUGARCANE'
  | 'CUCURBIT'
  | 'LEAFY'
  | 'LEGUME'
  | 'OKRA'
  | 'ROOT_BULB'
  | 'GINGER'
  | 'CAMOTE'
  | 'CASSAVA'
  | 'STRAWBERRY'
  | 'PINEAPPLE'
  | 'ADLAI'
  | 'FORAGE_GRASS'
  | 'PERENNIAL_YEAR1';

/** Trim, lowercase, collapse spaces; fix known RSL typos. */
export function normalizeCropLabel(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (s === 'coonut') s = 'coconut';
  if (s === 'ampalya') s = 'ampalaya';
  if (s === 'radush') s = 'radish';
  return s;
}

function m(entries: [string, TimelineTemplateId][]): Record<string, TimelineTemplateId> {
  const out: Record<string, TimelineTemplateId> = {};
  for (const [k, v] of entries) {
    out[normalizeCropLabel(k)] = v;
  }
  return out;
}

const ALIAS_ENTRIES: [string, TimelineTemplateId][] = [
  // DEFAULT
  ['Algae', 'DEFAULT'],
  ['Banguhan', 'DEFAULT'],
  ['Buckwheat', 'DEFAULT'],
  ['Celery', 'DEFAULT'],
  ['Flowering Plants', 'DEFAULT'],
  ['Herbs', 'DEFAULT'],
  ['Test Data', 'DEFAULT'],
  ['Vegetables', 'DEFAULT'],
  ['Wild daisy', 'DEFAULT'],

  // CEREAL
  ['Corn', 'CEREAL'],
  ['Maize', 'CEREAL'],
  ['Millet', 'CEREAL'],
  ['Sorghum', 'CEREAL'],

  // RICE
  ['Rice (Lowland)', 'RICE'],
  ['Rice (Upland)', 'RICE'],
  ['Rice', 'RICE'],

  // API / model parity
  ['Wheat', 'WHEAT'],
  ['Cotton', 'COTTON'],

  // TOMATO family (solanaceous fruit veg)
  ['Tomato', 'TOMATO'],
  ['Bell Pepper', 'TOMATO'],
  ['Chili Pepper', 'TOMATO'],
  ['Sweet Pepper', 'TOMATO'],

  ['Eggplant', 'EGGPLANT'],
  ['Potato', 'POTATO'],

  ['Broccoli', 'CABBAGE'],
  ['Cabbage', 'CABBAGE'],
  ['Cabbage (Chinese)', 'CABBAGE'],

  ['Tobacco', 'TOBACCO'],
  ['Sugarcane', 'SUGARCANE'],

  ['Ampalaya', 'CUCURBIT'],
  ['Chayote', 'CUCURBIT'],
  ['Cucumber', 'CUCURBIT'],
  ['Muskmelon (Cantaloupe)', 'CUCURBIT'],
  ['Patola', 'CUCURBIT'],
  ['Squash', 'CUCURBIT'],
  ['Watermelon', 'CUCURBIT'],

  ['Alugbati', 'LEAFY'],
  ['Basil', 'LEAFY'],
  ['Kangkong', 'LEAFY'],
  ['Lettuce', 'LEAFY'],

  ['Baguio Beans', 'LEGUME'],
  ['Beans (Soybean)', 'LEGUME'],
  ['Beans (Soybeans)', 'LEGUME'],
  ['Beans (String Beans)', 'LEGUME'],
  ['Beans (String beans)', 'LEGUME'],
  ['Beans (Stringbeans)', 'LEGUME'],
  ['Cowpea', 'LEGUME'],
  ['Mongo (Mungbean)', 'LEGUME'],
  ['Peanut', 'LEGUME'],
  ['Peas', 'LEGUME'],
  ['Sitao', 'LEGUME'],

  ['Okra', 'OKRA'],

  ['Carrots', 'ROOT_BULB'],
  ['Onion', 'ROOT_BULB'],
  ['Radish', 'ROOT_BULB'],

  ['Ginger', 'GINGER'],

  ['Camote (Sweet Potato)', 'CAMOTE'],
  ['Gabi', 'CAMOTE'],

  ['Cassava', 'CASSAVA'],
  ['Strawberry', 'STRAWBERRY'],
  ['Pineapple', 'PINEAPPLE'],
  ['Adlai', 'ADLAI'],

  ['Alfalfa', 'FORAGE_GRASS'],
  ['Arachis Pintoi', 'FORAGE_GRASS'],
  ['Gatton', 'FORAGE_GRASS'],
  ['Grass (Pasture)', 'FORAGE_GRASS'],
  ['Green Panic', 'FORAGE_GRASS'],
  ['Mombasa (Forage)', 'FORAGE_GRASS'],
  ['Mombasa Grass', 'FORAGE_GRASS'],
  ['Mulato Grass', 'FORAGE_GRASS'],
  ['Napier', 'FORAGE_GRASS'],

  // PERENNIAL_YEAR1 (illustrative)
  ['Abaca', 'PERENNIAL_YEAR1'],
  ['Acacia', 'PERENNIAL_YEAR1'],
  ['Avocado', 'PERENNIAL_YEAR1'],
  ['Bamboo', 'PERENNIAL_YEAR1'],
  ['Banana', 'PERENNIAL_YEAR1'],
  ['Caimito (Star Apple)', 'PERENNIAL_YEAR1'],
  ['Cacao', 'PERENNIAL_YEAR1'],
  ['Calamansi', 'PERENNIAL_YEAR1'],
  ['Coconut', 'PERENNIAL_YEAR1'],
  ['Coffee', 'PERENNIAL_YEAR1'],
  ['Dragonfruit', 'PERENNIAL_YEAR1'],
  ['Durian', 'PERENNIAL_YEAR1'],
  ['Falcata', 'PERENNIAL_YEAR1'],
  ['Forest Trees', 'PERENNIAL_YEAR1'],
  ['Gmelina', 'PERENNIAL_YEAR1'],
  ['Golden Tree', 'PERENNIAL_YEAR1'],
  ['Grapes', 'PERENNIAL_YEAR1'],
  ['Guyabano', 'PERENNIAL_YEAR1'],
  ['Jackfruit', 'PERENNIAL_YEAR1'],
  ['Lanzones', 'PERENNIAL_YEAR1'],
  ['Mahogany', 'PERENNIAL_YEAR1'],
  ['Mango', 'PERENNIAL_YEAR1'],
  ['Mangrove', 'PERENNIAL_YEAR1'],
  ['Mulberry', 'PERENNIAL_YEAR1'],
  ['Ornamental', 'PERENNIAL_YEAR1'],
  ['Palm', 'PERENNIAL_YEAR1'],
  ['Papaya', 'PERENNIAL_YEAR1'],
  ['Pine Tree', 'PERENNIAL_YEAR1'],
  ['Rambutan', 'PERENNIAL_YEAR1'],
  ['River tamarind', 'PERENNIAL_YEAR1'],
  ['Rubber', 'PERENNIAL_YEAR1'],
  ['Tea', 'PERENNIAL_YEAR1'],
];

export const CROP_LABEL_TO_TEMPLATE: Record<string, TimelineTemplateId> = m(ALIAS_ENTRIES);

export function resolveCropToTemplateId(cropName: string): TimelineTemplateId {
  const key = normalizeCropLabel(cropName);
  return CROP_LABEL_TO_TEMPLATE[key] ?? 'DEFAULT';
}
