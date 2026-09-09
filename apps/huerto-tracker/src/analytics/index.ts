import * as Sentry from '@sentry/react-native';
import { PostHog } from 'posthog-react-native';
import Constants from 'expo-constants';

// Client-side keys (safe to bundle). Values come from .env (EXPO_PUBLIC_*).
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

// Detect Expo Go: Sentry RN @7 needs the native Sentry module installed by
// the `@sentry/react-native/expo` config plugin; Expo Go ships without it,
// so calling Sentry.init() there trips a silent native crash on SDK 57+.
// `appOwnership === 'expo'` is the legacy-but-unambiguous Expo Go signal.
const isExpoGo = Constants.appOwnership === 'expo';

let posthog: PostHog | null = null;
let initialized = false;
const impressions = new Set<string>();

/** Once per semantic impression in this app session, including screen remounts. */
export function trackImpression(key: string, event: string, props?: Record<string, unknown>) {
  if (impressions.has(key)) return;
  impressions.add(key);
  track(event, props);
}

/** Analytics event names — keep them few and meaningful. */
export const EVENTS = {
  appOpen: 'app_open',
  onboardingCompleted: 'onboarding_completed',
  plantAdded: 'plant_added',
  entryAdded: 'entry_added',
  paywallViewed: 'paywall_viewed',
  purchaseCompleted: 'purchase_completed',
  firstCropSuggested: 'first_crop_suggested',
  firstCropRecommendationsShown: 'first_crop_recommendations_shown',
  firstCropPicked: 'first_crop_picked',
  firstPlantCreated: 'first_plant_created',
  todayActionShown: 'today_action_shown',
  todayActionCompleted: 'today_action_completed',
  onboardingStepCompleted: 'onboarding_step_completed',
  coachingLevelChanged: 'coaching_level_changed',
  coachingOverrideSet: 'coaching_override_set',
  accountDeleted: 'account_deleted',
  notificationsEnabled: 'notifications_enabled',
  sunlightSelected: 'sunlight_selected',
  experienceSelected: 'experience_selected',
  provinceDetected: 'province_detected',
  provinceSelected: 'province_selected',
  gardenCreated: 'garden_created',
  onboardingStepViewed: 'onboarding_step_viewed',
} as const;

/**
 * Init crash reporting (Sentry) + product analytics (PostHog). Safe to call
 * once at startup; missing keys or Expo Go (no native Sentry) degrade to no-op.
 */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;
  if (SENTRY_DSN && !isExpoGo) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        tracesSampleRate: 0.2,
        // Native crash capture needs a dev/production build; in Expo Go the SDK
        // falls back to JS-only. debug off to keep logs clean.
        debug: false,
      });
    } catch (e) {
      console.warn('[analytics] Sentry init failed', e);
    }
  }
  if (POSTHOG_KEY) {
    try {
      posthog = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
    } catch (e) {
      console.warn('[analytics] PostHog init failed', e);
    }
  }
}

/** Track a product event. No-op if PostHog isn't configured. */
export function track(event: string, props?: Record<string, unknown>): void {
  try {
    posthog?.capture(event, props as Record<string, never>);
  } catch {
    /* analytics must never break the app */
  }
}

/** Tie events + errors to a user after login. */
export function identifyUser(id: string, props?: Record<string, unknown>): void {
  try {
    posthog?.identify(id, props as Record<string, never>);
  } catch {
    /* ignore */
  }
  try {
    Sentry.setUser({ id });
  } catch {
    /* ignore */
  }
}

/** Clear user association on sign-out / account deletion. */
export function resetAnalyticsUser(): void {
  impressions.clear();
  try {
    posthog?.reset();
  } catch {
    /* ignore */
  }
  try {
    Sentry.setUser(null);
  } catch {
    /* ignore */
  }
}

/** Report a handled error to Sentry. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* ignore */
  }
}

/** Re-export so callers can wrap the root component for Sentry. */
export { Sentry };
