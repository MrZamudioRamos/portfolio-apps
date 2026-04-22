import * as Notifications from 'expo-notifications';

export interface MonthlyAlert {
  year: number;
  month: number; // 1–12
  hour?: number;
  minute?: number;
  title: string;
  body: string;
}

export async function scheduleMonthlyAlerts(alerts: MonthlyAlert[]): Promise<string[]> {
  const T = Notifications.SchedulableTriggerInputTypes;
  const ids: string[] = [];

  for (const alert of alerts) {
    const date = new Date(alert.year, alert.month - 1, 1, alert.hour ?? 9, alert.minute ?? 0, 0);
    if (date <= new Date()) continue;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: alert.title,
          body: alert.body,
          sound: true,
        },
        trigger: { type: T.DATE, date } as any,
      });
      ids.push(id);
    } catch {
      // skip alerts that fail to schedule (permissions not granted, etc.)
    }
  }

  return ids;
}

export async function cancelMonthlyAlerts(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
}
