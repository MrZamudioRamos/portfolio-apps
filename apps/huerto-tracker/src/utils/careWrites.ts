import { createStore } from '@portfolio/storage';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import { hasSoilCheckToday, isSeedPlan } from './dailyCare';
import { todayStr } from './dateStr';

const plants = createStore<Plant>('plants');
const diary = createStore<DiaryEntry>('diary_entries');
// Share the lock across mounted care cards and quick-log dialogs.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(write: () => Promise<T>): Promise<T> {
  const result = queue.then(write, write);
  queue = result.catch(() => {});
  return result;
}

export function createPlantWithSowing(data: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plant> {
  return serial(async () => {
    const plant = await plants.create(data);
    try {
      if (plant.sowingDate && (plant.propagationMethod ?? 'seed') === 'seed') {
        await diary.create({ gardenId: plant.gardenId, plantId: plant.id, type: 'sowing', date: plant.sowingDate });
      }
    } catch (error) {
      // Tombstones also undo any partial row already observed by sync.
      await plants.softRemove(plant.id);
      throw error;
    }
    return plant;
  });
}

export function recordCare(plantId: string, kind: 'watering' | 'moist' | 'sowing', moistNote = '', extraData?: Record<string, unknown>) {
  return serial(async () => {
    const plant = await plants.getById(plantId);
    if (!plant || plant.deletedAt || plant.status === 'finished') throw new Error('Plant unavailable');
    const date = todayStr();
    const latest = (await diary.getAll()).filter(e => !e.deletedAt);
    if (kind === 'sowing') {
      if (!isSeedPlan(plant)) return false;
      const existing = latest.find(e => e.plantId === plant.id && e.type === 'sowing');
      const entry = existing ?? await diary.create({ gardenId: plant.gardenId, plantId, type: 'sowing', date });
      try {
        if (!await plants.update(plantId, { sowingDate: entry.date })) throw new Error('Plant unavailable');
      } catch (error) {
        if (!existing) await diary.softRemove(entry.id);
        throw error;
      }
      return true;
    }
    if (isSeedPlan(plant)) throw new Error('Confirm sowing first');
    if (hasSoilCheckToday(plant, latest, date)) return false;
    await diary.create({ gardenId: plant.gardenId, plantId, date,
      type: kind === 'moist' ? 'note' : 'watering',
      ...(kind === 'moist' ? { notes: moistNote, data: { soilCheck: 'moist' as const } } : extraData ? { data: extraData } : {}) });
    return true;
  });
}

export function recordQuickEntry(data: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  return serial(async () => {
    const plant = data.plantId ? await plants.getById(data.plantId) : null;
    if (!plant || plant.deletedAt) throw new Error('Plant unavailable');
    if (data.type === 'watering' && isSeedPlan(plant)) throw new Error('Confirm sowing first');
    const entry = await diary.create({ ...data, gardenId: plant.gardenId });
    try {
      if (data.type === 'pest' && !await plants.update(plant.id, { pestStatus: 'active' })) throw new Error('Plant unavailable');
    } catch (error) {
      await diary.softRemove(entry.id);
      throw error;
    }
    return entry;
  });
}
