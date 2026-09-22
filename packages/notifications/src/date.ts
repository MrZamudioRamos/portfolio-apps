export interface ReminderTime {
  hour: number;
  minute: number;
}

/** Builds a device-local notification date from the ISO date selected in the app. */
export function localReminderDate(dateKey: string, time: ReminderTime, now = new Date()): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)
    || !Number.isInteger(time.hour) || time.hour < 0 || time.hour > 23
    || !Number.isInteger(time.minute) || time.minute < 0 || time.minute > 59) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, time.hour, time.minute, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date > now ? date : null;
}
