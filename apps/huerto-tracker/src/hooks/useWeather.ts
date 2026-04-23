import { useEffect, useRef, useState } from 'react';
import { fetchWeather, type WeatherData } from '../utils/weather';

export function useWeather(province: string | null | undefined) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastProvince = useRef<string | null>(null);

  useEffect(() => {
    if (!province || province === lastProvince.current) return;
    lastProvince.current = province;
    setLoading(true);
    setError(false);
    fetchWeather(province)
      .then((data) => {
        setWeather(data);
        if (!data) setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [province]);

  return { weather, loading, error };
}
