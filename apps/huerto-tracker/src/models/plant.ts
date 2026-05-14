import type { BaseItem } from '@portfolio/storage';

export type PlantStatus =
  | 'seedling'
  | 'transplanted'
  | 'growing'
  | 'flowering'
  | 'fruiting'
  | 'harvesting'
  | 'finished';

export type PestStatus = 'none' | 'active' | 'treated';

export interface Plant extends BaseItem {
  gardenId: string;
  cropId: string;
  name: string;
  variety?: string;
  varietyId?: string;
  sowingDate?: string;
  transplantDate?: string;
  firstHarvestDate?: string;
  status: PlantStatus;
  pestStatus?: PestStatus;
  photoUri?: string;
  notes?: string;
  harvestGoalKg?: number;
  soilPh?: string;
  soilTexture?: 'sandy' | 'loamy' | 'clay' | 'silty' | 'peaty';
  soilNotes?: string;
  bedName?: string;
}

export const PLANT_STATUS_CONFIG: Record<
  PlantStatus,
  { label: string; emoji: string; color: string }
> = {
  seedling: {
    label: 'Semillero',
    emoji: '🌱',
    color: '#81C784',
  },
  transplanted: {
    label: 'Trasplantada',
    emoji: '🪴',
    color: '#4CAF50',
  },
  growing: {
    label: 'Creciendo',
    emoji: '🌿',
    color: '#2E7D32',
  },
  flowering: {
    label: 'En flor',
    emoji: '🌸',
    color: '#EC407A',
  },
  fruiting: {
    label: 'Fructificando',
    emoji: '🍅',
    color: '#FF7043',
  },
  harvesting: {
    label: 'En cosecha',
    emoji: '🧺',
    color: '#FFA726',
  },
  finished: {
    label: 'Finalizada',
    emoji: '✅',
    color: '#9E9E9E',
  },
};
