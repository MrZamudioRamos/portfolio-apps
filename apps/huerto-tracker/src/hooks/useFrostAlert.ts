import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { fetchWeather } from '../utils/weather';

const ENABLED_KEY = '@portfolio/frost_alert/enabled';
const LAST_CHECK_KEY = '@portfolio/frost_alert/last_check';
const FROST_THRESHOLD = 2;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function useFrostAlert(province: string | null | undefined) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ENABLED_KEY).then((v) => {
      setEnabled(v === 'true');
      setLoading(false);
    });
  }, []);

  // Check for frost whenever province or enabled changes
  useEffect(() => {
    if (!enabled || !province) return;
    checkFrost(province);
  }, [enabled, province]);

  async function toggle(value: boolean) {
    if (value) {
      const result = await Notifications.requestPermissionsAsync();
      if ((result as any).status !== 'granted' && !(result as any).granted) return;
    }
    await AsyncStorage.setItem(ENABLED_KEY, value ? 'true' : 'false');
    setEnabled(value);
  }

  return { enabled, loading, toggle };
}

export async function checkFrost(province: string): Promise<void> {
  const enabled = await AsyncStorage.getItem(ENABLED_KEY);
  if (enabled !== 'true') return;

  const lastCheckStr = await AsyncStorage.getItem(LAST_CHECK_KEY);
  const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;
  if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;

  try {
    const weather = await fetchWeather(province);
    if (!weather) return;
    await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

    const frostDays = [weather.today, ...weather.forecast].filter(
      (d) => d.tempMin <= FROST_THRESHOLD
    );
    if (frostDays.length === 0) return;

    const minTemp = Math.min(...frostDays.map((d) => d.tempMin));
    const dateStr = new Date(frostDays[0].date + 'T12:00:00').toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌡️ Alerta de helada',
        body: `Temperatura mínima de ${minTemp}°C prevista el ${dateStr}. Protege tus plantas sensibles.`,
        sound: true,
      },
      trigger: null, // immediate
    });
  } catch {
    // Network or other errors silently ignored
  }
}
