import type { BaseItem } from '@portfolio/storage';

export type ClimateZone = 'atlantica' | 'mediterranea' | 'continental' | 'subtropical';

export interface Garden extends BaseItem {
  name: string;
  climateZone: ClimateZone;
  province: string;
  photoUri?: string;
}
