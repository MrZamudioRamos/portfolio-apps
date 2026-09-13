import { CROPS, CROP_CONTAINER_MIN, CROP_DIFFICULTY, type CropCategory, type CropDifficulty, type CropInfo } from '../data/crops';
import type { ClimateZone } from '../models/garden';
import type { SunlightLevel, ExperienceLevel } from '../models/user-profile';
import { cropMatchesSun } from './cropMatchesSun';

export type FirstCropSpace = 'balcony' | 'terrace' | 'patio' | 'garden' | 'indoor';
export type CareTimeBudget = 'light' | 'regular' | 'handsOn';
export type RecommendationAction = 'sow' | 'prepare';
export type RecommendationReason =
  | 'sunlight'
  | 'container'
  | 'seasonNow'
  | 'seasonSoon'
  | 'easy'
  | 'quick'
  | 'preference'
  | 'timeFit';

export interface FirstCropRecommendation {
  crop: CropInfo;
  score: number;
  action: RecommendationAction;
  reasons: RecommendationReason[];
  containerLiters?: number;
}


export interface RecommendationInput {
  climateZone: ClimateZone;
  month: number;
  sunlight?: SunlightLevel;
  experience?: ExperienceLevel;
  crops?: CropInfo[];
  customCropsById?: Record<string, CropInfo>;
  space?: FirstCropSpace;
  preferredCategories?: CropCategory[];
  careTime?: CareTimeBudget;
}

/**
 * Deterministic onboarding recommendations. Unlike the legacy helper, this
 * never relaxes a declared sunlight constraint and only offers container
 * crops where the user's space calls for one.
 */
export function getFirstCropRecommendations({
  climateZone,
  month,
  sunlight,
  experience,
  crops = CROPS,
  customCropsById,
  space,
  preferredCategories = [],
  careTime,
}: RecommendationInput): FirstCropRecommendation[] {
  const allCrops = dedup(customCropsById ? [...crops, ...Object.values(customCropsById)] : crops);
  const containerSpace = space === 'balcony' || space === 'terrace' || space === 'indoor';
  const nextMonth = month === 12 ? 1 : month + 1;

  return allCrops.flatMap((crop) => {
    if (sunlight && !cropMatchesSun(crop.sunNeeds, sunlight)) return [];

    const containerLiters = CROP_CONTAINER_MIN[crop.id];
    if (containerSpace && (containerLiters === null || containerLiters === undefined)) return [];

    const sowingMonths = crop.sowingMonths[climateZone] ?? [];
    const sowNow = sowingMonths.includes(month);
    const sowSoon = sowingMonths.includes(nextMonth);
    if (!sowNow && !sowSoon) return [];

    const difficulty = CROP_DIFFICULTY[crop.id] ?? 'medium';
    const reasons: RecommendationReason[] = [];
    let score = 0;
    if (sunlight) {
      score += 35;
      reasons.push('sunlight');
    }
    if (containerSpace && typeof containerLiters === 'number') {
      score += 25;
      reasons.push('container');
      if (containerLiters >= 20) score -= 25;
    }
    if (preferredCategories.includes(crop.category)) {
      score += 25;
      reasons.push('preference');
    }
    if (sowNow) {
      score += 20;
      reasons.push('seasonNow');
    } else {
      score += 10;
      reasons.push('seasonSoon');
    }
    if (difficulty === 'easy') {
      score += 15;
      reasons.push('easy');
    } else if (difficulty === 'medium' && experience !== 'beginner') {
      score += 5;
    }
    if (crop.daysToHarvest[0] <= 45) {
      score += 10;
      reasons.push('quick');
    } else if (crop.daysToHarvest[0] <= 60) {
      score += 5;
    }

    if (careTime) {
      const timeScore = getCareTimeScore(careTime, difficulty, crop.waterNeeds);
      score += timeScore;
      if (timeScore > 0) reasons.push('timeFit');
    }

    const action: RecommendationAction = sowNow ? 'sow' : 'prepare';
    return [{ crop, score, action, reasons, ...(typeof containerLiters === 'number' ? { containerLiters } : {}) }];
  }).sort((a, b) => b.score - a.score || a.crop.daysToHarvest[0] - b.crop.daysToHarvest[0] || a.crop.id.localeCompare(b.crop.id)).slice(0, 3);
}

function getCareTimeScore(careTime: CareTimeBudget, difficulty: CropDifficulty, waterNeeds: CropInfo['waterNeeds']): number {
  if (careTime === 'light') {
    if (difficulty === 'hard') return -18;
    if (difficulty === 'easy' && waterNeeds !== 'high') return 18;
    if (waterNeeds === 'high') return -8;
    return 4;
  }
  if (careTime === 'handsOn') {
    if (difficulty === 'hard' || waterNeeds === 'high') return 10;
    if (difficulty === 'medium') return 5;
    return 2;
  }
  if (difficulty === 'easy' || difficulty === 'medium') return 5;
  return 0;
}

/**
 * Return up to 2 crop recommendations for onboarding.
 *
 * Compatibility wrapper for callers that still require crop records only.
 * It delegates to the strict, deterministic Phase A scorer.
 */
export function getTop2Recommendations({
  climateZone,
  month,
  sunlight,
  experience,
  crops = CROPS,
  customCropsById,
  preferredCategories,
}: RecommendationInput): CropInfo[] {
  return getFirstCropRecommendations({ climateZone, month, sunlight, experience, crops, customCropsById, preferredCategories })
    .slice(0, 2)
    .map((recommendation) => recommendation.crop);
}

function dedup(crops: CropInfo[]): CropInfo[] {
  return [...new Map(crops.map((c) => [c.id, c])).values()];
}
