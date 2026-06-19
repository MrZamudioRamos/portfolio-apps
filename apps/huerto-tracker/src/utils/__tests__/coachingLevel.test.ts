import { describe, it, expect } from 'vitest';
import {
  seedFromExperience,
  behavioralFloor,
  mostGraduated,
  advanceFloor,
  deriveCoachingLevel,
  COACHING_THRESHOLDS,
} from '../coachingLevel';
import type { GamificationData } from '../gamification';

const zero: GamificationData = {
  plantsCount: 0, entriesCount: 0, harvestCount: 0, streak: 0,
  uniqueCropCount: 0, pestCount: 0, wateringCount: 0, wateringStreak: 0, totalWeightG: 0,
};

// ── seedFromExperience ──────────────────────────────────────────────────────

describe('seedFromExperience', () => {
  it('beginner → full', () => expect(seedFromExperience('beginner')).toBe('full'));
  it('some → light',    () => expect(seedFromExperience('some')).toBe('light'));
  it('expert → off',   () => expect(seedFromExperience('expert')).toBe('off'));
  it('undefined → light', () => expect(seedFromExperience(undefined)).toBe('light'));
});

// ── behavioralFloor — toLight boundaries (OR) ─────────────────────────────

describe('behavioralFloor toLight', () => {
  const { toLight } = COACHING_THRESHOLDS;

  it('no activity → full', () => expect(behavioralFloor(zero)).toBe('full'));

  it('harvestCount=1 triggers toOff directly (both thresholds share that value) → off', () =>
    expect(behavioralFloor({ ...zero, harvestCount: toLight.harvestCount })).toBe('off'));

  it('streak at threshold → light', () =>
    expect(behavioralFloor({ ...zero, streak: toLight.streak })).toBe('light'));

  it('plantsCount at threshold → light', () =>
    expect(behavioralFloor({ ...zero, plantsCount: toLight.plantsCount })).toBe('light'));

  it('entriesCount at threshold → light', () =>
    expect(behavioralFloor({ ...zero, entriesCount: toLight.entriesCount })).toBe('light'));

  it('one below harvestCount → full', () =>
    expect(behavioralFloor({ ...zero, harvestCount: toLight.harvestCount - 1 })).toBe('full'));
});

// ── behavioralFloor — toOff boundaries (OR) ───────────────────────────────

describe('behavioralFloor toOff', () => {
  const { toOff } = COACHING_THRESHOLDS;

  it('plantsCount at threshold → off', () =>
    expect(behavioralFloor({ ...zero, plantsCount: toOff.plantsCount })).toBe('off'));

  it('entriesCount at threshold → off', () =>
    expect(behavioralFloor({ ...zero, entriesCount: toOff.entriesCount })).toBe('off'));

  it('streak at threshold → off', () =>
    expect(behavioralFloor({ ...zero, streak: toOff.streak })).toBe('off'));

  it('harvestCount at threshold → off', () =>
    expect(behavioralFloor({ ...zero, harvestCount: toOff.harvestCount })).toBe('off'));

  it('uniqueCropCount at threshold → off', () =>
    expect(behavioralFloor({ ...zero, uniqueCropCount: toOff.uniqueCropCount })).toBe('off'));

  it('one below all toOff conditions → light (meets toLight via harvestCount)', () => {
    const d: GamificationData = {
      ...zero,
      plantsCount: toOff.plantsCount - 1,
      entriesCount: toOff.entriesCount - 1,
      streak: toOff.streak - 1,
      harvestCount: toOff.harvestCount - 1, // 0
      uniqueCropCount: toOff.uniqueCropCount - 1,
    };
    // harvestCount = 0 so doesn't meet toOff, but also doesn't meet toLight (harvestCount < 1)
    // entriesCount = 39 which exceeds toLight.entriesCount (5) → light
    expect(behavioralFloor(d)).toBe('light');
  });
});

// ── mostGraduated ──────────────────────────────────────────────────────────

describe('mostGraduated', () => {
  it('full vs off → off', () => expect(mostGraduated('full', 'off')).toBe('off'));
  it('light vs light → light', () => expect(mostGraduated('light', 'light')).toBe('light'));
  it('off vs full → off', () => expect(mostGraduated('off', 'full')).toBe('off'));
  it('full vs light → light', () => expect(mostGraduated('full', 'light')).toBe('light'));
});

// ── advanceFloor — ratchet ─────────────────────────────────────────────────

describe('advanceFloor ratchet', () => {
  it('undefined prev + zero data → full', () =>
    expect(advanceFloor(undefined, zero)).toBe('full'));

  it('null prev → same as undefined', () =>
    expect(advanceFloor(null, zero)).toBe('full'));

  it('floor off + data back to zero (streak dropped) → stays off', () =>
    expect(advanceFloor('off', zero)).toBe('off'));

  it('floor light + data now meets toOff → advances to off', () =>
    expect(advanceFloor('light', { ...zero, plantsCount: 5 })).toBe('off'));

  it('floor off + data meets toOff → stays off', () =>
    expect(advanceFloor('off', { ...zero, plantsCount: 5 })).toBe('off'));

  it('floor full + data meets toLight → advances to light', () =>
    expect(advanceFloor('full', { ...zero, plantsCount: 2 })).toBe('light'));
});

// ── deriveCoachingLevel ────────────────────────────────────────────────────

describe('deriveCoachingLevel', () => {
  it('no args → light (seed of undefined)', () =>
    expect(deriveCoachingLevel({})).toBe('light'));

  it('beginner, no floor → full', () =>
    expect(deriveCoachingLevel({ experience: 'beginner' })).toBe('full'));

  it('beginner, floor=off → off (floor wins via mostGraduated)', () =>
    expect(deriveCoachingLevel({ experience: 'beginner', floor: 'off' })).toBe('off'));

  it('expert, floor=full → off (seed wins)', () =>
    expect(deriveCoachingLevel({ experience: 'expert', floor: 'full' })).toBe('off'));

  it('override=light beats seed=off (expert)', () =>
    expect(deriveCoachingLevel({ experience: 'expert', override: 'light' })).toBe('light'));

  it('override=full beats floor=off', () =>
    expect(deriveCoachingLevel({ floor: 'off', override: 'full' })).toBe('full'));

  it('override=null → automatic (no override)', () =>
    expect(deriveCoachingLevel({ experience: 'beginner', override: null })).toBe('full'));

  it('override=off beats beginner seed', () =>
    expect(deriveCoachingLevel({ experience: 'beginner', override: 'off' })).toBe('off'));
});
