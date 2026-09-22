import { describe, expect, it } from 'vitest';
import { rowToSeedLot, seedLotToRow } from '../adapters';
import type { SeedLot } from '../../models/seed-lot';

const seedLot: SeedLot = {
  id: '00000000-0000-4000-8000-000000000010',
  gardenId: '00000000-0000-4000-8000-000000000011',
  cropId: 'tomate',
  cropName: 'Tomate',
  variety: 'Raf',
  brand: 'Sobre del usuario',
  packetCount: 4,
  lowStockAt: 1,
  expiresOn: '2027-05-01',
  notes: 'Semillas guardadas en lugar seco',
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:00.000Z',
};

describe('seed lot sync adapter', () => {
  it('round-trips only the entered inventory fields and binds them to the signed-in user', () => {
    const row = seedLotToRow(seedLot, '00000000-0000-4000-8000-000000000012');
    expect(row).toMatchObject({ user_id: '00000000-0000-4000-8000-000000000012', packet_count: 4, low_stock_at: 1, expires_on: '2027-05-01' });
    expect(rowToSeedLot(row)).toEqual(seedLot);
  });

  it('maps absent optional database fields back to undefined', () => {
    const row = { ...seedLotToRow(seedLot, 'user-1'), variety: null, brand: null, low_stock_at: null, expires_on: null, notes: null, deleted_at: null };
    expect(rowToSeedLot(row)).toMatchObject({ variety: undefined, brand: undefined, lowStockAt: undefined, expiresOn: undefined, notes: undefined, deletedAt: undefined });
  });
});
