import { useCollection } from '@portfolio/storage';
import type { BaseItem } from '@portfolio/storage';
import { useEffect } from 'react';
import { requestPermissions, scheduleReminder, cancelReminder } from './scheduler';
import type { SchedulableReminder } from './types';

type CreateInput<T extends SchedulableReminder> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'notificationId'>;

export function useReminders<T extends SchedulableReminder>(key: string) {
  const collection = useCollection<T>(key);

  useEffect(() => {
    requestPermissions();
  }, []);

  async function create(data: CreateInput<T>): Promise<void> {
    let notificationId: string | undefined;
    if (data.enabled) {
      notificationId = await scheduleReminder(data).catch(() => undefined);
    }
    await collection.create({ ...data, notificationId } as Omit<T, keyof BaseItem>);
  }

  async function toggle(id: string, enabled: boolean): Promise<void> {
    const reminder = collection.getById(id);
    if (!reminder) return;
    if (enabled) {
      if (reminder.notificationId) await cancelReminder(reminder.notificationId).catch(() => {});
      const notificationId = await scheduleReminder(reminder).catch(() => undefined);
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
    let notificationId: string | undefined;
    if (merged.enabled) {
      notificationId = await scheduleReminder(merged).catch(() => undefined);
    }
    await collection.update(id, { ...data, notificationId } as any);
  }

  async function remove(id: string): Promise<void> {
    const reminder = collection.getById(id);
    if (reminder?.notificationId) await cancelReminder(reminder.notificationId).catch(() => {});
    await collection.remove(id);
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
    getById: collection.getById,
    filter,
    refresh: collection.refresh,
  };
}
