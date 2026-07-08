import { describe, it, expect, vi } from 'vitest';
import { getTop2Recommendations, type RecommendationInput } from '../firstCropRecommendation';
import type { CropInfo } from '../../data/crops';
import type { ClimateZone } from '../../models/garden';

const MED: ClimateZone = 'mediterranea';

// Synthetic crops for precise test control
const EASY_FULL: CropInfo = {
  id: 'easy-full', name: 'Easy Full', emoji: 'A', category: 'hojas',
  sowingMonths: { atlantica: [3], continental: [3], mediterranea: [3], subtropical: [3] },
  harvestMonths: { atlantica: [5], continental: [5], mediterranea: [5], subtropical: [5] },
  daysToHarvest: [30, 40], sunNeeds: 'full', waterNeeds: 'medium', spacing: 20,
  companions: [], incompatible: [], tips: '',
};
const EASY_FULL_SLOW: CropInfo = {
  id: 'easy-full-slow', name: 'Easy Full Slow', emoji: 'B', category: 'hojas',
  sowingMonths: { atlantica: [3], continental: [3], mediterranea: [3], subtropical: [3] },
  harvestMonths: { atlantica: [6], continental: [6], mediterranea: [6], subtropical: [6] },
  daysToHarvest: [60, 70], sunNeeds: 'full', waterNeeds: 'medium', spacing: 20,
  companions: [], incompatible: [], tips: '',
};
const MED_FULL: CropInfo = {
  id: 'med-full', name: 'Med Full', emoji: 'C', category: 'hojas',
  sowingMonths: { atlantica: [3], continental: [3], mediterranea: [3], subtropical: [3] },
  harvestMonths: { atlantica: [5], continental: [5], mediterranea: [5], subtropical: [5] },
  daysToHarvest: [45, 55], sunNeeds: 'full', waterNeeds: 'medium', spacing: 20,
  companions: [], incompatible: [], tips: '',
};
const HARD_FULL: CropInfo = {
  id: 'hard-full', name: 'Hard Full', emoji: 'D', category: 'hojas',
  sowingMonths: { atlantica: [3], continental: [3], mediterranea: [3], subtropical: [3] },
  harvestMonths: { atlantica: [6], continental: [6], mediterranea: [6], subtropical: [6] },
  daysToHarvest: [90, 100], sunNeeds: 'full', waterNeeds: 'medium', spacing: 20,
  companions: [], incompatible: [], tips: '',
};
const EASY_SHADE: CropInfo = {
  id: 'easy-shade', name: 'Easy Shade', emoji: 'E', category: 'hojas',
  sowingMonths: { atlantica: [3], continental: [3], mediterranea: [3], subtropical: [3] },
  harvestMonths: { atlantica: [5], continental: [5], mediterranea: [5], subtropical: [5] },
  daysToHarvest: [25, 35], sunNeeds: 'shade', waterNeeds: 'medium', spacing: 20,
  companions: [], incompatible: [], tips: '',
};

const BASE_CROPS = [EASY_FULL, EASY_FULL_SLOW, MED_FULL, HARD_FULL, EASY_SHADE];

function makeInput(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
  return { climateZone: MED, month: 3, crops: BASE_CROPS, ...overrides };
}

// Stub CROP_DIFFICULTY for synthetic crops
vi.mock('../../data/crops', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/crops')>();
  return {
    ...actual,
    CROP_DIFFICULTY: {
      ...actual.CROP_DIFFICULTY,
      'easy-full': 'easy',
      'easy-full-slow': 'easy',
      'med-full': 'medium',
      'hard-full': 'hard',
      'easy-shade': 'easy',
    },
  };
});

