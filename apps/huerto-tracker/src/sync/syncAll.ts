import AsyncStorage from '@react-native-async-storage/async-storage';
import { pullAll, saveGardenMapScene, upsertAll } from '@portfolio/supabase';
import { isUUID } from '@portfolio/storage';
import type { Garden } from '../models/garden';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import type { SeedLot } from '../models/seed-lot';
import type { GardenReminder } from '../models/reminder';
import type { GridLayout } from '../hooks/useGardenLayout';
import { layoutTsKey } from '../hooks/useGardenLayout';
import type { FreeMapPositions } from '../hooks/useGardenFreeLayout';
import { freeLayoutKey, freeLayoutTsKey } from '../hooks/useGardenFreeLayout';
import type { GardenMapPlan } from '../models/garden-map-plan';
import { gardenMapPlanKey, gardenMapPlanTsKey } from '../hooks/useGardenMapPlan';
import { pushMapSceneToCloud, reconcileRemoteMapScene } from './gardenMapSceneSync';
import { uploadLocalPhotos } from './photoSync';
import {
  gardenToRow, rowToGarden,
  plantToRow, rowToPlant,
  entryToRow, rowToEntry,
  reminderToRow, rowToReminder,
  userProfileToRow, rowToUserProfile,
  customCropToRow, rowToCustomCrop,
  costEntryToRow, rowToCostEntry,
  seedLotToRow, rowToSeedLot,
  gardenLayoutToRow, rowToGardenLayout,
} from './adapters';

// Keys must match createStore(`@portfolio/${key}`)
const KEYS = {
  gardens:      '@portfolio/gardens',
  plants:       '@portfolio/plants',
  entries:      '@portfolio/diary_entries',
  reminders:    '@portfolio/reminders',
  userProfile:  '@portfolio/user-profile',
  customCrops:  '@portfolio/custom_crops',
  costEntries:  '@portfolio/cost_entries',
  seedLots:     '@portfolio/seed_lots',
};

async function readLocal<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw) as T[]; } catch { return []; }
}

async function writeLocal<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

const LAYOUT_KEY = (gardenId: string) => `@portfolio/huerto/garden_layout/${gardenId}`;
type SyncFailure = { table: string; reason: unknown };

type LocalLayout = {
  gardenId: string;
  layout: GridLayout;
  freeLayout: FreeMapPositions;
  mapPlan?: GardenMapPlan;
  updatedAt: string;
};

async function readLayouts(gardenIds: string[]): Promise<LocalLayout[]> {
  return Promise.all(
    gardenIds.map(async (id) => {
      const [rawLayout, rawFreeLayout, rawMapPlan, rawTs, rawFreeTs, rawMapTs] = await Promise.all([
        AsyncStorage.getItem(LAYOUT_KEY(id)),
        AsyncStorage.getItem(freeLayoutKey(id)),
        AsyncStorage.getItem(gardenMapPlanKey(id)),
        AsyncStorage.getItem(layoutTsKey(id)),
        AsyncStorage.getItem(freeLayoutTsKey(id)),
        AsyncStorage.getItem(gardenMapPlanTsKey(id)),
      ]);
      const layout: GridLayout = rawLayout ? JSON.parse(rawLayout) : [];
      const freeLayout: FreeMapPositions = rawFreeLayout ? JSON.parse(rawFreeLayout) : {};
      const mapPlan: GardenMapPlan | undefined = rawMapPlan ? JSON.parse(rawMapPlan) : undefined;
      const timestamps = [rawTs, rawFreeTs, rawMapTs].filter((value): value is string => Boolean(value));
      const updatedAt = timestamps.sort().at(-1) ?? new Date(0).toISOString();
      return { gardenId: id, layout, freeLayout, mapPlan, updatedAt };
    })
  );
}

async function writeLayouts(layouts: Array<Partial<LocalLayout> & Pick<LocalLayout, 'gardenId'>>): Promise<void> {
  await Promise.all(
    layouts.map(async ({ gardenId, layout = [], freeLayout = {}, mapPlan, updatedAt }) => {
      await AsyncStorage.setItem(LAYOUT_KEY(gardenId), JSON.stringify(layout));
      await AsyncStorage.setItem(freeLayoutKey(gardenId), JSON.stringify(freeLayout));
      if (updatedAt) await AsyncStorage.setItem(layoutTsKey(gardenId), updatedAt);
      if (updatedAt) await AsyncStorage.setItem(freeLayoutTsKey(gardenId), updatedAt);
      // A legacy cloud row has no map plan; don't erase newer local planner data.
      if (mapPlan !== undefined) {
        await AsyncStorage.setItem(gardenMapPlanKey(gardenId), JSON.stringify(mapPlan));
        if (updatedAt) await AsyncStorage.setItem(gardenMapPlanTsKey(gardenId), updatedAt);
      }
    })
  );
}

