import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const ONBOARDING_KEY = '@portfolio/onboarding_completed';

export interface UseOnboardingResult {
  completed: boolean;
  isLoading: boolean;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
}

export function useOnboarding(appKey?: string): UseOnboardingResult {
  const key = appKey ? `${ONBOARDING_KEY}_${appKey}` : ONBOARDING_KEY;
  const [completed, setCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(key).then((value) => {
      setCompleted(value === 'true');
      setIsLoading(false);
    });
  }, [key]);

  const complete = useCallback(async () => {
    await AsyncStorage.setItem(key, 'true');
    setCompleted(true);
  }, [key]);

  const reset = useCallback(async () => {
    await AsyncStorage.removeItem(key);
    setCompleted(false);
  }, [key]);

  return { completed, isLoading, complete, reset };
}
