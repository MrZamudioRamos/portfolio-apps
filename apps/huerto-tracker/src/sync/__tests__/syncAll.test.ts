import { beforeEach, describe, expect, it, vi } from 'vitest';

const UUIDS = {
  user: '00000000-0000-4000-8000-000000000001',
  garden: '00000000-0000-4000-8000-000000000002',
  plant: '00000000-0000-4000-8000-000000000003',
  entry: '00000000-0000-4000-8000-000000000004',
  reminder: '00000000-0000-4000-8000-000000000005',
};

const fixtures = {
  garden: {
    id: UUIDS.garden,
    name: 'Mi huerto',
    province: 'Madrid',
    climateZone: 'continental',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  plant: {
    id: UUIDS.plant,
    gardenId: UUIDS.garden,
    cropId: 'rabano',
    name: 'Rábano',
    status: 'seedling',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  entry: {
    id: UUIDS.entry,
    gardenId: UUIDS.garden,
    plantId: UUIDS.plant,
    type: 'note',
    date: '2026-01-01',
    notes: 'Observación',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  reminder: {
    id: UUIDS.reminder,
    gardenId: UUIDS.garden,
    plantId: UUIDS.plant,
    type: 'watering',
    title: 'Revisar sustrato',
    frequency: 'daily',
    time: { hour: 9, minute: 0 },
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

const harness = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  upsertCalls: [] as { table: string; rows: unknown[] }[],
  failPlants: false,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => harness.storage.get(key) ?? null,
    setItem: async (key: string, value: string) => { harness.storage.set(key, value); },
  },
}));

vi.mock('@portfolio/supabase', () => ({
  upsertAll: async (table: string, rows: unknown[]) => {
    harness.upsertCalls.push({ table, rows });
    if (table === 'plants' && harness.failPlants) throw new Error('23503: crop FK');
  },
  pullAll: async () => [],
}));

vi.mock('../photoSync', () => ({
  uploadLocalPhotos: async () => false,
}));

import { syncToCloud } from '../syncAll';

const keys = {
  gardens: '@portfolio/gardens',
  plants: '@portfolio/plants',
  entries: '@portfolio/diary_entries',
  reminders: '@portfolio/reminders',
};

function seedLocalData() {
  harness.storage.set(keys.gardens, JSON.stringify([fixtures.garden]));
  harness.storage.set(keys.plants, JSON.stringify([fixtures.plant]));
  harness.storage.set(keys.entries, JSON.stringify([fixtures.entry]));
  harness.storage.set(keys.reminders, JSON.stringify([fixtures.reminder]));
}

beforeEach(() => {
  harness.storage.clear();
  harness.upsertCalls.length = 0;
  harness.failPlants = false;
  seedLocalData();
});

describe('syncToCloud dependency waves', () => {
  it('pushes plants before entries and reminders when the dependency chain succeeds', async () => {
    await expect(syncToCloud(UUIDS.user)).resolves.toBe(true);

    const pushedTables = harness.upsertCalls.map(({ table }) => table);
    expect(pushedTables.indexOf('gardens')).toBeGreaterThanOrEqual(0);
    expect(pushedTables.indexOf('plants')).toBeGreaterThan(pushedTables.indexOf('gardens'));
    expect(pushedTables.indexOf('diary_entries')).toBeGreaterThan(pushedTables.indexOf('plants'));
    expect(pushedTables.indexOf('reminders')).toBeGreaterThan(pushedTables.indexOf('plants'));
  });

  it('does not push dependent rows after a plants foreign-key failure', async () => {
    harness.failPlants = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(syncToCloud(UUIDS.user)).resolves.toBe(false);

    const pushedTables = harness.upsertCalls.map(({ table }) => table);
    expect(pushedTables).toContain('plants');
    expect(pushedTables).not.toContain('diary_entries');
    expect(pushedTables).not.toContain('reminders');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('diary_entries (skipped: dependency plants push failed)'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('reminders (skipped: dependency plants push failed)'));
    warn.mockRestore();
  });
});
