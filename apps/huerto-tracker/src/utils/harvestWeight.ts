type HarvestWeightData = {
  weightKg?: unknown;
  /** Historical field name; values written by this app are kilograms. */
  weightGrams?: unknown;
  /** Old text field; values were entered in kilograms. */
  weight?: unknown;
  units?: unknown;
  unit?: string;
} | null | undefined;

function finiteNonNegative(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = typeof value === 'string'
    ? Number(value.trim().replace(',', '.'))
    : value;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Returns a harvest mass in kg, including legacy fields that were historically entered in kg. */
export function getHarvestWeightKg(data: HarvestWeightData): number | null {
  if (!data) return null;
  const explicit = finiteNonNegative(data.weightKg);
  if (explicit !== null) return explicit;
  if (data.unit === 'units') return null;
  return finiteNonNegative(data.weightGrams ?? data.weight);
}

/** Returns a separately recorded harvest count without treating it as a mass. */
export function getHarvestUnitCount(data: HarvestWeightData): string | number | null {
  if (!data) return null;
  const value = data.units ?? (data.unit === 'units' ? data.weight : undefined);
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (finiteNonNegative(value) === null) return null;
  return typeof value === 'string' ? value.trim() : value;
}

/** Converts a harvest mass to the integer grams expected by Supabase's harvest_weight_g column. */
export function harvestWeightToGrams(data: HarvestWeightData): number | null {
  const weightKg = getHarvestWeightKg(data);
  return weightKg === null ? null : Math.round(weightKg * 1000);
}
