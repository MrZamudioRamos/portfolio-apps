import { describe, expect, it } from 'vitest';
import { localReminderDate } from '../../../../../packages/notifications/src/date';

describe('exact local reminder date', () => {
  it('uses the device-local date and time and only returns future dates', () => {
    const now = new Date(2026, 8, 22, 12, 0);
    const result = localReminderDate('2026-09-23', { hour: 8, minute: 15 }, now);

    expect(result).toEqual(new Date(2026, 8, 23, 8, 15));
    expect(localReminderDate('2026-09-22', { hour: 11, minute: 59 }, now)).toBeNull();
  });

  it('rejects invalid dates and out-of-range times', () => {
    const now = new Date(2026, 8, 1);
    expect(localReminderDate('2026-02-31', { hour: 10, minute: 0 }, now)).toBeNull();
    expect(localReminderDate('2026-09-23', { hour: 24, minute: 0 }, now)).toBeNull();
    expect(localReminderDate('2026-09-23', { hour: 10, minute: 60 }, now)).toBeNull();
  });
});
