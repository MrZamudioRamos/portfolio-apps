export type StatsPeriod = 'last30Days' | 'thisYear' | 'all';

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Filters garden records using local calendar dates, inclusive of today and the start day. */
export function filterEntriesByPeriod<T extends { date: string }>(
  entries: T[],
  period: StatsPeriod,
  now: Date = new Date(),
): T[] {
  if (period === 'all') return entries;
  if (period === 'thisYear') {
    const year = String(now.getFullYear());
    return entries.filter(({ date }) => date.slice(0, 4) === year);
  }

  const today = localDateKey(now);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - 29);
  const firstDay = localDateKey(start);

  return entries.filter(({ date }) => {
    const day = date.slice(0, 10);
    return day >= firstDay && day <= today;
  });
}
