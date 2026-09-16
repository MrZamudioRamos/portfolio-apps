import { describe, expect, it } from 'vitest';
import { buildCarePlan } from '../carePlan';
import type { CropInfo } from '../../data/crops';
import type { Plant } from '../../models/plant';
import type { DiaryEntry } from '../../models/diary-entry';

const crop: CropInfo = {
  id: 'tomate', name: 'Tomate', emoji: '🍅', category: 'frutas',
  sowingMonths: {} as CropInfo['sowingMonths'], harvestMonths: {} as CropInfo['harvestMonths'],
  daysToHarvest: [60, 80], sunNeeds: 'full', waterNeeds: 'high', spacing: 60,
  companions: [], incompatible: [], tips: '',
};

const plant = (overrides: Partial<Plant> = {}): Plant => ({
  id: 'p1', gardenId: 'g1', cropId: 'tomate', name: 'Tomate del balcón', status: 'growing',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  sowingDate: '2026-09-01', ...overrides,
});

const entry = (overrides: Partial<DiaryEntry>): DiaryEntry => ({
  id: 'e1', gardenId: 'g1', plantId: 'p1', type: 'watering', date: '2026-09-10',
  createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z', ...overrides,
});

describe('buildCarePlan', () => {
  it('prioritizes overdue watering and active pests', () => {
    const tasks = buildCarePlan(
      [plant({ pestStatus: 'active' })],
      { tomate: crop },
      [entry({ date: '2026-09-08' })],
      new Date('2026-09-13T10:00:00'),
    );

    expect(tasks[0]?.kind).toBe('water');
    expect(tasks.some((task) => task.kind === 'pest' && task.priority === 'today')).toBe(true);
    expect(tasks[0]?.dueDate).toBe('2026-09-10');
  });

  it('turns plant dates into upcoming transplant and harvest actions', () => {
    const tasks = buildCarePlan(
      [plant({ id: 'p2', status: 'seedling', sowingDate: '2026-08-05', firstHarvestDate: '2026-09-18' })],
      { tomate: crop },
      [],
      new Date('2026-09-13T10:00:00'),
    );

    expect(tasks.some((task) => task.kind === 'transplant' && task.dueDate === '2026-09-16')).toBe(true);
    expect(tasks.some((task) => task.kind === 'harvest' && task.dueDate === '2026-09-18')).toBe(true);
  });
});

