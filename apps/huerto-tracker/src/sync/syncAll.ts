import AsyncStorage from '@react-native-async-storage/async-storage';
import { pullAll, upsertAll } from '@portfolio/supabase';
import { isUUID } from '@portfolio/storage';
import type { Garden } from '../models/garden';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import type { GardenReminder } from '../models/reminder';
import type { GridLayout } from '../hooks/useGardenLayout';
import {
  gardenToRow, rowToGarden,
  plantToRow, rowToPlant,
  entryToRow, rowToEntry,
  reminderToRow, rowToReminder,
  userProfileToRow, rowToUserProfile,
  customCropToRow, rowToCustomCrop,
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

async function readLayouts(gardenIds: string[]): Promise<{ gardenId: string; layout: GridLayout }[]> {
  return Promise.all(
    gardenIds.map(async (id) => {
      const raw = await AsyncStorage.getItem(LAYOUT_KEY(id));
      const layout: GridLayout = raw ? JSON.parse(raw) : [];
      return { gardenId: id, layout };
    })
  );
}

async function writeLayouts(layouts: { gardenId: string; layout: GridLayout }[]): Promise<void> {
  await Promise.all(
    layouts.map(({ gardenId, layout }) =>
      AsyncStorage.setItem(LAYOUT_KEY(gardenId), JSON.stringify(layout))
    )
  );
}

/**
 * Push all local data to Supabase (migration + background push).
 * Skips items whose IDs are not valid UUIDs (pre-UUID-era data).
 */
export async function syncToCloud(userId: string): Promise<void> {
  try {
    const [gardens, plants, entries, reminders, userProfiles, customCrops] = await Promise.all([
      readLocal<Garden>(KEYS.gardens),
      readLocal<Plant>(KEYS.plants),
      readLocal<DiaryEntry>(KEYS.entries),
      readLocal<GardenReminder>(KEYS.reminders),
      readLocal<import('../models/user-profile').UserProfile>(KEYS.userProfile),
      readLocal<import('../models/custom-crop').CustomCrop>(KEYS.customCrops),
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
      upsertAll('garden_layouts', layouts.map((l) => gardenLayoutToRow(l.gardenId, l.layout, userId))),
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
    const [remoteGardens, remotePlants, remoteEntries, remoteReminders, remoteProfiles, remoteCrops, remoteLayouts] = await Promise.all([
      pullAll<ReturnType<typeof gardenToRow>>('gardens', userId),
      pullAll<ReturnType<typeof plantToRow>>('plants', userId),
      pullAll<ReturnType<typeof entryToRow>>('diary_entries', userId),
      pullAll<ReturnType<typeof reminderToRow>>('reminders', userId),
      pullAll<ReturnType<typeof userProfileToRow>>('user_profiles', userId),
      pullAll<ReturnType<typeof customCropToRow>>('custom_crops', userId),
      pullAll<ReturnType<typeof gardenLayoutToRow>>('garden_layouts', userId),
    ]);

    await Promise.all([
      mergeLocal(KEYS.gardens,     remoteGardens.map(rowToGarden)       as any[]),
      mergeLocal(KEYS.plants,      remotePlants.map(rowToPlant)          as any[]),
      mergeLocal(KEYS.entries,     remoteEntries.map(rowToEntry)         as any[]),
      mergeLocal(KEYS.reminders,   remoteReminders.map(rowToReminder)    as any[]),
      mergeLocal(KEYS.userProfile, remoteProfiles.map(rowToUserProfile)  as any[]),
      mergeLocal(KEYS.customCrops, remoteCrops.map(rowToCustomCrop)      as any[]),
      writeLayouts(remoteLayouts.map(rowToGardenLayout)),
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
