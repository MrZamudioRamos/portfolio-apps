import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';

const DAYS_THRESHOLD = 2;
const LOOKBACK_DAYS = 30;

/**
 * Returns plants that haven't been watered for >= thresholdDays.
 * Pure function — no side effects, safe to unit-test without mocking Expo.
 */
export function computePlantsNeedingWater(
  activePlants: Plant[],
  entries: DiaryEntry[],
  now: Date = new Date(),
  thresholdDays = DAYS_THRESHOLD,
): Plant[] {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recentWaterings = entries.filter(
    (e) => e.type === 'watering' && e.plantId && e.date >= cutoffStr,
  );

  const lastWatered = new Map<string, string>();
  for (const e of recentWaterings) {
    if (!e.plantId) continue;
    const prev = lastWatered.get(e.plantId);
    if (!prev || e.date > prev) lastWatered.set(e.plantId, e.date);
  }

  return activePlants.filter((p) => {
    const last = lastWatered.get(p.id);
    if (!last) return true;
    const then = new Date(last + 'T12:00:00');
    const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
    return days >= thresholdDays;
  });
}
