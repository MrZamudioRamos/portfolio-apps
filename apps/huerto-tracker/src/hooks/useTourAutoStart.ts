import { useEffect, type RefObject } from 'react';
import { useCopilot } from 'react-native-copilot';
import { useCoachMark } from './useCoachMark';

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
 * Auto-starts the spotlight tour once per screen on first visit, gated by a
 * coach-mark flag (so "Replay tutorial" re-runs it). Must be called inside a
 * SemillitaTourProvider.
 */
export function useTourAutoStart(gateKey: string, opts: Options = {}) {
  const { ready = true, firstStep, delay = 800, scrollRef } = opts;
  const tour = useCoachMark(gateKey);
  const { start } = useCopilot();

  useEffect(() => {
    if (!tour.show || !ready) return;
    const id = setTimeout(() => {
      // copilot calls scrollView.scrollTo() — FlatList lacks it, so hand it
      // the inner ScrollView via getScrollResponder() when present.
      const node = scrollRef?.current as any;
      const scrollable =
        node && typeof node.getScrollResponder === 'function' ? node.getScrollResponder() : node;
      start(firstStep, scrollable ?? undefined);
      tour.dismiss();
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.show, ready]);
}
