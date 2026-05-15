import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCollection } from '@portfolio/storage';
import { requestPermissions, scheduleDateAlert, cancelMonthlyAlerts } from '@portfolio/notifications';
import { useEffect, useState } from 'react';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import { CROPS } from '../data/crops';
import { useActiveGarden } from './useActiveGarden';

type NotifType = 'transplant' | 'harvest' | 'treatment';

const KEYS: Record<NotifType, { enabled: string; ids: string }> = {
  transplant: {
    enabled: '@portfolio/plant_notifs/transplant',
    ids: '@portfolio/plant_notifs/transplant_ids',
  },
  harvest: {
    enabled: '@portfolio/plant_notifs/harvest',
    ids: '@portfolio/plant_notifs/harvest_ids',
  },
  treatment: {
    enabled: '@portfolio/plant_notifs/treatment',
    ids: '@portfolio/plant_notifs/treatment_ids',
  },
};

const TRANSPLANT_WEEKS = 6;

async function cancelByType(type: NotifType) {
  const raw = await AsyncStorage.getItem(KEYS[type].ids);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (ids.length) await cancelMonthlyAlerts(ids);
  await AsyncStorage.removeItem(KEYS[type].ids);
}

async function scheduleTransplant(plants: Plant[]): Promise<string[]> {
  const now = new Date();
  const ids: string[] = [];
  for (const plant of plants) {
    if (!plant.sowingDate || plant.status === 'finished') continue;
    const sow = new Date(plant.sowingDate);
    const target = new Date(sow.getTime() + TRANSPLANT_WEEKS * 7 * 86400000);
    target.setHours(9, 0, 0, 0);
    if (target <= now) continue;
    const crop = CROPS.find((c) => c.id === plant.cropId);
    const label = crop ? `${crop.emoji} ${plant.name}` : plant.name;
    const id = await scheduleDateAlert({
      date: target,
      title: `🌱 Trasplanta ${label}`,
      body: `Lleva ${TRANSPLANT_WEEKS} semanas en semillero. Muévela al bancal.`,
    });
    if (id) ids.push(id);
  }
  return ids;
}

async function scheduleHarvest(plants: Plant[]): Promise<string[]> {
  const now = new Date();
  const ids: string[] = [];
  for (const plant of plants) {
    if (!plant.firstHarvestDate || plant.status === 'finished') continue;
    const harvest = new Date(plant.firstHarvestDate);
    const target = new Date(harvest.getTime() - 3 * 86400000);
    target.setHours(9, 0, 0, 0);
    if (target <= now) continue;
    const crop = CROPS.find((c) => c.id === plant.cropId);
    const label = crop ? `${crop.emoji} ${plant.name}` : plant.name;
    const id = await scheduleDateAlert({
      date: target,
      title: `🧺 ${label} casi lista`,
      body: `Cosecha prevista en 3 días. Revisa el punto de madurez.`,
    });
    if (id) ids.push(id);
  }
  return ids;
}

async function scheduleTreatment(plants: Plant[], entries: DiaryEntry[]): Promise<string[]> {
  const now = new Date();
  const ids: string[] = [];

  // Last treatment with waitDays per plant
  const latest = new Map<string, DiaryEntry>();
  for (const e of entries) {
    if (e.type !== 'treatment' || !e.plantId) continue;
    const waitDays = (e.data?.waitDays as number) ?? 0;
    if (!waitDays) continue;
    const prev = latest.get(e.plantId);
    if (!prev || e.date > prev.date) latest.set(e.plantId, e);
  }

  for (const [plantId, entry] of latest) {
    const plant = plants.find((p) => p.id === plantId);
    if (!plant || plant.status === 'finished') continue;
    const waitDays = (entry.data?.waitDays as number) ?? 0;
    const target = new Date(new Date(entry.date).getTime() + waitDays * 86400000);
    target.setHours(9, 0, 0, 0);
    if (target <= now) continue;
    const crop = CROPS.find((c) => c.id === plant.cropId);
    const label = crop ? `${crop.emoji} ${plant.name}` : plant.name;
    const id = await scheduleDateAlert({
      date: target,
      title: `🧴 Carencia vencida: ${label}`,
      body: `Han pasado ${waitDays} días desde el último tratamiento. Ya puedes cosechar.`,
    });
    if (id) ids.push(id);
  }
  return ids;
}

