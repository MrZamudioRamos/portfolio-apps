import type { PlantStatus } from '../models/plant';

export const GUIDE_STAGES = ['sowing', 'germination', 'growth', 'flowering', 'harvest'] as const;
export type GuideStage = (typeof GUIDE_STAGES)[number];

/** Maps the status users record to the closest guide chapter. */
export function guideStageForStatus(status: PlantStatus | undefined): GuideStage {
  switch (status) {
    case 'seedling':
      return 'germination';
    case 'transplanted':
    case 'growing':
      return 'growth';
    case 'flowering':
    case 'fruiting':
      return 'flowering';
    case 'harvesting':
    case 'finished':
      return 'harvest';
    default:
      return 'sowing';
  }
}
