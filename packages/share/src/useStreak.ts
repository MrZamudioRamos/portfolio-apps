import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_MILESTONES = [3, 7, 14, 30, 100];

interface StreakData {
  current: number;
  longest: number;
  lastActivityDate: string | null;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface StreakResult {
  current: number;
  longest: number;
  registerActivity: () => Promise<{ current: number; isNew: boolean }>;
  isMilestone: (n: number) => boolean;
}

export function useStreak(key: string, milestones = DEFAULT_MILESTONES): StreakResult {
  const storageKey = `@portfolio/share/streak/${key}`;
  const [data, setData] = useState<StreakData>({ current: 0, longest: 0, lastActivityDate: null });

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (raw) setData(JSON.parse(raw));
    });
  }, [storageKey]);

  const registerActivity = useCallback(async (): Promise<{ current: number; isNew: boolean }> => {
    const t = todayISO();
    const y = yesterdayISO();
    const raw = await AsyncStorage.getItem(storageKey);
    const prev: StreakData = raw
      ? JSON.parse(raw)
      : { current: 0, longest: 0, lastActivityDate: null };

    // Idempotent: same day = no change
    if (prev.lastActivityDate === t) return { current: prev.current, isNew: false };

    const current = prev.lastActivityDate === y ? prev.current + 1 : 1;
    const next: StreakData = {
      current,
      longest: Math.max(current, prev.longest),
      lastActivityDate: t,
    };
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    setData(next);
    return { current, isNew: true };
  }, [storageKey]);

  const isMilestone = useCallback((n: number) => milestones.includes(n), [milestones]);

  return { current: data.current, longest: data.longest, registerActivity, isMilestone };
}
