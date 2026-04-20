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

export interface DiaryEntry extends BaseItem {
  gardenId: string;
  plantId?: string;
  type: EntryType;
  date: string;
  notes?: string;
  photoUri?: string;
  data?: Record<string, unknown>;
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
