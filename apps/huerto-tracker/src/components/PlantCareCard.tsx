import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, useTheme } from '@portfolio/ui';
import { Button } from './ActionButton';
import { recordCare } from '../utils/careWrites';
import { useTranslation } from 'react-i18next';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import type { CropInfo } from '../data/crops';
import type { ClimateZone } from '../models/garden';
import { hasSoilCheckToday, isSeedPlan } from '../utils/dailyCare';
import { EVENTS, track, trackImpression } from '../analytics';
import { Mascot } from './Mascot';
import { useToday } from '../hooks/useToday';
import { useFocusEffect } from 'expo-router';

interface Props {
  plant: Plant;
  crop?: CropInfo;
  climateZone?: ClimateZone;
  entries: DiaryEntry[];
  onOpen?: () => void;
  frost?: boolean;
  onUpdated?: () => Promise<void>;
}

export function PlantCareCard({ plant, crop, climateZone, entries, onOpen, frost = false, onUpdated }: Props) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const plan = isSeedPlan(plant);
  const today = useToday();
  const checked = hasSoilCheckToday(plant, entries, today);
  const pest = plant.pestStatus === 'active';
  const sowNow = Boolean(crop && climateZone && crop.sowingMonths[climateZone]?.includes(new Date().getMonth() + 1));
  const state = frost ? 'frost' : pest ? 'pest' : plan ? 'prepare' : checked ? 'done' : 'check';
  const source = onOpen ? 'home' : 'plant_detail';
  useFocusEffect(React.useCallback(() => {
    const key = `${today}:${plant.id}:${state}:${source}`;
    trackImpression(key, EVENTS.todayActionShown, { action_type: state, plant_id: plant.id, source, date: today });
  }, [state, plant.id, source, today]));

  async function record(kind: 'watering' | 'moist' | 'sowing') {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(false);
    try {
      const written = await recordCare(plant.id, kind, t('dailyCare.moistNote'));
      if (!written) { await onUpdated?.(); return; }
      track(EVENTS.entryAdded, { type: kind === 'moist' ? 'note' : kind, source: 'daily_care', plant_id: plant.id });
      track(EVENTS.todayActionCompleted, { action_type: kind === 'sowing' ? 'prepare' : 'check', outcome: kind, plant_id: plant.id, source });
      await onUpdated?.();
    } catch { setError(true); }
    finally { busy.current = false; setSaving(false); }
  }

  return (
    <Card padded style={{ borderWidth: 1, borderColor: frost || pest ? colors.warning : colors.primary, marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Mascot pose={checked ? 'celebrate' : 'point'} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('dailyCare.eyebrow')}</Text>
          <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: fontWeight.bold, fontSize: fontSize.lg }}>{t('dailyCare.' + state + 'Title', { name: plant.name })}</Text>
        </View>
      </View>
      <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 23, marginVertical: spacing.md }}>{t('dailyCare.' + state + 'Body')}</Text>
      {error && <Text accessibilityRole="alert" style={{ color: colors.error, marginBottom: spacing.sm }}>{t('dailyCare.saveError')}</Text>}
      {onOpen ? <Button title={t('dailyCare.open')} size="lg" onPress={onOpen} /> : <>
        {state === 'prepare' && <>
          <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md }}>{t(sowNow ? 'dailyCare.sowNow' : 'dailyCare.waitSeason')}</Text>
          <Button title={t('dailyCare.sown')} onPress={() => record('sowing')} loading={saving} size="lg" />
        </>}
        {state === 'check' && <View style={{ gap: spacing.sm }}>
          <Button title={t('dailyCare.watered')} onPress={() => record('watering')} loading={saving} size="lg" />
          <Button title={t('dailyCare.moist')} onPress={() => record('moist')} disabled={saving} variant="outline" size="lg" />
        </View>}
      </>}
    </Card>
  );
}
