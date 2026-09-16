import { useToday } from '../../src/hooks/useToday';
import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useSession } from '@portfolio/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { GardenWidget } from '../../src/widgets/GardenWidget';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../../src/data';
import { useCustomCrops } from '../../src/hooks/useCustomCrops';
import { dateToStr, todayStr } from '../../src/utils/dateStr';
import { VARIETIES_BY_ID } from '../../src/data/varieties';
import type { Garden } from '../../src/models/garden';
import { GARDEN_TYPE_CONFIG } from '../../src/models/garden';
import { type Plant } from '../../src/models/plant';
import type { GardenReminder } from '../../src/models/reminder';
import { CLIMATE_ZONE_CONFIG } from '../../src/data/zones';
import { getLunarDay } from '../../src/utils/lunar';
import { Button } from '../../src/components/ActionButton';
import { SowNowCard } from '../../src/components/SowNowCard';
import type { DiagnosisFollowUpData, DiaryEntry } from '../../src/models/diary-entry';
import { useWeather } from '../../src/hooks/useWeather';
import { getWeatherLabel } from '../../src/utils/weather';
import { buildGamificationData } from '../../src/utils/gamification';
import { getNeedsWater, getWateringNeedsCount } from '../../src/utils/wateringStatus';
import { checkFrost } from '../../src/hooks/useFrostAlert';
import { recordQuickEntry } from '../../src/utils/careWrites';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { Mascot } from '../../src/components/Mascot';
import { SuccessBurst } from '../../src/components/SuccessBurst';
import { useCoachingLevel } from '../../src/hooks/useCoachingLevel';
import { useActivationChecklist } from '../../src/hooks/useActivationChecklist';
import { ActivationChecklist } from '../../src/components/ActivationChecklist';
import { useWateringReminder } from '../../src/hooks/useWateringReminder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlantCareCard } from '../../src/components/PlantCareCard';
import { getTodayPlant, isSeedPlan } from '../../src/utils/dailyCare';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { track, EVENTS } from '../../src/analytics';
import { buildCarePlan } from '../../src/utils/carePlan';
import { usePro } from '../../src/hooks/usePro';

