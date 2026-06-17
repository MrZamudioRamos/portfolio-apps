import { useEffect } from 'react';
import { useCopilot } from 'react-native-copilot';
import { useCoachMark } from './useCoachMark';

interface Options {
  /** Only start once this is true (e.g. data loaded). Default true. */
  ready?: boolean;
  /** Step name to start at (avoids copilot starting at whichever registered first). */
  firstStep?: string;
  /** Delay before starting, to let targets lay out. Default 800ms. */
  delay?: number;
}

/**
 * Auto-starts the spotlight tour once per screen on first visit, gated by a
 * coach-mark flag (so "Replay tutorial" re-runs it). Must be called inside a
 * SemillitaTourProvider.
 */
export function useTourAutoStart(gateKey: string, opts: Options = {}) {
  const { ready = true, firstStep, delay = 800 } = opts;
  const tour = useCoachMark(gateKey);
  const { start } = useCopilot();

  useEffect(() => {
    if (!tour.show || !ready) return;
    const id = setTimeout(() => {
      start(firstStep);
      tour.dismiss();
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.show, ready]);
}
