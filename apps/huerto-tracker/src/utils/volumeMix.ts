export const VOLUME_MIX_PRESET_IDS = ['aromatic', 'leafy', 'fruiting'] as const;
export type VolumeMixPresetId = (typeof VOLUME_MIX_PRESET_IDS)[number];

export type VolumeMixRecipe = {
  presetId: VolumeMixPresetId;
  volumeText: string;
};

export type VolumeMixResult = {
  totalLiters: number;
  substrateLiters: number;
  perliteLiters: number;
  substratePercent: 80;
  aerationPercent: 20;
};

export type VolumeMixStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const DEFAULT_VOLUME_MIX_RECIPE: VolumeMixRecipe = {
  presetId: 'fruiting',
  volumeText: '20',
};

export function sanitizeVolumeInput(value: string): string {
  const filtered = value.replace(/[^\d.,]/g, '');
  const separatorIndex = filtered.search(/[.,]/);
  if (separatorIndex < 0) return filtered;
  const first = filtered.slice(0, separatorIndex + 1);
  const rest = filtered.slice(separatorIndex + 1).replace(/[.,]/g, '');
  return first + rest;
}

export function parseVolumeLiters(volumeText: string): number | null {
  const normalized = volumeText.trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const volume = Number(normalized);
  return Number.isFinite(volume) && volume > 0 ? volume : null;
}

function roundToHundredth(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateVolumeMix(volumeText: string): VolumeMixResult | null {
  const totalLiters = parseVolumeLiters(volumeText);
  if (totalLiters === null) return null;

  return {
    totalLiters,
    substrateLiters: roundToHundredth(totalLiters * 0.8),
    perliteLiters: roundToHundredth(totalLiters * 0.2),
    substratePercent: 80,
    aerationPercent: 20,
  };
}

function isVolumeMixRecipe(value: unknown): value is VolumeMixRecipe {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<VolumeMixRecipe>;
  return VOLUME_MIX_PRESET_IDS.includes(candidate.presetId as VolumeMixPresetId)
    && typeof candidate.volumeText === 'string'
    && parseVolumeLiters(candidate.volumeText) !== null;
}

function keyForGarden(gardenId: string): string {
  return `@huerto/volume-mix/${encodeURIComponent(gardenId.trim())}`;
}

export async function loadVolumeMixRecipe(
  gardenId: string | null | undefined,
  storage: VolumeMixStorage,
): Promise<VolumeMixRecipe | null> {
  const id = gardenId?.trim();
  if (!id) return null;
  const serialized = await storage.getItem(keyForGarden(id));
  if (!serialized) return null;
  try {
    const parsed: unknown = JSON.parse(serialized);
    return isVolumeMixRecipe(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveVolumeMixRecipe(
  gardenId: string | null | undefined,
  recipe: VolumeMixRecipe,
  storage: VolumeMixStorage,
): Promise<void> {
  const id = gardenId?.trim();
  if (!id) throw new Error('An active garden is required to save a substrate mix.');
  if (!isVolumeMixRecipe(recipe)) throw new Error('The substrate mix is invalid.');
  await storage.setItem(keyForGarden(id), JSON.stringify(recipe));
}
