import { describe, expect, it } from 'vitest';
import { createSeasonPlanFromSnapshot, dateFallsInMonths, findMapCropAssociations, findSpacingWarnings, generateSuccessionDates, getOccupancyWindow, getSeasonRotationWarnings, soilVolumeLiters } from '../gardenMapPlanner';

describe('garden map planning calculations', () => {
  it('calculates geometric substrate volume and rejects missing dimensions', () => {
    expect(soilVolumeLiters(100, 50, 20)).toBe(100);
    expect(soilVolumeLiters(100, 0, 20)).toBeNull();
  });

  it('warns only when catalog spacing is exceeded in a measured space', () => {
    const plants = [
      { id: 'a', name: 'Tomate', x: 0.1, y: 0.5, spacingCm: 60, groupKey: 'bancal-a' },
      { id: 'b', name: 'Pimiento', x: 0.35, y: 0.5, spacingCm: 50, groupKey: 'bancal-a' },
      { id: 'c', name: 'Lechuga', x: 0.11, y: 0.5, spacingCm: 25, groupKey: 'maceta-1' },
    ];
    expect(findSpacingWarnings(plants, { widthCm: 100, lengthCm: 100 })).toEqual([
      { first: 'Tomate', second: 'Pimiento', distanceCm: 25, requiredCm: 60 },
    ]);
    expect(findSpacingWarnings(plants)).toEqual([]);
  });

  it('validates catalog month windows using the selected sowing month', () => {
    expect(dateFallsInMonths('2026-09-22', [9, 10])).toBe(true);
    expect(dateFallsInMonths('2026-09-22', [2, 3])).toBe(false);
    expect(dateFallsInMonths('not-a-date', [9])).toBe(false);
  });

  it('creates explicit dates for each sowing round and rejects invalid ranges', () => {
    expect(generateSuccessionDates('2026-09-22', 3, 14)).toEqual(['2026-09-22', '2026-10-06', '2026-10-20']);
    expect(generateSuccessionDates('2028-02-28', 3, 1)).toEqual(['2028-02-28', '2028-02-29', '2028-03-01']);
    expect(generateSuccessionDates('2026-02-31', 2, 7)).toBeNull();
    expect(generateSuccessionDates('2026-09-22', 13, 7)).toBeNull();
    expect(generateSuccessionDates('2026-09-22', 2, 0)).toBeNull();
  });

  it('warns about the same known rotation group in the same location, not unknown groups', () => {
    const current = [
      { plantId: 'a', cropId: 'tomate', name: 'Tomate', rotationGroup: 'Solanaceae', locationKey: 'bancal-1', x: 0.1, y: 0.2 },
      { plantId: 'b', cropId: 'custom', name: 'Personalizada', locationKey: 'bancal-1', x: 0.2, y: 0.2 },
    ];
    const previous = [{
      id: 'season-2025', year: 2025, label: '2025', savedAt: '2025-12-01', gridRows: 1, gridCols: 1,
      grid: [], free: {}, plants: [{ plantId: 'old', cropId: 'patata', name: 'Patata', rotationGroup: 'Solanaceae', locationKey: 'bancal-1', x: 0.2, y: 0.3 }],
    }];
    const warnings = getSeasonRotationWarnings(current, previous);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].previous.name).toBe('Patata');
  });

  it('copies an archived season into an independent future draft without live plant ids or dates', () => {
    const snapshot = {
      id: 'season-2026', year: 2026, label: 'Temporada 2026', savedAt: '2026-09-22T12:00:00Z',
      gridRows: 2, gridCols: 2, grid: ['live-plant-id', null], free: {},
      plants: [{ plantId: 'live-plant-id', cropId: 'tomate', name: 'Tomate cherry', rotationGroup: 'Solanaceae', locationKey: 'bancal-1', x: 0.25, y: 0.5 }],
    };
    const draft = createSeasonPlanFromSnapshot(snapshot, 2027, 'draft-2027', '2026-09-22T12:00:00Z');
    expect(draft?.year).toBe(2027);
    expect(draft?.plants[0]).toMatchObject({ cropId: 'tomate', name: 'Tomate cherry', locationKey: 'bancal-1', x: 0.25, y: 0.5 });
    expect(draft?.plants[0]).not.toHaveProperty('plantId');
    expect(draft?.plants[0]).not.toHaveProperty('plannedDate');
    expect(draft?.plants[0]).not.toHaveProperty('plannedMonth');
    expect(createSeasonPlanFromSnapshot(snapshot, 2026, 'draft', 'now')).toBeNull();
  });

  it('derives month occupancy only from valid catalog duration estimates', () => {
    expect(getOccupancyWindow(10, [60, 85])).toEqual({ startMonth: 10, endMonth: 12, continuesNextYear: false });
    expect(getOccupancyWindow(11, [60, 85])).toEqual({ startMonth: 11, endMonth: 12, continuesNextYear: true });
    expect(getOccupancyWindow(2)).toBeNull();
    expect(getOccupancyWindow(13, [20, 30])).toBeNull();
    expect(getOccupancyWindow(2, [40, 20])).toBeNull();
  });

  it('surfaces only explicit crop associations from the supplied catalog', () => {
    const plants = [
      { plantId: 'a', cropId: 'tomate', name: 'Tomate', locationKey: 'bancal-1' },
      { plantId: 'b', cropId: 'albahaca', name: 'Albahaca', locationKey: 'bancal-1' },
      { plantId: 'c', cropId: 'hinojo', name: 'Hinojo', locationKey: 'bancal-2' },
    ];
    const associations = findMapCropAssociations(plants, {
      tomate: { id: 'tomate', name: 'Tomate', companions: ['albahaca'], incompatible: ['hinojo'] },
      albahaca: { id: 'albahaca', name: 'Albahaca', companions: [], incompatible: [] },
      hinojo: { id: 'hinojo', name: 'Hinojo', companions: [], incompatible: [] },
    });
    expect(associations).toEqual([
      { firstPlantId: 'a', firstName: 'Tomate', secondPlantId: 'b', secondName: 'Albahaca', kind: 'companion', sameLocation: true },
      { firstPlantId: 'a', firstName: 'Tomate', secondPlantId: 'c', secondName: 'Hinojo', kind: 'incompatible', sameLocation: false },
    ]);
  });
});
