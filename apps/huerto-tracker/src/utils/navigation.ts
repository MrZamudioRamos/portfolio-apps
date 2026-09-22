import type { Href, ImperativeRouter } from 'expo-router';

/**
 * Return to the previous screen when the stack has one, otherwise land on a
 * stable parent route. This avoids an unhandled GO_BACK action when a screen
 * is opened directly from a deep link or browser URL.
 */
export function goBackOr(
  router: Pick<ImperativeRouter, 'back' | 'canGoBack' | 'replace'>,
  fallback: Href = '/(tabs)',
): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
