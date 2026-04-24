import type { BaseItem } from '@portfolio/storage';

export type ClimateZone = 'atlantica' | 'mediterranea' | 'continental' | 'subtropical';
export type GardenType = 'huerto' | 'balcon' | 'maceta';

export interface Garden extends BaseItem {
  name: string;
  climateZone: ClimateZone;
  province: string;
  gardenType?: GardenType;
  photoUri?: string;
}

export const GARDEN_TYPE_CONFIG: Record<GardenType, { label: string; emoji: string; description: string }> = {
  huerto: {
    label: 'Huerto',
    emoji: '🏡',
    description: 'Tierra directa, parcela o jardín',
  },
  balcon: {
    label: 'Balcón / Terraza',
    emoji: '🪴',
    description: 'Cultivo en contenedores en exterior',
  },
  maceta: {
    label: 'Interior / Macetas',
    emoji: '🪟',
    description: 'Cultivo en interiores o ventanas',
  },
};
