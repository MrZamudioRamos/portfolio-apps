import AsyncStorage from '@react-native-async-storage/async-storage';
import { pullAll, upsertAll } from '@portfolio/supabase';
import { isUUID } from '@portfolio/storage';
import type { Garden } from '../models/garden';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import type { GardenReminder } from '../models/reminder';
import type { GridLayout } from '../hooks/useGardenLayout';
import { layoutTsKey } from '../hooks/useGardenLayout';
import { uploadLocalPhotos } from './photoSync';
import {
  gardenToRow, rowToGarden,
  plantToRow, rowToPlant,
  entryToRow, rowToEntry,
  reminderToRow, rowToReminder,
  userProfileToRow, rowToUserProfile,
  customCropToRow, rowToCustomCrop,
  costEntryToRow, rowToCostEntry,
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

async function readLayouts(gardenIds: string[]): Promise<{ gardenId: string; layout: GridLayout; updatedAt: string }[]> {
  return Promise.all(
    gardenIds.map(async (id) => {
      const [rawLayout, rawTs] = await Promise.all([
        AsyncStorage.getItem(LAYOUT_KEY(id)),
        AsyncStorage.getItem(layoutTsKey(id)),
      ]);
      const layout: GridLayout = rawLayout ? JSON.parse(rawLayout) : [];
      const updatedAt = rawTs ?? new Date(0).toISOString();
      return { gardenId: id, layout, updatedAt };
    })
  );
}

async function writeLayouts(layouts: { gardenId: string; layout: GridLayout; updatedAt?: string }[]): Promise<void> {
  await Promise.all(
    layouts.map(async ({ gardenId, layout, updatedAt }) => {
      await AsyncStorage.setItem(LAYOUT_KEY(gardenId), JSON.stringify(layout));
      if (updatedAt) await AsyncStorage.setItem(layoutTsKey(gardenId), updatedAt);
    })
  );
}

/**
 * Push all local data to Supabase (migration + background push).
 * Skips items whose IDs are not valid UUIDs (pre-UUID-era data).
 */
export async function syncToCloud(userId: string): Promise<void> {
  try {
    // Soft-deleted rows are kept locally with deleted_at set, so upsertAll
    // carries the tombstone to the cloud like any other field — no special
    // delete pass needed.
    const [gardens, plants, entries, reminders, userProfiles, customCrops, costEntries] = await Promise.all([
      readLocal<Garden>(KEYS.gardens),
      readLocal<Plant>(KEYS.plants),
      readLocal<DiaryEntry>(KEYS.entries),
      readLocal<GardenReminder>(KEYS.reminders),
      readLocal<import('../models/user-profile').UserProfile>(KEYS.userProfile),
      readLocal<import('../models/custom-crop').CustomCrop>(KEYS.customCrops),
      readLocal<import('../models/cost-entry').CostEntry>(KEYS.costEntries),
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

    await Promise.all([
      upsertAll('gardens',        gardens.filter(     (g) => isUUID(g.id)).map((g) => gardenToRow(g, userId))),
      upsertAll('plants',         plants.filter(      (p) => isUUID(p.id)).map((p) => plantToRow(p, userId))),
      upsertAll('diary_entries',  entries.filter(     (e) => isUUID(e.id)).map((e) => entryToRow(e, userId))),
      upsertAll('reminders',      reminders.filter(   (r) => isUUID(r.id)).map((r) => reminderToRow(r, userId))),
      upsertAll('user_profiles',  userProfiles.filter((p) => isUUID(p.id)).map((p) => userProfileToRow(p, userId))),
      upsertAll('custom_crops',   customCrops.filter( (c) => isUUID(c.id)).map((c) => customCropToRow(c, userId))),
      upsertAll('cost_entries',   costEntries.filter( (c) => isUUID(c.id)).map((c) => costEntryToRow(c, userId))),
      upsertAll('garden_layouts', layouts.map((l) => gardenLayoutToRow(l.gardenId, l.layout, userId, l.updatedAt))),
    ]);
  } catch (e) {
    console.warn('[sync] syncToCloud failed:', e);
  }
}

/**
 * Pull all data from Supabase and merge into local storage.
 * Cloud wins when updatedAt is newer than local.
 */
export async function syncFromCloud(userId: string): Promise<void> {
  try {
    const [remoteGardens, remotePlants, remoteEntries, remoteReminders, remoteProfiles, remoteCrops, remoteCosts, remoteLayouts] = await Promise.all([
      pullAll<ReturnType<typeof gardenToRow>>('gardens', userId),
      pullAll<ReturnType<typeof plantToRow>>('plants', userId),
      pullAll<ReturnType<typeof entryToRow>>('diary_entries', userId),
      pullAll<ReturnType<typeof reminderToRow>>('reminders', userId),
      pullAll<ReturnType<typeof userProfileToRow>>('user_profiles', userId),
      pullAll<ReturnType<typeof customCropToRow>>('custom_crops', userId),
      pullAll<ReturnType<typeof costEntryToRow>>('cost_entries', userId),
      pullAll<ReturnType<typeof gardenLayoutToRow>>('garden_layouts', userId),
    ]);

    // For layouts: only overwrite local if remote is strictly newer (preserves offline edits)
    const remoteMapped = remoteLayouts.map(rowToGardenLayout);
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
      writeLayouts(layoutsToWrite),
    ]);
  } catch (e) {
    console.warn('[sync] syncFromCloud failed:', e);
  }
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
