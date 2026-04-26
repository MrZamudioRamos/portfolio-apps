import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildGamificationData,
  evaluateBadges,
  getUnlockedCount,
  sortBadges,
  type GamificationData,
} from '../gamification';
import type { Plant } from '../../models/plant';
import type { DiaryEntry } from '../../models/diary-entry';

// ── Helpers ────────────────────────────────────────────────────────────────

function makePlant(cropId: string, id = cropId): Plant {
  return { id, gardenId: 'g1', cropId, name: cropId, status: 'growing' } as Plant;
}

function makeEntry(
  type: DiaryEntry['type'],
  date: string,
  extra: Partial<DiaryEntry> = {}
): DiaryEntry {
  return { id: `${type}-${date}`, gardenId: 'g1', type, date, ...extra } as DiaryEntry;
}

// Freeze time to a known date so streak calculations are deterministic
const FROZEN_DATE = new Date('2024-06-15T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_DATE);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── buildGamificationData ──────────────────────────────────────────────────

describe('buildGamificationData', () => {
  it('devuelve ceros con arrays vacíos', () => {
    const data = buildGamificationData([], []);
    expect(data).toEqual({
      plantsCount: 0,
      entriesCount: 0,
      harvestCount: 0,
      streak: 0,
      uniqueCropCount: 0,
      pestCount: 0,
      wateringCount: 0,
      wateringStreak: 0,
      totalWeightG: 0,
    });
  });

  it('plantsCount refleja el número de plantas', () => {
    const plants = [makePlant('tomate'), makePlant('lechuga')];
    expect(buildGamificationData(plants, []).plantsCount).toBe(2);
  });

  it('uniqueCropCount cuenta cropIds únicos', () => {
    const plants = [makePlant('tomate', 'p1'), makePlant('tomate', 'p2'), makePlant('lechuga', 'p3')];
    expect(buildGamificationData(plants, []).uniqueCropCount).toBe(2);
  });

  it('harvestCount cuenta solo entradas de tipo harvest', () => {
    const entries = [
      makeEntry('harvest', '2024-06-10'),
      makeEntry('harvest', '2024-06-11'),
      makeEntry('watering', '2024-06-12'),
    ];
    expect(buildGamificationData([], entries).harvestCount).toBe(2);
  });

  it('wateringCount cuenta solo entradas de tipo watering', () => {
    const entries = [
      makeEntry('watering', '2024-06-10'),
      makeEntry('watering', '2024-06-11'),
      makeEntry('harvest', '2024-06-12'),
    ];
    expect(buildGamificationData([], entries).wateringCount).toBe(2);
  });

  it('pestCount cuenta solo entradas de tipo pest', () => {
    const entries = [
      makeEntry('pest', '2024-06-10'),
      makeEntry('note', '2024-06-11'),
    ];
    expect(buildGamificationData([], entries).pestCount).toBe(1);
  });

  it('totalWeightG convierte kg a gramos correctamente', () => {
    const entries = [
      makeEntry('harvest', '2024-06-10', { data: { weight: '1.5' } }),
      makeEntry('harvest', '2024-06-11', { data: { weight: '0.5' } }),
    ];
    expect(buildGamificationData([], entries).totalWeightG).toBe(2000);
  });

  it('totalWeightG ignora cosechas sin peso', () => {
    const entries = [
      makeEntry('harvest', '2024-06-10'),
      makeEntry('harvest', '2024-06-11', { data: { weight: '1' } }),
    ];
    expect(buildGamificationData([], entries).totalWeightG).toBe(1000);
  });

  it('totalWeightG acepta peso numérico (no string)', () => {
    const entries = [
      makeEntry('harvest', '2024-06-10', { data: { weight: 2 } }),
    ];
    expect(buildGamificationData([], entries).totalWeightG).toBe(2000);
  });

  describe('streak', () => {
    it('calcula racha de días consecutivos desde hoy', () => {
      // Frozen: 2024-06-15; entradas los últimos 3 días consecutivos
      const entries = [
        makeEntry('watering', '2024-06-15'),
        makeEntry('watering', '2024-06-14'),
        makeEntry('watering', '2024-06-13'),
      ];
      expect(buildGamificationData([], entries).streak).toBe(3);
    });

    it('rompe la racha en el primer día sin actividad', () => {
      // 15 y 14 hay actividad, 13 no
      const entries = [
        makeEntry('watering', '2024-06-15'),
        makeEntry('watering', '2024-06-14'),
        makeEntry('watering', '2024-06-12'), // no es consecutivo
      ];
      expect(buildGamificationData([], entries).streak).toBe(2);
    });

    it('streak = 0 si no hay actividad hoy', () => {
      const entries = [makeEntry('watering', '2024-06-10')];
      expect(buildGamificationData([], entries).streak).toBe(0);
    });

    it('streak = 1 si solo hay actividad hoy', () => {
      const entries = [makeEntry('note', '2024-06-15')];
      expect(buildGamificationData([], entries).streak).toBe(1);
    });
  });

  describe('wateringStreak', () => {
    it('calcula racha de riego consecutiva', () => {
      const entries = [
        makeEntry('watering', '2024-06-15'),
        makeEntry('watering', '2024-06-14'),
        makeEntry('note', '2024-06-13'), // no es riego → rompe racha
      ];
      expect(buildGamificationData([], entries).wateringStreak).toBe(2);
    });

    it('wateringStreak = 0 si no regó hoy', () => {
      const entries = [makeEntry('harvest', '2024-06-15')];
      expect(buildGamificationData([], entries).wateringStreak).toBe(0);
    });
  });
});

// ── evaluateBadges ─────────────────────────────────────────────────────────

describe('evaluateBadges', () => {
  const empty: GamificationData = {
    plantsCount: 0, entriesCount: 0, harvestCount: 0, streak: 0,
    uniqueCropCount: 0, pestCount: 0, wateringCount: 0, wateringStreak: 0, totalWeightG: 0,
  };

  it('devuelve todos los badges definidos', () => {
    const badges = evaluateBadges(empty);
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => {
      expect(b).toHaveProperty('id');
      expect(b).toHaveProperty('emoji');
      expect(b).toHaveProperty('tier');
      expect(b).toHaveProperty('unlocked');
    });
  });

  it('con datos vacíos, todos los badges están bloqueados', () => {
    const badges = evaluateBadges(empty);
    expect(badges.every((b) => !b.unlocked)).toBe(true);
  });

  it('first_plant se desbloquea con plantsCount >= 1', () => {
    const badges = evaluateBadges({ ...empty, plantsCount: 1 });
    expect(badges.find((b) => b.id === 'first_plant')?.unlocked).toBe(true);
  });

  it('first_entry se desbloquea con entriesCount >= 1', () => {
    const badges = evaluateBadges({ ...empty, entriesCount: 1 });
    expect(badges.find((b) => b.id === 'first_entry')?.unlocked).toBe(true);
  });

  it('first_harvest se desbloquea con harvestCount >= 1', () => {
    const badges = evaluateBadges({ ...empty, harvestCount: 1 });
    expect(badges.find((b) => b.id === 'first_harvest')?.unlocked).toBe(true);
  });

  it('first_watering se desbloquea con wateringCount >= 1', () => {
    const badges = evaluateBadges({ ...empty, wateringCount: 1 });
    expect(badges.find((b) => b.id === 'first_watering')?.unlocked).toBe(true);
  });

  it('plants_5 requiere plantsCount >= 5', () => {
    expect(evaluateBadges({ ...empty, plantsCount: 4 }).find((b) => b.id === 'plants_5')?.unlocked).toBe(false);
    expect(evaluateBadges({ ...empty, plantsCount: 5 }).find((b) => b.id === 'plants_5')?.unlocked).toBe(true);
  });

  it('plants_10 requiere plantsCount >= 10', () => {
    expect(evaluateBadges({ ...empty, plantsCount: 9 }).find((b) => b.id === 'plants_10')?.unlocked).toBe(false);
    expect(evaluateBadges({ ...empty, plantsCount: 10 }).find((b) => b.id === 'plants_10')?.unlocked).toBe(true);
  });

  it('diversity_5 requiere 5 cultivos únicos', () => {
    expect(evaluateBadges({ ...empty, uniqueCropCount: 4 }).find((b) => b.id === 'diversity_5')?.unlocked).toBe(false);
    expect(evaluateBadges({ ...empty, uniqueCropCount: 5 }).find((b) => b.id === 'diversity_5')?.unlocked).toBe(true);
  });

  it('streak_3 requiere streak >= 3', () => {
    expect(evaluateBadges({ ...empty, streak: 2 }).find((b) => b.id === 'streak_3')?.unlocked).toBe(false);
    expect(evaluateBadges({ ...empty, streak: 3 }).find((b) => b.id === 'streak_3')?.unlocked).toBe(true);
  });

  it('streak_7 requiere streak >= 7', () => {
    expect(evaluateBadges({ ...empty, streak: 7 }).find((b) => b.id === 'streak_7')?.unlocked).toBe(true);
  });

  it('streak_30 requiere streak >= 30 (gold)', () => {
    const badge = evaluateBadges({ ...empty, streak: 30 }).find((b) => b.id === 'streak_30');
    expect(badge?.unlocked).toBe(true);
    expect(badge?.tier).toBe('gold');
  });

  it('weight_1kg requiere 1000 g cosechados', () => {
    expect(evaluateBadges({ ...empty, totalWeightG: 999 }).find((b) => b.id === 'weight_1kg')?.unlocked).toBe(false);
    expect(evaluateBadges({ ...empty, totalWeightG: 1000 }).find((b) => b.id === 'weight_1kg')?.unlocked).toBe(true);
  });

  it('weight_10kg requiere 10000 g (gold)', () => {
    const badge = evaluateBadges({ ...empty, totalWeightG: 10000 }).find((b) => b.id === 'weight_10kg');
    expect(badge?.unlocked).toBe(true);
    expect(badge?.tier).toBe('gold');
  });

  it('pest_3 requiere 3 incidencias de plagas', () => {
    expect(evaluateBadges({ ...empty, pestCount: 2 }).find((b) => b.id === 'pest_3')?.unlocked).toBe(false);
    expect(evaluateBadges({ ...empty, pestCount: 3 }).find((b) => b.id === 'pest_3')?.unlocked).toBe(true);
  });
});

