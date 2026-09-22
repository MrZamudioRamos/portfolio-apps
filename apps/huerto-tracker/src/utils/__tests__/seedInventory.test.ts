import { describe, expect, it } from 'vitest';
import { seedLotStatus, validateSeedLotDraft } from '../seedInventory';

const valid = {
  cropId: 'tomate',
  cropName: 'Tomate',
  packetCount: 3,
};

describe('seed inventory', () => {
  it('uses the gardener-entered stock threshold and packet date without guessing', () => {
    expect(seedLotStatus({ packetCount: 3 }, '2026-09-22')).toBe('available');
    expect(seedLotStatus({ packetCount: 2, lowStockAt: 2 }, '2026-09-22')).toBe('low');
    expect(seedLotStatus({ packetCount: 2, expiresOn: '2026-09-21' }, '2026-09-22')).toBe('expired');
    expect(seedLotStatus({ packetCount: 0, expiresOn: '2026-01-01' }, '2026-09-22')).toBe('empty');
  });

  it('accepts zero remaining packets and rejects invalid quantities, dates and thresholds', () => {
    expect(validateSeedLotDraft({ ...valid, packetCount: 0 })).toBeNull();
    expect(validateSeedLotDraft({ ...valid, packetCount: 1.5 })).toBe('quantity_invalid');
    expect(validateSeedLotDraft({ ...valid, lowStockAt: 0 })).toBe('threshold_invalid');
    expect(validateSeedLotDraft({ ...valid, expiresOn: '2026-02-31' })).toBe('date_invalid');
  });

  it('requires a real crop selection and bounds user text before persisting', () => {
    expect(validateSeedLotDraft({ ...valid, cropId: '' })).toBe('crop_required');
    expect(validateSeedLotDraft({ ...valid, notes: 'n'.repeat(1001) })).toBe('text_too_long');
  });
});
