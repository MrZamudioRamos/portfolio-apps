import { useCollection } from '@portfolio/storage';
import { requestPermissions, scheduleReminder, cancelReminder } from './scheduler';
import type { SchedulableReminder } from './types';

type CreateInput<T extends SchedulableReminder> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'notificationId'>;

export class NotificationPermissionDeniedError extends Error {
  constructor() {
    super('Notification permission was denied');
    this.name = 'NotificationPermissionDeniedError';
  }
}

async function scheduleIfEnabled(input: ScheduleInput): Promise<string | undefined> {
  if (!input.enabled) return undefined;
  if (!await requestPermissions()) throw new NotificationPermissionDeniedError();
  return scheduleReminder(input);
}

type ScheduleInput = Parameters<typeof scheduleReminder>[0] & { enabled?: boolean };

export function useReminders<T extends SchedulableReminder>(key: string) {
  const collection = useCollection<T>(key);

  async function create(data: CreateInput<T>): Promise<void> {
    const notificationId = await scheduleIfEnabled(data);
    await collection.create({ ...data, notificationId } as Omit<T, 'id' | 'createdAt' | 'updatedAt'>);
  }

  async function toggle(id: string, enabled: boolean): Promise<void> {
    const reminder = collection.getById(id);
    if (!reminder) return;
    if (enabled) {
      if (reminder.notificationId) await cancelReminder(reminder.notificationId).catch(() => {});
      const notificationId = await scheduleIfEnabled(reminder);
      await collection.update(id, { enabled: true, notificationId } as any);
    } else {
      if (reminder.notificationId) await cancelReminder(reminder.notificationId).catch(() => {});
      await collection.update(id, { enabled: false, notificationId: undefined } as any);
    }
  }

  async function update(id: string, data: Partial<CreateInput<T>>): Promise<void> {
    const reminder = collection.getById(id);
    if (!reminder) return;
    if (reminder.notificationId) await cancelReminder(reminder.notificationId).catch(() => {});
    const merged = { ...reminder, ...data };
    const notificationId = await scheduleIfEnabled(merged);
    await collection.update(id, { ...data, notificationId } as any);
  }

  async function remove(id: string): Promise<void> {
    const reminder = collection.getById(id);
    if (reminder?.notificationId) await cancelReminder(reminder.notificationId).catch(() => {});
    await collection.remove(id);
  }

  async function removeMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await cancelNotifs(ids);
    await collection.removeMany(ids);
  }

  async function cancelNotifs(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id) => {
        const reminder = collection.getById(id);
        return reminder?.notificationId
          ? cancelReminder(reminder.notificationId).catch(() => {})
          : Promise.resolve();
      })
    );
  }

  async function softRemove(id: string): Promise<void> {
    const reminder = collection.getById(id);
    if (reminder?.notificationId) await cancelReminder(reminder.notificationId).catch(() => {});
    await collection.softRemove(id);
  }

  async function softRemoveMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await cancelNotifs(ids);
    await collection.softRemoveMany(ids);
  }

  function filter(predicate: (item: T) => boolean): T[] {
    return collection.items.filter(predicate);
  }

  return {
    items: collection.items,
    loading: collection.loading,
    create,
    update,
    toggle,
    remove,
    removeMany,
    softRemove,
    softRemoveMany,
    getById: collection.getById,
    filter,
    refresh: collection.refresh,
  };
}
