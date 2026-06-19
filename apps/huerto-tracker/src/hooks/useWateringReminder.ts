import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCollection } from '@portfolio/storage';
import { scheduleDateAlert } from '@portfolio/notifications';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import { CROPS_BY_ID } from '../data/crops';
import { useActiveGarden } from './useActiveGarden';
import { computePlantsNeedingWater } from '../utils/wateringUtils';
import i18n from '../i18n';

export { computePlantsNeedingWater } from '../utils/wateringUtils';

const WATERING_KEY = '@portfolio/plant_notifs/watering_reminder';
const DAYS_THRESHOLD = 2;

/**
 * Background hook: schedules (or cancels) a watering reminder for tomorrow 9:00
 * whenever the plant/entry data changes. No UI — call it at the top of the home screen.
 */
export function useWateringReminder(): void {
  const { activeGarden } = useActiveGarden();
  const allPlants = useCollection<Plant>('plants');
  const allEntries = useCollection<DiaryEntry>('diary_entries');

  useEffect(() => {
    if (allPlants.loading || allEntries.loading) return;

    const gardenId = activeGarden?.id;
    const activePlants = allPlants.items.filter(
      (p) => p.status !== 'finished' && (!gardenId || p.gardenId === gardenId),
    );

    (async () => {
      // Cancel previous reminder regardless — will reschedule below if still needed.
      const prevId = await AsyncStorage.getItem(WATERING_KEY);
      if (prevId) {
        await Notifications.cancelScheduledNotificationAsync(prevId).catch(() => {});
        await AsyncStorage.removeItem(WATERING_KEY);
      }

      if (activePlants.length === 0) return;

      const perms = await Notifications.getPermissionsAsync();
      const granted = (perms as any).granted ?? (perms as any).status === 'granted';
      if (!granted) return;

      const needWater = computePlantsNeedingWater(
        activePlants,
        allEntries.items,
        new Date(),
        DAYS_THRESHOLD,
      );

      if (needWater.length === 0) return;

      const labels = needWater.slice(0, 3).map((p) => {
        const crop = CROPS_BY_ID[p.cropId];
        return crop ? `${crop.emoji} ${p.name}` : p.name;
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const id = await scheduleDateAlert({
        date: tomorrow,
        title: i18n.t('notifications.wateringReminderTitle'),
        body: i18n.t('notifications.wateringReminderBody', { plants: labels.join(', ') }),
      });

      if (id) await AsyncStorage.setItem(WATERING_KEY, id);
    })();
  }, [allPlants.items, allEntries.items, activeGarden?.id, allPlants.loading, allEntries.loading]);
}
