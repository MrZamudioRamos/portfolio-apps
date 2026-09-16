import React, { useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [showSoilSheet, setShowSoilSheet] = useState(false);
  const busy = useRef(false);
  const plan = isSeedPlan(plant);
  const today = useToday();
  const checked = hasSoilCheckToday(plant, entries, today);
  const pest = plant.pestStatus === 'active';
  const sowNow = Boolean(crop && climateZone && crop.sowingMonths[climateZone]?.includes(new Date().getMonth() + 1));
  const state = frost ? 'frost' : pest ? 'pest' : plan ? 'prepare' : checked ? 'done' : 'check';
  const tone = frost || pest ? colors.warning : state === 'done' ? colors.success : colors.primary;
  const icon = state === 'done' ? 'checkmark-circle-outline' : state === 'prepare' ? 'leaf-outline' : 'water-outline';
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
    <Card padded style={{ borderWidth: 1.5, borderColor: tone, marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tone + '18', borderWidth: 1, borderColor: tone + '55' }}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={23} color={tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: tone, fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.6 }}>{t('dailyCare.nextStep')}</Text>
          <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: fontWeight.bold, fontSize: fontSize.lg }}>{t('dailyCare.' + state + 'Title', { name: plant.name })}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, marginTop: spacing.md, borderRadius: spacing.md, backgroundColor: tone + '0d' }}>
        <Mascot pose={checked ? 'celebrate' : 'point'} size={42} />
        <Text accessibilityLiveRegion="polite" style={{ flex: 1, color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 23 }}>{t('dailyCare.' + state + 'Body')}</Text>
      </View>
      {error && <Text accessibilityRole="alert" style={{ color: colors.error, marginBottom: spacing.sm }}>{t('dailyCare.saveError')}</Text>}
      {state === 'prepare' && <>
        <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md }}>{t(sowNow ? 'dailyCare.sowNow' : 'dailyCare.waitSeason')}</Text>
        <Button title={t('dailyCare.sown')} onPress={() => record('sowing')} loading={saving} size="lg" />
      </>}
      {state === 'check' && (
        <Button
          title={t('dailyCare.checkSoil')}
          onPress={() => setShowSoilSheet(true)}
          disabled={saving}
          size="lg"
        />
      )}
      {onOpen && <Button title={t('dailyCare.viewPlant')} size="lg" variant="outline" onPress={onOpen} style={{ marginTop: spacing.sm }} />}

      <Modal
        visible={showSoilSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSoilSheet(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22,36,15,0.34)' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            onPress={() => setShowSoilSheet(false)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: spacing.xl,
              paddingBottom: spacing.xl + 12,
              gap: spacing.md,
            }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: colors.border }} />
            <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>
              {t('dailyCare.checkTitle', { name: plant.name })}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 23 }}>
              {t('dailyCare.checkBody')}
            </Text>
            <Button
              title={t('dailyCare.watered')}
              onPress={() => {
                setShowSoilSheet(false);
                void record('watering');
              }}
              loading={saving}
              size="lg"
            />
            <Button
              title={t('dailyCare.moist')}
              onPress={() => {
                setShowSoilSheet(false);
                void record('moist');
              }}
              disabled={saving}
              variant="outline"
              size="lg"
            />
          </View>
        </View>
      </Modal>
    </Card>
  );
}
