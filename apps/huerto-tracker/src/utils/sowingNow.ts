import { CROPS, type CropInfo } from '../data/crops';
import type { ClimateZone } from '../models/garden';

export interface SowingNowResult {
  now: CropInfo[];   // sow this month
  soon: CropInfo[];  // sow next month (not already in 'now')
}

export function getSowingNow(climateZone: ClimateZone, month: number): SowingNowResult {
  const nextMonth = month === 12 ? 1 : month + 1;

  const now: CropInfo[] = [];
  const soon: CropInfo[] = [];

  for (const crop of CROPS) {
    const months = crop.sowingMonths[climateZone] ?? [];
    if (months.includes(month)) {
      now.push(crop);
    } else if (months.includes(nextMonth)) {
      soon.push(crop);
    }
  }

  return { now, soon };
}
