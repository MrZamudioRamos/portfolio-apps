import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveGardenMapScene, type MapSceneSaveResult } from '@portfolio/supabase';
import { gardenMapSceneKey, gardenMapSceneTimestampKey, type GardenMapSceneStorage } from '../utils/gardenMapSceneStorage';

export type MapSceneSyncDecision = 'push' | 'pull' | 'conflict' | 'noop';

export interface MapSceneConflictRecord {
  localRevision: number;
  remoteRevision: number;
  localScene: unknown;
  remoteScene: unknown;
  remoteUpdatedAt: string;
  detectedAt: string;
}

export const gardenMapSceneRevisionKey = (gardenId: string) => `${gardenMapSceneKey(gardenId)}/revision`;
export const gardenMapSceneDirtyKey = (gardenId: string) => `${gardenMapSceneKey(gardenId)}/dirty`;
export const gardenMapSceneConflictKey = (gardenId: string) => `${gardenMapSceneKey(gardenId)}/conflict`;

export function decideMapSceneSync(input: {
  localRevision: number;
  remoteRevision: number;
  localDirty: boolean;
}): MapSceneSyncDecision {
  if (input.localDirty && input.remoteRevision > input.localRevision) return 'conflict';
  if (input.localDirty) return 'push';
  if (input.remoteRevision > input.localRevision) return 'pull';
  return 'noop';
}

export async function applyMapSceneSaveResult(
  gardenId: string,
  localScene: unknown,
  result: MapSceneSaveResult,
  storage: GardenMapSceneStorage = AsyncStorage,
  localRevision = 0,
): Promise<void> {
  if (result.status === 'saved') {
    await storage.multiSet([
      [gardenMapSceneKey(gardenId), JSON.stringify(result.scene ?? localScene)],
      [gardenMapSceneRevisionKey(gardenId), String(result.revision)],
      [gardenMapSceneTimestampKey(gardenId), result.updatedAt],
      [gardenMapSceneDirtyKey(gardenId), '0'],
      [gardenMapSceneConflictKey(gardenId), ''],
    ]);
    return;
  }

  const conflict: MapSceneConflictRecord = {
    localRevision,
    remoteRevision: result.revision,
    localScene,
    remoteScene: result.scene,
    remoteUpdatedAt: result.updatedAt,
    detectedAt: new Date().toISOString(),
  };
  await storage.multiSet([
    [gardenMapSceneConflictKey(gardenId), JSON.stringify(conflict)],
    [gardenMapSceneDirtyKey(gardenId), '1'],
  ]);
}

export async function pushMapSceneToCloud(
  gardenId: string,
  storage: GardenMapSceneStorage = AsyncStorage,
  save: typeof saveGardenMapScene = saveGardenMapScene,
): Promise<'skipped' | 'saved' | 'conflict'> {
  const rawScene = await storage.getItem(gardenMapSceneKey(gardenId));
  if (!rawScene) return 'skipped';
  const dirty = await storage.getItem(gardenMapSceneDirtyKey(gardenId));
  const rawRevision = await storage.getItem(gardenMapSceneRevisionKey(gardenId));
  if (dirty === '0' && rawRevision !== null) return 'skipped';

  const scene = parseJson(rawScene, 'local garden map scene');
  const expectedRevision = parseRevision(rawRevision);
  const result = await save(gardenId, expectedRevision, scene);
  await applyMapSceneSaveResult(gardenId, scene, result, storage, expectedRevision);
  return result.status;
}

