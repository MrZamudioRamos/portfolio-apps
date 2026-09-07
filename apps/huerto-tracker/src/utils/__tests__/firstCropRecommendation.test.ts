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
});
