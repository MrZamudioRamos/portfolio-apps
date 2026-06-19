import type { GamificationData } from './gamification';
import type { CoachingLevel, ExperienceLevel } from '../models/user-profile';

export const RANK: Record<CoachingLevel, number> = { full: 0, light: 1, off: 2 };

export const COACHING_THRESHOLDS = {
  toLight: { harvestCount: 1, streak: 7, plantsCount: 2, entriesCount: 5 },
  toOff:   { plantsCount: 5, entriesCount: 40, streak: 21, harvestCount: 1, uniqueCropCount: 3 },
} as const;

export function seedFromExperience(exp?: ExperienceLevel): CoachingLevel {
  if (exp === 'beginner') return 'full';
  if (exp === 'expert') return 'off';
  // 'some' or undefined
  return 'light';
}

export function behavioralFloor(d: GamificationData): CoachingLevel {
  const { toOff, toLight } = COACHING_THRESHOLDS;
  const meetsOff =
    d.plantsCount >= toOff.plantsCount ||
    d.entriesCount >= toOff.entriesCount ||
    d.streak >= toOff.streak ||
    d.harvestCount >= toOff.harvestCount ||
    d.uniqueCropCount >= toOff.uniqueCropCount;
  if (meetsOff) return 'off';

  const meetsLight =
    d.harvestCount >= toLight.harvestCount ||
    d.streak >= toLight.streak ||
    d.plantsCount >= toLight.plantsCount ||
    d.entriesCount >= toLight.entriesCount;
  if (meetsLight) return 'light';

  return 'full';
}

export function mostGraduated(a: CoachingLevel, b: CoachingLevel): CoachingLevel {
  return RANK[a] >= RANK[b] ? a : b;
}

/** Ratchet: advance floor from data but never go backwards. */
export function advanceFloor(
  prev: CoachingLevel | undefined | null,
  d: GamificationData
): CoachingLevel {
  return mostGraduated(prev ?? 'full', behavioralFloor(d));
}

export function deriveCoachingLevel({
  experience,
  floor,
  override,
}: {
  experience?: ExperienceLevel;
  floor?: CoachingLevel | null;
  override?: CoachingLevel | null;
}): CoachingLevel {
  if (override != null) return override;
  return mostGraduated(seedFromExperience(experience), floor ?? 'full');
}
