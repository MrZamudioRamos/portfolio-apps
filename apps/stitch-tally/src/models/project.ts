import type { BaseItem } from '@portfolio/storage';

export type CraftType = 'crochet' | 'knitting';

export interface Session {
  date: string;       // ISO date string
  rowsCompleted: number;
}

export interface Project extends BaseItem {
  name: string;
  craftType: CraftType;
  totalRows: number | null;
  currentRow: number;
  stitchCount: number;
  autoResetStitch: boolean;
  yarnColor: string;
  notes: Record<number, string>;  // row number → note text
  sessions: Session[];
  lastUsedAt: string;
}

export const YARN_COLORS = [
  '#E91E63', // pink
  '#9C27B0', // purple
  '#3F51B5', // indigo
  '#2196F3', // blue
  '#00BCD4', // cyan
  '#4CAF50', // green
  '#FF9800', // orange
  '#F44336', // red
  '#795548', // brown
  '#607D8B', // grey-blue
  '#FFC107', // amber
  '#FFFFFF', // white
] as const;

export const CRAFT_CONFIG: Record<CraftType, { label: string; emoji: string }> = {
  crochet: { label: 'Crochet', emoji: '🧶' },
  knitting: { label: 'Knitting', emoji: '🧵' },
};
