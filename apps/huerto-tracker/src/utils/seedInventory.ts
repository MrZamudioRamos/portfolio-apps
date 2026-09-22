import type { SeedLot, SeedLotStatus } from '../models/seed-lot';

export const FREE_SEED_LOT_LIMIT = 5;

export function seedLotStatus(lot: Pick<SeedLot, 'packetCount' | 'lowStockAt' | 'expiresOn'>, today: string): SeedLotStatus {
  if (lot.packetCount <= 0) return 'empty';
  if (lot.expiresOn && isLocalDateKey(lot.expiresOn) && lot.expiresOn < today) return 'expired';
  if (lot.lowStockAt !== undefined && lot.packetCount <= lot.lowStockAt) return 'low';
  return 'available';
}

export function isLocalDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

export function validateSeedLotDraft(input: {
  cropId: string;
  cropName: string;
  packetCount: number;
  lowStockAt?: number;
  expiresOn?: string;
  variety?: string;
  brand?: string;
  notes?: string;
}): 'crop_required' | 'quantity_invalid' | 'threshold_invalid' | 'date_invalid' | 'text_too_long' | null {
  if (!input.cropId.trim() || !input.cropName.trim()) return 'crop_required';
  if (!Number.isInteger(input.packetCount) || input.packetCount < 0 || input.packetCount > 100_000) return 'quantity_invalid';
  if (input.lowStockAt !== undefined && (!Number.isInteger(input.lowStockAt) || input.lowStockAt < 1 || input.lowStockAt > 100_000)) return 'threshold_invalid';
  if (input.expiresOn && !isLocalDateKey(input.expiresOn)) return 'date_invalid';
  if ((input.variety?.length ?? 0) > 100 || (input.brand?.length ?? 0) > 100 || (input.notes?.length ?? 0) > 1000) return 'text_too_long';
  return null;
}
