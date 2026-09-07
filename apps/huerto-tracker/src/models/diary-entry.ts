import type { BaseItem } from '@portfolio/storage';

export type EntryType =
  | 'sowing'
  | 'transplant'
  | 'watering'
  | 'fertilizing'
  | 'pruning'
  | 'harvest'
  | 'pest'
  | 'treatment'
  | 'photo'
  | 'note';

export interface WateringData {
  liters?: string;
  method?: 'hand' | 'drip' | 'sprinkler' | 'flood';
}

export interface HarvestData {
  weightGrams?: number;
  weight?: string;
  units?: string;
  quality?: number;
  unit?: string;
}

export interface FertilizingData {
  product?: string;
  amount?: string;
  unit?: 'g' | 'kg' | 'ml' | 'L';
}

export interface TreatmentData {
  product?: string;
  dose?: string;
  waitDays?: number;
}

export type EntryDataMap = {
  sowing: undefined;
  transplant: undefined;
  watering: WateringData;
  fertilizing: FertilizingData;
  pruning: undefined;
  harvest: HarvestData;
  pest: undefined;
  treatment: TreatmentData;
  photo: undefined;
  note: { soilCheck: 'moist' } | undefined;
};

export interface DiaryEntry extends BaseItem {
  gardenId: string;
  plantId?: string;
  type: EntryType;
  date: string;
  notes?: string;
  photoUri?: string;
  data?: EntryDataMap[EntryType];
}

export const ENTRY_TYPE_CONFIG: Record<
  EntryType,
  { label: string; emoji: string; color: string }
> = {
  sowing: {
    label: 'Siembra',
    emoji: '🌰',
    color: '#8D6E63',
  },
  transplant: {
    label: 'Trasplante',
    emoji: '🪴',
    color: '#4CAF50',
  },
  watering: {
    label: 'Riego',
    emoji: '💧',
    color: '#29B6F6',
  },
  fertilizing: {
    label: 'Abono',
    emoji: '🌾',
    color: '#FFA726',
  },
  pruning: {
    label: 'Poda',
    emoji: '✂️',
    color: '#AB47BC',
  },
  harvest: {
    label: 'Cosecha',
    emoji: '🧺',
    color: '#FF7043',
  },
  pest: {
    label: 'Plaga',
    emoji: '🐛',
    color: '#EF5350',
  },
  treatment: {
    label: 'Tratamiento',
    emoji: '🧴',
    color: '#26C6DA',
  },
  photo: {
    label: 'Foto',
    emoji: '📷',
    color: '#7E57C2',
  },
  note: {
    label: 'Nota',
    emoji: '📝',
    color: '#78909C',
  },
};
