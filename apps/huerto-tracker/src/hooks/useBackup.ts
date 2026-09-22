import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

const BACKUP_FILE = FileSystem.documentDirectory + 'huerto-backup.json';
const AUTO_BACKUP_KEY = '@portfolio/backup/auto';
const LAST_BACKUP_KEY = '@portfolio/backup/last';
const BACKUP_VERSION = 3;
const LAYOUT_KEY_PREFIX = '@portfolio/huerto/garden_layout/';
const FREE_LAYOUT_KEY_PREFIX = '@portfolio/huerto/garden_free_layout/';
const MAP_PLAN_KEY_PREFIX = '@portfolio/huerto/garden_map_plan/';

const DATA_KEYS = [
  '@portfolio/gardens',
  '@portfolio/plants',
  '@portfolio/diary_entries',
  '@portfolio/reminders',
  '@portfolio/user-profile',
  '@portfolio/custom_crops',
  '@portfolio/cost_entries',
  '@portfolio/onboarding_completed_huerto',
] as const;

interface BackupData {
  version: number;
  exportedAt: string;
  appId: 'huerto-tracker';
  gardens: unknown[];
  plants: unknown[];
  diary_entries: unknown[];
  reminders: unknown[];
  userProfile: unknown[];
  customCrops: unknown[];
  costEntries: unknown[];
  onboardingCompleted: boolean;
  gardenLayouts: Record<string, unknown>;
}

function safeParseArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as unknown[]; } catch { return []; }
}

function safeParseValue(raw: string | null): unknown {
  if (!raw) return [];
  try { return JSON.parse(raw) as unknown; } catch { return []; }
}

