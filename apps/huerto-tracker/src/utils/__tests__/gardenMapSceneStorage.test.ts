import { describe, expect, it, vi } from 'vitest';
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
import { freeLayoutKey } from '../../hooks/useGardenFreeLayout';
import { gardenLayoutKey } from '../../hooks/useGardenLayout';
import { gardenMapPlanKey } from '../gardenMapStorageKeys';
import { gardenMapSceneBackupKey, gardenMapSceneKey, loadOrMigrateGardenMapScene } from '../gardenMapSceneStorage';

const gardenId = 'garden-1';
const legacyPlan = {
  version: 1,
  dimensions: { widthCm: 240, lengthCm: 180 },
  structures: [],
  zones: [],
  plannedPlantings: [],
  seasons: [],
  seasonPlans: [],
};
function createMemoryStorage(initial: Record<string, string> = {}, failOnKey?: string) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    async getItem(key: string) { return values.get(key) ?? null; },
    async setItem(key: string, value: string) {
      if (key === failOnKey) throw new Error(`write failed: ${key}`);
      values.set(key, value);
    },
    async multiSet(entries: [string, string][]) {
      if (entries.some(([key]) => key === failOnKey)) throw new Error(`write failed: ${failOnKey}`);
      for (const [key, value] of entries) values.set(key, value);
    },
  };
}

describe('loadOrMigrateGardenMapScene', () => {
  it('backs up raw legacy values before writing a v2 scene and is idempotent', async () => {
    const storage = createMemoryStorage({
      [gardenLayoutKey(gardenId)]: JSON.stringify(['plant-1', null]),
      [freeLayoutKey(gardenId)]: JSON.stringify({}),
      [gardenMapPlanKey(gardenId)]: JSON.stringify(legacyPlan),
    });

    const first = await loadOrMigrateGardenMapScene(gardenId, 'huerto', storage, { rows: 1, cols: 2 });
    const backupBeforeSecondLoad = await storage.getItem(gardenMapSceneBackupKey(gardenId));
    const second = await loadOrMigrateGardenMapScene(gardenId, 'huerto', storage);

    expect(first).toEqual(second);
    expect(first.plantPlacements).toEqual([{ plantId: 'plant-1', x: 0.25, y: 0.5 }]);
    expect(backupBeforeSecondLoad).toContain('plant-1');
    expect(await storage.getItem(gardenMapSceneKey(gardenId))).toContain('"version":2');
    expect(await storage.getItem(`@portfolio/huerto/garden_map_scene/${gardenId}/migration`)).toBe('2');
  });

  it('keeps the legacy values intact when writing the new scene fails', async () => {
    const rawGrid = '["plant-1"]';
    const storage = createMemoryStorage({ [gardenLayoutKey(gardenId)]: rawGrid }, gardenMapSceneKey(gardenId));

    await expect(loadOrMigrateGardenMapScene(gardenId, 'huerto', storage)).rejects.toThrow(/write failed/);

    expect(await storage.getItem(gardenLayoutKey(gardenId))).toBe(rawGrid);
    expect(JSON.parse((await storage.getItem(gardenMapSceneBackupKey(gardenId)))!).values.grid).toBe(rawGrid);
    expect(await storage.getItem(gardenMapSceneKey(gardenId))).toBeNull();
    expect(await storage.getItem(`@portfolio/huerto/garden_map_scene/${gardenId}/migration`)).toBeNull();
  });

  it('retains a backup and refuses to migrate an unknown legacy plan version', async () => {
    const rawPlan = JSON.stringify({ ...legacyPlan, version: 900 });
    const storage = createMemoryStorage({ [gardenMapPlanKey(gardenId)]: rawPlan });

    await expect(loadOrMigrateGardenMapScene(gardenId, 'huerto', storage)).rejects.toThrow(/version/i);

    expect(JSON.parse((await storage.getItem(gardenMapSceneBackupKey(gardenId)))!).values.plan).toBe(rawPlan);
    expect(await storage.getItem(gardenMapSceneKey(gardenId))).toBeNull();
  });
});
