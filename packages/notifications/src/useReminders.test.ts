import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const create = vi.fn();
  const update = vi.fn();
  return {
    requestPermissions: vi.fn(),
    scheduleReminder: vi.fn(),
    cancelReminder: vi.fn(),
    create,
    update,
    collection: {
      items: [], loading: false, create, update,
      remove: vi.fn(), removeMany: vi.fn(), softRemove: vi.fn(), softRemoveMany: vi.fn(),
      getById: vi.fn(), refresh: vi.fn(),
    },
  };
});
const { requestPermissions, scheduleReminder, cancelReminder, create, update, collection } = mocks;

vi.mock('@portfolio/storage', () => ({ useCollection: () => mocks.collection }));
vi.mock('./scheduler', () => ({ requestPermissions: mocks.requestPermissions, scheduleReminder: mocks.scheduleReminder, cancelReminder: mocks.cancelReminder }));

import { NotificationPermissionDeniedError, useReminders } from './useReminders';

const reminder = {
  gardenId: 'g1',
  title: 'Revisar tierra',
  frequency: 'daily' as const,
  time: { hour: 8, minute: 0 },
  enabled: true,
};

describe('useReminders permission boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestPermissions.mockResolvedValue(true);
    scheduleReminder.mockResolvedValue('notification-1');
  });

  it('does not request permission when the hook is mounted for reading', () => {
    useReminders('reminders');
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('requests only when creating an enabled reminder', async () => {
    await useReminders('reminders').create(reminder);
    expect(requestPermissions).toHaveBeenCalledTimes(1);
    expect(scheduleReminder).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ notificationId: 'notification-1' }));
  });

  it('does not persist an enabled reminder after permission denial', async () => {
    requestPermissions.mockResolvedValue(false);
    await expect(useReminders('reminders').create(reminder)).rejects.toBeInstanceOf(NotificationPermissionDeniedError);
    expect(scheduleReminder).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
