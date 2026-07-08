import type { CropInfo, CropDifficulty } from '../data/crops';
import { CROP_DIFFICULTY } from '../data/crops';
import type { ClimateZone } from '../models/garden';
import type { SunlightLevel, ExperienceLevel } from '../models/user-profile';
import { getSowingNow } from './sowingNow';

interface RecommendationInput {
  climateZone: ClimateZone;
  month: number;
  sunlight?: SunlightLevel;
  experience?: ExperienceLevel;
}

const DIFF_RANK: Record<CropDifficulty, number> = { easy: 0, medium: 1, hard: 2 };

function byDifficultyThenHarvest(a: CropInfo, b: CropInfo): number {
  const da = DIFF_RANK[CROP_DIFFICULTY[a.id] ?? 'medium'];
  const db = DIFF_RANK[CROP_DIFFICULTY[b.id] ?? 'medium'];
  if (da !== db) return da - db;
  return a.daysToHarvest[0] - b.daysToHarvest[0];
}

/**
 * Return up to 2 crop recommendations for onboarding.
 *
 * Strategy:
 *  1. Get crops sowable this month (now) + next month (soon) for the zone/sun.
 *  2. If beginner: prefer easy crops, then medium.
 *  3. If fewer than 2 results: relax difficulty (include medium/hard).
 *  4. If still fewer than 2: relax sun filter entirely (include all crops sowable
 *     in zone regardless of sun).
 *  5. Sort by difficulty → harvest time and return top 2.
 */
export function getTop2Recommendations({
  climateZone,
  month,
  sunlight,
  experience,
}: RecommendationInput): CropInfo[] {
  const isBeginner = experience === 'beginner';
  const { now, soon } = getSowingNow(climateZone, month, sunlight);
  const candidates = [...now, ...soon];

  if (candidates.length === 0) return [];
  if (candidates.length <= 2) return [...candidates].sort(byDifficultyThenHarvest);

  // Filter: prefer easy for beginners
  if (isBeginner) {
    const easy = candidates.filter((c) => CROP_DIFFICULTY[c.id] === 'easy');
    if (easy.length >= 2) {
      return [...easy].sort(byDifficultyThenHarvest).slice(0, 2);
    }
    // Relax: include medium too
    const easyOrMedium = candidates.filter(
      (c) => (CROP_DIFFICULTY[c.id] ?? 'medium') !== 'hard'
    );
    if (easyOrMedium.length >= 2) {
      return [...easyOrMedium].sort(byDifficultyThenHarvest).slice(0, 2);
    }
  }

  // Default: sort all candidates, top 2
  return [...candidates].sort(byDifficultyThenHarvest).slice(0, 2);
}
