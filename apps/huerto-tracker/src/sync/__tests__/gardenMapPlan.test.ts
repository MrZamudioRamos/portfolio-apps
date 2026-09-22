import { describe, expect, it } from 'vitest';
import { normalizeGardenMapPlan, type GardenMapPlan } from '../../models/garden-map-plan';
import { gardenLayoutToRow, rowToGardenLayout } from '../adapters';

const plan: GardenMapPlan = {
  version: 1,
  dimensions: { widthCm: 240, lengthCm: 180 },
  structures: [{ id: 'bed-1', name: 'Bancal norte', kind: 'bed', x: 0.1, y: 0.2, widthCm: 100, lengthCm: 80, depthCm: 25 }],
  zones: [{ id: 'light-1', name: 'Sol de mañana', kind: 'light', x: 0.5, y: 0.1, widthCm: 80, lengthCm: 60, lightLevel: 'full' }],
  plannedPlantings: [{ id: 'sow-1', cropId: 'rabano', count: 4, plannedDate: '2026-10-01', location: 'Bancal norte' }],
  seasons: [],
  seasonPlans: [],
};

describe('garden map plan persistence adapter', () => {
  it('preserves explicit sowing/transplant actions while accepting plans made by older versions', () => {
    const normalized = normalizeGardenMapPlan({
      ...plan,
      plannedPlantings: [
        { id: 'sowing', cropId: 'rabano', count: 2, plannedDate: '2026-10-01', action: 'sowing' },
        { id: 'transplant', cropId: 'rabano', count: 1, plannedDate: '2026-10-02', action: 'transplant' },
        { id: 'legacy', cropId: 'rabano', count: 1, plannedDate: '2026-10-03' },
        { id: 'invalid', cropId: 'rabano', count: 1, plannedDate: '2026-10-04', action: 'harvest' },
      ],
    });

    expect(normalized.plannedPlantings.map(({ id, action }) => [id, action])).toEqual([
      ['sowing', 'sowing'], ['transplant', 'transplant'], ['legacy', undefined],
    ]);
  });

  it('round-trips the map plan alongside grid and free layouts', () => {
    const row = gardenLayoutToRow('garden-1', ['plant-1', null], 'user-1', '2026-09-22T10:00:00Z', { 'plant-2': { x: 0.4, y: 0.6 } }, plan);

    expect(row.layout).toEqual({
      grid: ['plant-1', null],
      free: { 'plant-2': { x: 0.4, y: 0.6 } },
      mapPlan: plan,
    });
    expect(rowToGardenLayout(row)).toEqual({
      gardenId: 'garden-1',
      layout: ['plant-1', null],
      freeLayout: { 'plant-2': { x: 0.4, y: 0.6 } },
      mapPlan: plan,
      updatedAt: '2026-09-22T10:00:00Z',
    });
  });

  it('continues to read legacy array-shaped layout rows', () => {
    const row = gardenLayoutToRow('garden-1', ['plant-1', null], 'user-1');

    expect(row.layout).toEqual(['plant-1', null]);
    expect(rowToGardenLayout(row)).toMatchObject({
      gardenId: 'garden-1',
      layout: ['plant-1', null],
      freeLayout: {},
      mapPlan: undefined,
    });
  });

  it('drops unsupported photo schemes from persisted remote plans', () => {
    const normalized = normalizeGardenMapPlan({
      ...plan,
      structures: [
        ...plan.structures,
        { ...plan.structures[0], id: 'unsafe', photoUri: 'javascript:alert(1)' },
      ],
    });

    expect(normalized.structures.map((item) => item.id)).toEqual(['bed-1']);
  });

  it('keeps valid season drafts and rejects malformed months or map coordinates', () => {
    const valid = {
      id: 'draft-2027', year: 2027, label: 'Plan 2027', createdAt: '2026-09-22T10:00:00Z', sourceSeasonId: 'season-2026',
      gridRows: 2, gridCols: 2,
      plants: [{ id: 'draft-plant-1', cropId: 'tomate', name: 'Tomate', locationKey: 'bancal-1', x: 0.5, y: 0.25, plannedMonth: 5 }],
    };
    const normalized = normalizeGardenMapPlan({
      ...plan,
      seasonPlans: [
        valid,
        { ...valid, id: 'bad-month', plants: [{ ...valid.plants[0], plannedMonth: 13 }] },
        { ...valid, id: 'bad-position', plants: [{ ...valid.plants[0], x: 2 }] },
      ],
    });
    expect(normalized.seasonPlans).toEqual([valid]);
  });

  it('preserves the supported plan version and rejects unknown versions instead of normalizing them as v2', () => {
    expect(normalizeGardenMapPlan(plan).version).toBe(1);
    expect(() => normalizeGardenMapPlan({ ...plan, version: 99 })).toThrow(/version/i);
  });

  it('validates row geometry and rotations without dropping valid v2 placements', () => {
    const normalized = normalizeGardenMapPlan({
      ...plan,
      version: 2,
      plantPlacements: [{ plantId: 'plant-1', x: 0.25, y: 0.75, structureId: 'row-1' }],
      structures: [
        { id: 'row-1', name: 'Fila', kind: 'row', x: 0, y: 0, widthCm: 100, lengthCm: 20, rotationDegrees: 90, rowSpacingCm: 30 },
        { id: 'bad-row', name: 'Fila inválida', kind: 'row', x: 0, y: 0, widthCm: 100, lengthCm: 20, rowSpacingCm: 0 },
        { id: 'bad-rotation', name: 'Giro inválido', kind: 'bed', x: 0, y: 0, widthCm: 100, lengthCm: 20, rotationDegrees: 360 },
      ],
    });

    expect(normalized.version).toBe(2);
    expect(normalized.plantPlacements).toEqual([{ plantId: 'plant-1', x: 0.25, y: 0.75, structureId: 'row-1' }]);
    expect(normalized.structures.map(({ id }) => id)).toEqual(['row-1']);
  });
});
