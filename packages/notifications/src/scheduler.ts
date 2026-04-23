import * as Notifications from 'expo-notifications';
import type { ReminderFrequency } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
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
    case 'daily':
      return { type: T.DAILY, hour, minute };
    case 'every_2_days':
      return { type: T.TIME_INTERVAL, seconds: 172800, repeats: true };
    case 'every_3_days':
      return { type: T.TIME_INTERVAL, seconds: 259200, repeats: true };
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
