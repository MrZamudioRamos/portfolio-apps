import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { Button } from '../../src/components/ActionButton';
import { useCollection } from '@portfolio/storage';
import { useReminders } from '@portfolio/notifications';
import { ShareModal, type ShareModalProps } from '../../src/components/ShareModal';
import { formatDate, formatRelative } from '@portfolio/shared';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID, CATEGORY_CONFIG } from '../../src/data/crops';
import { CROP_IMAGES } from '../../src/data/cropImages';
import { INDOOR_START, getSeedlingSchedule } from '../../src/data/indoorStart';
import { getPlantCoach } from '../../src/utils/plantCoach';
import { Mascot } from '../../src/components/Mascot';
import type { PropagationMethod } from '../../src/models/plant';
import { useCustomCrops } from '../../src/hooks/useCustomCrops';
import { dateToStr, todayStr } from '../../src/utils/dateStr';
import { VARIETIES_BY_ID } from '../../src/data/varieties';
import { getCompanions, getIncompatible } from '../../src/data/companions';
import { PLANT_STATUS_CONFIG, type Plant, type PlantStatus } from '../../src/models/plant';
import { ENTRY_TYPE_CONFIG, type DiaryEntry } from '../../src/models/diary-entry';
import { REMINDER_TYPE_CONFIG, type GardenReminder } from '../../src/models/reminder';
import { getPestsForCrop, PEST_STATUS_CONFIG } from '../../src/data/pests';
import { usePro as usePurchases } from '../../src/hooks/usePro';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { CalendarGantt } from '../../src/components/plant/CalendarGantt';
import { DifficultyGauge } from '../../src/components/plant/DifficultyGauge';
import { HowToStages } from '../../src/components/plant/HowToStages';
import { PlantCareCard } from '../../src/components/PlantCareCard';
import { isSeedPlan } from '../../src/utils/dailyCare';
import { useWeather } from '../../src/hooks/useWeather';

type CropTab = 'overview' | 'calendar' | 'companions' | 'howto';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

const ALL_STATUSES: PlantStatus[] = [
  'seedling', 'transplanted', 'growing', 'flowering', 'fruiting', 'harvesting', 'finished',
];

// Sun/water labels are now derived from t() inside the component

