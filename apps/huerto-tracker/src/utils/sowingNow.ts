import { CROPS, type CropInfo } from '../data/crops';
import type { ClimateZone } from '../models/garden';
import type { SunlightLevel } from '../models/user-profile';
import { cropMatchesSun } from './cropMatchesSun';

export interface SowingNowResult {
  now: CropInfo[];   // sow this month
  soon: CropInfo[];  // sow next month (not already in 'now')
}

export function getSowingNow(
  climateZone: ClimateZone,
  month: number,
  sunlight?: SunlightLevel
): SowingNowResult {
  const nextMonth = month === 12 ? 1 : month + 1;

  const now: CropInfo[] = [];
  const soon: CropInfo[] = [];

  for (const crop of CROPS) {
    const months = crop.sowingMonths[climateZone] ?? [];
    const sunOk = !sunlight || cropMatchesSun(crop.sunNeeds, sunlight);
    if (months.includes(month)) {
      if (sunOk) now.push(crop);
    } else if (months.includes(nextMonth)) {
      if (sunOk) soon.push(crop);
    }
  }

  return { now, soon };
}
