import { INDOOR_START, getSeedlingSchedule } from '../data/indoorStart';
import type { Plant } from '../models/plant';

/** Minimal structural crop shape — works for both catalog and custom crops. */
interface CoachCrop {
  id: string;
  daysToHarvest?: [number, number];
}

export type CoachTone = 'info' | 'success' | 'warn';

export interface CoachLine {
  emoji: string;
  /** i18n key under plantCoach.* */
  key: string;
  params?: Record<string, string | number>;
  tone: CoachTone;
}

const DAY = 86_400_000;
const daysSince = (d: string) =>
  Math.floor((Date.now() - new Date(d + 'T12:00:00').getTime()) / DAY);
const daysUntil = (date: Date) => Math.ceil((date.getTime() - Date.now()) / DAY);

/**
 * One plain-language coaching line: what's happening now + the next step,
 * picked by lifecycle stage. The mentor voice that turns a tracker into a coach.
 * Returns null when there's nothing useful to say (no dates yet).
 */
export function getPlantCoach(plant: Plant, crop: CoachCrop | undefined): CoachLine | null {
  const sow = plant.sowingDate;
  const prop = plant.propagationMethod ?? 'seed';
  const dth = crop?.daysToHarvest;
  const germ = (crop && INDOOR_START[crop.id]?.germinationDays) ?? [5, 10];

  if (plant.status === 'finished') {
    return { emoji: '🌾', key: 'plantCoach.finished', tone: 'info' };
  }

  if (plant.status === 'harvesting') {
    return { emoji: '🧺', key: 'plantCoach.harvesting', tone: 'success' };
  }

  if (plant.status === 'seedling') {
    // Still waiting on germination (seed-sown, not yet marked germinated).
    if (prop === 'seed' && !plant.germinationDate) {
      if (!sow) return { emoji: '🌱', key: 'plantCoach.seedlingGeneric', tone: 'info' };
      const d = daysSince(sow);
      if (d < germ[0]) {
        return { emoji: '🌱', key: 'plantCoach.germWindow', params: { min: germ[0], max: germ[1] }, tone: 'info' };
      }
      if (d <= germ[1]) {
        return { emoji: '👀', key: 'plantCoach.germNow', tone: 'info' };
      }
      return { emoji: '🤔', key: 'plantCoach.germLate', params: { days: d }, tone: 'warn' };
    }
    // Germinated / bought / cutting — coach the transplant timing.
    if (crop && sow && INDOOR_START[crop.id]) {
      const schedule = getSeedlingSchedule(crop.id, sow);
      if (schedule) {
        const left = daysUntil(schedule.transplant);
        return left > 0
          ? { emoji: '🪴', key: 'plantCoach.toTransplant', params: { days: left }, tone: 'info' }
          : { emoji: '🪴', key: 'plantCoach.transplantNow', tone: 'success' };
      }
    }
    return { emoji: '🌱', key: 'plantCoach.seedlingGeneric', tone: 'info' };
  }

  // transplanted | growing | flowering | fruiting — estimate harvest.
  if (sow && dth) {
    const est = Math.round((dth[0] + dth[1]) / 2);
    const remaining = est - daysSince(sow);
    if (remaining > 14) {
      return { emoji: '🌿', key: 'plantCoach.growing', params: { weeks: Math.ceil(remaining / 7) }, tone: 'success' };
    }
    if (remaining > 0) {
      return { emoji: '⏳', key: 'plantCoach.harvestSoon', params: { days: remaining }, tone: 'info' };
    }
    return { emoji: '🧺', key: 'plantCoach.harvestDue', tone: 'success' };
  }

  if (plant.status === 'flowering') return { emoji: '🌸', key: 'plantCoach.flowering', tone: 'info' };
  if (plant.status === 'fruiting') return { emoji: '🍅', key: 'plantCoach.fruiting', tone: 'info' };
  return { emoji: '🌿', key: 'plantCoach.growingGeneric', tone: 'info' };
}
