import type { SunlightLevel } from '../models/user-profile';

const SUN_RANK: Record<string, number> = { shade: 0, partial: 1, full: 2 };

/**
 * True when a crop's sun requirement can be met by the user's available sunlight.
 * shade crops grow in any light; full-sun crops require full sun.
 */
export function cropMatchesSun(
  cropSun: 'full' | 'partial' | 'shade',
  userSun: SunlightLevel
): boolean {
  return SUN_RANK[cropSun] <= SUN_RANK[userSun];
}
