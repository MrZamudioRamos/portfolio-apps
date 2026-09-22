import AsyncStorage from '@react-native-async-storage/async-storage';
import { pullCropCatalog, type RemoteCrop } from '@portfolio/supabase';
import type { ClimateZone } from '../models/garden';
import { replaceCropCatalog, type CropInfo } from './crops';

const CACHE_KEY = '@portfolio/reference/crop-catalog-v2';

function toCrop(remote: RemoteCrop): CropInfo {
  const months = (zone: ClimateZone, kind: 'sowing' | 'harvest') => {
    const key = `${kind}_months_${zone}` as keyof RemoteCrop;
    const value = remote[key];
    return Array.isArray(value) ? value.filter((month): month is number => typeof month === 'number') : [];
  };
  return {
    id: remote.id,
    name: remote.name,
    emoji: remote.emoji,
    category: remote.category,
    sowingMonths: {
      atlantica: months('atlantica', 'sowing'),
      continental: months('continental', 'sowing'),
      mediterranea: months('mediterranea', 'sowing'),
      subtropical: months('subtropical', 'sowing'),
    },
    harvestMonths: {
      atlantica: months('atlantica', 'harvest'),
      continental: months('continental', 'harvest'),
      mediterranea: months('mediterranea', 'harvest'),
      subtropical: months('subtropical', 'harvest'),
    },
    daysToHarvest: [remote.days_to_harvest_min, remote.days_to_harvest_max],
    sunNeeds: remote.sun_needs,
    waterNeeds: remote.water_needs,
    spacing: remote.spacing_cm,
    rotationGroup: remote.rotation_group ?? undefined,
    companions: remote.companions ?? [],
    incompatible: remote.incompatible ?? [],
    tips: remote.tips ?? '',
  };
}

function applyCatalog(rows: RemoteCrop[]): boolean {
  const catalog = rows.map(toCrop).filter((crop) => crop.id && crop.name);
  if (catalog.length === 0) return false;
  replaceCropCatalog(catalog);
  return true;
}

/**
 * Hydrate reference data from Supabase and retain the last verified catalog
 * for offline launches. The bundled snapshot remains only as a boot fallback;
 * it is never used to fabricate a user's garden data.
 */
export async function hydrateCropCatalog(): Promise<'remote' | 'cache' | 'bundled'> {
  try {
    const remote = await pullCropCatalog();
    if (applyCatalog(remote)) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote));
      return 'remote';
    }
  } catch {
    // Offline or not configured: use the last verified cache below.
  }

  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw && applyCatalog(JSON.parse(raw) as RemoteCrop[])) return 'cache';
  } catch {
    // Keep the bundled reference snapshot if the cache is unavailable/corrupt.
  }
  return 'bundled';
}
