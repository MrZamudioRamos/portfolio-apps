import * as Notifications from 'expo-notifications';
import type { ReminderFrequency } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const result = await Notifications.requestPermissionsAsync();
  return (result as any).granted ?? (result as any).status === 'granted';
}

export async function cancelReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

interface ScheduleInput {
  title: string;
  frequency: ReminderFrequency;
  time: { hour: number; minute: number };
}

function buildTrigger(frequency: ReminderFrequency, time: { hour: number; minute: number }) {
  const { hour, minute } = time;
  const T = Notifications.SchedulableTriggerInputTypes;
  switch (frequency) {
    // expo-notifications has no native "every N days at a fixed time" trigger:
    // TIME_INTERVAL repeats fire at the creation clock-time, ignoring the
    // chosen hour:minute. We honor the chosen time by firing DAILY instead.
    case 'daily':
    case 'every_2_days':
    case 'every_3_days':
      return { type: T.DAILY, hour, minute };
    case 'weekly':
      return { type: T.WEEKLY, weekday: 2, hour, minute };
    case 'once': {
      const d = new Date();
      d.setHours(hour, minute, 0, 0);
      if (d <= new Date()) d.setDate(d.getDate() + 1);
      return { type: T.DATE, date: d };
    }
  }
}

export async function scheduleReminder(input: ScheduleInput): Promise<string> {
  const trigger = buildTrigger(input.frequency, input.time);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: '🌱 HuertoTracker',
      sound: true,
    },
    trigger: trigger as any,
  });
}

export async function scheduleDateAlert(input: {
  date: Date;
  title: string;
  body: string;
}): Promise<string | null> {
  if (input.date <= new Date()) return null;
  try {
    const T = Notifications.SchedulableTriggerInputTypes;
    return await Notifications.scheduleNotificationAsync({
      content: { title: input.title, body: input.body, sound: true },
      trigger: { type: T.DATE, date: input.date } as any,
    });
  } catch {
    return null;
  }
}