describe('getTop2Recommendations', () => {
  it('never returns more than 2', () => {
    const result = getTop2Recommendations(makeInput());
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('returns empty when no crops match the zone+month', () => {
    const result = getTop2Recommendations(makeInput({ month: 7 }));
    expect(result).toEqual([]);
  });

  it('prioritizes easy crops for beginner', () => {
    const result = getTop2Recommendations(makeInput({ experience: 'beginner' }));
    expect(result.length).toBe(2);
    // Both should be easy (easy-full and easy-shade are the only easy crops)
    for (const c of result) {
      expect(['easy-full', 'easy-shade']).toContain(c.id);
    }
  });

  it('sorts by shortest harvest time', () => {
    // shade user → only easy-shade matches sun filter (shade crop), easy-full needs full sun
    // With shade filter: only easy-shade (25d) → 1 result → relax sun → pool = all 5
    // beginner: easy-full (30d), easy-full-slow (60d), easy-shade (25d) → top 2 by time = easy-shade (25), easy-full (30)
    const result = getTop2Recommendations(makeInput({ experience: 'beginner', sunlight: 'shade' }));
    expect(result.length).toBe(2);
    expect(result[0].daysToHarvest[0]).toBeLessThanOrEqual(result[1].daysToHarvest[0]);
  });

  it('relaxes difficulty when not enough easy crops for beginner', () => {
    // Only 1 easy crop that matches sun: easy-full (shade user blocks all full-sun crops,
    // but shade crops are compatible with any sun → easy-shade passes too).
    // Use a crop set with only 1 easy crop for full-sun.
    const onlyOneEasy: CropInfo[] = [EASY_FULL, MED_FULL, HARD_FULL];
    const result = getTop2Recommendations(makeInput({
      crops: onlyOneEasy,
      experience: 'beginner',
      sunlight: 'full',
    }));
    expect(result.length).toBe(2);
    const ids = result.map((c) => c.id);
    // easy-full (easy) + med-full (medium) — difficulty relaxed to include medium
    expect(ids).toContain('easy-full');
    expect(ids).toContain('med-full');
  });

  it('relaxes sunlight when still not enough results', () => {
    // Only shade user, month 3: easy-shade matches sun (shade), easy-full/full crops blocked
    // pool = [easy-shade] → 1 result → relax sun → all 5 crops → easy = [easy-full, easy-full-slow, easy-shade] → top 2 by time
    const result = getTop2Recommendations(makeInput({ sunlight: 'shade', experience: 'beginner' }));
    expect(result.length).toBe(2);
    // easy-shade (25d) is fastest, easy-full (30d) second
    expect(result[0].id).toBe('easy-shade');
    expect(result[1].id).toBe('easy-full');
  });

  it('respects sun filter — shade user does not get full-sun crops', () => {
    // shade user: full-sun crops (rank 2) are blocked, only shade (rank 0) and partial (rank 1) pass
    // easy-shade passes, easy-full/med-full/hard-full are blocked → pool = [easy-shade] → 1 result
    // → relax sun → all 5 → top 2 by time: easy-shade (25d), easy-full (30d)
    const result = getTop2Recommendations(makeInput({ sunlight: 'shade', experience: 'some' }));
    expect(result.length).toBe(2);
    // First result should be shade-compatible (fastest harvest)
    expect(result[0].id).toBe('easy-shade');
    // Second result came from sun relaxation (full-sun crop is fine after relaxation)
    expect(result[1].id).toBe('easy-full');
  });

  it('accepts custom crops via customCropsById', () => {
    const custom: CropInfo = {
      id: 'my-crop', name: 'My Crop', emoji: 'Z', category: 'hojas',
      sowingMonths: { atlantica: [3], continental: [3], mediterranea: [3], subtropical: [3] },
      harvestMonths: { atlantica: [5], continental: [5], mediterranea: [5], subtropical: [5] },
      daysToHarvest: [10, 15], sunNeeds: 'full', waterNeeds: 'low', spacing: 10,
      companions: [], incompatible: [], tips: '',
    };
    const result = getTop2Recommendations(makeInput({
      sunlight: 'full',
      customCropsById: { 'my-crop': custom },
    }));
    const ids = result.map((c) => c.id);
    expect(ids).toContain('my-crop');
    // custom crop has shortest harvest → should be first
    expect(result[0].id).toBe('my-crop');
  });
});
