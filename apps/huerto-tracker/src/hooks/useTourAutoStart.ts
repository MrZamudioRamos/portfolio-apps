import { useEffect, type RefObject } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
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
}

/**
 * Auto-starts the spotlight tour once per screen, gated by a coach-mark flag.
 * Re-checks the flag on every focus (not just mount) so "Replay tutorial"
 * re-runs the tour even on tab screens that stay mounted across navigation.
 * Must be called inside a SemillitaTourProvider.
 */
export function useTourAutoStart(gateKey: string, opts: Options = {}) {
  const { ready = true, firstStep, delay = 800, scrollRef } = opts;
  const isFocused = useIsFocused();
  const { start } = useCopilot();

  useEffect(() => {
    if (!isFocused || !ready) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    AsyncStorage.getItem(COACH_PREFIX + gateKey).then((v) => {
      if (cancelled || v === 'true') return;
      timer = setTimeout(() => {
        // copilot calls scrollView.scrollTo() — FlatList lacks it, so hand it
        // the inner ScrollView via getScrollResponder() when present.
        const node = scrollRef?.current as any;
        const scrollable =
          node && typeof node.getScrollResponder === 'function' ? node.getScrollResponder() : node;
        start(firstStep, scrollable ?? undefined);
        void AsyncStorage.setItem(COACH_PREFIX + gateKey, 'true');
      }, delay);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, ready, gateKey]);
}
