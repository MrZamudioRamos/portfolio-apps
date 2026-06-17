import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const PREFIX = '@portfolio/coach/';

/**
 * One-time coach mark per screen. `show` is true only once the flag has
 * loaded AND the user hasn't dismissed it yet, so the tip never flashes on
 * a screen that was already seen.
 */
export function useCoachMark(key: string) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PREFIX + key).then((v) => {
      if (active) setSeen(v === 'true');
    });
    return () => {
      active = false;
    };
  }, [key]);

  const dismiss = useCallback(() => {
    setSeen(true);
    AsyncStorage.setItem(PREFIX + key, 'true');
  }, [key]);

  return { show: seen === false, dismiss };
}

/** Clear all coach marks so the guided tour runs again (e.g. from settings). */
export async function resetCoachMarks(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((k) => k.startsWith(PREFIX));
  if (ours.length) await AsyncStorage.multiRemove(ours);
}
