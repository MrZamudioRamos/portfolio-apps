import { describe, expect, it } from 'vitest';
import type { DiaryEntry } from '../../models/diary-entry';
import { getHarvestWeightKg } from '../../utils/harvestWeight';
import { entryToRow, rowToEntry } from '../adapters';

const entry = (data: Record<string, unknown>): DiaryEntry => ({
  id: 'entry-1',
  gardenId: 'garden-1',
  plantId: 'plant-1',
  type: 'harvest',
  date: '2026-09-23',
  createdAt: '2026-09-23T10:00:00.000Z',
  updatedAt: '2026-09-23T10:00:00.000Z',
  data,
});

describe('harvest weight sync adapter', () => {
  it('writes actual grams while preserving the canonical kg value in entry_data', () => {
    const row = entryToRow(entry({ weightKg: 0.275, units: '3' }), 'user-1');

    expect(row.harvest_weight_g).toBe(275);
    expect(row.entry_data).toEqual({ weightKg: 0.275, units: '3' });
    expect(getHarvestWeightKg(rowToEntry(row).data as Record<string, unknown>)).toBe(0.275);
  });

  it('converts legacy kg fields only in the indexed grams column', () => {
    const oldData = { weightGrams: 0.8, unit: 'kg' };
    const row = entryToRow(entry(oldData), 'user-1');

    expect(row.harvest_weight_g).toBe(800);
    expect(row.entry_data).toEqual(oldData);
    expect(getHarvestWeightKg(rowToEntry(row).data as Record<string, unknown>)).toBe(0.8);
  });

  it('does not put a unit count into the grams column', () => {
    expect(entryToRow(entry({ weight: '12', unit: 'units' }), 'user-1').harvest_weight_g).toBeNull();
  });

  it('preserves the established display of legacy rows without entry_data', () => {
    const row = entryToRow(entry({}), 'user-1');
    const oldRow = { ...row, entry_data: null, harvest_weight_g: 2, harvest_unit: 'kg' };

    expect(getHarvestWeightKg(rowToEntry(oldRow).data as Record<string, unknown>)).toBe(2);
  });
});
