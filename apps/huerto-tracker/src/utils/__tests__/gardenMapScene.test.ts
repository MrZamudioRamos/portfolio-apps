import { describe, expect, it } from 'vitest';
import { migrateLegacyMapScene } from '../gardenMapScene';

const legacyPlan = {
  version: 1,
  dimensions: { widthCm: 240, lengthCm: 180 },
  structures: [{ id: 'bed-1', name: 'Bancal', kind: 'bed', x: 0.1, y: 0.2, widthCm: 100, lengthCm: 80 }],
  zones: [],
  plannedPlantings: [],
  seasons: [],
  seasonPlans: [],
};

describe('migrateLegacyMapScene', () => {
  it('converts grid cell centers and retains hand-placed free coordinates', () => {
    const result = migrateLegacyMapScene({
      plan: legacyPlan,
      grid: ['grid-plant', null],
      rows: 1,
      cols: 2,
      free: { 'free-plant': { x: 0.75, y: 0.25 } },
      preferFree: true,
    });

    expect(result.version).toBe(2);
    expect(result.plantPlacements).toEqual([
      { plantId: 'grid-plant', x: 0.25, y: 0.5 },
      { plantId: 'free-plant', x: 0.75, y: 0.25 },
    ]);
    expect(result.structures).toEqual(legacyPlan.structures);
  });

  it('prefers free coordinates for a balcony when the same plant appears in both layouts', () => {
    const result = migrateLegacyMapScene({
      plan: legacyPlan,
      grid: ['same-plant'],
      rows: 1,
      cols: 1,
      free: { 'same-plant': { x: 0.8, y: 0.3 } },
      preferFree: true,
    });

    expect(result.plantPlacements.filter(({ plantId }) => plantId === 'same-plant'))
      .toEqual([{ plantId: 'same-plant', x: 0.8, y: 0.3 }]);
  });

  it('keeps grid position when grid is the selected layout and ignores invalid free coordinates', () => {
    const result = migrateLegacyMapScene({
      plan: legacyPlan,
      grid: ['same-plant'],
      rows: 1,
      cols: 1,
      free: { 'same-plant': { x: 1.2, y: 0.3 }, 'invalid': { x: 0.5, y: Number.NaN } },
      preferFree: false,
    });

    expect(result.plantPlacements).toEqual([{ plantId: 'same-plant', x: 0.5, y: 0.5 }]);
  });
});