async function pushMapScenes(layouts: LocalLayout[]): Promise<SyncFailure[]> {
  const results = await Promise.allSettled(layouts.map((layout) => pushMapSceneToCloud(layout.gardenId, AsyncStorage, saveGardenMapScene)));
  return results.flatMap((result, index) => {
    if (result.status === 'rejected') return [{ table: 'garden_map_scene', reason: result.reason }];
    if (result.value === 'conflict') return [{ table: 'garden_map_scene', reason: new Error(`conflict: ${layouts[index].gardenId}`) }];
    return [];
  });
}

/**
 * Push all local data to Supabase (migration + background push).
 * Skips items whose IDs are not valid UUIDs (pre-UUID-era data).
 * Returns true if every table upsert succeeded, false on any failure so
 * the caller can skip the subsequent pull (avoiding clobbering unsynced
 * locals with stale cloud rows).
 */
export async function syncToCloud(userId: string): Promise<boolean> {
  try {
    // Soft-deleted rows are kept locally with deleted_at set, so upsertAll
    // carries the tombstone to the cloud like any other field — no special
    // delete pass needed.
    const [gardens, plants, entries, reminders, userProfiles, customCrops, costEntries, seedLots] = await Promise.all([
      readLocal<Garden>(KEYS.gardens),
      readLocal<Plant>(KEYS.plants),
      readLocal<DiaryEntry>(KEYS.entries),
      readLocal<GardenReminder>(KEYS.reminders),
      readLocal<import('../models/user-profile').UserProfile>(KEYS.userProfile),
      readLocal<import('../models/custom-crop').CustomCrop>(KEYS.customCrops),
      readLocal<import('../models/cost-entry').CostEntry>(KEYS.costEntries),
      readLocal<SeedLot>(KEYS.seedLots),
    ]);

    // Upload any local file:// photos to Storage and rewrite their photoUri to
    // the public URL, then persist locally so the row carries a syncable URL
    // (adapters drop non-http photoUris). Without this, photos never sync.
    const [plantsChanged, entriesChanged, gardensChanged] = await Promise.all([
      uploadLocalPhotos(plants, userId),
      uploadLocalPhotos(entries, userId),
      uploadLocalPhotos(gardens, userId),
    ]);
    await Promise.all([
      plantsChanged ? writeLocal(KEYS.plants, plants) : Promise.resolve(),
      entriesChanged ? writeLocal(KEYS.entries, entries) : Promise.resolve(),
      gardensChanged ? writeLocal(KEYS.gardens, gardens) : Promise.resolve(),
    ]);

    const validGardenIds = gardens.filter((g) => isUUID(g.id)).map((g) => g.id);
    const layouts = await readLayouts(validGardenIds);
    for (const item of layouts) {
      if (!item.mapPlan) continue;
      const mapPhotos = [...item.mapPlan.structures, ...item.mapPlan.zones];
      if (!mapPhotos.some((record) => record.photoUri && /^(file:\/\/|content:\/\/|blob:|data:image\/)/i.test(record.photoUri))) continue;
      const changed = await uploadLocalPhotos(mapPhotos, userId);
      if (changed) {
        const timestamp = new Date().toISOString();
        item.updatedAt = timestamp;
        await AsyncStorage.multiSet([
          [gardenMapPlanKey(item.gardenId), JSON.stringify(item.mapPlan)],
          [gardenMapPlanTsKey(item.gardenId), timestamp],
        ]);
      }
    }

    // Use allSettled per table so a single RLS blip / network glitch on one
    // table doesn't abort the whole push — pushed what can be pushed, and
    // surface the partial failure to the caller via the boolean return.
    type PushJob = { table: string; run: () => Promise<void> };
    const runPushWave = async (jobs: PushJob[]) => {
      const results = await Promise.allSettled(jobs.map(({ run }) => run()));
      return results.flatMap((result, index) =>
        result.status === 'rejected' ? [{ table: jobs[index].table, reason: result.reason }] : []
      );
    };
    const dependencyFailure = (table: string, dependency: string): SyncFailure => ({
      table,
      reason: new Error(`skipped: dependency ${dependency} push failed`),
    });

    // Respect the database foreign-key graph: profiles/gardens first, then
    // plants, and finally entries/reminders. Independent tables still share
    // a wave, so a transient failure in one table does not abort the others.
    const failures: SyncFailure[] = [];
    const profileGardenFailures = await runPushWave([
      { table: 'user_profiles', run: () => upsertAll('user_profiles', userProfiles.filter((p) => isUUID(p.id)).map((p) => userProfileToRow(p, userId))) },
      { table: 'gardens', run: () => upsertAll('gardens', gardens.filter((g) => isUUID(g.id)).map((g) => gardenToRow(g, userId))) },
    ]);
    failures.push(...profileGardenFailures);
    const gardensFailed = profileGardenFailures.some(({ table }) => table === 'gardens');

    const secondaryFailures = await runPushWave([
      { table: 'custom_crops', run: () => upsertAll('custom_crops', customCrops.filter((c) => isUUID(c.id)).map((c) => customCropToRow(c, userId))) },
      { table: 'cost_entries', run: () => upsertAll('cost_entries', costEntries.filter((c) => isUUID(c.id)).map((c) => costEntryToRow(c, userId))) },
      ...(!gardensFailed ? [{ table: 'seed_lots', run: () => upsertAll('seed_lots', seedLots.filter((seed) => isUUID(seed.id)).map((seed) => seedLotToRow(seed, userId))) }] : []),
      ...(!gardensFailed ? [{ table: 'garden_layouts', run: () => upsertAll('garden_layouts', layouts.map((l) => gardenLayoutToRow(l.gardenId, l.layout, userId, l.updatedAt, l.freeLayout, l.mapPlan))) }] : []),
    ]);
    failures.push(...secondaryFailures);
    if (gardensFailed && layouts.length > 0) failures.push(dependencyFailure('garden_layouts', 'gardens'));
    if (gardensFailed && seedLots.some((seed) => isUUID(seed.id))) failures.push(dependencyFailure('seed_lots', 'gardens'));
    if (!gardensFailed) failures.push(...await pushMapScenes(layouts));
    else if (layouts.length > 0) failures.push(dependencyFailure('garden_map_scene', 'gardens'));

    const plantFailures = gardensFailed
      ? [dependencyFailure('plants', 'gardens')]
      : await runPushWave([
        { table: 'plants', run: () => upsertAll('plants', plants.filter((p) => isUUID(p.id)).map((p) => plantToRow(p, userId))) },
      ]);
    failures.push(...plantFailures);

    if (plantFailures.length > 0) {
      if (entries.some((entry) => isUUID(entry.id))) failures.push(dependencyFailure('diary_entries', 'plants'));
      if (reminders.some((reminder) => isUUID(reminder.id))) failures.push(dependencyFailure('reminders', 'plants'));
    } else {
      failures.push(...await runPushWave([
        { table: 'diary_entries', run: () => upsertAll('diary_entries', entries.filter((e) => isUUID(e.id)).map((e) => entryToRow(e, userId))) },
        { table: 'reminders', run: () => upsertAll('reminders', reminders.filter((r) => isUUID(r.id)).map((r) => reminderToRow(r, userId))) },
      ]));
    }
    if (failures.length > 0) {
      console.warn(`[sync] syncToCloud failed tables: ${failures.map(({ table, reason }) => `${table} (${describeSyncError(reason)})`).join(', ')}`);
    }
    return failures.length === 0;
  } catch (e) {
    console.warn('[sync] syncToCloud failed:', e);
    return false;
  }
}