export function useBackup() {
  const [autoBackup, setAutoBackup] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([AUTO_BACKUP_KEY, LAST_BACKUP_KEY])
      .then(([[, auto], [, last]]) => {
        setAutoBackup(auto === 'true');
        setLastBackupAt(last);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const writeBackupFile = useCallback(async (): Promise<string> => {
    const allKeys = await AsyncStorage.getAllKeys();
    const layoutKeys = allKeys.filter((key) => (
      key.startsWith(LAYOUT_KEY_PREFIX)
      || key.startsWith(FREE_LAYOUT_KEY_PREFIX)
      || key.startsWith(MAP_PLAN_KEY_PREFIX)
    ) && !key.endsWith('/ts'));

    const [staticResults, layoutResults] = await Promise.all([
      AsyncStorage.multiGet([...DATA_KEYS]),
      AsyncStorage.multiGet(layoutKeys),
    ]);
    const map = Object.fromEntries(staticResults.map(([k, v]) => [k, v]));

    const gardenLayouts: Record<string, { grid?: unknown; free?: unknown; mapPlan?: unknown }> = {};
    for (const [key, raw] of layoutResults) {
      const prefix = key.startsWith(LAYOUT_KEY_PREFIX) ? LAYOUT_KEY_PREFIX
        : key.startsWith(FREE_LAYOUT_KEY_PREFIX) ? FREE_LAYOUT_KEY_PREFIX : MAP_PLAN_KEY_PREFIX;
      const gardenId = key.slice(prefix.length);
      const entry = gardenLayouts[gardenId] ?? {};
      const value = safeParseValue(raw);
      if (prefix === LAYOUT_KEY_PREFIX) entry.grid = value;
      else if (prefix === FREE_LAYOUT_KEY_PREFIX) entry.free = value;
      else entry.mapPlan = value;
      gardenLayouts[gardenId] = entry;
    }

    const data: BackupData = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      appId: 'huerto-tracker',
      gardens: safeParseArray(map['@portfolio/gardens']),
      plants: safeParseArray(map['@portfolio/plants']),
      diary_entries: safeParseArray(map['@portfolio/diary_entries']),
      reminders: safeParseArray(map['@portfolio/reminders']),
      userProfile: safeParseArray(map['@portfolio/user-profile']),
      customCrops: safeParseArray(map['@portfolio/custom_crops']),
      costEntries: safeParseArray(map['@portfolio/cost_entries']),
      onboardingCompleted: map['@portfolio/onboarding_completed_huerto'] === 'true',
      gardenLayouts,
    };

    await FileSystem.writeAsStringAsync(BACKUP_FILE, JSON.stringify(data, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const now = new Date().toISOString();
    await AsyncStorage.setItem(LAST_BACKUP_KEY, now);
    setLastBackupAt(now);
    return BACKUP_FILE;
  }, []);

  // Write to documentDirectory when app goes to background (iCloud picks it up)
  useEffect(() => {
    if (!autoBackup) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        writeBackupFile().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [autoBackup, writeBackupFile]);

  async function exportBackup(): Promise<void> {
    setExporting(true);
    try {
      const uri = await writeBackupFile();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Guardar backup del huerto',
          UTI: 'public.json',
        });
      }
    } finally {
      setExporting(false);
    }
  }

  async function importBackup(): Promise<{ success: boolean; error?: string; needsRestart?: boolean }> {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return { success: false };

      const asset = result.assets[0];
      const raw = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let data: BackupData;
      try {
        data = JSON.parse(raw) as BackupData;
      } catch {
        return { success: false, error: 'El archivo no es un JSON válido.' };
      }

      if (data.appId !== 'huerto-tracker') {
        return { success: false, error: 'El archivo no es un backup de HuertoTracker.' };
      }

      const staticPairs: [string, string][] = [
        ['@portfolio/gardens',     JSON.stringify(data.gardens ?? [])],
        ['@portfolio/plants',      JSON.stringify(data.plants ?? [])],
        ['@portfolio/diary_entries', JSON.stringify(data.diary_entries ?? [])],
        ['@portfolio/reminders',   JSON.stringify(data.reminders ?? [])],
        ['@portfolio/user-profile', JSON.stringify(data.userProfile ?? [])],
        ['@portfolio/custom_crops', JSON.stringify(data.customCrops ?? [])],
        ['@portfolio/cost_entries', JSON.stringify(data.costEntries ?? [])],
        ['@portfolio/onboarding_completed_huerto', data.onboardingCompleted ? 'true' : 'false'],
      ];

      const restoredAt = new Date().toISOString();
      const layoutPairs: [string, string][] = Object.entries(data.gardenLayouts ?? {}).flatMap(([gardenId, value]) => {
        // Version 1/2 backups stored just the grid array. Keep restoring those.
        if (Array.isArray(value)) return [
          [LAYOUT_KEY_PREFIX + gardenId, JSON.stringify(value)],
          [LAYOUT_KEY_PREFIX + gardenId + '/ts', restoredAt],
        ];
        if (!value || typeof value !== 'object') return [];
        const saved = value as { grid?: unknown; free?: unknown; mapPlan?: unknown };
        const pairs: [string, string][] = [];
        if (saved.grid !== undefined) pairs.push([LAYOUT_KEY_PREFIX + gardenId, JSON.stringify(saved.grid)], [LAYOUT_KEY_PREFIX + gardenId + '/ts', restoredAt]);
        if (saved.free !== undefined) pairs.push([FREE_LAYOUT_KEY_PREFIX + gardenId, JSON.stringify(saved.free)], [FREE_LAYOUT_KEY_PREFIX + gardenId + '/ts', restoredAt]);
        if (saved.mapPlan !== undefined) pairs.push([MAP_PLAN_KEY_PREFIX + gardenId, JSON.stringify(saved.mapPlan)], [MAP_PLAN_KEY_PREFIX + gardenId + '/ts', restoredAt]);
        return pairs;
      });

      await AsyncStorage.multiSet([...staticPairs, ...layoutPairs]);

      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_BACKUP_KEY, now);
      setLastBackupAt(now);

      return { success: true, needsRestart: true };
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Error al importar.' };
    } finally {
      setImporting(false);
    }
  }

  async function toggleAutoBackup(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(AUTO_BACKUP_KEY, enabled ? 'true' : 'false');
    setAutoBackup(enabled);
    if (enabled) await writeBackupFile().catch(() => {});
  }

  return {
    autoBackup,
    lastBackupAt,
    loading,
    exporting,
    importing,
    exportBackup,
    importBackup,
    toggleAutoBackup,
    writeBackupFile,
  };
}
