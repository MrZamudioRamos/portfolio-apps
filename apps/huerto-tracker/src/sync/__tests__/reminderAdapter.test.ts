import { describe, expect, it } from 'vitest';
import { reminderToRow, rowToReminder } from '../adapters';
import type { GardenReminder } from '../../models/reminder';

const reminder: GardenReminder = {
  id: 'reminder-1',
  gardenId: 'garden-1',
  type: 'custom',
  title: 'Revisar semillero',
  frequency: 'once',
  weekday: 5,
  dueDate: '2026-10-02',
  time: { hour: 18, minute: 30 },
  enabled: true,
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:00.000Z',
};

describe('reminder sync adapter', () => {
  it('persists and restores the selected weekday and exact local due date', () => {
    const row = reminderToRow(reminder, 'user-1');

    expect(row).toMatchObject({ weekday: 5, due_date: '2026-10-02' });
    expect(rowToReminder(row)).toMatchObject({ weekday: 5, dueDate: '2026-10-02' });
  });

  it('keeps old cloud rows without scheduling fields readable', () => {
    const row = { ...reminderToRow(reminder, 'user-1'), weekday: null, due_date: null };

    expect(rowToReminder(row)).toMatchObject({ weekday: undefined, dueDate: undefined });
  });
});
