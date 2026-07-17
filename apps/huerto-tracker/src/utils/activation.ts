import type { GamificationData } from './gamification';

export type ActivationPhase = 'new' | 'growing' | 'established';

export interface ChecklistItem {
  id: string;
  labelKey: string;
  completed: boolean;
}

/**
 * Derive the user's activation phase from days since onboarding
 * and behavioral data.
 *
 * Phase 1 ("new"): days 0-7, or entriesCount < 3
 * Phase 2 ("growing"): days 3-30, entriesCount ≥ 3 or plantsCount ≥ 2
 * Phase 3 ("established"): 30+ days and meets COACHING_THRESHOLDS.toOff
 */
export function deriveActivationPhase(
  daysSinceOnboarding: number,
  data: GamificationData,
): ActivationPhase {
  if (daysSinceOnboarding >= 30) {
    if (
      data.plantsCount >= 5 ||
      data.entriesCount >= 40 ||
      data.streak >= 21 ||
      data.harvestCount >= 1 ||
      data.uniqueCropCount >= 3
    ) {
      return 'established';
    }
  }
  if (
    daysSinceOnboarding >= 3 &&
    (data.entriesCount >= 3 || data.plantsCount >= 2)
  ) {
    return 'growing';
  }
  return 'new';
}

/**
 * Build the activation checklist. Items 1-2 are auto-completed if
 * the onboarding already handled them (garden exists, plant exists).
 * Items 3-5 require user action.
 */
export function buildActivationChecklist(opts: {
  gardenExists: boolean;
  plantExists: boolean;
  wateringExists: boolean;
  calendarVisited: boolean;
  secondPlantExists: boolean;
}): ChecklistItem[] {
  return [
    { id: 'garden', labelKey: 'activation.checkGarden', completed: opts.gardenExists },
    { id: 'plant', labelKey: 'activation.checkPlant', completed: opts.plantExists },
    { id: 'watering', labelKey: 'activation.checkWatering', completed: opts.wateringExists },
    { id: 'calendar', labelKey: 'activation.checkCalendar', completed: opts.calendarVisited },
    { id: 'secondPlant', labelKey: 'activation.checkSecondPlant', completed: opts.secondPlantExists },
  ];
}

/**
 * Should the checklist be visible?
 * Visible for 14 days after onboarding, or until all items are done.
 */
export function isChecklistVisible(
  daysSinceOnboarding: number,
  allCompleted: boolean,
): boolean {
  return !allCompleted && daysSinceOnboarding <= 14;
}

/** AsyncStorage key for the calendar visit flag */
export const ACTIVATION_CALENDAR_KEY = '@huerto/activation_calendar_visited';

/** AsyncStorage key for the onboarding completion timestamp */
export const ONBOARDING_COMPLETED_KEY = '@huerto/onboarding_completed_at';
