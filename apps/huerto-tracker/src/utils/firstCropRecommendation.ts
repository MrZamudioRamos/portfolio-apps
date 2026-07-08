import { CROPS, type CropInfo } from '../data/crops';
import { CROP_DIFFICULTY } from '../data/crops';
import type { CropDifficulty } from '../data/crops';
import type { ClimateZone } from '../models/garden';
import type { SunlightLevel, ExperienceLevel } from '../models/user-profile';
import { getSowingNow } from './sowingNow';
import { cropMatchesSun } from './cropMatchesSun';

const DIFF_RANK: Record<CropDifficulty, number> = { easy: 0, medium: 1, hard: 2 };

function byHarvestTime(a: CropInfo, b: CropInfo): number {
  return a.daysToHarvest[0] - b.daysToHarvest[0];
}

function sowableInZone(crop: CropInfo, climateZone: ClimateZone, month: number): 'now' | 'soon' | null {
  const months = crop.sowingMonths[climateZone] ?? [];
  if (months.includes(month)) return 'now';
  const nextMonth = month === 12 ? 1 : month + 1;
  if (months.includes(nextMonth)) return 'soon';
  return null;
}

export interface RecommendationInput {
  climateZone: ClimateZone;
  month: number;
  sunlight?: SunlightLevel;
  experience?: ExperienceLevel;
  crops?: CropInfo[];
  customCropsById?: Record<string, CropInfo>;
}

/**
 * Return up to 2 crop recommendations for onboarding.
 *
 * Progressive relaxation:
 *  a. Sowable crops this month + next month, sun-filtered.
 *  b. Beginner: prefer easy, then medium.
 *  c. If < 2: relax difficulty (include hard).
 *  d. If still < 2: relax sunlight filter entirely.
 *  e. Sort by shortest harvest time.
 *  f. Return max 2.
 */
export function getTop2Recommendations({
  climateZone,
  month,
  sunlight,
  experience,
  crops = CROPS,
  customCropsById,
}: RecommendationInput): CropInfo[] {
  const isBeginner = experience === 'beginner';

  // Combine base crops + custom crops, deduped by id
  const allCrops = customCropsById
    ? [...crops, ...Object.values(customCropsById)]
    : crops;

  // Partition into now/soon with sun filter
  const withSun = filterSowable(allCrops, climateZone, month, sunlight);
  let pool = withSun;

  const pickTop2 = (arr: CropInfo[]) => [...arr].sort(byHarvestTime).slice(0, 2);

  if (pool.length === 0) return [];

  // b) Beginner: prefer easy, then easy+medium
  if (isBeginner) {
    const easy = pool.filter((c) => DIFF_RANK[CROP_DIFFICULTY[c.id] ?? 'medium'] === 0);
    if (easy.length >= 2) return pickTop2(easy);
    const easyOrMed = pool.filter((c) => DIFF_RANK[CROP_DIFFICULTY[c.id] ?? 'medium'] <= 1);
    if (easyOrMed.length >= 2) return pickTop2(easyOrMed);
  }

  // c) Enough candidates with sun filter
  if (pool.length >= 2) return pickTop2(pool);

  // d) Relax sunlight: get all sowable crops regardless of sun
  const noSun = filterSowable(allCrops, climateZone, month, undefined);
  const relaxedPool = dedup([...pool, ...noSun]);

  if (relaxedPool.length === 0) return [];

  // e) Beginner preference on relaxed pool
  if (isBeginner) {
    const easy = relaxedPool.filter((c) => DIFF_RANK[CROP_DIFFICULTY[c.id] ?? 'medium'] === 0);
    if (easy.length >= 2) return pickTop2(easy);
    const easyOrMed = relaxedPool.filter((c) => DIFF_RANK[CROP_DIFFICULTY[c.id] ?? 'medium'] <= 1);
    if (easyOrMed.length >= 2) return pickTop2(easyOrMed);
  }

  // f) Sort by harvest time, return top 2
  return pickTop2(relaxedPool);
}

function filterSowable(
  crops: CropInfo[],
  climateZone: ClimateZone,
  month: number,
  sunlight?: SunlightLevel,
): CropInfo[] {
  const result: CropInfo[] = [];
  for (const crop of crops) {
    const timing = sowableInZone(crop, climateZone, month);
    if (!timing) continue;
    if (sunlight && !cropMatchesSun(crop.sunNeeds, sunlight)) continue;
    result.push(crop);
  }
  return result;
}

function dedup(crops: CropInfo[]): CropInfo[] {
  return [...new Map(crops.map((c) => [c.id, c])).values()];
}
