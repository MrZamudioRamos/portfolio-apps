import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCollection } from '@portfolio/storage';
import {
  requestPermissions,
  scheduleMonthlyAlerts,
  cancelMonthlyAlerts,
} from '@portfolio/notifications';
import { useEffect, useState } from 'react';
import { CROPS } from '../data/crops';
import type { Garden } from '../models/garden';

const ENABLED_KEY = '@portfolio/seasonal_alerts/enabled';
const IDS_KEY = '@portfolio/seasonal_alerts/ids';

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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
    const extra = sowable.length > 3 ? ` y ${sowable.length - 3} más` : '';

    alerts.push({
      year,
      month,
      hour: 9,
      minute: 0,
      title: `🌱 ${MONTH_LABELS[month - 1]}: tiempo de sembrar`,
      body: `Puedes sembrar: ${names}${extra}`,
    });
  }

  return alerts;
}

export function useSeasonalAlerts() {
  const gardens = useCollection<Garden>('gardens');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ENABLED_KEY).then((v) => {
      setEnabled(v === 'true');
      setLoading(false);
    });
  }, []);

  const zone = gardens.items[0]?.climateZone ?? null;

  // Recompute schedule when zone changes while enabled
  useEffect(() => {
    if (!enabled || !zone || gardens.loading) return;
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
      monthLabel: MONTH_LABELS[m - 1],
      crops: crops.slice(0, 4),
      total: crops.length,
    };
  })();

  return { enabled, loading, toggle, nextPreview, zone };
}
