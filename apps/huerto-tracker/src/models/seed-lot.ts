import type { BaseItem } from '@portfolio/storage';

/** A gardener-recorded seed packet lot; these values are never seeded by the app. */
export interface SeedLot extends BaseItem {
  gardenId: string;
  cropId: string;
  cropName: string;
  variety?: string;
  brand?: string;
  /** Number of unopened packets currently in the gardener's inventory. */
  packetCount: number;
  /** Optional threshold chosen by the gardener; no app-imposed stock estimate. */
  lowStockAt?: number;
  /** Date printed on the packet, not a claim about actual seed viability. */
  expiresOn?: string;
  notes?: string;
}

export type SeedLotStatus = 'empty' | 'expired' | 'low' | 'available';
