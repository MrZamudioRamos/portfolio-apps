import type { BaseItem } from '@portfolio/storage';

export type ReminderFrequency =
  | 'daily'
  | 'every_2_days'
  | 'every_3_days'
  | 'weekly'
  | 'once';

export const FREQUENCY_LABELS: Record<ReminderFrequency, string> = {
  daily: 'Cada día',
  every_2_days: 'Cada 2 días',
  every_3_days: 'Cada 3 días',
  weekly: 'Cada semana',
  once: 'Una vez',
};

export interface SchedulableReminder extends BaseItem {
  enabled: boolean;
  notificationId?: string;
  frequency: ReminderFrequency;
  time: { hour: number; minute: number };
  title: string;
}
