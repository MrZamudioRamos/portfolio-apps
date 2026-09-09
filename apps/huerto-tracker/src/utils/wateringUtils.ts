import { dateToStr } from './dateStr';
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
    (e) => !e.deletedAt && e.type === 'watering' && e.plantId && e.date >= cutoffStr && e.date <= dateToStr(now),
  );

  const lastWatered = new Map<string, string>();
  for (const e of recentWaterings) {
    if (!e.plantId) continue;
    const prev = lastWatered.get(e.plantId);
    if (!prev || e.date > prev) lastWatered.set(e.plantId, e.date);
  }

  return activePlants.filter((p) => {
    if (p.status === 'finished' || (p.status === 'seedling' && !p.sowingDate && (p.propagationMethod ?? 'seed') === 'seed')) return false;
    if (entries.some(e => !e.deletedAt && e.plantId === p.id && e.gardenId === p.gardenId && e.date === dateToStr(now) && e.type === 'note' && e.data && 'soilCheck' in e.data && e.data.soilCheck === 'moist')) return false;
    const last = lastWatered.get(p.id) ?? p.sowingDate;
    if (!last) return true;
    const then = new Date(last + 'T12:00:00');
    const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
    return days >= thresholdDays;
  });
}