// ── getUnlockedCount ───────────────────────────────────────────────────────

describe('getUnlockedCount', () => {
  it('devuelve 0 si ningún badge está desbloqueado', () => {
    const badges = evaluateBadges({
      plantsCount: 0, entriesCount: 0, harvestCount: 0, streak: 0,
      uniqueCropCount: 0, pestCount: 0, wateringCount: 0, wateringStreak: 0, totalWeightG: 0,
    });
    expect(getUnlockedCount(badges)).toBe(0);
  });

  it('cuenta correctamente los badges desbloqueados', () => {
    const badges = evaluateBadges({
      plantsCount: 1, entriesCount: 1, harvestCount: 1, streak: 0,
      uniqueCropCount: 0, pestCount: 0, wateringCount: 1, wateringStreak: 0, totalWeightG: 0,
    });
    // first_plant, first_entry, first_harvest, first_watering → 4
    expect(getUnlockedCount(badges)).toBe(4);
  });
});

// ── sortBadges ─────────────────────────────────────────────────────────────

describe('sortBadges', () => {
  it('pone los desbloqueados antes que los bloqueados', () => {
    const badges = evaluateBadges({
      plantsCount: 1, entriesCount: 0, harvestCount: 0, streak: 0,
      uniqueCropCount: 0, pestCount: 0, wateringCount: 0, wateringStreak: 0, totalWeightG: 0,
    });
    const sorted = sortBadges(badges);
    const firstLocked = sorted.findIndex((b) => !b.unlocked);
    const lastUnlocked = sorted.map((b) => b.unlocked).lastIndexOf(true);
    expect(lastUnlocked).toBeLessThan(firstLocked);
  });

  it('entre badges desbloqueados, gold va antes de silver y bronze', () => {
    const badges = evaluateBadges({
      plantsCount: 10, entriesCount: 200, harvestCount: 0, streak: 30,
      uniqueCropCount: 0, pestCount: 0, wateringCount: 0, wateringStreak: 0, totalWeightG: 10000,
    });
    const sorted = sortBadges(badges);
    const unlockedSorted = sorted.filter((b) => b.unlocked);
    const tiers = unlockedSorted.map((b) => b.tier);
    const firstSilverOrBronze = tiers.findIndex((t) => t !== 'gold');
    const lastGold = tiers.lastIndexOf('gold');
    if (firstSilverOrBronze !== -1 && lastGold !== -1) {
      expect(lastGold).toBeLessThan(firstSilverOrBronze);
    }
  });

  it('no muta el array original', () => {
    const badges = evaluateBadges({
      plantsCount: 1, entriesCount: 0, harvestCount: 0, streak: 0,
      uniqueCropCount: 0, pestCount: 0, wateringCount: 0, wateringStreak: 0, totalWeightG: 0,
    });
    const original = [...badges];
    sortBadges(badges);
    expect(badges.map((b) => b.id)).toEqual(original.map((b) => b.id));
  });
});
