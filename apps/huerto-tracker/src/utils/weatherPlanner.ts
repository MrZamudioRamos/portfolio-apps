import type { WeatherDay } from './weather';

export interface ForecastCareNote {
  date: string;
  kind: 'cold' | 'rain' | 'heat';
  title: string;
  detail: string;
}

/** Turns provider observations into cautious checks, never automatic watering instructions. */
export function getForecastCareNotes(days: WeatherDay[]): ForecastCareNote[] {
  return days.flatMap((day) => {
    const notes: ForecastCareNote[] = [];
    if (day.tempMin <= 2) notes.push({
      date: day.date,
      kind: 'cold',
      title: 'Mínima cercana a 2 °C',
      detail: `La previsión marca ${day.tempMin} °C. Comprueba qué cultivos son sensibles al frío antes de protegerlos.`,
    });
    if (day.precipitationMm >= 5 && day.rainProbability >= 60) notes.push({
      date: day.date,
      kind: 'rain',
      title: 'Lluvia prevista',
      detail: `${day.precipitationMm} mm y ${day.rainProbability}% de probabilidad. Revisa el drenaje y comprueba el sustrato antes de decidir el riego.`,
    });
    if (day.tempMax >= 35) notes.push({
      date: day.date,
      kind: 'heat',
      title: 'Temperatura alta prevista',
      detail: `Máxima de ${day.tempMax} °C. Observa las plantas y verifica la humedad del sustrato; la previsión no activa un riego automático.`,
    });
    return notes;
  });
}

/** Expo uses 1 = Sunday and 2–7 = Monday–Saturday. */
export function expoWeekdayForDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.getDay() === 0 ? 1 : date.getDay() + 1;
}
