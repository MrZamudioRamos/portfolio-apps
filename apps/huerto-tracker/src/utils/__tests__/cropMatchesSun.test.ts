import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cropMatchesSun } from '../cropMatchesSun';

describe('cropMatchesSun', () => {
  it('shade crop grows in any light', () => {
    expect(cropMatchesSun('shade', 'shade')).toBe(true);
    expect(cropMatchesSun('shade', 'partial')).toBe(true);
    expect(cropMatchesSun('shade', 'full')).toBe(true);
  });

  it('partial-sun crop requires at least partial light', () => {
    expect(cropMatchesSun('partial', 'shade')).toBe(false);
    expect(cropMatchesSun('partial', 'partial')).toBe(true);
    expect(cropMatchesSun('partial', 'full')).toBe(true);
  });

  it('full-sun crop only matches full sun', () => {
    expect(cropMatchesSun('full', 'shade')).toBe(false);
    expect(cropMatchesSun('full', 'partial')).toBe(false);
    expect(cropMatchesSun('full', 'full')).toBe(true);
  });
});

describe('getSowingNow with sunlight filter', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('without sunlight returns all sowable crops', async () => {
    const { getSowingNow } = await import('../sowingNow');
    const result = getSowingNow('mediterranea', 6);
    const withSun = getSowingNow('mediterranea', 6, 'full');
    // full sun filter can only reduce or equal the unfiltered count
    expect(withSun.now.length).toBeLessThanOrEqual(result.now.length);
    expect(withSun.soon.length).toBeLessThanOrEqual(result.soon.length);
  });

  it('shade filter excludes non-shade crops', async () => {
    const { getSowingNow } = await import('../sowingNow');
    const result = getSowingNow('mediterranea', 6, 'shade');
    for (const crop of result.now) {
      expect(crop.sunNeeds).toBe('shade');
    }
  });

  it('partial filter excludes full-sun but includes partial and shade', async () => {
    const { getSowingNow } = await import('../sowingNow');
    const result = getSowingNow('mediterranea', 6, 'partial');
    for (const crop of result.now) {
      expect(['partial', 'shade']).toContain(crop.sunNeeds);
    }
  });
});
