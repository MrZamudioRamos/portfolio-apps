import { describe, expect, it } from 'vitest';
import { buildAbsencePlan } from '../absencePlan';
import type { CropInfo } from '../../data/crops';
import type { Plant } from '../../models/plant';

const plant = (id: string, cropId: string): Plant => ({
  id,
  gardenId: 'garden',
  cropId,
  name: id,
  status: 'growing',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const crop = (id: string, waterNeeds: CropInfo['waterNeeds']): CropInfo => ({
  id,
  name: id,
  emoji: '🌱',
  category: 'hojas',
  sowingMonths: { atlantica: [], continental: [], mediterranea: [], subtropical: [] },
  harvestMonths: { atlantica: [], continental: [], mediterranea: [], subtropical: [] },
  daysToHarvest: [30, 40],
  sunNeeds: 'partial',
  waterNeeds,
  spacing: 10,
  companions: [],
  incompatible: [],
  tips: '',
});

describe('buildAbsencePlan', () => {
  it('prioritizes frequent watering and flags unattended trips', () => {
    const result = buildAbsencePlan([plant('tomate', 'tomate'), plant('romero', 'romero')], { tomate: crop('tomate', 'high'), romero: crop('romero', 'low') }, 7, false);
    expect(result.plans[0].plant.id).toBe('tomate');
    expect(result.plans[0].visitsNeeded).toBe(6);
    expect(result.plans[0].risk).toBe('high');
    expect(result.needsHelp).toBe(true);
  });

  it('lowers risk when a helper is available', () => {
    const result = buildAbsencePlan([plant('lechuga', 'lechuga')], { lechuga: crop('lechuga', 'medium') }, 7, true);
    expect(result.plans[0].visitsNeeded).toBe(3);
    expect(result.plans[0].risk).toBe('low');
    expect(result.needsHelp).toBe(false);
  });
});
