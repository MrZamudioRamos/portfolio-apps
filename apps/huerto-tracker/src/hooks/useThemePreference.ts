import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_PREFERENCE_KEY = '@portfolio/settings/theme_preference';
let currentPreference: ThemePreference = 'system';
const listeners = new Set<(preference: ThemePreference) => void>();

function publishPreference(preference: ThemePreference) {
  currentPreference = preference;
  for (const listener of listeners) listener(preference);
}

function applyPreference(preference: ThemePreference) {
  // Appearance.setColorScheme is supported by native Expo and web. Keep the
  // guard for older Expo Go runtimes so settings never become a hard failure.
  try {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  } catch {
    // ThemeProvider still follows the system scheme when unavailable.
  }
}

export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(currentPreference);

  useEffect(() => {
    let mounted = true;
    const listener = (next: ThemePreference) => {
      if (mounted) setPreferenceState(next);
    };
    listeners.add(listener);
    void AsyncStorage.getItem(THEME_PREFERENCE_KEY).then((value) => {
      if (!mounted) return;
      const next = value === 'light' || value === 'dark' ? value : 'system';
      publishPreference(next);
      applyPreference(next);
    }).catch(() => {});
    return () => { mounted = false; listeners.delete(listener); };
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    publishPreference(next);
    applyPreference(next);
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, next);
  }, []);

  return { preference, setPreference };
}

export async function loadThemePreference() {
  try {
    const value = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
    const preference: ThemePreference = value === 'light' || value === 'dark' ? value : 'system';
    publishPreference(preference);
    applyPreference(preference);
    return preference;
  } catch {
    return 'system' as const;
  }
}
