import type { BaseItem } from '@portfolio/storage';

export type CostCategory = 'seeds' | 'fertilizer' | 'treatment' | 'tools' | 'other';

export interface CostEntry extends BaseItem {
  gardenId: string;
  plantId?: string;
  category: CostCategory;
  amount: number;
  description?: string;
  date: string;
}

export const COST_CATEGORY_CONFIG: Record<CostCategory, { label: string; emoji: string; color: string }> = {
  seeds:      { label: 'Semillas',      emoji: '🌱', color: '#8D6E63' },
  fertilizer: { label: 'Abono',         emoji: '🌾', color: '#FFA726' },
  treatment:  { label: 'Tratamientos',  emoji: '🧴', color: '#26C6DA' },
  tools:      { label: 'Herramientas',  emoji: '🔧', color: '#78909C' },
  other:      { label: 'Otros',         emoji: '📦', color: '#9E9E9E' },
};
