import type { CropInfo } from '../data/crops';
import type { Plant } from '../models/plant';

export type AbsenceRisk = 'low' | 'medium' | 'high';

export interface AbsencePlantPlan {
  plant: Plant;
  cadenceDays: number;
  visitsNeeded: number;
  risk: AbsenceRisk;
}

export interface AbsencePlan {
  daysAway: number;
  plans: AbsencePlantPlan[];
  needsHelp: boolean;
}

const RISK_ORDER: Record<AbsenceRisk, number> = { high: 3, medium: 2, low: 1 };

export function buildAbsencePlan(
  plants: Plant[],
  cropsById: Record<string, CropInfo>,
  daysAway: number,
  hasHelper: boolean,
): AbsencePlan {
  const safeDays = Math.max(1, Math.round(daysAway));
  const plans = plants
    .filter((plant) => !plant.deletedAt && plant.status !== 'finished')
    .map((plant) => {
      const waterNeeds = cropsById[plant.cropId]?.waterNeeds ?? 'medium';
      const cadenceDays = waterNeeds === 'high' ? 1 : waterNeeds === 'medium' ? 2 : 4;
      const visitsNeeded = Math.max(0, Math.ceil(safeDays / cadenceDays) - 1);
      const risk: AbsenceRisk = hasHelper || visitsNeeded === 0
        ? 'low'
        : waterNeeds === 'high' || visitsNeeded >= 4
          ? 'high'
          : 'medium';
      return { plant, cadenceDays, visitsNeeded, risk };
    })
    .sort((a, b) => RISK_ORDER[b.risk] - RISK_ORDER[a.risk] || b.visitsNeeded - a.visitsNeeded || a.plant.name.localeCompare(b.plant.name));

  return { daysAway: safeDays, plans, needsHelp: plans.some((plan) => plan.risk !== 'low') };
}
