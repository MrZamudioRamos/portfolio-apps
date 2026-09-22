import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWeather, type WeatherData } from '../utils/weather';

const WEATHER_CACHE_PREFIX = '@portfolio/weather-cache/';

export type WeatherSnapshot = WeatherData & {
  source: 'live' | 'cache';
  fetchedAt: string;
};

type WeatherCache = {
  weather: WeatherData;
  fetchedAt: string;
};

export function useWeather(province: string | null | undefined) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!province) {
      setWeather(null);
      setError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    // Show the last successful real response immediately while asking the
    // provider for a fresh forecast. Cached values are labelled in the hook's
    // result so the UI never presents stale data as live.
    try {
      const rawCache = await AsyncStorage.getItem(WEATHER_CACHE_PREFIX + province);
      if (rawCache && currentRequest === requestId.current) {
        const cached = JSON.parse(rawCache) as WeatherCache;
        if (cached.weather?.province === province && cached.fetchedAt) {
          setWeather({ ...cached.weather, source: 'cache', fetchedAt: cached.fetchedAt });
        }
      }
    } catch {
      // A cache failure must not prevent the live request.
    }

    try {
      const data = await fetchWeather(province);
      if (currentRequest !== requestId.current) return;
      if (!data) {
        setError(true);
        return;
      }
      const fetchedAt = new Date().toISOString();
      setWeather({ ...data, source: 'live', fetchedAt });
      await AsyncStorage.setItem(
        WEATHER_CACHE_PREFIX + province,
        JSON.stringify({ weather: data, fetchedAt } satisfies WeatherCache),
      );
    } catch {
      if (currentRequest === requestId.current) setError(true);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [province]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { weather, loading, error, refresh };
}
