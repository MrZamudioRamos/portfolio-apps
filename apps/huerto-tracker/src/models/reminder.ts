import type { BaseItem } from '@portfolio/storage';

export type ReminderType = 'watering' | 'fertilizing' | 'harvest_check' | 'custom';

export type ReminderFrequency =
  | 'daily'
  | 'every_2_days'
  | 'every_3_days'
  | 'weekly'
  | 'once';

export interface GardenReminder extends BaseItem {
  gardenId: string;
  plantId?: string;
  type: ReminderType;
  title: string;
  frequency: ReminderFrequency;
  time: { hour: number; minute: number };
  enabled: boolean;
  notificationId?: string;
}

export const REMINDER_TYPE_CONFIG: Record<
  ReminderType,
  { label: string; emoji: string; defaultTitle: string }
> = {
  watering: {
    label: 'Riego',
    emoji: '💧',
    defaultTitle: 'Hora de regar',
  },
  fertilizing: {
    label: 'Abono',
    emoji: '🌾',
    defaultTitle: 'Toca abonar',
  },
  harvest_check: {
    label: 'Revisar cosecha',
    emoji: '🧺',
    defaultTitle: 'Revisa si hay cosecha',
  },
  custom: {
    label: 'Personalizado',
    emoji: '🔔',
    defaultTitle: 'Recordatorio de huerto',
  },
};

export const FREQUENCY_LABELS: Record<ReminderFrequency, string> = {
  daily: 'Cada día',
  every_2_days: 'Cada 2 días',
  every_3_days: 'Cada 3 días',
  weekly: 'Cada semana',
  once: 'Una vez',
};