export function usePlantNotifications() {
  const { activeGarden } = useActiveGarden();
  const allPlants = useCollection<Plant>('plants');
  const allEntries = useCollection<DiaryEntry>('diary-entries');

  const [enabled, setEnabled] = useState<Record<NotifType, boolean>>({
    transplant: false,
    harvest: false,
    treatment: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.transplant.enabled),
      AsyncStorage.getItem(KEYS.harvest.enabled),
      AsyncStorage.getItem(KEYS.treatment.enabled),
    ]).then(([t, h, tr]) => {
      setEnabled({ transplant: t === 'true', harvest: h === 'true', treatment: tr === 'true' });
      setLoading(false);
    });
  }, []);

  const gardenPlants = activeGarden
    ? allPlants.items.filter((p) => p.gardenId === activeGarden.id)
    : allPlants.items;

  // Reschedule when plant data changes while enabled
  useEffect(() => {
    if (loading || allPlants.loading) return;
    (async () => {
      for (const type of ['transplant', 'harvest', 'treatment'] as NotifType[]) {
        if (!enabled[type]) continue;
        await cancelByType(type);
        const ids = await scheduleForType(type, gardenPlants, allEntries.items);
        await AsyncStorage.setItem(KEYS[type].ids, JSON.stringify(ids));
      }
    })();
  }, [allPlants.items, allEntries.items, activeGarden?.id]);

  async function scheduleForType(
    type: NotifType,
    plants: Plant[],
    entries: DiaryEntry[]
  ): Promise<string[]> {
    if (type === 'transplant') return scheduleTransplant(plants);
    if (type === 'harvest') return scheduleHarvest(plants);
    return scheduleTreatment(plants, entries);
  }

  async function toggle(type: NotifType, value: boolean) {
    if (value) {
      const granted = await requestPermissions();
      if (!granted) return;
    }
    await cancelByType(type);
    if (value) {
      const ids = await scheduleForType(type, gardenPlants, allEntries.items);
      await AsyncStorage.setItem(KEYS[type].ids, JSON.stringify(ids));
    }
    await AsyncStorage.setItem(KEYS[type].enabled, value ? 'true' : 'false');
    setEnabled((prev) => ({ ...prev, [type]: value }));
  }

  // Counts of schedulable items (for subtitle display)
  const now = new Date();
  const transplantCount = gardenPlants.filter(
    (p) =>
      p.sowingDate &&
      p.status !== 'finished' &&
      new Date(p.sowingDate).getTime() + TRANSPLANT_WEEKS * 7 * 86400000 > now.getTime()
  ).length;

  const harvestCount = gardenPlants.filter(
    (p) =>
      p.firstHarvestDate &&
      p.status !== 'finished' &&
      new Date(p.firstHarvestDate).getTime() > now.getTime()
  ).length;

  const treatmentCount = (() => {
    const seen = new Set<string>();
    for (const e of allEntries.items) {
      if (e.type !== 'treatment' || !e.plantId) continue;
      const waitDays = (e.data?.waitDays as number) ?? 0;
      if (!waitDays) continue;
      const clearDate = new Date(e.date).getTime() + waitDays * 86400000;
      if (clearDate > now.getTime()) seen.add(e.plantId);
    }
    return seen.size;
  })();

  return {
    enabled,
    loading,
    toggle,
    counts: { transplant: transplantCount, harvest: harvestCount, treatment: treatmentCount },
  };
}
