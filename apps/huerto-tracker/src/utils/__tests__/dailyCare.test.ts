import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasSoilCheckToday, isSeedPlan, getTodayPlant } from '../dailyCare';
import { getNeedsWater } from '../wateringStatus';
import { computePlantsNeedingWater } from '../wateringUtils';
import { CROPS_BY_ID } from '../../data/crops';
import { entryToRow, rowToEntry, plantToRow, rowToPlant } from '../../sync/adapters';
import type { Plant } from '../../models/plant';
import type { DiaryEntry } from '../../models/diary-entry';

const NOW = new Date('2026-09-07T12:00:00');
const plant = (overrides: Partial<Plant> = {}): Plant => ({ id: 'p1', gardenId: 'g1', cropId: 'rabano', name: 'Rábano', status: 'seedling', propagationMethod: 'seed', createdAt: '2026-09-01T12:00:00Z', updatedAt: '2026-09-01T12:00:00Z', ...overrides });
const moist = (overrides: Partial<DiaryEntry> = {}): DiaryEntry => ({ id: 'e1', gardenId: 'g1', plantId: 'p1', type: 'note', date: '2026-09-07', data: { soilCheck: 'moist' }, notes: 'Localized text', createdAt: '2026-09-07T12:00:00Z', updatedAt: '2026-09-07T12:00:00Z', ...overrides });

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());

describe('first plant and daily care', () => {
  it('does not treat yesterday’s moist soil as a new multi-day watering', () => {
    const oldPlant = plant({ sowingDate: '2026-08-01' });
    const yesterday = moist({ date: '2026-09-06' });
    expect(getNeedsWater(oldPlant, CROPS_BY_ID.rabano, [yesterday])).toBe(true);
    expect(computePlantsNeedingWater([oldPlant], [yesterday], NOW)).toHaveLength(1);
  });
  it('ignores deleted or foreign-garden care entries', () => {
    const current = plant({ sowingDate: '2026-08-01' });
    expect(hasSoilCheckToday(current, [moist({ deletedAt: NOW.toISOString() })])).toBe(false);
    expect(hasSoilCheckToday(current, [moist({ gardenId: 'another' })])).toBe(false);
    expect(getNeedsWater(current, CROPS_BY_ID.rabano, [moist({ deletedAt: NOW.toISOString() })])).toBe(true);
  });
  it('does not ask to water a seed plan or schedule its watering', () => {
    const pending = plant();
    expect(isSeedPlan(pending)).toBe(true);
    expect(getNeedsWater(pending, CROPS_BY_ID.rabano, [])).toBe(false);
    expect(computePlantsNeedingWater([pending], [], NOW)).toEqual([]);
  });

  it('does not reinterpret a bought or growing plant without a date as a seed plan', () => {
    expect(isSeedPlan(plant({ propagationMethod: 'bought' }))).toBe(false);
    expect(isSeedPlan(plant({ status: 'growing' }))).toBe(false);
    expect(isSeedPlan(plant({ sowingDate: '2026-09-07' }))).toBe(false);
  });

  it('a moist soil check completes care without fabricating a watering', () => {
    const living = plant({ sowingDate: '2026-08-01' });
    expect(getNeedsWater(living, CROPS_BY_ID.rabano, [])).toBe(true);
    expect(hasSoilCheckToday(living, [moist()])).toBe(true);
    expect(getNeedsWater(living, CROPS_BY_ID.rabano, [moist()])).toBe(false);
    expect(computePlantsNeedingWater([living], [moist()], NOW)).toEqual([]);
    expect(moist().type).toBe('note');
  });

  it('does not complete today from yesterday, another plant or an ordinary note', () => {
    expect(hasSoilCheckToday(plant(), [moist({ date: '2026-09-06' })])).toBe(false);
    expect(hasSoilCheckToday(plant(), [moist({ plantId: 'p2' })])).toBe(false);
    expect(hasSoilCheckToday(plant(), [moist({ data: undefined })])).toBe(false);
  });

  it('recognizes an existing watering today as completed', () => {
    expect(hasSoilCheckToday(plant(), [moist({ type: 'watering', data: undefined })])).toBe(true);
  });

  it('prioritizes active pests, then watering checks, then preparation', () => {
    const pending = plant({ id: 'plan' });
    const thirsty = plant({ id: 'water', sowingDate: '2026-08-01' });
    const pest = plant({ id: 'pest', pestStatus: 'active', sowingDate: '2026-09-06' });
    expect(getTodayPlant([pending, thirsty, pest], CROPS_BY_ID, [])?.id).toBe('pest');
    expect(getTodayPlant([pending, thirsty], CROPS_BY_ID, [])?.id).toBe('water');
  });

  it('moves to the next unchecked plant after care, with stable ordering', () => {
    const done = plant({ sowingDate: '2026-09-07' });
    const next = plant({ id: 'p2', sowingDate: '2026-09-07' });
    expect(getTodayPlant([done, next], CROPS_BY_ID, [moist()])?.id).toBe('p2');
    expect(getTodayPlant([next, done], CROPS_BY_ID, [moist()])?.id).toBe('p2');
  });

  it('never prioritizes or schedules a finished plant', () => {
    const finished = plant({ status: 'finished', sowingDate: '2026-08-01', pestStatus: 'active' });
    expect(getTodayPlant([finished], CROPS_BY_ID, [])).toBeUndefined();
    expect(getNeedsWater(finished, CROPS_BY_ID.rabano, [])).toBe(false);
    expect(computePlantsNeedingWater([finished], [], NOW)).toEqual([]);
  });

  it('preserves the language-independent soil check through existing sync adapters', () => {
    const restored = rowToEntry(entryToRow(moist(), 'user'));
    expect(restored.data).toEqual({ soilCheck: 'moist' });
    expect(hasSoilCheckToday(plant(), [restored])).toBe(true);
  });

  it('preserves an unsown plan through existing plant sync adapters', () => {
    const restored = rowToPlant(plantToRow(plant(), 'user'));
    expect(restored.sowingDate).toBeUndefined();
    expect(isSeedPlan(restored)).toBe(true);
  });
});
