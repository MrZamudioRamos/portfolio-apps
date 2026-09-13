import { describe, expect, it } from 'vitest';
import { guideStageForStatus } from '../plantGuide';

describe('guideStageForStatus', () => {
  it('opens the guide at the chapter that matches the plant status', () => {
    expect(guideStageForStatus('seedling')).toBe('germination');
    expect(guideStageForStatus('growing')).toBe('growth');
    expect(guideStageForStatus('flowering')).toBe('flowering');
    expect(guideStageForStatus('harvesting')).toBe('harvest');
  });

  it('falls back to sowing when a plant has no status yet', () => {
    expect(guideStageForStatus(undefined)).toBe('sowing');
  });
});
