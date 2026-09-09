import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { todayStr } from '../utils/dateStr';

/** Re-evaluate daily advice after midnight and after returning to the app. */
export function useToday() {
  const [today, setToday] = useState(todayStr);
  const update = useCallback(() => setToday(todayStr()), []);
  useFocusEffect(useCallback(() => { update(); }, [update]));
  useEffect(() => {
    const timer = setInterval(update, 30_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [update]);
  return today;
}
