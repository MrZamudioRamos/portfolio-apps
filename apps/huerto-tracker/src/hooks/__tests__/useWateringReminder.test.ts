import { describe, it, expect } from 'vitest';
import { computePlantsNeedingWater } from '../../utils/wateringUtils';
import type { Plant } from '../../models/plant';
import type { DiaryEntry } from '../../models/diary-entry';

const NOW = new Date('2026-06-19T12:00:00Z');

function makePlant(id: string): Plant {
  return {
    id,
    gardenId: 'g1',
    cropId: 'tomate',
    name: 'Tomate',
    status: 'growing',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as unknown as Plant;
}

function makeWatering(plantId: string, daysAgo: number): DiaryEntry {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `e-${plantId}-${daysAgo}`,
    gardenId: 'g1',
    plantId,
    type: 'watering',
    date: d.toISOString().slice(0, 10),
    createdAt: d.toISOString(),
    updatedAt: d.toISOString(),
  } as DiaryEntry;
}

describe('computePlantsNeedingWater', () => {
  it('watered today (0 days ago) → no schedule', () => {
    const plant = makePlant('p1');
    const entries = [makeWatering('p1', 0)];
    expect(computePlantsNeedingWater([plant], entries, NOW)).toHaveLength(0);
  });

  it('watered yesterday (1 day ago) → no schedule', () => {
    const plant = makePlant('p1');
    const entries = [makeWatering('p1', 1)];
    expect(computePlantsNeedingWater([plant], entries, NOW)).toHaveLength(0);
  });

  it('watered 2 days ago → schedule', () => {
    const plant = makePlant('p1');
    const entries = [makeWatering('p1', 2)];
    const result = computePlantsNeedingWater([plant], entries, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('never watered (no entries) → schedule', () => {
    const plant = makePlant('p1');
    expect(computePlantsNeedingWater([plant], [], NOW)).toHaveLength(1);
  });

  it('no active plants → no schedule', () => {
    expect(computePlantsNeedingWater([], [], NOW)).toHaveLength(0);
  });

  it('picks the most recent watering when multiple entries exist', () => {
    const plant = makePlant('p1');
    // 5 days ago and 1 day ago — should use 1 day ago → no schedule
    const entries = [makeWatering('p1', 5), makeWatering('p1', 1)];
    expect(computePlantsNeedingWater([plant], entries, NOW)).toHaveLength(0);
  });

  it('only considers watering entries, not other types', () => {
    const plant = makePlant('p1');
    const noteEntry: DiaryEntry = {
      ...makeWatering('p1', 0),
      type: 'note',
    };
    expect(computePlantsNeedingWater([plant], [noteEntry], NOW)).toHaveLength(1);
  });

  it('handles multiple plants independently', () => {
    const p1 = makePlant('p1');
    const p2 = makePlant('p2');
    const p3 = makePlant('p3');
    const entries = [
      makeWatering('p1', 0), // today → no
      makeWatering('p2', 3), // 3 days → yes
      // p3 never watered → yes
    ];
    const result = computePlantsNeedingWater([p1, p2, p3], entries, NOW);
    expect(result.map((p) => p.id).sort()).toEqual(['p2', 'p3']);
  });
});
