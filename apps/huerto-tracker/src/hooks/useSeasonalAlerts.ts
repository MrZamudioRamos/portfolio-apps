import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestPermissions,
  scheduleMonthlyAlerts,
  cancelMonthlyAlerts,
} from '@portfolio/notifications';
import { useEffect, useState } from 'react';
import { CROPS } from '../data/crops';
import type { Garden } from '../models/garden';
import { useActiveGarden } from './useActiveGarden';
import i18n from '../i18n';

const ENABLED_KEY = '@portfolio/seasonal_alerts/enabled';
const IDS_KEY = '@portfolio/seasonal_alerts/ids';

function monthName(month: number): string {
  const months = i18n.t('notifications.monthsFull', { returnObjects: true }) as string[];
  return months[month - 1] ?? String(month);
}

function buildAlerts(zone: Garden['climateZone']) {
  const now = new Date();
  const alerts = [];

  for (let i = 1; i <= 12; i++) {
    const target = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = target.getMonth() + 1;
    const year = target.getFullYear();

    const sowable = CROPS.filter((c) => c.sowingMonths[zone]?.includes(month));
    if (sowable.length === 0) continue;

    const names = sowable
      .slice(0, 3)
      .map((c) => `${c.emoji} ${c.name}`)
      .join(', ');
    const extra = sowable.length > 3
      ? i18n.t('notifications.seasonalPushMore', { count: sowable.length - 3 })
      : '';

    alerts.push({
      year,
      month,
      hour: 9,
      minute: 0,
      title: i18n.t('notifications.seasonalPushTitle', { month: monthName(month) }),
      body: i18n.t('notifications.seasonalPushBody', { crops: `${names}${extra}` }),
    });
  }

  return alerts;
}

export function useSeasonalAlerts() {
  const { activeGarden, gardensLoading } = useActiveGarden();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ENABLED_KEY)
      .then((v) => setEnabled(v === 'true'))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Use the active garden's climate zone (multi-garden may span zones)
  const zone = activeGarden?.climateZone ?? null;

  // Recompute schedule when zone changes while enabled
  useEffect(() => {
    if (!enabled || !zone || gardensLoading) return;
    reschedule();
  }, [zone, enabled]);

  async function reschedule(): Promise<void> {
    if (!zone) return;
    const oldRaw = await AsyncStorage.getItem(IDS_KEY);
    const oldIds: string[] = oldRaw ? JSON.parse(oldRaw) : [];
    if (oldIds.length > 0) await cancelMonthlyAlerts(oldIds);

    const alerts = buildAlerts(zone);
    const newIds = await scheduleMonthlyAlerts(alerts);
    await AsyncStorage.setItem(IDS_KEY, JSON.stringify(newIds));
  }

  async function toggle(value: boolean): Promise<void> {
    if (value) {
      const granted = await requestPermissions();
      if (!granted) return;
      await reschedule();
    } else {
      const raw = await AsyncStorage.getItem(IDS_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      await cancelMonthlyAlerts(ids);
      await AsyncStorage.removeItem(IDS_KEY);
    }
    await AsyncStorage.setItem(ENABLED_KEY, value ? 'true' : 'false');
    setEnabled(value);
  }

  // Preview for the next alert
  const nextPreview = (() => {
    if (!zone) return null;
    const now = new Date();
    const nextMonth = now.getMonth() + 2; // next calendar month (1-indexed)
    const m = ((nextMonth - 1) % 12) + 1;
    const crops = CROPS.filter((c) => c.sowingMonths[zone]?.includes(m));
    if (crops.length === 0) return null;
    return {
      monthLabel: monthName(m),
      crops: crops.slice(0, 4),
      total: crops.length,
    };
  })();

  return { enabled, loading, toggle, nextPreview, zone };
}
