import { describe, expect, it } from 'vitest';
import { filterEntriesByPeriod, getEntryCalendarYear, type StatsPeriod } from '../statsPeriod';

const entries = [
  { id: 'old', date: '2026-08-24T10:00:00.000Z' },
  { id: 'start', date: '2026-08-25T00:00:00.000Z' },
  { id: 'today', date: '2026-09-23T12:00:00.000Z' },
  { id: 'future', date: '2026-09-24T09:00:00.000Z' },
  { id: 'previous-year', date: '2025-12-31T09:00:00.000Z' },
];

describe('filterEntriesByPeriod', () => {
  const now = new Date(2026, 8, 23, 14, 30);

  it('includes exactly the last 30 local calendar days and excludes future entries', () => {
    expect(filterEntriesByPeriod(entries, 'last30Days', now).map(({ id }) => id))
      .toEqual(['start', 'today']);
  });

  it('includes only entries in the current calendar year', () => {
    expect(filterEntriesByPeriod(entries, 'thisYear', now).map(({ id }) => id))
      .toEqual(['old', 'start', 'today', 'future']);
  });

  it('returns all history unchanged for the all-time period', () => {
    expect(filterEntriesByPeriod(entries, 'all', now)).toBe(entries);
  });

  it('returns no entries when none fall within the selected period', () => {
    const result = filterEntriesByPeriod([{ date: '2025-01-01' }], 'last30Days' satisfies StatsPeriod, now);
    expect(result).toEqual([]);
  });
});

describe('getEntryCalendarYear', () => {
  it('uses the date written in the diary instead of converting midnight UTC to local time', () => {
    expect(getEntryCalendarYear('2026-01-01')).toBe(2026);
    expect(getEntryCalendarYear('2026-01-01T00:00:00.000Z')).toBe(2026);
    expect(getEntryCalendarYear('not-a-date')).toBeNull();
  });
});
