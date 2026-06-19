import * as Sentry from '@sentry/react-native';
import { PostHog } from 'posthog-react-native';

// Client-side keys (safe to bundle). Values come from .env (EXPO_PUBLIC_*).
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let posthog: PostHog | null = null;

/** Analytics event names — keep them few and meaningful. */
export const EVENTS = {
  appOpen: 'app_open',
  onboardingCompleted: 'onboarding_completed',
  plantAdded: 'plant_added',
  entryAdded: 'entry_added',
  paywallViewed: 'paywall_viewed',
  purchaseCompleted: 'purchase_completed',
  firstCropSuggested: 'first_crop_suggested',
  firstCropPicked: 'first_crop_picked',
  coachingLevelChanged: 'coaching_level_changed',
  coachingOverrideSet: 'coaching_override_set',
  accountDeleted: 'account_deleted',
} as const;

/**
 * Init crash reporting (Sentry) + product analytics (PostHog). Safe to call
 * once at startup; missing keys or Expo Go (no native Sentry) degrade to no-op.
 */
export function initAnalytics(): void {
  if (SENTRY_DSN) {
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