export default function PlantDetailScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const reminders = useReminders<GardenReminder>('reminders');
  const { customCropsById } = useCustomCrops();
  const { activeGarden } = useActiveGarden();
  const { weather } = useWeather(activeGarden?.province);
  const [cropTab, setCropTab] = useState<CropTab>('overview');
  const [cropImgErr, setCropImgErr] = useState(false);
  const [shareModal, setShareModal] = useState<Omit<ShareModalProps, 'visible' | 'onClose'> | null>(null);
  const [wateringFeedback, setWateringFeedback] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([plants.refresh(), entries.refresh()]);
    } finally {
      setRefreshing(false);
    }
  }

  const plant = plants.getById(id);
  const crop = plant
    ? (CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId] ?? {
        id: plant.cropId, name: plant.cropId, emoji: '🌿',
        category: 'vegetable' as const, sowingMonths: {} as any,
        daysToHarvest: null as any, sunNeeds: 'medium' as any, waterNeeds: 'medium' as any,
        isCustom: true,
      })
    : null;
  const statusConfig = plant ? PLANT_STATUS_CONFIG[plant.status] : null;
  const companions = crop ? getCompanions(crop.id) : [];
  const incompatibles = crop ? getIncompatible(crop.id) : [];
  const pestInfo = crop ? getPestsForCrop(crop.id) : [];
  const currentPestStatus = plant?.pestStatus ?? 'none';
  const { isPro } = usePurchases();

  const plantEntryCount = useMemo(
    () => entries.items.filter((e) => e.plantId === id).length,
    [entries.items, id]
  );

  const plantEntries = useMemo(
    () =>
      [...entries.items]
        .filter((e) => e.plantId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [entries.items, id]
  );

  const photoEntries = useMemo(
    () =>
      [...entries.items]
        .filter((e) => e.plantId === id && e.photoUri)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [entries.items, id]
  );

  const harvestSummary = useMemo(() => {
    const harvests = entries.items.filter((e) => e.plantId === id && e.type === 'harvest');
    if (harvests.length === 0) return null;
    // new format: weightGrams (kg value, misnamed) | old format: weight + unit !== 'units'
    const kgEntries = harvests.filter((e) => {
      const d = e.data as any;
      return d?.weightGrams != null || (d?.weight != null && d?.unit !== 'units');
    });
    // new format: data.units (count) | old format: data.unit === 'units' + data.weight
    const unitEntries = harvests.filter((e) => {
      const d = e.data as any;
      return d?.units != null || (d?.unit === 'units' && d?.weight != null);
    });
    const totalKg = kgEntries.reduce((s, e) => {
      const d = e.data as any;
      const w = d?.weightGrams ?? d?.weight;
      return s + (typeof w === 'number' ? w : parseFloat(String(w)) || 0);
    }, 0);
    const totalUnits = unitEntries.reduce((s, e) => {
      const d = e.data as any;
      const u = d?.units ?? (d?.unit === 'units' ? d?.weight : null);
      return s + (typeof u === 'number' ? u : parseFloat(String(u)) || 0);
    }, 0);
    return { count: harvests.length, totalKg: totalKg > 0 ? totalKg : null, totalUnits: totalUnits > 0 ? totalUnits : null };
  }, [entries.items, id]);

  const plantReminders = useMemo(
    () => reminders.items.filter((r) => r.plantId === id && (!plant || r.gardenId === plant.gardenId)),
    [reminders.items, id, plant?.gardenId]
  );

  const treatmentCarencia = useMemo(() => {
    const treatments = entries.items
      .filter((e) => e.plantId === id && e.type === 'treatment' && (e.data as any)?.waitDays)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!treatments[0]) return null;
    const last = treatments[0];
    const waitDays = Number((last.data as any).waitDays);
    const treatDate = new Date(last.date + 'T12:00:00');
    const safeDate = new Date(treatDate.getTime() + waitDays * 86_400_000);
    const daysLeft = Math.ceil((safeDate.getTime() - Date.now()) / 86_400_000);
    return { product: (last.data as any)?.product as string | undefined, daysLeft };
  }, [entries.items, id]);

  const { t } = useTranslation();

  const SUN_LABEL: Record<string, string> = {
    full: `☀️ ${t('plantDetail.sunFull')}`,
    partial: `⛅ ${t('plantDetail.sunPartial')}`,
    shade: `🌑 ${t('plantDetail.sunShade')}`,
  };
  const WATER_LABEL: Record<string, string> = {
    high: `💧💧💧 ${t('plantDetail.waterHigh')}`,
    medium: `💧💧 ${t('plantDetail.waterMedium')}`,
    low: `💧 ${t('plantDetail.waterLow')}`,
  };

  const [showTransplantModal, setShowTransplantModal] = useState(false);
  const [transplantDateInput, setTransplantDateInput] = useState(todayStr);
  const [showTransplantDatePicker, setShowTransplantDatePicker] = useState(false);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (plants.loading && !plant) return (
    <SafeAreaView style={[s.loadingState, { backgroundColor: colors.background }]}>
      <Mascot pose="idle" size={72} />
      <ActivityIndicator color={colors.primary} />
      <Text style={[s.loadingText, { color: colors.textSecondary }]}>{t('plantDetail.loading')}</Text>
    </SafeAreaView>
  );
  if (!plant || !crop) {
    return (
      <SafeAreaView style={[s.notFoundState, { backgroundColor: colors.background }]}>
        <Mascot pose="idle" size={96} />
        <Text style={[s.notFoundTitle, { color: colors.text }]}>{t('plantDetail.notFound')}</Text>
        <Button
          title={t('plantDetail.backToGarden')}
          size="md"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        />
      </SafeAreaView>
    );
  }
  const currentStatusConfig = statusConfig ?? PLANT_STATUS_CONFIG.seedling;

  async function handleStatusChange(status: PlantStatus) {
    if (plant!.status === status) {
      setShowStatusModal(false);
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await plants.update(id, { status });
    setShowStatusModal(false);

    // Trigger C: season summary when last active plant is marked finished
    if (status === 'finished' && plant && activeGarden) {
      const gardenPlants = plants.items.filter((p) => p.gardenId === plant.gardenId);
      if (gardenPlants.length >= 3) {
        const activeCount = gardenPlants.filter((p) => p.id !== id && p.status !== 'finished').length;
        if (activeCount === 0) {
          const harvestKg = entries.items
            .filter((e) => e.gardenId === plant.gardenId && e.type === 'harvest')
            .reduce((sum, e) => {
              const w = (e.data as any)?.weightGrams ?? 0;
              return sum + (typeof w === 'number' ? w : parseFloat(w) || 0);
            }, 0);
          setShareModal({
            eventType: 'season_summary',
            title: t('share.seasonTitle', { garden: activeGarden.name }),
            primaryStat: `${gardenPlants.length}`,
            primaryStatLabel: t('share.seasonStatLabel'),
            secondaryStat: harvestKg > 0 ? `${(harvestKg / 1000).toFixed(1)} kg` : undefined,
            secondaryStatLabel: harvestKg > 0 ? t('share.harvestedLabel') : undefined,
            badgeIcon: '🏆',
          });
        }
      }
    }
  }

  async function handleDuplicate() {
    const today = todayStr();
    const newPlant = await plants.create({
      gardenId: plant!.gardenId,
      cropId: plant!.cropId,
      name: plant!.name + ' 2',
      variety: plant!.variety,
      varietyId: plant!.varietyId,
      photoUri: plant!.photoUri,
      status: 'seedling',
      sowingDate: today,
    });
    await entries.create({
      gardenId: plant!.gardenId,
      plantId: newPlant.id,
      type: 'sowing',
      date: today,
    });
    router.replace(`/plant/${newPlant.id}` as any);
  }

  async function handleSuccessionSow() {
    const today = todayStr();
    const batchNum = plants.items.filter(
      (p) => p.cropId === plant!.cropId && p.gardenId === plant!.gardenId
    ).length + 1;
    const newPlant = await plants.create({
      gardenId: plant!.gardenId,
      cropId: plant!.cropId,
      name: t('plantDetail.successionName', { name: plant!.name, batch: batchNum }),
      variety: plant!.variety,
      varietyId: plant!.varietyId,
      sowingDate: today,
      status: 'seedling',
      soilPh: plant!.soilPh,
      soilTexture: plant!.soilTexture,
      soilNotes: plant!.soilNotes,
      bedName: plant!.bedName,
      harvestGoalKg: plant!.harvestGoalKg,
    });
    await entries.create({
      gardenId: plant!.gardenId,
      plantId: newPlant.id,
      type: 'sowing',
      date: today,
      notes: t('plantDetail.successionNote', { original: plant!.name }),
    });
    router.push(`/plant/${newPlant.id}` as any);
  }

  function handleDelete() {
    Alert.alert(
      t('plantDetail.deleteTitle', { name: plant!.name }),
      t('plantDetail.deleteDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const relatedEntries = entries.items.filter((e) => e.plantId === id);
            const relatedReminders = reminders.items.filter((r) => r.plantId === id);
            // Soft-delete plant + its children; tombstones sync on next push.
            await plants.softRemove(id);
            await Promise.all([
              entries.softRemoveMany(relatedEntries.map((e) => e.id)),
              reminders.softRemoveMany(relatedReminders.map((r) => r.id)),
            ]);
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: colors.surfaceAlt }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('onboarding.back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          {plant.photoUri ? (
            <Image source={{ uri: plant.photoUri }} style={s.heroPhoto} />
          ) : CROP_IMAGES[plant.cropId] && !cropImgErr ? (
            <Image
              source={{ uri: CROP_IMAGES[plant.cropId] }}
              style={s.heroPhoto}
              resizeMode="cover"
              onError={() => setCropImgErr(true)}
            />
          ) : (
            <View style={[s.heroNoPhoto, { backgroundColor: statusConfig ? statusConfig.color + '15' : colors.surfaceAlt }]}>
              <Text style={{ fontSize: 72 }}>{crop.emoji}</Text>
              <Text style={[s.heroNoPhotoName, { color: colors.text }]} numberOfLines={1}>
                {crop.isCustom ? crop.name : t('crops.' + crop.id + '.name', { defaultValue: crop.name })}
              </Text>
              <View style={[s.heroCategoryChip, { backgroundColor: 'rgba(0,0,0,0.07)' }]}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
                  {CATEGORY_CONFIG[crop.category]?.emoji} {t('cropCategory.' + crop.category)}
                </Text>
              </View>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('plantEdit.title')}
            onPress={() => router.push(`/plant/edit?id=${id}`)}
            style={s.editBtn}
          >
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={s.body}>
          {/* Title + badge */}
          <View style={s.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.plantName, { color: colors.text }]}>{plant.name}</Text>
              {(plant.varietyId || plant.variety) && (
                <Text style={[s.variety, { color: colors.textSecondary }]}>
                  {plant.varietyId
                    ? t('varieties.' + plant.varietyId, { defaultValue: VARIETIES_BY_ID[plant.varietyId]?.name ?? plant.variety })
                    : plant.variety}
                </Text>
              )}
            </View>
            {statusConfig && (
              <View style={[s.statusBadge, { backgroundColor: statusConfig.color + '22' }]}>
                <Text style={[s.statusText, { color: statusConfig.color }]}>
                  {statusConfig.emoji} {t(isSeedPlan(plant) ? 'dailyCare.planStatus' : 'plantStatus.' + plant.status)}
                </Text>
              </View>
            )}
          </View>

          {plant.status !== 'finished' && <PlantCareCard plant={plant} crop={crop} climateZone={activeGarden?.climateZone} entries={entries.items} frost={Boolean(weather && weather.today.tempMin <= 2 && !isSeedPlan(plant))} onUpdated={async () => { await Promise.all([plants.refresh(), entries.refresh()]); }} />}

          {/* Lifecycle progress bar */}
          {!isSeedPlan(plant) && (() => {
            const currentIdx = ALL_STATUSES.indexOf(plant.status);
            return (
              <View style={{ marginBottom: spacing.xl }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {ALL_STATUSES.map((st, i) => {
                    const cfg = PLANT_STATUS_CONFIG[st];
                    const isCurrent = i === currentIdx;
                    const isDone = i < currentIdx;
                    return (
                      <React.Fragment key={st}>
                        {i > 0 && (
                          <View style={{
                            flex: 1, height: 2,
                            backgroundColor: isDone ? colors.primary + '66' : colors.border,
                          }} />
                        )}
                        <View style={{
                          width: 30, height: 30, borderRadius: 15,
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isCurrent ? cfg.color + '20' : 'transparent',
                          borderWidth: 1.5,
                          borderColor: isCurrent ? cfg.color : isDone ? colors.primary + '55' : colors.border,
                        }}>
                          <Text style={{ fontSize: isCurrent ? 15 : 12, opacity: isDone ? 0.5 : 1 }}>
                            {cfg.emoji}
                          </Text>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>
                {statusConfig && (
                  <Text style={{
                    fontSize: fontSize.xs,
                    color: statusConfig.color,
                    fontWeight: fontWeight.semibold,
                    textAlign: 'center',
                    marginTop: spacing.xs,
                  }}>
                    {t('plantStatus.' + plant.status)}
                  </Text>
                )}
              </View>
            );
          })()}

          {/* Coach line — what's happening now + the next step, in plain words */}
          {(() => {
            const coach = isSeedPlan(plant) ? null : getPlantCoach(plant, crop);
            if (!coach) return null;
            const tone =
              coach.tone === 'success' ? colors.success : coach.tone === 'warn' ? colors.warning : colors.info;
            const coachPose =
              coach.tone === 'success' ? 'celebrate' : coach.tone === 'warn' ? 'idle' : 'point';
            return (
              <View style={[s.coachCard, { backgroundColor: tone + '14', borderColor: tone + '44' }]}>
                <Mascot pose={coachPose} size={48} />
                <Text style={[s.coachText, { color: colors.text }]}>{t(coach.key, coach.params)}</Text>
              </View>
            );
          })()}

          {/* "Es normal" coaching tip for seedlings past 7 days without germination */}
          {plant.status === 'seedling' && plant.sowingDate && !plant.germinationDate && (() => {
            const refDate = plant.sowingDate ?? plant.createdAt;
            const days = Math.floor((Date.now() - new Date(refDate + 'T12:00:00').getTime()) / 86_400_000);
            if (days < 7) return null;
            return (
              <View style={[s.coachCard, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
                <Mascot pose="point" size={48} />
                <Text style={[s.coachText, { color: colors.text }]}>{t('plantDetail.seedlingTip')}</Text>
              </View>
            );
          })()}

          {/* Notes */}
          {plant.notes && (
            <View style={[s.notesCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={s.notesEmoji}>📝</Text>
              <Text style={[s.notesText, { color: colors.text }]}>{plant.notes}</Text>
            </View>
          )}

          {/* Dates */}
          {plant.sowingDate && (
            <View style={{ marginBottom: spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={[s.dateText, { color: colors.textSecondary, marginBottom: 0 }]}>
                  {t('plantDetail.sownOn', { date: formatDate(plant.sowingDate) })}
                </Text>
                {(() => {
                  const days = Math.floor((Date.now() - new Date(plant.sowingDate + 'T12:00:00').getTime()) / 86_400_000);
                  if (days < 1) return null;
                  return (
                    <View style={[s.daysChip, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[s.daysChipText, { color: colors.primary }]}>
                        {t('plantDetail.daysGrowing', { count: days })}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              {(() => {
                const dth = plant.varietyId
                  ? VARIETIES_BY_ID[plant.varietyId]?.daysToHarvest
                  : crop.daysToHarvest;
                if (!dth) return null;
                const sow = new Date(plant.sowingDate + 'T12:00:00');
                const daysRemaining = Math.ceil(
                  (new Date(sow.getTime() + dth[0] * 86_400_000).getTime() - Date.now()) / 86_400_000
                );
                const isReady = daysRemaining <= 0;
                return (
                  <View style={[s.harvestEstBlock, {
                    backgroundColor: isReady ? colors.success + '15' : colors.primary + '12',
                    borderColor: isReady ? colors.success : colors.primary,
                  }]}>
                    <Text style={{ fontSize: 16 }}>🧺</Text>
                    <Text style={[s.harvestEstText, { color: isReady ? colors.success : colors.primary }]}>
                      {isReady
                        ? t('plantDetail.harvestReadyNow')
                        : t('plantDetail.harvestInDays', { count: daysRemaining })
                      }
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* Stage journey — compact summary with an explicit change action */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.statusSection')}</Text>
          {(() => {
            const currentIdx = ALL_STATUSES.indexOf(plant.status);
            const nextStatus = currentIdx >= 0 ? ALL_STATUSES[currentIdx + 1] : undefined;
            return (
              <Card padded style={s.statusOverviewCard}>
                <View style={s.statusOverviewHeader}>
                  <View style={[s.statusOverviewIcon, { backgroundColor: currentStatusConfig.color + '20', borderColor: currentStatusConfig.color }]}>
                    <Text style={{ fontSize: 20 }}>{currentStatusConfig.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.statusOverviewEyebrow, { color: colors.textSecondary }]}>{t('plantDetail.currentStage')}</Text>
                    <Text style={[s.statusOverviewTitle, { color: currentStatusConfig.color }]}>{t('plantStatus.' + plant.status)}</Text>
                  </View>
                  <View style={[s.statusCurrentBadge, { backgroundColor: currentStatusConfig.color + '22' }]}>
                    <Text style={[s.statusCurrentBadgeText, { color: currentStatusConfig.color }]}>{t('plantDetail.currentBadge')}</Text>
                  </View>
                </View>
                <Text style={[s.statusOverviewHint, { color: colors.textSecondary }]}>
                  {nextStatus
                    ? t('plantDetail.nextStage', { status: t('plantStatus.' + nextStatus) })
                    : t('plantDetail.lastStage')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('plantDetail.changeStatus')}
                  onPress={() => setShowStatusModal(true)}
                  style={({ pressed }) => [s.statusChangeButton, { borderColor: colors.primary, backgroundColor: colors.primary + '12', opacity: pressed ? 0.75 : 1 }]}
                >
                  <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                  <Text style={[s.statusChangeText, { color: colors.primary }]}>{t('plantDetail.changeStatus')}</Text>
                </Pressable>
              </Card>
            );
          })()}

          {/* Transplant CTA — show when still in seedling phase */}
          {plant.status === 'seedling' && plant.sowingDate && (() => {
            const daysSinceSowing = Math.floor(
              (Date.now() - new Date(plant.sowingDate + 'T12:00:00').getTime()) / 86_400_000
            );
            if (daysSinceSowing < 7) return null;
            return (
              <Pressable
                onPress={() => setShowTransplantModal(true)}
                style={[s.transplantCta, { backgroundColor: colors.success + '15', borderColor: colors.success }]}
              >
                <Text style={{ fontSize: 24 }}>🪴</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.transplantCtaTitle, { color: colors.primaryDark }]}>
                    {t('plantDetail.transplantCta')}
                  </Text>
                  <Text style={[s.transplantCtaDesc, { color: colors.textSecondary }]}>
                    {t('plantDetail.transplantCtaDesc', { days: daysSinceSowing })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.success} />
              </Pressable>
            );
          })()}

          {/* Seedling guide — indoor start schedule */}
          {plant.status === 'seedling' && plant.sowingDate && INDOOR_START[crop.id] && (() => {
            const schedule = getSeedlingSchedule(crop.id, plant.sowingDate);
            if (!schedule) return null;
            const now = Date.now();
            const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
            const hardeningPast = schedule.hardeningStart.getTime() < now;
            const transplantPast = schedule.transplant.getTime() < now;
            const daysToTransplant = Math.ceil((schedule.transplant.getTime() - now) / 86_400_000);
            return (
              <View style={[{ borderRadius: radii.md, borderWidth: 1.5, padding: spacing.md, marginBottom: spacing.md, borderColor: colors.primary + '44', backgroundColor: colors.primary + '08' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 18 }}>🌱</Text>
                  <Text style={[s.transplantCtaTitle, { color: colors.text }]}>{t('plantDetail.seedlingGuide')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 0 }}>
                  {[
                    { emoji: '🏠', labelKey: 'plantDetail.indoorStart', date: schedule.indoorStart, done: hardeningPast },
                    { emoji: '☀️', labelKey: 'plantDetail.hardening', date: schedule.hardeningStart, done: transplantPast },
                    { emoji: '🪴', labelKey: 'plantDetail.transplantOut', date: schedule.transplant, done: transplantPast },
                  ].map((step, idx, arr) => (
                    <React.Fragment key={step.labelKey}>
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <View style={[{
                          width: 36, height: 36, borderRadius: 18,
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: step.done ? colors.primary + '22' : colors.surfaceAlt,
                          borderWidth: 1.5,
                          borderColor: step.done ? colors.primary : colors.border,
                        }]}>
                          <Text style={{ fontSize: 14 }}>{step.emoji}</Text>
                        </View>
                        <Text style={{ fontSize: 9, color: colors.textSecondary, textAlign: 'center', marginTop: 4, fontWeight: fontWeight.semibold }}>
                          {t(step.labelKey)}
                        </Text>
                        <Text style={{ fontSize: 9, color: step.done ? colors.textDisabled : colors.text, textAlign: 'center' }}>
                          {fmt(step.date)}
                        </Text>
                      </View>
                      {idx < arr.length - 1 && (
                        <View style={{ flex: 0.5, height: 2, marginTop: 17, backgroundColor: hardeningPast && idx === 0 ? colors.primary + '55' : colors.border }} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
                {daysToTransplant > 0 && (
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}>
                    {t('plantDetail.daysToTransplant', { count: daysToTransplant })}
                  </Text>
                )}
              </View>
            );
          })()}

          {/* Germination tracker */}
          {plant.propagationMethod === 'seed' && plant.status === 'seedling' && plant.sowingDate && (() => {
            if (plant.germinationDate) {
              const days = Math.floor((Date.now() - new Date(plant.germinationDate + 'T12:00:00').getTime()) / 86_400_000);
              return (
                <View style={[s.transplantCta, { backgroundColor: colors.success + '10', borderColor: colors.success + '50', marginBottom: spacing.md }]}>
                  <Text style={{ fontSize: 20 }}>🌿</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.transplantCtaTitle, { color: colors.primaryDark }]}>{t('plantDetail.germinatedTitle')}</Text>
                    <Text style={[s.transplantCtaDesc, { color: colors.textSecondary }]}>
                      {t('plantDetail.germinatedDays', { count: days })}
                    </Text>
                  </View>
                </View>
              );
            }
            const cfg = INDOOR_START[crop.id];
            const expectedDays = cfg ? `${cfg.germinationDays[0]}–${cfg.germinationDays[1]}` : '5–10';
            return (
              <Pressable
                onPress={async () => {
                  await plants.update(id, { germinationDate: todayStr() });
                  await entries.create({ gardenId: plant.gardenId, plantId: id, type: 'note', date: todayStr(), notes: '🌿 ' + t('plantDetail.germinatedNote') });
                }}
                style={[s.transplantCta, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '50', marginBottom: spacing.md }]}
              >
                <Text style={{ fontSize: 20 }}>🌰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.transplantCtaTitle, { color: colors.warning }]}>{t('plantDetail.germinationQ')}</Text>
                  <Text style={[s.transplantCtaDesc, { color: colors.textSecondary }]}>
                    {t('plantDetail.germinationExpected', { days: expectedDays })}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.warning} />
              </Pressable>
            );
          })()}

          {/* Soil info */}
          {(plant.soilPh || plant.soilTexture || plant.soilNotes || plant.bedName) && (
            <Card padded style={[s.infoCard, { marginBottom: spacing.lg }] as unknown as ViewStyle}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <Text style={{ fontSize: 16 }}>🌍</Text>
                <Text style={[s.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>{t('plantDetail.soilSection')}</Text>
              </View>
              <View style={s.infoGrid}>
                {plant.soilPh ? <InfoItem label={t('plantDetail.soilPh')} value={`pH ${plant.soilPh}`} /> : null}
                {plant.soilTexture ? <InfoItem label={t('plantDetail.soilTexture')} value={t('soilTexture.' + plant.soilTexture)} /> : null}
                {plant.bedName ? <InfoItem label={t('plantDetail.bedName')} value={plant.bedName} /> : null}
              </View>
              {plant.soilNotes ? (
                <View style={[s.tipBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[s.tipText, { color: colors.textSecondary }]}>📝 {plant.soilNotes}</Text>
                </View>
              ) : null}
              {plant.bedName && (
                <Pressable onPress={() => router.push('/rotation' as any)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}>
                  <Ionicons name="refresh-circle-outline" size={14} color={colors.primary} />
                  <Text style={{ fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium }}>
                    {t('rotation.title')}
                  </Text>
                </Pressable>
              )}
            </Card>
          )}

          {/* Crop info — tabbed */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.cropInfo')}</Text>
            {plant && CROPS_BY_ID[plant.cropId] && (
              <Pressable
                onPress={() => router.push(`/catalog?focus=${plant.cropId}` as any)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                hitSlop={8}
              >
                <Ionicons name="library-outline" size={13} color={colors.primary} />
                <Text style={{ fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium }}>
                  {t('plantDetail.viewInCatalog')}
                </Text>
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBar}>
            {(['overview', 'calendar', 'companions', 'howto'] as const).map((tab) => {
              const active = cropTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setCropTab(tab)}
                  style={[
                    s.tabBtn,
                    {
                      backgroundColor: active ? colors.primary + '22' : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: fontSize.xs,
                      fontWeight: active ? fontWeight.bold : fontWeight.medium,
                      color: active ? colors.primary : colors.textSecondary,
                    }}
                  >
                    {t('plantDetail.tab.' + tab)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {cropTab === 'overview' && (
            <Card padded style={s.infoCard}>
              <DifficultyGauge
                waterNeeds={crop.waterNeeds}
                sunNeeds={crop.sunNeeds}
                spacing={crop.spacing}
              />
              <View style={s.infoGrid}>
                {(() => {
                  const dth = (plant.varietyId ? VARIETIES_BY_ID[plant.varietyId]?.daysToHarvest : null) ?? crop.daysToHarvest;
                  if (!dth) return null;
                  return <InfoItem label={t('plantDetail.harvest')} value={t('plantDetail.harvestDays', { min: dth[0], max: dth[1] })} />;
                })()}
                <InfoItem label={t('plantDetail.light')} value={SUN_LABEL[crop.sunNeeds]} />
                <InfoItem label={t('plantDetail.water')} value={WATER_LABEL[crop.waterNeeds]} />
                <InfoItem label={t('plantDetail.spacing')} value={`${crop.spacing} cm`} />
              </View>
              <View style={[s.tipBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[s.tipText, { color: colors.textSecondary }]}>
                  💡 {crop.isCustom ? crop.tips : t('crops.' + crop.id + '.tips', { defaultValue: crop.tips })}
                </Text>
              </View>
            </Card>
          )}

          {cropTab === 'calendar' && (
            <Card padded style={s.infoCard}>
              {crop.isCustom || !activeGarden ? (
                <Text style={[s.tipText, { color: colors.textSecondary }]}>
                  {t('plantDetail.calendar.unavailable')}
                </Text>
              ) : (
                <CalendarGantt
                  sowingMonths={crop.sowingMonths[activeGarden.climateZone] ?? []}
                  harvestMonths={crop.harvestMonths[activeGarden.climateZone] ?? []}
                  climateZone={activeGarden.climateZone}
                />
              )}
            </Card>
          )}

          {cropTab === 'companions' && (
            <Card padded style={s.infoCard}>
              {companions.length > 0 && (
                <>
                  <View style={s.companionsHeader}>
                    <Text style={{ fontSize: 18 }}>✅</Text>
                    <Text style={[s.companionsTitle, { color: colors.primaryDark }]}>
                      {t('plantDetail.goodNeighbors')}
                    </Text>
                  </View>
                  <View style={s.companionsGrid}>
                    {companions.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => router.push(`/catalog?focus=${c.id}` as any)}
                        style={({ pressed }) => [s.companionCard, { backgroundColor: colors.success + '18', borderColor: colors.success, opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={[s.companionPhoto, { backgroundColor: colors.success + '18' }]}>
                          {CROP_IMAGES[c.id] ? (
                            <Image source={{ uri: CROP_IMAGES[c.id] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          ) : (
                            <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
                          )}
                        </View>
                        <Text style={[s.companionCardName, { color: colors.text }]} numberOfLines={1}>{t('crops.' + c.id + '.name', { defaultValue: c.name })}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              {incompatibles.length > 0 && (
                <>
                  <View style={[s.companionsHeader, { marginTop: spacing.lg }]}>
                    <Text style={{ fontSize: 18 }}>⛔</Text>
                    <Text style={[s.companionsTitle, { color: colors.error }]}>
                      {t('plantDetail.badNeighbors')}
                    </Text>
                  </View>
                  <View style={s.companionsGrid}>
                    {incompatibles.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => router.push(`/catalog?focus=${c.id}` as any)}
                        style={({ pressed }) => [s.companionCard, { backgroundColor: colors.error + '18', borderColor: colors.error, opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={[s.companionPhoto, { backgroundColor: colors.error + '18' }]}>
                          {CROP_IMAGES[c.id] ? (
                            <Image source={{ uri: CROP_IMAGES[c.id] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          ) : (
                            <Text style={{ fontSize: 26 }}>{c.emoji}</Text>
                          )}
                        </View>
                        <Text style={[s.companionCardName, { color: colors.text }]} numberOfLines={1}>{t('crops.' + c.id + '.name', { defaultValue: c.name })}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              {companions.length === 0 && incompatibles.length === 0 && (
                <Text style={[s.tipText, { color: colors.textSecondary, textAlign: 'center' }]}>
                  {t('plantDetail.companions.empty')}
                </Text>
              )}
            </Card>
          )}

          {cropTab === 'howto' && (
            <Card padded style={s.infoCard}>
              <HowToStages
                cropId={crop.id}
                fallbackTip={crop.isCustom ? crop.tips : t('crops.' + crop.id + '.tips', { defaultValue: crop.tips })}
              />
            </Card>
          )}

          {/* Reminders */}
          {plantReminders.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.reminders')}</Text>
              {plantReminders.map((r) => {
                const rc = REMINDER_TYPE_CONFIG[r.type];
                const hour = String(r.time.hour).padStart(2, '0');
                const min = String(r.time.minute).padStart(2, '0');
                return (
                  <Card key={r.id} padded style={{ marginBottom: spacing.sm }}>
                    <View style={s.reminderRow}>
                      <Text style={{ fontSize: 22 }}>{rc.emoji}</Text>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                          {r.title}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                          {t('reminderType.' + r.type)} · {t('reminderFrequency.' + r.frequency)} · {hour}:{min}
                        </Text>
                      </View>
                      <View style={[s.enabledBadge, { backgroundColor: r.enabled ? colors.success + '22' : colors.surfaceAlt }]}>
                        <Text style={{ fontSize: 12, color: r.enabled ? colors.success : colors.textDisabled }}>
                          {r.enabled ? t('plantDetail.active') : t('plantDetail.paused')}
                        </Text>
                      </View>
                      <Switch
                        value={r.enabled}
                        onValueChange={(val) => reminders.update(r.id, { enabled: val })}
                        trackColor={{ true: colors.primary }}
                        style={{ marginLeft: 4 }}
                      />
                      <Pressable
                        onPress={() => router.push(`/reminder/edit?id=${r.id}`)}
                        hitSlop={8}
                        style={{ padding: 4, marginLeft: 4 }}
                      >
                        <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </>
          )}

          {/* Treatment carencia banner */}
          {treatmentCarencia && (
            <View style={[s.harvestSummaryCard, {
              backgroundColor: treatmentCarencia.daysLeft > 0 ? colors.error + '18' : colors.success + '18',
              borderColor: treatmentCarencia.daysLeft > 0 ? colors.error : colors.success,
            }]}>
              <Text style={{ fontSize: 22 }}>🧴</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.harvestSummaryTitle, { color: treatmentCarencia.daysLeft > 0 ? colors.error : colors.success }]}>
                  {treatmentCarencia.daysLeft > 0
                    ? t('plantDetail.treatmentActive')
                    : t('plantDetail.treatmentSafeToday')}
                </Text>
                <Text style={[s.harvestSummaryValue, { color: colors.textSecondary }]}>
                  {treatmentCarencia.product ? `${treatmentCarencia.product} · ` : ''}
                  {treatmentCarencia.daysLeft > 0
                    ? t('plantDetail.treatmentSafeIn', { days: treatmentCarencia.daysLeft })
                    : '✓'}
                </Text>
              </View>
            </View>
          )}

          {/* Harvest summary + goal progress */}
          {harvestSummary && (
            <View style={[s.harvestSummaryCard, { backgroundColor: colors.warning + '18', borderColor: colors.warning }]}>
              <Text style={{ fontSize: 22 }}>🧺</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.harvestSummaryTitle, { color: colors.warning }]}>
                  {t('plantDetail.harvestSummary', { count: harvestSummary.count })}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: 2 }}>
                  {harvestSummary.totalKg !== null && (
                    <Text style={[s.harvestSummaryValue, { color: colors.text }]}>
                      ⚖️ {harvestSummary.totalKg.toFixed(2)} kg
                    </Text>
                  )}
                  {harvestSummary.totalUnits !== null && (
                    <Text style={[s.harvestSummaryValue, { color: colors.text }]}>
                      🔢 {Math.round(harvestSummary.totalUnits)} {t('plantDetail.units')}
                    </Text>
                  )}
                </View>
                {plant?.harvestGoalKg && harvestSummary.totalKg !== null && (
                  <View style={{ marginTop: spacing.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={[s.harvestSummaryValue, { color: colors.textSecondary }]}>
                        {t('plantDetail.goalProgress')}
                      </Text>
                      <Text style={[s.harvestSummaryValue, { color: harvestSummary.totalKg >= plant.harvestGoalKg ? colors.success : colors.warning }]}>
                        {harvestSummary.totalKg.toFixed(1)} / {plant.harvestGoalKg} kg
                        {harvestSummary.totalKg >= plant.harvestGoalKg ? ' 🎉' : ''}
                      </Text>
                    </View>
                    <View style={[s.goalBarTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          s.goalBarFill,
                          {
                            width: `${Math.min((harvestSummary.totalKg / plant.harvestGoalKg) * 100, 100)}%` as any,
                            backgroundColor: harvestSummary.totalKg >= plant.harvestGoalKg ? colors.success : colors.warning,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Photo progress timeline */}
          {photoEntries.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.photoTimeline')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {photoEntries.map((entry) => (
                    <View key={entry.id} style={s.photoTimelineItem}>
                      <Image source={{ uri: entry.photoUri! }} style={s.photoTimelineImg} />
                      <Text style={[s.photoTimelineDate, { color: colors.textSecondary }]}>
                        {new Date(entry.date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Diary entries */}
          <View style={s.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[s.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>
                {t('plantDetail.diary')}{plantEntryCount > 0 ? ` (${plantEntryCount})` : ''}
              </Text>
              {plantEntries[0] && (() => {
                const days = Math.floor((Date.now() - new Date(plantEntries[0].date + 'T12:00:00').getTime()) / 86_400_000);
                if (days < 1) return null;
                return (
                  <View style={[s.daysChip, { backgroundColor: days > 14 ? colors.error + '18' : colors.primary + '12' }]}>
                    <Text style={[s.daysChipText, { color: days > 14 ? colors.error : colors.primary }]}>
                      {days}d
                    </Text>
                  </View>
                );
              })()}
            </View>
            {plantEntries.length > 0 && (
              <Pressable onPress={() => router.push(`/(tabs)/diary?plantId=${id}` as any)}>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm }}>{t('common.viewAll')}</Text>
              </Pressable>
            )}
          </View>

          {plantEntries.length > 0 ? (
            plantEntries.map((entry) => {
              const cfg = ENTRY_TYPE_CONFIG[entry.type];
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => router.push(`/entry/edit?id=${entry.id}` as any)}
                  style={({ pressed }) => [
                    s.diaryEntryCard,
                    {
                      backgroundColor: colors.surface,
                      borderLeftColor: cfg.color,
                      opacity: pressed ? 0.92 : 1,
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                    },
                  ]}
                >
                  <View style={[s.entryIcon, { backgroundColor: cfg.color + '20' }]}>
                    <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                        {t('diary.filters.' + entry.type)}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                        {formatRelative(entry.date)}
                      </Text>
                    </View>
                    {entry.notes ? (
                      <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2, lineHeight: 18 }} numberOfLines={2}>
                        {entry.notes}
                      </Text>
                    ) : null}
                  </View>
                  {entry.photoUri ? (
                    <Image source={{ uri: entry.photoUri }} style={s.entryThumb} />
                  ) : null}
                </Pressable>
              );
            })
          ) : (
            <View style={[s.emptyDiaryCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={s.emptyDiaryEmoji}>🌱</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.emptyDiaryTitle, { color: colors.text }]}>{t('plantDetail.emptyDiaryTitle')}</Text>
                <Text style={[s.emptyText, { color: colors.textSecondary, textAlign: 'left', marginVertical: spacing.xs }]}>
                  {t('plantDetail.noEntries')}
                </Text>
                <Button title={t('plantDetail.newEntry')} size="sm" onPress={() => router.push(`/entry/new?plantId=${id}`)} />
              </View>
            </View>
          )}

          {/* Pest tracker section */}
          <View style={[s.sectionHeaderRow, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>{t('plantDetail.pestSection')}</Text>
            <Pressable
              onPress={() => router.push('/disease-guide' as any)}
              hitSlop={8}
            >
              <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                {t('plantDetail.diseaseGuideBtn')}
              </Text>
            </Pressable>
          </View>

          {/* AI identify button */}
          <Pressable
            onPress={() =>
              isPro
                ? router.push(`/plant/identify?plantId=${id}&cropId=${crop.id}` as any)
                : router.push('/paywall?source=ai_identify_detail' as any)
            }
            style={[s.identifyBtn, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}
          >
            <Text style={{ fontSize: 22 }}>📸</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.identifyBtnTitle, { color: colors.warning }]}>{t('identify.title')}</Text>
              <Text style={[s.identifyBtnSub, { color: colors.textSecondary }]}>
                {isPro ? t('identify.subtitle') : t('identify.proOnly')}
              </Text>
            </View>
            {!isPro && (
              <View style={[s.proBadge, { backgroundColor: colors.primary }]}>
                <Text style={[s.proBadgeText, { color: colors.background }]}>PRO</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>

          <Card padded style={{ gap: spacing.md }}>
            {/* Status selector */}
            <View style={s.pestStatusRow}>
              {(['none', 'active', 'treated'] as const).map((status) => {
                const cfg = PEST_STATUS_CONFIG[status];
                const isActive = currentPestStatus === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => plants.update(id, { pestStatus: status })}
                    style={[
                      s.pestStatusChip,
                      {
                        backgroundColor: isActive ? cfg.color + '22' : colors.surfaceAlt,
                        borderColor: isActive ? cfg.color : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                    <Text style={[s.pestStatusLabel, { color: isActive ? cfg.color : colors.textSecondary }]}>
                      {t('pestStatus.' + status)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Pest reference for this crop */}
            {currentPestStatus !== 'none' && pestInfo.length > 0 && (
              <>
                <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }]} />
                <Text style={[{ fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semibold }]}>
                  {t('plantDetail.commonPests', {
                    crop: (crop?.isCustom ? crop.name : t('crops.' + crop?.id + '.name', { defaultValue: crop?.name })).toUpperCase(),
                  })}
                </Text>
                {pestInfo.slice(0, 3).map((pest) => (
                  <View key={pest.id} style={[s.pestCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <View style={s.pestCardHeader}>
                      <Text style={s.pestEmoji}>{pest.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.pestName, { color: colors.text }]}>{pest.name}</Text>
                        <Text style={[s.pestSymptoms, { color: colors.textSecondary }]} numberOfLines={2}>
                          {pest.symptoms}
                        </Text>
                      </View>
                    </View>
                    <View style={s.treatmentList}>
                      {pest.treatments.slice(0, 2).map((t, i) => (
                        <View key={i} style={[s.treatmentRow, { borderTopColor: colors.border }]}>
                          <View style={[s.treatmentTypeBadge, {
                            backgroundColor:
                              t.type === 'organico' ? colors.success + '22' :
                              t.type === 'preventivo' ? colors.info + '22' : colors.error + '22',
                          }]}>
                            <Text style={[s.treatmentType, {
                              color: t.type === 'organico' ? colors.primaryDark :
                                     t.type === 'preventivo' ? colors.info : colors.error,
                            }]}>
                              {t.type}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.treatmentName, { color: colors.text }]}>{t.name}</Text>
                            <Text style={[s.treatmentInstructions, { color: colors.textSecondary }]} numberOfLines={2}>
                              {t.instructions}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </>
            )}
          </Card>

          {/* Action buttons */}
          <View style={s.actions}>
            <Button
              title={t('plantDetail.newEntry')}
              variant="secondary"
              size="md"
              onPress={() => router.push(`/entry/new?plantId=${id}`)}
              style={{ flex: 1 }}
            />
            <Button
              title={t('plantDetail.reminder')}
              variant="outline"
              size="md"
              onPress={() => router.push(`/reminder/new?plantId=${id}`)}
              style={{ flex: 1 }}
            />
          </View>

          {/* Succession sowing */}
          <Pressable onPress={handleSuccessionSow} style={[s.duplicateBtn, { backgroundColor: colors.success + '12', borderColor: colors.success + '44', borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
            <Text style={{ fontSize: 16 }}>🌱</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.duplicateText, { color: colors.success }]}>{t('plantDetail.successionSow')}</Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{t('plantDetail.successionSowDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.success} />
          </Pressable>

          {/* Duplicate */}
          <Pressable onPress={handleDuplicate} style={s.duplicateBtn}>
            <Ionicons name="copy-outline" size={16} color={colors.primary} />
            <Text style={[s.duplicateText, { color: colors.primary }]}>{t('plantDetail.duplicate')}</Text>
          </Pressable>

          {/* Delete */}
          <Pressable onPress={handleDelete} style={s.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[s.deleteText, { color: colors.error }]}>{t('plantDetail.deletePlant')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Status picker */}
      <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowStatusModal(false)}>
          <Pressable style={[s.statusModal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[s.transplantModalTitle, { color: colors.text }]}>{t('plantDetail.changeStatus')}</Text>
            <Text style={[s.statusModalHint, { color: colors.textSecondary }]}>{t('plantDetail.statusHint')}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {ALL_STATUSES.map((status) => {
                const cfg = PLANT_STATUS_CONFIG[status];
                const active = plant.status === status;
                return (
                  <Pressable
                    key={status}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => handleStatusChange(status)}
                    style={({ pressed }) => [s.statusOption, { backgroundColor: active ? cfg.color + '16' : colors.surfaceAlt, borderColor: active ? cfg.color : colors.border, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <View style={[s.statusOptionIcon, { backgroundColor: active ? cfg.color + '25' : colors.surface, borderColor: active ? cfg.color : colors.border }]}>
                      <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
                    </View>
                    <Text style={[s.statusOptionText, { color: active ? cfg.color : colors.text }]}>{t('plantStatus.' + status)}</Text>
                    {active && <Ionicons name="checkmark-circle" size={20} color={cfg.color} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setShowStatusModal(false)} style={[s.modalCancelBtn, { backgroundColor: colors.surfaceAlt, marginTop: spacing.md }]}>
              <Text style={{ color: colors.textSecondary, fontWeight: fontWeight.medium }}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Transplant modal */}
      <Modal visible={showTransplantModal} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setShowTransplantModal(false)}>
          <Pressable style={[s.transplantModal, { backgroundColor: glassAvailable ? 'transparent' : colors.surface, overflow: 'hidden' }]} onPress={(e) => e.stopPropagation()}>
              {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
            <Text style={[s.transplantModalTitle, { color: colors.text }]}>
              {t('plantDetail.transplantModalTitle')}
            </Text>
            <Text style={[s.sectionTitle, { color: colors.textSecondary, fontSize: fontSize.xs, letterSpacing: 0.8 }]}>
              {t('plantDetail.transplantDateLabel')}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
              {([0, 1] as const).map((days) => {
                const d = new Date();
                d.setDate(d.getDate() - days);
                const dateStr = dateToStr(d);
                const active = transplantDateInput === dateStr;
                const label = days === 0 ? t('entryNew.today') : t('entryNew.yesterday');
                return (
                  <Pressable
                    key={days}
                    onPress={() => setTransplantDateInput(dateStr)}
                    style={[
                      s.modalDateBtn,
                      {
                        backgroundColor: active ? colors.success + '22' : colors.surfaceAlt,
                        borderColor: active ? colors.success : colors.border,
                      },
                    ]}
                  >
                    <Text style={[s.modalDateBtnText, { color: active ? colors.primaryDark : colors.textSecondary }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setShowTransplantDatePicker(true)}
              style={[s.transplantInput, { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt, borderColor: transplantDateInput ? colors.primary : colors.border }]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: fontSize.md, flex: 1 }}>{transplantDateInput}</Text>
            </Pressable>
            {showTransplantDatePicker && (
              <DateTimePicker
                value={new Date(transplantDateInput + 'T12:00:00')}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (Platform.OS === 'android') setShowTransplantDatePicker(false);
                  if (date) setTransplantDateInput(dateToStr(date));
                }}
                style={{ width: '100%' }}
              />
            )}
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
              <Pressable
                onPress={() => setShowTransplantModal(false)}
                style={[s.modalCancelBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[{ color: colors.textSecondary, fontWeight: fontWeight.medium }]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await plants.update(id, { status: 'transplanted', transplantDate: transplantDateInput });
                  await entries.create({
                    gardenId: plant!.gardenId,
                    plantId: id,
                    type: 'transplant',
                    date: transplantDateInput,
                  });
                  setShowTransplantModal(false);
                }}
                style={[s.modalConfirmBtn, { backgroundColor: colors.success }]}
              >
                <Text style={[{ color: '#fff', fontWeight: fontWeight.semibold }]}>
                  {t('plantDetail.transplantConfirm')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {shareModal && (
        <ShareModal
          {...shareModal}
          visible
          onClose={() => setShareModal(null)}
        />
      )}
    </SafeAreaView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  const { fontSize, fontWeight } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: '45%', marginBottom: 10 }}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
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
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      padding: spacing.xl,
    },
    loadingText: { fontSize: fontSize.sm },
    notFoundState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      padding: spacing.xl,
    },
    notFoundTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, textAlign: 'center' },
    hero: {
      height: 220,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
      marginHorizontal: spacing.xl,
      borderRadius: radii.xl,
      overflow: 'hidden',
    },
    heroPhoto: { width: '100%', height: 220, resizeMode: 'cover' },
    heroEmoji: { fontSize: 80 },
    backBtn: {
      zIndex: 1,
      position: 'absolute',
      top: spacing.lg,
      left: spacing.lg,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editBtn: {
      zIndex: 1,
      position: 'absolute',
      top: spacing.lg,
      right: spacing.lg,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { padding: spacing.xl },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
    plantName: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    variety: { fontSize: fontSize.sm, marginTop: 2 },
    statusBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radii.full,
      alignSelf: 'flex-start',
    },
    statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    dateText: { fontSize: fontSize.sm },
    daysChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    harvestChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      marginTop: spacing.xs,
    },
    daysChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    statusRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
    journeyDotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    journeyDotWrap: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    journeyDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    journeyLine: {
      flex: 1,
      height: 2,
    },
    journeyLabelsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 5,
    },
    journeyLabelCell: {
      width: 28,
      alignItems: 'center',
      overflow: 'visible',
    },
    journeyLabelText: {
      fontSize: 8,
      textAlign: 'center',
      fontWeight: '600',
    },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
      gap: 5,
    },
    statusChipLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    infoCard: {},
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    tipBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    tipText: { fontSize: fontSize.sm, lineHeight: 20 },
    companionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1,
      gap: 6,
    },
    companionName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    reminderRow: { flexDirection: 'row', alignItems: 'center' },
    enabledBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
    entryRow: { flexDirection: 'row', alignItems: 'flex-start' },
    diaryEntryCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: radii.lg,
      borderLeftWidth: 3,
      marginBottom: spacing.sm,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    entryIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    entryThumb: { width: 44, height: 44, borderRadius: radii.sm, marginLeft: spacing.sm },
    emptyText: { fontSize: fontSize.sm, textAlign: 'center', marginVertical: spacing.md },
    actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.xl,
      padding: spacing.md,
    },
    deleteText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    notFound: { textAlign: 'center', marginTop: 80, fontSize: fontSize.lg },
    pestStatusRow: { flexDirection: 'row', gap: spacing.sm },
    pestStatusChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 2,
    },
    pestStatusLabel: { fontSize: 10, fontWeight: fontWeight.semibold, textAlign: 'center' },
    pestCard: {
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.md,
      gap: spacing.sm,
    },
    pestCardHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    pestEmoji: { fontSize: 24, marginTop: 2 },
    pestName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    pestSymptoms: { fontSize: fontSize.xs, lineHeight: 16, marginTop: 2 },
    treatmentList: { gap: spacing.sm },
    treatmentRow: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      alignItems: 'flex-start',
    },
    treatmentTypeBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radii.sm,
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    treatmentType: { fontSize: 9, fontWeight: fontWeight.bold, textTransform: 'uppercase' },
    treatmentName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    treatmentInstructions: { fontSize: fontSize.xs, lineHeight: 16, marginTop: 2 },
    identifyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      marginBottom: spacing.md,
    },
    identifyBtnTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    identifyBtnSub: { fontSize: fontSize.xs, marginTop: 2 },
    proBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    proBadgeText: { fontSize: 10, fontWeight: fontWeight.bold, color: '#fff' },
    photoTimelineItem: { alignItems: 'center', gap: 4 },
    photoTimelineImg: { width: 80, height: 80, borderRadius: radii.md },
    photoTimelineDate: { fontSize: 10, fontWeight: fontWeight.medium },
    harvestSummaryCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      marginBottom: spacing.sm,
    },
    harvestSummaryTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    harvestSummaryValue: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    goalBarTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    goalBarFill: {
      height: 6,
      borderRadius: 3,
    },
    transplantCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      marginBottom: spacing.md,
    },
    transplantCtaTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    transplantCtaDesc: { fontSize: fontSize.xs, marginTop: 2 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    transplantModal: {
      borderTopLeftRadius: radii.xl ?? 20,
      borderTopRightRadius: radii.xl ?? 20,
      padding: spacing.xl,
      paddingBottom: spacing['2xl'],
      gap: spacing.md,
    },
    transplantModalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    transplantInput: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      padding: spacing.md,
      fontSize: fontSize.md,
    },
    modalDateBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    modalDateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    modalCancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
    },
    modalConfirmBtn: {
      flex: 2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
    },
    notesCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    notesEmoji: { fontSize: 16, marginTop: 1 },
    notesText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
    coachCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      marginBottom: spacing.lg,
    },
    coachEmoji: { fontSize: 22 },
    coachText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20, fontWeight: fontWeight.medium },
    statusOverviewCard: { marginBottom: spacing.xl },
    statusOverviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    statusOverviewIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusOverviewEyebrow: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    statusOverviewTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: 2 },
    statusCurrentBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full },
    statusCurrentBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    statusOverviewHint: { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.md },
    statusChangeButton: {
      minHeight: 46,
      borderRadius: radii.md,
      borderWidth: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    statusChangeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    statusModal: {
      borderTopLeftRadius: radii.xl ?? 20,
      borderTopRightRadius: radii.xl ?? 20,
      padding: spacing.xl,
      paddingBottom: spacing['2xl'],
    },
    statusModalHint: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
    statusOption: {
      minHeight: 56,
      borderRadius: radii.md,
      borderWidth: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    statusOptionIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusOptionText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    emptyDiaryCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    emptyDiaryEmoji: { fontSize: 24, marginTop: 2 },
    emptyDiaryTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    duplicateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.sm,
      padding: spacing.md,
    },
    duplicateText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    tabBar: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.md,
      paddingRight: spacing.xl,
    },
    tabBtn: {
      minWidth: 84,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.full,
      borderWidth: 1.5,
      alignItems: 'center',
    },
    companionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
    companionsTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    companionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    companionPhoto: {
      width: 54,
      height: 54,
      borderRadius: 27,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    companionCard: {
      width: '30%',
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: 4,
    },
    companionCardName: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },
    heroNoPhoto: {
      width: '100%',
      height: 220,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    heroNoPhotoName: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      marginTop: spacing.xs,
    },
    heroCategoryChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 3,
      borderRadius: radii.full,
      marginTop: 2,
    },
    harvestEstBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
    },
    harvestEstText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    fabFeedback: {
      position: 'absolute',
      bottom: 90,
      right: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      elevation: 4,
    },
  });
