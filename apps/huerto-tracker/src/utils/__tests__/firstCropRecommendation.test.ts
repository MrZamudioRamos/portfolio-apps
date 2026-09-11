import { describe, expect, it } from 'vitest';
import { getFirstCropRecommendations } from '../firstCropRecommendation';
import type { CropInfo } from '../../data/crops';

const crop = (id: string, sunNeeds: CropInfo['sunNeeds'], months: number[], days: number, difficulty: CropInfo['category'] = 'hojas'): CropInfo => ({
  id, name: id, emoji: '🌱', category: difficulty,
  sowingMonths: { atlantica: months, continental: months, mediterranea: months, subtropical: months },
  harvestMonths: { atlantica: [], continental: [], mediterranea: [], subtropical: [] },
  daysToHarvest: [days, days + 5], sunNeeds, waterNeeds: 'low', spacing: 10, companions: [], incompatible: [], tips: '',
});

describe('getFirstCropRecommendations', () => {
  it('keeps December preparation in January and remains deterministic', () => {
    const input = { climateZone: 'continental' as const, month: 12, sunlight: 'partial' as const, crops: [crop('a', 'shade', [1], 30), crop('b', 'shade', [1], 30)] };
    const result = getFirstCropRecommendations(input);
    expect(result.map((item) => item.crop.id)).toEqual(['a', 'b']);
    expect(result.every((item) => item.action === 'prepare')).toBe(true);
    expect(getFirstCropRecommendations({ ...input, crops: [...input.crops].reverse() })).toEqual(result);
  });
  it('never recommends a crop requiring more light than declared', () => {
    const result = getFirstCropRecommendations({ climateZone: 'mediterranea', month: 3, sunlight: 'shade', crops: [crop('shade', 'shade', [3], 30), crop('full', 'full', [3], 20)] });
    expect(result).toHaveLength(1);
    expect(result[0].crop.id).toBe('shade');
  });

  it('caps results at three and exposes score, action and reasons', () => {
    const result = getFirstCropRecommendations({ climateZone: 'mediterranea', month: 3, sunlight: 'full', crops: ['a', 'b', 'c', 'd'].map((id) => crop(id, 'shade', [3], 30)) });
    expect(result).toHaveLength(3);
    expect(result[0].action).toBe('sow');
    expect(result[0].score).toBeGreaterThan(0);
    expect(result[0].reasons).toContain('seasonNow');
  });

  it('offers a preparation action for the next sowing window', () => {
    const result = getFirstCropRecommendations({ climateZone: 'mediterranea', month: 3, sunlight: 'full', crops: [crop('soon', 'shade', [4], 30)] });
    expect(result[0].action).toBe('prepare');
    expect(result[0].reasons).toContain('seasonSoon');
  });

  it('excludes crops without a defined container fit in balcony space', () => {
    const result = getFirstCropRecommendations({ climateZone: 'mediterranea', month: 3, sunlight: 'full', space: 'balcony', crops: [crop('unknown-container', 'shade', [3], 30)] });
    expect(result).toEqual([]);
  });

  it('uses an optional crop preference to reorder compatible results', () => {
    const result = getFirstCropRecommendations({
      climateZone: 'mediterranea',
      month: 3,
      sunlight: 'full',
      preferredCategories: ['frutas'],
      crops: [crop('a-hojas', 'shade', [3], 30, 'hojas'), crop('z-fruta', 'shade', [3], 30, 'frutas')],
    });
    expect(result[0].crop.id).toBe('z-fruta');
    expect(result[0].reasons).toContain('preference');
  });
});