export async function reconcileRemoteMapScene(input: {
  gardenId: string;
  scene: unknown;
  revision: number;
  updatedAt: string;
  storage?: GardenMapSceneStorage;
}): Promise<MapSceneSyncDecision> {
  const storage = input.storage ?? AsyncStorage;
  const rawLocalScene = await storage.getItem(gardenMapSceneKey(input.gardenId));
  const rawLocalRevision = await storage.getItem(gardenMapSceneRevisionKey(input.gardenId));
  const localRevision = parseRevision(rawLocalRevision);
  const localDirty = (await storage.getItem(gardenMapSceneDirtyKey(input.gardenId))) === '1'
    || (rawLocalScene !== null && rawLocalRevision === null);

  if (!rawLocalScene) {
    await writePulledScene(input, storage);
    return 'pull';
  }

  const decision = decideMapSceneSync({ localRevision, remoteRevision: input.revision, localDirty });
  if (decision === 'pull') await writePulledScene(input, storage);
  if (decision === 'conflict') {
    const conflict: MapSceneConflictRecord = {
      localRevision,
      remoteRevision: input.revision,
      localScene: parseJson(rawLocalScene, 'local garden map scene'),
      remoteScene: input.scene,
      remoteUpdatedAt: input.updatedAt,
      detectedAt: new Date().toISOString(),
    };
    await storage.setItem(gardenMapSceneConflictKey(input.gardenId), JSON.stringify(conflict));
  }
  return decision;
}

/** Explicit recovery action: discard the local edit only after user choice. */
export async function acceptRemoteMapSceneConflict(
  gardenId: string,
  storage: GardenMapSceneStorage = AsyncStorage,
): Promise<void> {
  const conflict = await readConflict(gardenId, storage);
  if (!conflict || !isObjectScene(conflict.remoteScene)) throw new Error('MAP_SCENE_CONFLICT_NOT_FOUND');
  await storage.multiSet([
    [gardenMapSceneKey(gardenId), JSON.stringify(conflict.remoteScene)],
    [gardenMapSceneRevisionKey(gardenId), String(conflict.remoteRevision)],
    [gardenMapSceneTimestampKey(gardenId), conflict.remoteUpdatedAt],
    [gardenMapSceneDirtyKey(gardenId), '0'],
    [gardenMapSceneConflictKey(gardenId), ''],
  ]);
}

/** Explicit recovery action: retry the local edit against the observed revision. */
export async function keepLocalMapSceneConflict(
  gardenId: string,
  storage: GardenMapSceneStorage = AsyncStorage,
  save: typeof saveGardenMapScene = saveGardenMapScene,
): Promise<MapSceneSaveResult> {
  const conflict = await readConflict(gardenId, storage);
  if (!conflict || !isObjectScene(conflict.localScene)) throw new Error('MAP_SCENE_CONFLICT_NOT_FOUND');
  const result = await save(gardenId, conflict.remoteRevision, conflict.localScene);
  await applyMapSceneSaveResult(gardenId, conflict.localScene, result, storage, conflict.remoteRevision);
  return result;
}

async function writePulledScene(input: { gardenId: string; scene: unknown; revision: number; updatedAt: string }, storage: GardenMapSceneStorage) {
  if (!isObjectScene(input.scene)) throw new Error('REMOTE_MAP_SCENE_INVALID');
  await storage.multiSet([
    [gardenMapSceneKey(input.gardenId), JSON.stringify(input.scene)],
    [gardenMapSceneRevisionKey(input.gardenId), String(input.revision)],
    [gardenMapSceneTimestampKey(input.gardenId), input.updatedAt],
    [gardenMapSceneDirtyKey(input.gardenId), '0'],
    [gardenMapSceneConflictKey(input.gardenId), ''],
  ]);
}

async function readConflict(gardenId: string, storage: GardenMapSceneStorage): Promise<MapSceneConflictRecord | null> {
  const raw = await storage.getItem(gardenMapSceneConflictKey(gardenId));
  if (!raw) return null;
  const value = parseJson(raw, 'map scene conflict');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('MAP_SCENE_CONFLICT_INVALID');
  return value as MapSceneConflictRecord;
}

function parseJson(raw: string, label: string): unknown {
  try { return JSON.parse(raw) as unknown; }
  catch { throw new Error(`Could not parse ${label}`); }
}

function parseRevision(raw: string | null): number {
  if (raw === null) return 0;
  const revision = Number(raw);
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('MAP_SCENE_REVISION_INVALID');
  return revision;
}

function isObjectScene(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
