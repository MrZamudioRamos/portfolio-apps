import { describe, expect, it } from 'vitest';
import { expoWeekdayForDate, getForecastCareNotes } from '../weatherPlanner';

describe('weather-based garden checks', () => {
  it('uses only forecast measurements and avoids automatic watering advice', () => {
    const notes = getForecastCareNotes([
      { date: '2026-09-23', tempMax: 38, tempMin: 1, precipitationMm: 8, rainProbability: 80, weatherCode: 61 },
    ]);
    expect(notes.map((note) => note.kind)).toEqual(['cold', 'rain', 'heat']);
    expect(notes[1].detail).toContain('8 mm');
    expect(notes[2].detail).toContain('no activa un riego automático');
  });

  it('does not create advice below the defined weather thresholds', () => {
    expect(getForecastCareNotes([
      { date: '2026-09-23', tempMax: 34.9, tempMin: 2.1, precipitationMm: 4.9, rainProbability: 59, weatherCode: 2 },
    ])).toEqual([]);
  });

  it('maps forecast dates to Expo weekday numbering and rejects invalid dates', () => {
    expect(expoWeekdayForDate('2026-09-27')).toBe(1); // Sunday
    expect(expoWeekdayForDate('2026-09-28')).toBe(2); // Monday
    expect(expoWeekdayForDate('2026-02-31')).toBeNull();
  });
});
