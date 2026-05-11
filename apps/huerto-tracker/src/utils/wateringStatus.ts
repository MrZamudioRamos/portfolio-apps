import type { CropInfo } from '../data/crops';
import type { DiaryEntry } from '../models/diary-entry';
import type { Plant } from '../models/plant';

const WATER_THRESHOLD_DAYS: Record<CropInfo['waterNeeds'], number> = {
  high: 2,
  medium: 4,
  low: 7,
};

export function getNeedsWater(
  plant: Plant,
  crop: CropInfo | undefined,
  entries: DiaryEntry[]
): boolean {
  if (!crop) return false;
  if (plant.status === 'finished') return false;

  const threshold = WATER_THRESHOLD_DAYS[crop.waterNeeds];
  const plantWaterings = entries
    .filter((e) => e.plantId === plant.id && e.type === 'watering')
    .map((e) => e.date)
    .sort()
    .reverse();

  if (plantWaterings.length === 0) {
    // Never watered — check against sowing date
    if (!plant.sowingDate) return true;
    const sow = new Date(plant.sowingDate);
    const daysSinceSow = (Date.now() - sow.getTime()) / 86_400_000;
    return daysSinceSow >= threshold;
  }

  const lastWatered = new Date(plantWaterings[0] + 'T12:00:00');
  const daysSince = (Date.now() - lastWatered.getTime()) / 86_400_000;
  return daysSince >= threshold;
}

export function getWateringNeedsCount(
  plants: Plant[],
  cropById: Record<string, CropInfo>,
  entries: DiaryEntry[]
): number {
  return plants.filter((p) => getNeedsWater(p, cropById[p.cropId], entries)).length;
}
