import {
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  gardenLayoutKey,
  type GridLayout,
} from '../hooks/useGardenLayout';
import { freeLayoutKey, type FreeMapPositions } from '../hooks/useGardenFreeLayout';
import { gardenMapPlanKey } from './gardenMapStorageKeys';
import { normalizeGardenMapPlan, type GardenMapPlanV2 } from '../models/garden-map-plan';
import type { GardenType } from '../models/garden';
import { migrateLegacyMapScene } from './gardenMapScene';

export interface GardenMapSceneStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  multiSet(entries: [string, string][]): Promise<void>;
}

export interface GardenMapGridSize {
  rows: number;
  cols: number;
}

const DEFAULT_GRID_SIZE = { rows: DEFAULT_GRID_ROWS, cols: DEFAULT_GRID_COLS };

export const gardenMapSceneKey = (gardenId: string) => `@portfolio/huerto/garden_map_scene/${gardenId}`;
export const gardenMapSceneTimestampKey = (gardenId: string) => `${gardenMapSceneKey(gardenId)}/ts`;
export const gardenMapSceneBackupKey = (gardenId: string) => `${gardenMapSceneKey(gardenId)}/legacy-backup`;
export const gardenMapSceneMigrationKey = (gardenId: string) => `${gardenMapSceneKey(gardenId)}/migration`;

/** Load a canonical scene or safely migrate its local legacy sources once. */
export async function loadOrMigrateGardenMapScene(
  gardenId: string,
  gardenType: GardenType | undefined,
  storage: GardenMapSceneStorage,
  gridSize: GardenMapGridSize = DEFAULT_GRID_SIZE,
): Promise<GardenMapPlanV2> {
  const sceneKey = gardenMapSceneKey(gardenId);
  const rawScene = await storage.getItem(sceneKey);
  if (rawScene !== null) {
    const scene = normalizeGardenMapPlan(parseJson(rawScene, 'saved garden map scene'));
    if (scene.version !== 2) throw new TypeError('Saved garden map scene is not version 2');
    return scene;
  }

  const [rawPlan, rawGrid, rawFree, existingBackup] = await Promise.all([
    storage.getItem(gardenMapPlanKey(gardenId)),
    storage.getItem(gardenLayoutKey(gardenId)),
    storage.getItem(freeLayoutKey(gardenId)),
    storage.getItem(gardenMapSceneBackupKey(gardenId)),
  ]);

  // Keep the original strings, not re-serialized objects: even malformed
  // legacy payloads must remain recoverable if parsing or migration fails.
  if (existingBackup === null) {
    await storage.setItem(gardenMapSceneBackupKey(gardenId), JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      values: { plan: rawPlan, grid: rawGrid, free: rawFree },
    }));
  }

  const plan = rawPlan === null ? undefined : parseJson(rawPlan, 'legacy garden map plan');
  const grid = rawGrid === null ? [] : parseGrid(rawGrid);
  const free = rawFree === null ? {} : parseFreePositions(rawFree);
  const { rows, cols } = gridSize;
  const scene = normalizeGardenMapPlan(migrateLegacyMapScene({
    plan,
    grid,
    rows,
    cols,
    free,
    preferFree: gardenType === 'balcon' || gardenType === 'maceta',
  }));
  if (scene.version !== 2) throw new TypeError('Garden map migration did not produce version 2');

  const now = new Date().toISOString();
  await storage.multiSet([
    [sceneKey, JSON.stringify(scene)],
    [gardenMapSceneTimestampKey(gardenId), now],
  ]);
  // The marker is deliberately last: the scene has been normalized and
  // durably written before migration is declared complete.
  await storage.setItem(gardenMapSceneMigrationKey(gardenId), '2');
  return scene;
}

function parseJson(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new TypeError(`Could not parse ${label}; the original value has been backed up`);
  }
}

function parseGrid(raw: string): GridLayout {
  const value = parseJson(raw, 'legacy garden grid');
  if (!Array.isArray(value) || !value.every((entry) => entry === null || typeof entry === 'string')) {
    throw new TypeError('Invalid legacy garden grid; the original value has been backed up');
  }
  return value as GridLayout;
}

function parseFreePositions(raw: string): FreeMapPositions {
  const value = parseJson(raw, 'legacy free garden layout');
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid legacy free layout; the original value has been backed up');
  }
  return value as FreeMapPositions;
}
