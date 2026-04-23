import type { SchedulableReminder, ReminderFrequency } from '@portfolio/notifications';
export type { ReminderFrequency } from '@portfolio/notifications';
export { FREQUENCY_LABELS } from '@portfolio/notifications';

export type ReminderType = 'watering' | 'fertilizing' | 'harvest_check' | 'custom';

export interface GardenReminder extends SchedulableReminder {
  gardenId: string;
  plantId?: string;
  type: ReminderType;
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