function DashboardInner() {
  const currentDay = useToday();
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const { activeGarden: garden, gardens: allGardens, gardensLoading, refreshActiveId } = useActiveGarden();
  const { isGuest } = useSession();
  const allPlants = useCollection<Plant>('plants');

  useEffect(() => {
    if (isGuest && !gardensLoading && allGardens.length === 0) {
      router.replace('/onboarding');
    }
  }, [isGuest, gardensLoading, allGardens.length]);
  const reminders = useCollection<GardenReminder>('reminders');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const { customCropsById } = useCustomCrops();

  const gardenPlantItems = useMemo(
    () => (!garden ? [] : allPlants.items.filter((p) => p.gardenId === garden.id)),
    [allPlants.items, garden?.id]
  );
  const plants = useMemo(
    () => ({ ...allPlants, items: gardenPlantItems, count: gardenPlantItems.length }),
    [allPlants, gardenPlantItems]
  );

  useFocusEffect(
    useCallback(() => {
      void refreshActiveId().catch(() => {});
      void allPlants.refresh().catch(() => {});
      void reminders.refresh().catch(() => {});
      void entries.refresh().catch(() => {});
      if (garden?.province) checkFrost(garden.province);
    }, [garden?.id, garden?.province])
  );

  const { profile } = useUserProfile();
  const { isPro } = usePro();
  // Guidance level only controls the optional beginner recommendation card;
  // Stitch screens keep help inline and never launch an automatic overlay.
  const coachLevel = useCoachingLevel();
  const activation = useActivationChecklist();
  useWateringReminder();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    setRefreshError(false);
    try {
      await Promise.all([allPlants.refresh(), reminders.refresh(), entries.refresh()]);
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }
  const [showHarvestCelebration, setShowHarvestCelebration] = useState(false);
  const [harvestCelebKg, setHarvestCelebKg] = useState<number | null>(null);
  const [harvestCelebPlantId, setHarvestCelebPlantId] = useState<string | null>(null);
  const [harvestReflection, setHarvestReflection] = useState<'easy' | 'steady' | 'hard' | null>(null);
  const [harvestReflectionSaving, setHarvestReflectionSaving] = useState(false);
  const [harvestReflectionError, setHarvestReflectionError] = useState(false);
  const [showHarvestBurst, setShowHarvestBurst] = useState(false);

  const entriesByPlant = useMemo(() => {
    const idx = new Map<string, DiaryEntry[]>();
    for (const e of entries.items) {
      if (!e.plantId) continue;
      const arr = idx.get(e.plantId) ?? [];
      arr.push(e);
      idx.set(e.plantId, arr);
    }
    return idx;
  }, [entries.items]);

  const latestDiagnosisFollowUp = useMemo(() => {
    const entry = entries.items
      .filter((item) => item.gardenId === garden?.id && item.type === 'note' && (item.data as DiagnosisFollowUpData | undefined)?.kind === 'diagnosis_follow_up')
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!entry) return null;
    return { entry, data: entry.data as DiagnosisFollowUpData };
  }, [entries.items, garden?.id]);

  const carePlanTasks = useMemo(
    () => buildCarePlan(plants.items, { ...CROPS_BY_ID, ...customCropsById }, entries.items).filter((task) => task.priority === 'today'),
    [plants.items, customCropsById, entries.items, currentDay],
  );

  const weeklyTasks = useMemo(() => {
    const tasks: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; plantId: string }> = [];
    const today = new Date();
    const todayDateStr = dateToStr(today);
    const in7DaysStr = dateToStr(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));

    plants.items.forEach((p) => {
      if (p.status === 'finished' || isSeedPlan(p)) return;
      const crop = CROPS_BY_ID[p.cropId] ?? customCropsById[p.cropId];
      const plantEntries = entriesByPlant.get(p.id) ?? [];

      if (getNeedsWater(p, crop, plantEntries)) {
        tasks.push({
          icon: 'finger-print-outline',
          label: t('home.taskCheckSoil', { defaultValue: 'Comprobar sustrato · {{name}}', name: p.name }),
          plantId: p.id,
        });
      }
      if (p.pestStatus === 'active') {
        tasks.push({ icon: 'bug-outline', label: t('home.taskPest', { name: p.name }), plantId: p.id });
      }
      if (p.transplantDate && p.transplantDate >= todayDateStr && p.transplantDate <= in7DaysStr) {
        tasks.push({ icon: 'leaf-outline', label: t('home.taskTransplant', { name: p.name }), plantId: p.id });
      }
      if (p.firstHarvestDate && p.firstHarvestDate >= todayDateStr && p.firstHarvestDate <= in7DaysStr) {
        tasks.push({ icon: 'basket-outline', label: t('home.taskHarvest', { name: p.name }), plantId: p.id });
      } else if (p.sowingDate && !['harvesting', 'finished'].includes(p.status)) {
        const dth = (p.varietyId ? VARIETIES_BY_ID[p.varietyId]?.daysToHarvest : null) ?? crop?.daysToHarvest;
        if (dth) {
          const midDays = Math.round((dth[0] + dth[1]) / 2);
          const estDate = new Date(new Date(p.sowingDate + 'T12:00:00').getTime() + midDays * 86_400_000);
          const estStr = dateToStr(estDate);
          if (estStr >= todayDateStr && estStr <= in7DaysStr) {
            tasks.push({ icon: 'basket-outline', label: t('home.taskEstHarvest', { name: p.name }), plantId: p.id });
          }
        }
      }
      if (['growing', 'fruiting', 'harvesting'].includes(p.status)) {
        const lastEntry = [...plantEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
        const ref = lastEntry?.date ?? p.sowingDate;
        if (ref) {
          const daysInactive = Math.floor((Date.now() - new Date(ref + 'T12:00:00').getTime()) / 86_400_000);
          if (daysInactive > 10) {
            tasks.push({ icon: 'eye-outline', label: t('home.taskNeglected', { name: p.name, days: daysInactive }), plantId: p.id });
          }
        }
      }
      const lastTreatment = plantEntries
        .filter((e) => e.type === 'treatment' && (e.data as any)?.waitDays)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (lastTreatment) {
        const waitDays = Number((lastTreatment.data as any).waitDays);
        const treatDate = new Date(lastTreatment.date + 'T12:00:00');
        const safeDate = new Date(treatDate.getTime() + waitDays * 86_400_000);
        const daysLeft = Math.ceil((safeDate.getTime() - Date.now()) / 86_400_000);
        if (daysLeft > 0) {
          tasks.push({ icon: 'flask-outline', label: t('home.taskCarencia', { name: p.name, days: daysLeft }), plantId: p.id });
        }
      }
    });
    return tasks;
  }, [plants.items, entriesByPlant, t, customCropsById, currentDay]);

  const yearHarvestKg = useMemo(() => {
    const year = new Date().getFullYear().toString();
    return entries.items
      .filter((e) => e.type === 'harvest' && e.date.startsWith(year) && (e.data as any)?.unit !== 'units' && (!garden?.id || e.gardenId === garden.id))
      .reduce((sum, e) => {
        const w = (e.data as any)?.weightGrams ?? (e.data as any)?.weight;
        const n = typeof w === 'string' ? parseFloat(w) : typeof w === 'number' ? w : 0;
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
  }, [entries.items, garden?.id]);

  const zoneConfig = garden ? CLIMATE_ZONE_CONFIG[garden.climateZone] : null;
  const harvestingCount = plants.items.filter((p) => p.status === 'harvesting').length;
  const activeReminders = reminders.items.filter((r) => r.enabled && (!garden?.id || r.gardenId === garden.id)).length;
  const activePests = plants.items.filter((p) => p.pestStatus === 'active' || p.pestStatus === 'treated').length;
  const needsWaterCount = useMemo(
    () => getWateringNeedsCount(plants.items, CROPS_BY_ID, entries.items),
    [plants.items, entries.items, currentDay]
  );
  const lunar = useMemo(() => getLunarDay(), [currentDay]);
  const { weather, loading: weatherLoading } = useWeather(garden?.province);
  const streak = useMemo(
    () => buildGamificationData(plants.items, entries.items).streak,
    [plants.items, entries.items, currentDay]
  );

  const gardenHarvestCount = useMemo(
    () => entries.items.filter((e) => e.gardenId === garden?.id && e.type === 'harvest').length,
    [entries.items, garden?.id]
  );

  useEffect(() => {
    if (entries.loading || !garden?.id || gardenHarvestCount !== 1) return;
    const key = `@huerto/harvest_celebrated_${garden.id}`;
    void AsyncStorage.getItem(key).then((v) => {
      if (v) return;
      const harvestEntry = entries.items.find((e) => e.gardenId === garden.id && e.type === 'harvest');
      const d = harvestEntry?.data as any;
      const kg = d?.weightGrams ? d.weightGrams / 1000 : null;
      setHarvestCelebPlantId(harvestEntry?.plantId ?? null);
      setHarvestReflection(null);
      setHarvestReflectionError(false);
      setHarvestCelebKg(kg);
      setShowHarvestCelebration(true);
      setShowHarvestBurst(true);
      setTimeout(() => setShowHarvestBurst(false), 1200);
      void AsyncStorage.setItem(key, '1').catch(() => {});
    }).catch(() => {});
  }, [gardenHarvestCount, entries.loading, garden?.id]);

  async function saveHarvestReflection() {
    if (!harvestReflection || !harvestCelebPlantId || harvestReflectionSaving) return;
    setHarvestReflectionSaving(true);
    setHarvestReflectionError(false);
    try {
      await recordQuickEntry({
        gardenId: garden?.id ?? '',
        plantId: harvestCelebPlantId,
        type: 'note',
        date: todayStr(),
        notes: t('home.harvestReflectionNote', { rating: t('home.harvestReflection.' + harvestReflection) }),
      });
      track(EVENTS.entryAdded, { type: 'note', plant_id: harvestCelebPlantId, source: 'harvest_reflection' });
      // The note is already persisted locally; a refresh failure should not
      // make a successful save look like an error to the user.
      try { await entries.refresh(); } catch { /* local write succeeded */ }
      setShowHarvestCelebration(false);
    } catch {
      setHarvestReflectionError(true);
    } finally {
      setHarvestReflectionSaving(false);
    }
  }

  useEffect(() => {
    if (!garden) return;
    const nextReminder = reminders.items
      .filter((r) => r.enabled && r.gardenId === garden.id)
      .sort((a, b) => a.time.hour * 60 + a.time.minute - (b.time.hour * 60 + b.time.minute))[0];
    GardenWidget.updateSnapshot({
      gardenName: garden.name,
      plantCount: plants.count,
      nextReminder: nextReminder
        ? `${String(nextReminder.time.hour).padStart(2, '0')}:${String(nextReminder.time.minute).padStart(2, '0')}`
        : null,
      lunarEmoji: lunar.phaseEmoji,
    });
  }, [garden, plants.count, reminders.items]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  const todayPlant = getTodayPlant(plants.items, { ...CROPS_BY_ID, ...customCropsById }, entries.items);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header — Stitch: identity, active space, weather and notifications */}
      <View style={s.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.brandRow}>
            <View style={[s.brandMark, { backgroundColor: colors.accent }]}>
              <Ionicons name="leaf" size={15} color={colors.primaryDark} />
            </View>
            <Text style={[s.brandName, { color: colors.text }]}>Semilla</Text>
          </View>
          <Pressable
            onPress={() => router.push('/gardens' as any)}
            accessibilityRole="button"
            accessibilityLabel={t('gardens.title')}
            style={({ pressed }) => [s.locationButton, { opacity: pressed ? 0.72 : 1 }]}
            hitSlop={8}
          >
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[s.locationText, { color: colors.text }]} numberOfLines={1}>
              {garden?.province ?? t('home.defaultGardenName')} · {garden?.name ?? t('home.defaultGardenName')}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </Pressable>
          <Text style={[s.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {[
              weather && !weatherLoading
                ? `${getWeatherLabel(weather.today.weatherCode).emoji} ${weather.today.tempMax}°`
                : null,
              zoneConfig ? `${zoneConfig.emoji} ${t(`zone.${garden?.climateZone}`)}` : null,
            ].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/settings/notifications' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.title')}
          style={({ pressed }) => [s.headerBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
        </Pressable>
        <View style={[s.headerAvatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} accessibilityLabel="Perfil">
          <Ionicons name="person-outline" size={18} color={colors.primaryDark} />
        </View>
      </View>

      <FlatList
        // Hoy is a care dashboard. Plant inventory belongs to the dedicated
        // Plantas tab, so this list intentionally has no legacy plant-card rows.
        data={[]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            {refreshError && (
              <View accessibilityRole="alert" style={{ marginHorizontal: spacing.xl, marginBottom: spacing.md, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.error + '66', backgroundColor: colors.error + '12', gap: spacing.sm }}>
                <Text style={{ color: colors.text }}>{t('errorScreen.desc')}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={t('errorScreen.retry')} onPress={onRefresh} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>{t('errorScreen.retry')}</Text>
                </Pressable>
              </View>
            )}
            {/* Initial load spinner — avoids empty-state flash */}
            {plants.loading && plants.count === 0 && (
              <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}

            {/* Empty state — the first useful action stays visible in the Stitch shell. */}
            {plants.count === 0 && !plants.loading && (
              <View style={[s.firstUseCard, { backgroundColor: colors.surface, borderColor: colors.primary + '55', borderWidth: 1.5 }]}>
                <Mascot pose="wave" size={128} />
                <Text style={[s.firstUseTitle, { color: colors.text }]}>{t('home.firstUseTitle', { name: garden?.name ?? t('home.defaultGardenName') })}</Text>
                <Text style={[s.firstUseDesc, { color: colors.textSecondary }]}>{t('home.firstUseDesc')}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(profile ? '/first-crop' : '/onboarding')}
                  style={({ pressed }) => [s.firstUseCta, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primaryDark} />
                  <Text style={[s.firstUseCtaText, { color: colors.primaryDark }]}>{t('home.firstUseCta')}</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                  <Pressable
                    onPress={() => router.push('/(tabs)/calendar' as any)}
                    style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.primary + '44', backgroundColor: colors.primary + '08', opacity: pressed ? 0.7 : 1 })}
                  >
                    <Text style={{ fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium }}>{t('home.firstUseCalendarCta')}</Text>
                  </Pressable>

                </View>
              </View>
            )}

            {/* Beginner's first question answered: what should I plant? */}
            {plants.count === 0 && !plants.loading && garden && coachLevel !== 'full' && (
              <View>
                  <SowNowCard climateZone={garden.climateZone} />
              </View>
            )}

            {/* Stitch's first viewport: a calm status snapshot before the action. */}
            {!plants.loading && (
              <View style={[s.stitchOverview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={s.stitchGreetingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stitchGreeting, { color: colors.text }]}>
                      {t('home.todayHeading', { defaultValue: 'Hoy en tu huerto' })}
                    </Text>
                    <Text style={[s.stitchSubheading, { color: colors.textSecondary }]}>
                      {t('home.todaySubheading', { defaultValue: 'Una revisión breve para cuidar mejor, sin adivinar.' })}
                    </Text>
                  </View>
                  <View style={[s.stitchAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="leaf" size={19} color={colors.primaryDark} />
                  </View>
                </View>

                <View style={s.stitchMetricsGrid}>
                  <View style={[s.stitchMetric, { backgroundColor: colors.primaryLight + '55' }]}>
                    <Text style={[s.stitchMetricValue, { color: colors.primaryDark }]}>{plants.items.filter((plant) => plant.status !== 'finished').length}</Text>
                    <Text style={[s.stitchMetricLabel, { color: colors.textSecondary }]}>{t('home.stats.plants')}</Text>
                  </View>
                  <View style={[s.stitchMetric, { backgroundColor: colors.accent + '38' }]}>
                    <Text style={[s.stitchMetricValue, { color: colors.text }]}>{carePlanTasks.length}</Text>
                    <Text style={[s.stitchMetricLabel, { color: colors.textSecondary }]}>{t('home.todayPriority', { defaultValue: 'Tarea urgente' })}</Text>
                  </View>
                  <View style={[s.stitchMetric, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[s.stitchMetricValue, { color: colors.primaryDark }]}>{streak}</Text>
                    <Text style={[s.stitchMetricLabel, { color: colors.textSecondary }]}>Días felices</Text>
                  </View>
                </View>

                {todayPlant && !entries.loading && (
                  <View style={s.priorityCare}>
                    <PlantCareCard
                      plant={todayPlant}
                      crop={CROPS_BY_ID[todayPlant.cropId] ?? customCropsById[todayPlant.cropId]}
                      climateZone={garden?.climateZone}
                      entries={entries.items}
                      frost={Boolean(weather && weather.today.tempMin <= 2 && !isSeedPlan(todayPlant))}
                      onOpen={() => router.push({ pathname: '/plant/[id]', params: { id: todayPlant.id } })}
                      onUpdated={async () => { await Promise.all([allPlants.refresh(), entries.refresh()]); }}
                    />
                  </View>
                )}

                <View style={[s.stitchTip, { backgroundColor: colors.surfaceAlt, borderColor: colors.accent + '66' }]}>
                  <View style={[s.stitchTipIcon, { backgroundColor: colors.accent }]}>
                    <Ionicons name="sunny-outline" size={18} color={colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stitchTipTitle, { color: colors.text }]}>{t('home.semillaTipTitle', { defaultValue: 'Consejo de Semillita' })}</Text>
                    <Text style={[s.stitchTipText, { color: colors.textSecondary }]}>{t('home.semillaTip', { defaultValue: 'Observa la tierra antes de regar: tocar 2 cm de profundidad evita cuidados innecesarios.' })}</Text>
                  </View>
                </View>

                {weeklyTasks.length > 0 && (
                  <View style={s.stitchUpcoming}>
                    <View style={s.stitchUpcomingHeader}>
                      <Text style={[s.stitchUpcomingTitle, { color: colors.text }]}>{t('home.upcomingTitle', { defaultValue: 'Próximas tareas' })}</Text>
                      <Text style={[s.stitchUpcomingCount, { color: colors.textDisabled }]}>{weeklyTasks.length}</Text>
                    </View>
                    {weeklyTasks.slice(0, 3).map((task, index) => (
                      <Pressable
                        key={`stitch-task-${task.plantId}-${index}`}
                        accessibilityRole="button"
                        onPress={() => router.push({ pathname: '/plant/[id]', params: { id: task.plantId } })}
                        style={({ pressed }) => [s.stitchTask, { borderTopColor: colors.border, opacity: pressed ? 0.68 : 1 }]}
                      >
                        <View style={[s.stitchTaskDot, { backgroundColor: colors.primaryLight }]}>
                          <Ionicons name={task.icon} size={14} color={colors.primaryDark} />
                        </View>
                        <Text style={[s.stitchTaskText, { color: colors.text }]} numberOfLines={1}>{task.label}</Text>
                        <Ionicons name="chevron-forward" size={17} color={colors.textDisabled} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Seasonal discovery stays close to today's care, so the next plant is easy to find. */}
            {plants.count > 0 && garden && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/care-plan' as any)}
                style={({ pressed }) => [
                  { marginHorizontal: spacing.xl, marginTop: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.primary + '55', backgroundColor: colors.primary + '0d', flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '20' }}>
                  <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t('carePlan.heading')}</Text>
                    {!isPro && <Text style={{ color: colors.warning, fontSize: 10, fontWeight: fontWeight.bold }}>PRO</Text>}
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 17, marginTop: 2 }}>
                    {carePlanTasks.length > 0 ? t('carePlan.homeToday', { count: carePlanTasks.length }) : t('carePlan.homeReady')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </Pressable>
            )}

            {plants.count > 0 && latestDiagnosisFollowUp && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/plant/follow-up?entryId=${encodeURIComponent(latestDiagnosisFollowUp.data.parentEntryId)}` as any)}
                style={({ pressed }) => [
                  { marginHorizontal: spacing.xl, marginTop: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.info + '55', backgroundColor: colors.info + '0d', gap: spacing.xs, opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Ionicons name="search-outline" size={22} color={colors.info} />
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold, flex: 1 }} numberOfLines={1}>
                    {t('home.diagnosisProgressTitle', { name: latestDiagnosisFollowUp.data.diagnosisName ?? t('identify.title') })}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.info} />
                </View>
                <Text style={{ color: colors.info, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                  {t('home.diagnosisProgressStatus', { status: t('identify.followUpStatus.' + (latestDiagnosisFollowUp.data.comparisonStatus ?? 'incierto')) })}
                </Text>
                {!!latestDiagnosisFollowUp.data.comparisonSummary && (
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18 }} numberOfLines={2}>
                    {latestDiagnosisFollowUp.data.comparisonSummary}
                  </Text>
                )}
                {!!latestDiagnosisFollowUp.data.comparisonNextStep && (
                  <Text style={{ color: colors.text, fontSize: fontSize.xs, lineHeight: 18 }} numberOfLines={2}>
                    → {latestDiagnosisFollowUp.data.comparisonNextStep}
                  </Text>
                )}
                <Text style={{ color: colors.info, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginTop: spacing.xs }}>
                  {t('home.diagnosisProgressCta')}
                </Text>
              </Pressable>
            )}

          </>
        }
        ListEmptyComponent={null}
        ListFooterComponent={null}
        renderItem={() => null}
      />

      {/* First harvest celebration modal */}
      <Modal visible={showHarvestCelebration} transparent animationType="fade" onRequestClose={() => setShowHarvestCelebration(false)}>
        <SuccessBurst visible={showHarvestBurst} size={120} />
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }} onPress={() => setShowHarvestCelebration(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.lg, width: '100%' }}>
            <Mascot pose="celebrate" size={120} />
            <Ionicons name="trophy-outline" size={40} color={colors.secondary} />
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center' }}>
              {t('home.firstHarvestCelebTitle')}
            </Text>
            {harvestCelebKg !== null && (
              <Text style={{ fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' }}>
                {t('home.firstHarvestCelebDesc', { kg: harvestCelebKg.toFixed(2) })}
              </Text>
            )}
            {harvestCelebPlantId && (
              <View style={{ width: '100%', gap: spacing.sm }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center' }}>
                  {t('home.harvestReflectionTitle')}
                </Text>
                <Text style={{ fontSize: fontSize.sm, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' }}>
                  {t('home.harvestReflectionDesc')}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(['easy', 'steady', 'hard'] as const).map((rating) => {
                    const selected = harvestReflection === rating;
                    return (
                      <Pressable
                        key={rating}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setHarvestReflection(rating)}
                        style={{ flex: 1, minHeight: 52, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '18' : colors.surfaceAlt, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs }}
                      >
                        <Text style={{ color: selected ? colors.primary : colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' }}>{t('home.harvestReflection.' + rating)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {harvestReflectionError && <Text accessibilityRole="alert" style={{ color: colors.error, textAlign: 'center', fontSize: fontSize.sm }}>{t('home.harvestReflectionError')}</Text>}
                {harvestReflection && <Button title={t('home.harvestReflectionSave')} onPress={saveHarvestReflection} loading={harvestReflectionSaving} size="lg" />}
              </View>
            )}
            <Pressable
              onPress={() => setShowHarvestCelebration(false)}
              style={({ pressed }) => ({ backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radii.lg, opacity: pressed ? 0.8 : 1 })}
            >
              <Text style={{ color: colors.background, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t(harvestReflection ? 'home.harvestReflectionLater' : 'home.firstHarvestCelebClose')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

export default function DashboardScreen() {
  return <DashboardInner />;
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 3 },
    brandMark: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    brandName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
    locationButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 44,
      maxWidth: '100%',
    },
    locationText: { flexShrink: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    headerSub: { fontSize: fontSize.xs, marginTop: 1 },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    stitchOverview: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 1,
    },
    stitchGreetingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    stitchGreeting: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
    stitchSubheading: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 3 },
    stitchAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    stitchMetricsGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    stitchMetric: { flex: 1, minHeight: 76, borderRadius: radii.lg, padding: spacing.sm, justifyContent: 'center' },
    stitchMetricValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    stitchMetricLabel: { fontSize: fontSize.xs, lineHeight: 17, marginTop: 2 },
    priorityCare: { marginTop: spacing.lg },
    stitchTip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1 },
    stitchTipIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    stitchTipTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    stitchTipText: { fontSize: fontSize.xs, lineHeight: 17, marginTop: 2 },
    stitchUpcoming: { marginTop: spacing.lg },
    stitchUpcomingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
    stitchUpcomingTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    stitchUpcomingCount: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    stitchTask: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
    stitchTaskDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    stitchTaskText: { flex: 1, fontSize: fontSize.sm },
    listContent: { paddingBottom: 0 },
    firstUseCard: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.xl,
      borderRadius: radii.xl,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.md,
    },
    firstUseTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      textAlign: 'center',
    },
    firstUseDesc: {
      fontSize: fontSize.md,
      textAlign: 'center',
      lineHeight: 22,
    },
    firstUseCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderRadius: radii.full,
    },
    firstUseCtaText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
    },
  });
