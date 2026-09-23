import { describe, expect, it } from 'vitest';
import { getHarvestUnitCount, getHarvestWeightKg, harvestWeightToGrams } from '../harvestWeight';

describe('harvest weight units', () => {
  it('reads the explicit kg field and rounds it to grams for storage', () => {
    const harvest = { weightKg: 0.275 };
    expect(getHarvestWeightKg(harvest)).toBe(0.275);
    expect(harvestWeightToGrams(harvest)).toBe(275);
  });

  it('reads the historical misnamed numeric field as kg', () => {
    expect(getHarvestWeightKg({ weightGrams: 1.25 })).toBe(1.25);
    expect(harvestWeightToGrams({ weightGrams: 1.25 })).toBe(1250);
  });

  it('reads the older text field including a comma decimal', () => {
    expect(getHarvestWeightKg({ weight: '0,45' })).toBe(0.45);
    expect(harvestWeightToGrams({ weight: '0.45' })).toBe(450);
  });

  it('does not treat unit counts, missing values, invalid values or negatives as kg', () => {
    expect(getHarvestWeightKg({ weight: '12', unit: 'units' })).toBeNull();
    expect(harvestWeightToGrams({ weight: '12', unit: 'units' })).toBeNull();
    expect(getHarvestWeightKg(undefined)).toBeNull();
    expect(getHarvestWeightKg({ weightKg: Number.NaN })).toBeNull();
    expect(getHarvestWeightKg({ weightKg: -1 })).toBeNull();
  });

  it('prefers the explicit field when migrating a record that has both formats', () => {
    expect(getHarvestWeightKg({ weightKg: 0.3, weightGrams: 300 })).toBe(0.3);
  });

  it('preserves unit-based harvest counts separately from mass', () => {
    expect(getHarvestUnitCount({ units: '3' })).toBe('3');
    expect(getHarvestUnitCount({ weight: '12', unit: 'units' })).toBe('12');
    expect(getHarvestUnitCount({ weight: '0.25', unit: 'kg' })).toBeNull();
  });
});
