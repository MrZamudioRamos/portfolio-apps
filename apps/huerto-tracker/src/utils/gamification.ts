import type { DiaryEntry } from '../models/diary-entry';
import type { Plant } from '../models/plant';

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold';
}

export interface BadgeStatus extends Badge {
  unlocked: boolean;
}

export interface GamificationData {
  plantsCount: number;
  entriesCount: number;
  harvestCount: number;
  streak: number;
  uniqueCropCount: number;
  pestCount: number;
  wateringCount: number;
  wateringStreak: number; // consecutive days with at least one watering
  totalWeightG: number;
}

const ALL_BADGES: (Badge & { check: (d: GamificationData) => boolean })[] = [
  // Onboarding
  {
    id: 'first_plant',
    emoji: '🌱',
    name: 'Primer brote',
    description: 'Añade tu primera planta al huerto',
    tier: 'bronze',
    check: (d) => d.plantsCount >= 1,
  },
  {
    id: 'first_entry',
    emoji: '📓',
    name: 'Primer diario',
    description: 'Registra tu primera entrada',
    tier: 'bronze',
    check: (d) => d.entriesCount >= 1,
  },
  {
    id: 'first_harvest',
    emoji: '🧺',
    name: 'Primera cosecha',
    description: 'Cosecha por primera vez',
    tier: 'bronze',
    check: (d) => d.harvestCount >= 1,
  },
  {
    id: 'first_watering',
    emoji: '💧',
    name: 'Primer riego',
    description: 'Riega tu primera planta',
    tier: 'bronze',
    check: (d) => d.wateringCount >= 1,
  },

  // Plants
  {
    id: 'plants_5',
    emoji: '🪴',
    name: 'Huerto en marcha',
    description: 'Cultiva 5 plantas a la vez',
    tier: 'bronze',
    check: (d) => d.plantsCount >= 5,
  },
  {
    id: 'plants_10',
    emoji: '🏡',
    name: 'Huerto próspero',
    description: 'Cultiva 10 plantas a la vez',
    tier: 'silver',
    check: (d) => d.plantsCount >= 10,
  },
  {
    id: 'diversity_5',
    emoji: '🌈',
    name: 'Biodiversidad',
    description: 'Cultiva 5 tipos de cultivos diferentes',
    tier: 'silver',
    check: (d) => d.uniqueCropCount >= 5,
  },

  // Streaks
  {
    id: 'streak_3',
    emoji: '🔥',
    name: 'Racha inicial',
    description: '3 días consecutivos con actividad',
    tier: 'bronze',
    check: (d) => d.streak >= 3,
  },
  {
    id: 'streak_7',
    emoji: '⚡',
    name: 'Jardinero constante',
    description: '7 días seguidos cuidando el huerto',
    tier: 'silver',
    check: (d) => d.streak >= 7,
  },
  {
    id: 'streak_30',
    emoji: '🌟',
    name: 'Compromiso total',
    description: '30 días consecutivos de actividad',
    tier: 'gold',
    check: (d) => d.streak >= 30,
  },

  // Activity
  {
    id: 'entries_10',
    emoji: '📚',
    name: 'Diario activo',
    description: 'Registra 10 entradas en total',
    tier: 'bronze',
    check: (d) => d.entriesCount >= 10,
  },
  {
    id: 'entries_50',
    emoji: '🏅',
    name: 'Cronista del huerto',
    description: 'Registra 50 entradas en total',
    tier: 'silver',
    check: (d) => d.entriesCount >= 50,
  },
  {
    id: 'entries_200',
    emoji: '🏆',
    name: 'Maestro jardinero',
    description: '200 entradas registradas',
    tier: 'gold',
    check: (d) => d.entriesCount >= 200,
  },

  // Harvests
  {
    id: 'harvest_5',
    emoji: '🥦',
    name: 'Cosechador',
    description: '5 cosechas registradas',
    tier: 'bronze',
    check: (d) => d.harvestCount >= 5,
  },
  {
    id: 'harvest_20',
    emoji: '🌽',
    name: 'Gran cosecha',
    description: '20 cosechas registradas',
    tier: 'silver',
    check: (d) => d.harvestCount >= 20,
  },
  {
    id: 'weight_1kg',
    emoji: '⚖️',
    name: 'Un kilo de orgullo',
    description: 'Cosecha 1 kg en total',
    tier: 'silver',
    check: (d) => d.totalWeightG >= 1000,
  },
  {
    id: 'weight_10kg',
    emoji: '🥇',
    name: 'Huerto abundante',
    description: 'Cosecha 10 kg en total',
    tier: 'gold',
    check: (d) => d.totalWeightG >= 10000,
  },

  // Vigilance
  {
    id: 'pest_3',
    emoji: '🐛',
    name: 'Vigilante',
    description: 'Registra 3 incidencias de plagas',
    tier: 'bronze',
    check: (d) => d.pestCount >= 3,
  },
];

export function buildGamificationData(
  plants: Plant[],
  entries: DiaryEntry[]
): GamificationData {
  const harvestEntries = entries.filter((e) => e.type === 'harvest');
  const wateringEntries = entries.filter((e) => e.type === 'watering');
  const pestEntries = entries.filter((e) => e.type === 'pest');

  const uniqueCropIds = new Set(plants.map((p) => p.cropId));

  const totalWeightG = harvestEntries.reduce((sum, e) => {
    const w = (e.data as any)?.weight;
    const parsed = typeof w === 'string' ? parseFloat(w) : typeof w === 'number' ? w : 0;
    // Stored as kg string → convert to grams
    return sum + (isNaN(parsed) ? 0 : parsed * 1000);
  }, 0);

  // Overall streak
  const dateSet = new Set(entries.map((e) => e.date.slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (dateSet.has(d.toISOString().slice(0, 10))) streak++;
    else break;
  }

  // Watering streak
  const waterDateSet = new Set(wateringEntries.map((e) => e.date.slice(0, 10)));
  let wateringStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (waterDateSet.has(d.toISOString().slice(0, 10))) wateringStreak++;
    else break;
  }

  return {
    plantsCount: plants.length,
    entriesCount: entries.length,
    harvestCount: harvestEntries.length,
    streak,
    uniqueCropCount: uniqueCropIds.size,
    pestCount: pestEntries.length,
    wateringCount: wateringEntries.length,
    wateringStreak,
    totalWeightG,
  };
}

export function evaluateBadges(data: GamificationData): BadgeStatus[] {
  return ALL_BADGES.map(({ check, ...badge }) => ({
    ...badge,
    unlocked: check(data),
  }));
}

export function getUnlockedCount(badges: BadgeStatus[]): number {
  return badges.filter((b) => b.unlocked).length;
}

const TIER_ORDER = { gold: 0, silver: 1, bronze: 2 };

export function sortBadges(badges: BadgeStatus[]): BadgeStatus[] {
  return [...badges].sort((a, b) => {
    // Unlocked first, then by tier, then by id
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
  });
}

export const TIER_COLORS: Record<Badge['tier'], string> = {
  gold:   '#FFD700',
  silver: '#B0BEC5',
  bronze: '#A1887F',
};
