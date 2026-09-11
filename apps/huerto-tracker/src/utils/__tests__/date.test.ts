import { describe, expect, it, afterEach, vi } from 'vitest';
import { formatRelative } from '@portfolio/shared';

describe('formatRelative', () => {
  afterEach(() => vi.useRealTimers());

  it('uses correct singular and plural forms in Spanish', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));

    expect(formatRelative('2026-09-10T12:00:00Z', 'es')).toBe('ayer');
    expect(formatRelative('2026-09-04T12:00:00Z', 'es')).toBe('hace 1 semana');
    expect(formatRelative('2026-08-11T12:00:00Z', 'es')).toBe('hace 1 mes');
  });

  it('follows the active language for supported locales', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));

    expect(formatRelative('2026-09-04T12:00:00Z', 'en')).toBe('1 week ago');
    expect(formatRelative('2026-09-04T12:00:00Z', 'ca')).toBe('fa 1 setmana');
  });

  it('handles future dates without negative text', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-11T12:00:00Z'));

    expect(formatRelative('2026-09-12T12:00:00Z', 'es')).toBe('mañana');
  });
});
