import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Plant } from '../../models/plant';
import type { DiaryEntry } from '../../models/diary-entry';

const db = vi.hoisted(() => ({ plants: [] as Plant[], diary_entries: [] as DiaryEntry[], failDiary: false, failPlantUpdate: false, next: 0 }));
vi.mock('@portfolio/storage', () => ({ createStore: (key: 'plants' | 'diary_entries') => ({
  getAll: async () => structuredClone(db[key]),
  getById: async (id: string) => structuredClone(db[key].find(row => row.id === id) ?? null),
  create: async (data: object) => {
    if (key === 'diary_entries' && db.failDiary) { db.failDiary = false; throw new Error('disk write failed'); }
    const item = { ...data, id: String(++db.next), createdAt: '2026-09-09', updatedAt: '2026-09-09' };
    (db[key] as object[]).push(item); return structuredClone(item);
  },
  update: async (id: string, data: object) => {
    if (key === 'plants' && db.failPlantUpdate) { db.failPlantUpdate = false; throw new Error('disk write failed'); }
    const item = db[key].find(row => row.id === id); if (!item) return null;
    Object.assign(item, data); return structuredClone(item);
  },
  softRemove: async (id: string) => { const item = db[key].find(row => row.id === id); if (item) item.deletedAt = '2026-09-09'; },
}) }));
import { createPlantWithSowing, recordCare, recordQuickEntry } from '../careWrites';
const data = { gardenId: 'g', cropId: 'rabano', name: 'Test', status: 'seedling' as const, propagationMethod: 'seed' as const };
const live = () => db.diary_entries.filter(row => !row.deletedAt);
beforeEach(() => { db.plants = []; db.diary_entries = []; db.failDiary = false; db.failPlantUpdate = false; });
describe('care write recovery', () => {
  it('creates a plan without any diary entry', async () => {
    const plan = await createPlantWithSowing(data);
    expect(plan.sowingDate).toBeUndefined(); expect(live()).toHaveLength(0);
  });
  it('rolls back the plant if its sowing entry fails, then retries once', async () => {
    db.failDiary = true;
    await expect(createPlantWithSowing({ ...data, sowingDate: '2026-09-04' })).rejects.toThrow();
    expect(db.plants.filter(row => !row.deletedAt)).toHaveLength(0);
    await createPlantWithSowing({ ...data, sowingDate: '2026-09-04' });
    expect(db.plants.filter(row => !row.deletedAt)).toHaveLength(1);
    expect(live().map(row => row.date)).toEqual(['2026-09-04']);
  });
  it('does not invent a sowing entry for a bought plant', async () => {
    await createPlantWithSowing({ ...data, propagationMethod: 'bought', sowingDate: '2026-09-04' });
    expect(live()).toHaveLength(0);
  });
  it('rolls back a sowing confirmation if the plant update fails', async () => {
    const plan = await createPlantWithSowing(data); db.failPlantUpdate = true;
    await expect(recordCare(plan.id, 'sowing')).rejects.toThrow();
    expect(live()).toHaveLength(0); expect(db.plants[0].sowingDate).toBeUndefined();
    await recordCare(plan.id, 'sowing'); expect(live()).toHaveLength(1);
  });
  it('serializes two simultaneous confirmations from separate cards', async () => {
    const plan = await createPlantWithSowing(data);
    expect(await Promise.all([recordCare(plan.id, 'sowing'), recordCare(plan.id, 'sowing')])).toEqual([true, false]);
    expect(live()).toHaveLength(1);
  });
  it('stores one moist note under repeated taps and no fictitious watering', async () => {
    const plant = await createPlantWithSowing({ ...data, sowingDate: '2026-09-04' });
    expect(await Promise.all([recordCare(plant.id, 'moist'), recordCare(plant.id, 'moist')])).toEqual([true, false]);
    expect(live().filter(row => row.type === 'watering')).toHaveLength(0);
    expect(live().filter(row => row.type === 'note')).toHaveLength(1);
  });
  it('keeps bulk-watering metadata while respecting the same daily guard', async () => {
    const plant = await createPlantWithSowing({ ...data, sowingDate: '2026-09-04' });
    expect(await recordCare(plant.id, 'watering', '', { liters: '1.5', method: 'drip' })).toBe(true);
    expect(await recordCare(plant.id, 'watering', '', { liters: '1.5', method: 'drip' })).toBe(false);
    expect(live().filter(row => row.type === 'watering')).toEqual([
      expect.objectContaining({ data: { liters: '1.5', method: 'drip' } }),
    ]);
  });
  it('rejects watering a plan and a deleted plant', async () => {
    const plan = await createPlantWithSowing(data);
    await expect(recordCare(plan.id, 'watering')).rejects.toThrow();
    db.plants[0].deletedAt = '2026-09-09';
    await expect(recordCare(plan.id, 'sowing')).rejects.toThrow();
    expect(live()).toHaveLength(0);
  });
  it('rolls back quick pest entries on failure and uses the plant garden', async () => {
    const plant = await createPlantWithSowing(data); db.failPlantUpdate = true;
    const entry = { gardenId: 'wrong', plantId: plant.id, type: 'pest' as const, date: '2026-09-09' };
    await expect(recordQuickEntry(entry)).rejects.toThrow(); expect(live()).toHaveLength(0);
    await recordQuickEntry(entry); expect(live()[0].gardenId).toBe('g'); expect(db.plants[0].pestStatus).toBe('active');
  });
});
