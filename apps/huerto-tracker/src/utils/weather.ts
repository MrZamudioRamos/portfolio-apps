export interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationMm: number;
  rainProbability: number; // 0-100
  weatherCode: number;
}

export interface WeatherData {
  province: string;
  today: WeatherDay;
  forecast: WeatherDay[]; // next 2 days after today
  wateringAdvice: 'skip' | 'reduce' | 'normal';
  wateringKey: string;                   // i18n key
  wateringParams: Record<string, number>; // interpolation params
}

// Capital coordinates for each Spanish province
const PROVINCE_COORDS: Record<string, [number, number]> = {
  'A Coruña':                 [43.362, -8.412],
  'Álava':                    [42.846, -2.672],
  'Albacete':                 [38.994, -1.858],
  'Alicante':                 [38.345, -0.490],
  'Almería':                  [36.840, -2.467],
  'Asturias':                 [43.361, -5.849],
  'Ávila':                    [40.656, -4.700],
  'Badajoz':                  [38.879, -6.970],
  'Baleares':                 [39.570, 2.650],
  'Barcelona':                [41.383, 2.183],
  'Burgos':                   [42.344, -3.696],
  'Cáceres':                  [39.476, -6.372],
  'Cádiz':                    [36.527, -6.288],
  'Cantabria':                [43.462, -3.810],
  'Castellón':                [39.986, -0.028],
  'Ceuta':                    [35.890, -5.307],
  'Ciudad Real':              [38.986, -3.928],
  'Córdoba':                  [37.888, -4.779],
  'Cuenca':                   [40.070, -2.137],
  'Girona':                   [41.983, 2.824],
  'Granada':                  [37.176, -3.597],
  'Guadalajara':              [40.633, -3.167],
  'Guipúzcoa':               [43.313, -1.975],
  'Huelva':                   [37.261, -6.954],
  'Huesca':                   [42.136, -0.408],
  'Jaén':                     [37.769, -3.790],
  'La Rioja':                 [42.466, -2.440],
  'Las Palmas':               [28.099, -15.413],
  'León':                     [42.598, -5.567],
  'Lleida':                   [41.614, 0.624],
  'Lugo':                     [43.012, -7.555],
  'Madrid':                   [40.416, -3.703],
  'Málaga':                   [36.720, -4.420],
  'Melilla':                  [35.292, -2.938],
  'Murcia':                   [37.983, -1.130],
  'Navarra':                  [42.812, -1.645],
  'Ourense':                  [42.336, -7.864],
  'Palencia':                 [42.010, -4.534],
  'Pontevedra':               [42.433, -8.648],
  'Salamanca':                [40.965, -5.664],
  'Santa Cruz de Tenerife':   [28.463, -16.252],
  'Segovia':                  [40.948, -4.119],
  'Sevilla':                  [37.389, -5.984],
  'Soria':                    [41.764, -2.465],
  'Tarragona':                [41.119, 1.245],
  'Teruel':                   [40.344, -1.106],
  'Toledo':                   [39.857, -4.024],
  'Valencia':                 [39.470, -0.376],
  'Valladolid':               [41.652, -4.724],
  'Vizcaya':                  [43.263, -2.935],
  'Zamora':                   [41.503, -5.745],
  'Zaragoza':                 [41.656, -0.878],
};

// Maps WMO weather code to an i18n key and emoji
const WMO_MAP: Record<number, { key: string; emoji: string }> = {
  0:  { key: 'weather.clear',         emoji: '☀️' },
  1:  { key: 'weather.mostlyClear',   emoji: '🌤️' },
  2:  { key: 'weather.partlyCloudy',  emoji: '⛅' },
  3:  { key: 'weather.cloudy',        emoji: '☁️' },
  45: { key: 'weather.fog',           emoji: '🌫️' },
  48: { key: 'weather.frostFog',      emoji: '🌫️' },
  51: { key: 'weather.drizzle',       emoji: '🌦️' },
  53: { key: 'weather.drizzle',       emoji: '🌦️' },
  55: { key: 'weather.drizzle',       emoji: '🌦️' },
  61: { key: 'weather.lightRain',     emoji: '🌧️' },
  63: { key: 'weather.rain',          emoji: '🌧️' },
  65: { key: 'weather.heavyRain',     emoji: '🌧️' },
  71: { key: 'weather.lightSnow',     emoji: '🌨️' },
  73: { key: 'weather.snow',          emoji: '❄️' },
  80: { key: 'weather.showers',       emoji: '🌦️' },
  81: { key: 'weather.showers',       emoji: '🌦️' },
  95: { key: 'weather.thunderstorm',  emoji: '⛈️' },
  99: { key: 'weather.hailstorm',     emoji: '⛈️' },
};

export function getWeatherLabel(code: number): { key: string; emoji: string } {
  return WMO_MAP[code] ?? { key: 'weather.variable', emoji: '🌤️' };
}

function buildWateringAdvice(today: WeatherDay): {
  advice: WeatherData['wateringAdvice'];
  wateringKey: string;
  wateringParams: Record<string, number>;
} {
  if (today.rainProbability >= 60 || today.precipitationMm >= 5) {
    return {
      advice: 'skip',
      wateringKey: 'weather.wateringSkip',
      wateringParams: { rain: today.rainProbability },
    };
  }
  if (today.rainProbability >= 30 || today.precipitationMm >= 2) {
    return {
      advice: 'reduce',
      wateringKey: 'weather.wateringReduce',
      wateringParams: { rain: today.rainProbability },
    };
  }
  if (today.tempMax >= 35) {
    return {
      advice: 'normal',
      wateringKey: 'weather.wateringHot',
      wateringParams: { temp: today.tempMax },
    };
  }
  return {
    advice: 'normal',
    wateringKey: 'weather.wateringNormal',
    wateringParams: { temp: today.tempMax, rain: today.rainProbability },
  };
}

export async function fetchWeather(province: string): Promise<WeatherData | null> {
  const coords = PROVINCE_COORDS[province];
  if (!coords) return null;

  const [lat, lon] = coords;
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode` +
    `&forecast_days=3&timezone=Europe%2FMadrid`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const json = await res.json();
    const d = json.daily;

    const days: WeatherDay[] = (d.time as string[]).map((date: string, i: number) => ({
      date,
      tempMax: Math.round(d.temperature_2m_max[i]),
      tempMin: Math.round(d.temperature_2m_min[i]),
      precipitationMm: Math.round(d.precipitation_sum[i] * 10) / 10,
      rainProbability: d.precipitation_probability_max[i] ?? 0,
      weatherCode: d.weathercode[i],
    }));

    const [today, ...rest] = days;
    const { advice, wateringKey, wateringParams } = buildWateringAdvice(today);

    return {
      province,
      today,
      forecast: rest,
      wateringAdvice: advice,
      wateringKey,
      wateringParams,
    };
  } catch {
    return null;
  }
}
