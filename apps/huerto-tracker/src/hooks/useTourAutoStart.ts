import { useCallback, useRef, type RefObject } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCopilot } from 'react-native-copilot';
import { COACH_PREFIX } from './useCoachMark';

interface Options {
  /** Only start once this is true (e.g. data loaded). Default true. */
  ready?: boolean;
  /** Step name to start at (avoids copilot starting at whichever registered first). */
  firstStep?: string;
  /** Delay before starting, to let targets lay out. Default 800ms. */
  delay?: number;
  /** Scroll container ref — required for targets inside a FlatList/ScrollView
   *  so copilot can measure and scroll to them. */
  scrollRef?: RefObject<any>;
  /** When true the auto-start is suppressed entirely (coaching level light/off). */
  disabled?: boolean;
}

/**
 * Auto-starts the spotlight tour once per screen, gated by a coach-mark flag.
 * Uses expo-router's useFocusEffect so it re-checks the flag every time the
 * screen gains focus (tab screens stay mounted), making "Replay tutorial"
 * re-run the tour. Must be called inside a SemillitaTourProvider.
 *
 * NOTE: `start` from useCopilot() is a useCallback that re-creates every time
 * copilot's `steps` map changes (step registration). We store it in a ref so
 * the useFocusEffect timer always calls the LATEST version (not the stale one
 * captured when the effect was created, which had an empty `steps` map).
 */
export function useTourAutoStart(gateKey: string, opts: Options = {}) {
  const { ready = true, firstStep, delay = 800, scrollRef, disabled = false } = opts;
  const { start, stop } = useCopilot();

  // Always point to latest functions — useFocusEffect deps don't include them
  // to avoid re-subscribing, but stale closures would miss step registrations.
  const startRef = useRef(start);
  startRef.current = start;
  const stopRef = useRef(stop);
  stopRef.current = stop;

  useFocusEffect(
    useCallback(() => {
      if (!ready || disabled) return;
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      AsyncStorage.getItem(COACH_PREFIX + gateKey).then((v) => {
        if (cancelled || v === 'true') return;
        timer = setTimeout(() => {
          const node = scrollRef?.current as any;
          const scrollable =
            node && typeof node.getScrollResponder === 'function' ? node.getScrollResponder() : node;
          startRef.current(firstStep, scrollable ?? undefined);
          void AsyncStorage.setItem(COACH_PREFIX + gateKey, 'true');
        }, delay);
      });

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        // Stop any running tour — RN Modal stays on top even when this tab
        // loses focus, so dismiss it when the user navigates away.
        stopRef.current();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, disabled, gateKey, firstStep, delay])
  );
}
