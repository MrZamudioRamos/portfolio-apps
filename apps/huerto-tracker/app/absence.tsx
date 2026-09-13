import { Card, useColors, useTheme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { cancelReminder, requestPermissions, scheduleDateAlert } from '@portfolio/notifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ActionButton';
import { CROPS_BY_ID } from '../src/data/crops';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { useCustomCrops } from '../src/hooks/useCustomCrops';
import { usePro } from '../src/hooks/usePro';
import type { Plant } from '../src/models/plant';
import { buildAbsencePlan } from '../src/utils/absencePlan';
import { track, EVENTS } from '../src/analytics';

const ABSENCE_KEY = '@huerto/absence_plan/';
const ABSENCE_NOTIF_KEY = '@huerto/absence_plan_notifications/';
const DURATION_OPTIONS = [2, 4, 7, 14] as const;

export default function AbsenceScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isPro } = usePro();
  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const { customCropsById } = useCustomCrops();
  const [daysAway, setDaysAway] = useState<number>(4);
  const [hasHelper, setHasHelper] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!activeGarden?.id) return;
    void AsyncStorage.getItem(ABSENCE_KEY + activeGarden.id).then((value) => {
      if (!value) return;
      try {
        const parsed = JSON.parse(value) as { daysAway?: number; hasHelper?: boolean };
        if (DURATION_OPTIONS.includes(parsed.daysAway as (typeof DURATION_OPTIONS)[number])) setDaysAway(parsed.daysAway!);
        if (typeof parsed.hasHelper === 'boolean') setHasHelper(parsed.hasHelper);
      } catch {
        // Start with the safe defaults when local state is incomplete.
      }
    });
  }, [activeGarden?.id]);

  const gardenPlants = useMemo(
    () => plants.items.filter((plant) => plant.gardenId === activeGarden?.id && !plant.deletedAt && plant.status !== 'finished'),
    [plants.items, activeGarden?.id]
  );
  const plan = useMemo(() => buildAbsencePlan(gardenPlants, { ...CROPS_BY_ID, ...customCropsById }, daysAway, hasHelper), [gardenPlants, customCropsById, daysAway, hasHelper]);
  const returnDate = useMemo(() => new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(Date.now() + daysAway * 86_400_000)), [daysAway, i18n.language]);

  async function savePlan() {
    if (!activeGarden?.id) return;
    await AsyncStorage.setItem(ABSENCE_KEY + activeGarden.id, JSON.stringify({ daysAway, hasHelper, savedAt: new Date().toISOString() }));
    if (isPro && gardenPlants.length > 0) {
      const previousRaw = await AsyncStorage.getItem(ABSENCE_NOTIF_KEY + activeGarden.id);
      let previousIds: string[] = [];
      if (previousRaw) {
        try {
          const parsed = JSON.parse(previousRaw);
          if (Array.isArray(parsed)) previousIds = parsed.filter((id): id is string => typeof id === 'string');
        } catch {
          // Ignore stale notification state and rebuild the plan below.
        }
      }
      await Promise.all(previousIds.map((id) => cancelReminder(id).catch(() => undefined)));
      const granted = await requestPermissions();
      if (granted) {
        const ids: string[] = [];
        for (let offset = 1; offset <= daysAway; offset += 1) {
          const visits = plan.plans.filter(({ cadenceDays }) => offset % cadenceDays === 0);
          if (!visits.length) continue;
          const fireAt = new Date();
          fireAt.setDate(fireAt.getDate() + offset);
          fireAt.setHours(9, 0, 0, 0);
          const labels = visits.slice(0, 3).map(({ plant }) => plant.name).join(', ');
          const id = await scheduleDateAlert({
            date: fireAt,
            title: t('absence.notificationTitle'),
            body: t('absence.notificationBody', { plants: labels, count: visits.length }),
          });
          if (id) ids.push(id);
        }
        await AsyncStorage.setItem(ABSENCE_NOTIF_KEY + activeGarden.id, JSON.stringify(ids));
      }
    }
    track(EVENTS.absencePlanSaved, { days_away: daysAway, has_helper: hasHelper, is_pro: isPro });
    setSaved(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={12} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>{t('absence.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontSize: 34 }}>🧳</Text>
          <Text style={{ color: colors.text, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold }}>{t('absence.heading')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 22 }}>{t('absence.description')}</Text>
        </View>

        <Card padded style={{ borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t('absence.durationTitle')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>{t('absence.returnDate', { date: returnDate })}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
            {DURATION_OPTIONS.map((duration) => {
              const selected = daysAway === duration;
              return (
                <Pressable
                  key={duration}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => { setDaysAway(duration); setSaved(false); }}
                  style={{ minWidth: 70, minHeight: 46, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary + '12' : colors.surface }}
                >
                  <Text style={{ color: selected ? colors.primary : colors.text, fontWeight: selected ? fontWeight.bold : fontWeight.medium }}>{t('absence.days', { count: duration })}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card padded style={{ borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text style={{ fontSize: 26 }}>🤝</Text>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t('absence.helperTitle')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 }}>{t('absence.helperDesc')}</Text>
            </View>
            <Switch value={hasHelper} onValueChange={(value) => { setHasHelper(value); setSaved(false); }} trackColor={{ true: colors.primary }} thumbColor="#fff" accessibilityLabel={t('absence.helperTitle')} />
          </View>
        </Card>

        {!gardenPlants.length ? (
          <Card padded style={{ borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t('absence.noPlantsTitle')}</Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 21, marginTop: spacing.xs }}>{t('absence.noPlantsDesc')}</Text>
            <Button title={t('absence.addPlant')} variant="secondary" onPress={() => router.push('/plant/new')} style={{ marginTop: spacing.md }} />
          </Card>
        ) : (
          <>
            {plan.needsHelp && !hasHelper && (
              <View accessibilityRole="alert" style={{ padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.warning + '16', gap: spacing.xs }}>
                <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{t('absence.warningTitle')}</Text>
                <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{t('absence.warningDesc')}</Text>
              </View>
            )}
            <Card padded style={{ borderColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t('absence.plantsTitle')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>{t('absence.plantsDesc')}</Text>
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                {plan.plans.map(({ plant, cadenceDays, visitsNeeded, risk }) => (
                  <View key={plant.id} style={{ padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: risk === 'high' ? colors.error + '80' : colors.border, backgroundColor: risk === 'high' ? colors.error + '0d' : colors.surfaceAlt, gap: spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text style={{ fontSize: 22 }}>{CROPS_BY_ID[plant.cropId]?.emoji ?? customCropsById[plant.cropId]?.emoji ?? '🌱'}</Text>
                      <Text style={{ color: colors.text, fontWeight: fontWeight.bold, flex: 1 }}>{plant.name}</Text>
                      <Text style={{ color: risk === 'high' ? colors.error : risk === 'medium' ? colors.warning : colors.success, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{t('absence.risk.' + risk)}</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t(cadenceDays === 1 ? 'absence.cadenceOne' : 'absence.cadence', { days: cadenceDays })}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{visitsNeeded > 0 ? t('absence.visits', { count: visitsNeeded }) : t('absence.noVisit')}</Text>
                  </View>
                ))}
              </View>
            </Card>
            <Card padded style={{ borderColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t('absence.beforeTitle')}</Text>
              {[t('absence.before1'), t('absence.before2'), t('absence.before3'), t('absence.before4')].map((item, index) => (
                <View key={item} style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Text style={{ color: colors.primary, fontWeight: fontWeight.bold }}>{index + 1}</Text>
                  <Text style={{ color: colors.textSecondary, flex: 1, lineHeight: 20 }}>{item}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <Card padded style={{ borderColor: isPro ? colors.primary + '66' : colors.border, backgroundColor: isPro ? colors.primary + '0d' : colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text style={{ fontSize: 24 }}>{isPro ? '🔔' : '⭐'}</Text>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t(isPro ? 'absence.proActiveTitle' : 'absence.proTitle')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 }}>{t(isPro ? 'absence.proActiveDesc' : 'absence.proDesc')}</Text>
            </View>
          </View>
          {!isPro && <Button title={t('absence.proCta')} variant="secondary" size="sm" onPress={() => router.push('/paywall?source=absence_automation' as any)} style={{ marginTop: spacing.md }} />}
        </Card>

        <Button title={saved ? t('absence.saved') : t(isPro ? 'absence.savePro' : 'absence.save')} onPress={savePlan} disabled={!activeGarden?.id} size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}
