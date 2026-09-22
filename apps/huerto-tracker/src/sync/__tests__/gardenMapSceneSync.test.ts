import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('@portfolio/supabase', () => ({ saveGardenMapScene: vi.fn() }));
import { applyMapSceneSaveResult, decideMapSceneSync, type MapSceneConflictRecord } from '../gardenMapSceneSync';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    async getItem(key: string) { return values.get(key) ?? null; },
    async setItem(key: string, value: string) { values.set(key, value); },
    async multiSet(entries: [string, string][]) { for (const [key, value] of entries) values.set(key, value); },
  };
}

const localScene = { version: 2, structures: [], zones: [], plantPlacements: [], plannedPlantings: [], seasons: [] };
const remoteScene = { ...localScene, dimensions: { widthCm: 120, lengthCm: 80 } };

describe('garden map scene sync', () => {
  it('reports conflict instead of overwriting a dirty local scene at an older revision', () => {
    expect(decideMapSceneSync({ localRevision: 3, remoteRevision: 4, localDirty: true })).toBe('conflict');
  });

  it('pulls a newer remote scene when the local scene is clean', () => {
    expect(decideMapSceneSync({ localRevision: 3, remoteRevision: 4, localDirty: false })).toBe('pull');
  });

  it('stores both versions on a stale RPC response and keeps the local scene dirty', async () => {
    const storage = memoryStorage();
    await applyMapSceneSaveResult('garden-1', localScene, {
      status: 'conflict', revision: 4, updatedAt: '2026-09-22T10:00:00Z', scene: remoteScene,
    }, storage);

    const conflict = JSON.parse((await storage.getItem('@portfolio/huerto/garden_map_scene/garden-1/conflict'))!) as MapSceneConflictRecord;
    expect(conflict.localScene).toEqual(localScene);
    expect(conflict.remoteScene).toEqual(remoteScene);
    expect(await storage.getItem('@portfolio/huerto/garden_map_scene/garden-1/dirty')).toBe('1');
  });

  it('acknowledges a saved scene and clears dirty state', async () => {
    const storage = memoryStorage();
    await applyMapSceneSaveResult('garden-1', localScene, {
      status: 'saved', revision: 5, updatedAt: '2026-09-22T10:01:00Z', scene: localScene,
    }, storage);

    expect(await storage.getItem('@portfolio/huerto/garden_map_scene/garden-1/revision')).toBe('5');
    expect(await storage.getItem('@portfolio/huerto/garden_map_scene/garden-1/dirty')).toBe('0');
    expect(await storage.getItem('@portfolio/huerto/garden_map_scene/garden-1/conflict')).toBe('');
  });
});