/**
 * Pull all data from Supabase and merge into local storage.
 * Cloud wins when updatedAt is newer than local.
 * Returns true on success, false on any failure (caller may retry).
 */
export async function syncFromCloud(userId: string): Promise<boolean> {
  try {
    // allSettled per table: one table's network failure doesn't keep the
    // others from refreshing local state.
    const pullTableNames = ['gardens', 'plants', 'diary_entries', 'reminders', 'user_profiles', 'custom_crops', 'cost_entries', 'garden_layouts', 'seed_lots'];
    const results = await Promise.allSettled([
      pullAll<ReturnType<typeof gardenToRow>>('gardens', userId),
      pullAll<ReturnType<typeof plantToRow>>('plants', userId),
      pullAll<ReturnType<typeof entryToRow>>('diary_entries', userId),
      pullAll<ReturnType<typeof reminderToRow>>('reminders', userId),
      pullAll<ReturnType<typeof userProfileToRow>>('user_profiles', userId),
      pullAll<ReturnType<typeof customCropToRow>>('custom_crops', userId),
      pullAll<ReturnType<typeof costEntryToRow>>('cost_entries', userId),
      pullAll<ReturnType<typeof gardenLayoutToRow> & { map_scene?: unknown; map_scene_revision?: number | string | null; map_scene_updated_at?: string | null }>('garden_layouts', userId),
      pullAll<ReturnType<typeof seedLotToRow>>('seed_lots', userId),
    ]);
    const failures = results.flatMap((result, index) =>
      result.status === 'rejected' ? [{ table: pullTableNames[index], reason: result.reason }] : []
    );
    if (failures.length > 0) {
      console.warn(`[sync] syncFromCloud failed tables: ${failures.map(({ table, reason }) => `${table} (${describeSyncError(reason)})`).join(', ')}`);
    }
    // Only the fulfilled tables are merged (rejected ones are skipped).
    const ok = <T>(p: PromiseSettledResult<T>, fallback: T): T =>
      p.status === 'fulfilled' ? p.value : fallback;
    const remoteGardens = ok(results[0], []);
    const remotePlants = ok(results[1], []);
    const remoteEntries = ok(results[2], []);
    const remoteReminders = ok(results[3], []);
    const remoteProfiles = ok(results[4], []);
    const remoteCrops = ok(results[5], []);
    const remoteCosts = ok(results[6], []);
    const remoteLayouts = ok(results[7], []);
    const remoteSeedLots = ok(results[8], []);

    // For layouts: only overwrite local if remote is strictly newer (preserves offline edits)
    const remoteMapped = remoteLayouts.map(rowToGardenLayout);
    const sceneResults = await Promise.allSettled(remoteMapped.flatMap((layout) => (
      layout.mapScene !== undefined && layout.mapSceneRevision !== undefined
        ? [reconcileRemoteMapScene({
          gardenId: layout.gardenId,
          scene: layout.mapScene,
          revision: layout.mapSceneRevision,
          updatedAt: layout.mapSceneUpdatedAt ?? layout.updatedAt,
        })]
        : []
    )));
    const sceneFailures = sceneResults.flatMap((result) => result.status === 'rejected'
      ? [{ table: 'garden_map_scene', reason: result.reason }]
      : result.value === 'conflict'
        ? [{ table: 'garden_map_scene', reason: new Error('conflict: local map edit preserved') }]
        : []);
    failures.push(...sceneFailures);
    const localTsList = await Promise.all(
      remoteMapped.map(({ gardenId }) => AsyncStorage.getItem(layoutTsKey(gardenId)))
    );
    const layoutsToWrite = remoteMapped.filter(({ updatedAt }, i) => {
      const localTs = localTsList[i];
      return !localTs || updatedAt > localTs;
    });

    // Deleted rows arrive with deleted_at set and merge by updatedAt like any
    // other change, so a delete on another device propagates here naturally.
    await Promise.all([
      mergeLocal(KEYS.gardens,     remoteGardens.map(rowToGarden)       as any[]),
      mergeLocal(KEYS.plants,      remotePlants.map(rowToPlant)          as any[]),
      mergeLocal(KEYS.entries,     remoteEntries.map(rowToEntry)         as any[]),
      mergeLocal(KEYS.reminders,   remoteReminders.map(rowToReminder)    as any[]),
      mergeLocal(KEYS.userProfile, remoteProfiles.map(rowToUserProfile)  as any[]),
      mergeLocal(KEYS.customCrops, remoteCrops.map(rowToCustomCrop)      as any[]),
      mergeLocal(KEYS.costEntries, remoteCosts.map(rowToCostEntry)       as any[]),
      mergeLocal(KEYS.seedLots, remoteSeedLots.map(rowToSeedLot) as any[]),
      writeLayouts(layoutsToWrite),
    ]);
    return failures.length === 0;
  } catch (e) {
    console.warn('[sync] syncFromCloud failed:', e);
    return false;
  }
}

function describeSyncError(reason: unknown): string {
  if (reason && typeof reason === 'object') {
    const error = reason as { code?: string; message?: string };
    return [error.code, error.message].filter(Boolean).join(': ') || 'unknown error';
  }
  return String(reason || 'unknown error');
}

async function mergeLocal<T extends { id: string; updatedAt: string }>(
  key: string,
  remoteItems: T[]
): Promise<void> {
  if (remoteItems.length === 0) return;
  const local = await readLocal<T>(key);
  const byId = new Map(local.map((i) => [i.id, i]));

  for (const remote of remoteItems) {
    const existing = byId.get(remote.id);
    const remoteNewer = !existing || new Date(remote.updatedAt) > new Date(existing.updatedAt);
    if (remoteNewer) byId.set(remote.id, remote);
  }

  await writeLocal(key, Array.from(byId.values()));
}
