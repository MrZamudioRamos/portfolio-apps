import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import type { CropInfo } from '../data/crops';
import { getNeedsWater } from './wateringStatus';
import { todayStr } from './dateStr';

export function isSeedPlan(plant: Plant): boolean {
  return plant.status === 'seedling' && !plant.sowingDate && (plant.propagationMethod ?? 'seed') === 'seed';
}

export function hasSoilCheckToday(plant: Plant, entries: DiaryEntry[], today = todayStr()): boolean {
  return entries.some((entry) => !entry.deletedAt && entry.gardenId === plant.gardenId && entry.plantId === plant.id && entry.date === today &&
    (entry.type === 'watering' || (entry.type === 'note' && entry.data && 'soilCheck' in entry.data && entry.data.soilCheck === 'moist')));
}

/** One stable priority, without interpreting a watering estimate as a diagnosis. */
export function getTodayPlant(plants: Plant[], crops: Record<string, CropInfo>, entries: DiaryEntry[]): Plant | undefined {
  const priority = (plant: Plant) => {
    if (plant.pestStatus === 'active') return 0;
    if (getNeedsWater(plant, crops[plant.cropId], entries)) return 1;
    if (isSeedPlan(plant)) return 2;
    if (!hasSoilCheckToday(plant, entries)) return 3;
    return 4;
  };
  return plants.filter((plant) => !plant.deletedAt && plant.status !== 'finished')
    .sort((a, b) => priority(a) - priority(b) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
}
