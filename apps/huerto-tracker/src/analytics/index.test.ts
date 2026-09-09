import { expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ capture: vi.fn(), init: vi.fn(), clients: vi.fn() }));
vi.mock('@sentry/react-native', () => ({ init: calls.init, setUser: vi.fn() }));
vi.mock('expo-constants', () => ({ default: { appOwnership: 'expo' } }));
vi.mock('posthog-react-native', () => ({ PostHog: class {
  constructor() { calls.clients(); }
  capture = calls.capture;
  reset() {}
} }));
it('initializes one analytics client and emits each semantic impression once per session/user', async () => {
  vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', 'test-only');
  const analytics = await import('./index');
  analytics.initAnalytics(); analytics.initAnalytics();
  expect(calls.clients).toHaveBeenCalledTimes(1);
  const props = { action_type: 'check', plant_id: 'p', source: 'home' };
  analytics.trackImpression('today:p:home', analytics.EVENTS.todayActionShown, props);
  analytics.trackImpression('today:p:home', analytics.EVENTS.todayActionShown, props);
  expect(calls.capture).toHaveBeenCalledTimes(1);
  expect(calls.capture).toHaveBeenLastCalledWith('today_action_shown', props);
  analytics.resetAnalyticsUser();
  analytics.trackImpression('today:p:home', analytics.EVENTS.todayActionShown, props);
  expect(calls.capture).toHaveBeenCalledTimes(2);
  vi.unstubAllEnvs();
});
