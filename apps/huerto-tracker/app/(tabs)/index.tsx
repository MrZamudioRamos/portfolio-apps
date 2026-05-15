import { useColors, useTheme, Card, EmptyState, StatCard, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { GardenWidget } from '../../src/widgets/GardenWidget';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../../src/data';
import { VARIETIES_BY_ID } from '../../src/data/varieties';
import type { Garden } from '../../src/models/garden';
import { PLANT_STATUS_CONFIG, type Plant } from '../../src/models/plant';
import type { GardenReminder } from '../../src/models/reminder';
import { CLIMATE_ZONE_CONFIG } from '../../src/data/zones';
import { GARDEN_TYPE_CONFIG } from '../../src/models/garden';
import { getLunarDay } from '../../src/utils/lunar';
import { getSowingNow } from '../../src/utils/sowingNow';
import { QuickLogModal } from '../../src/components/QuickLogModal';
import type { DiaryEntry } from '../../src/models/diary-entry';
import { useWeather } from '../../src/hooks/useWeather';
import { getWeatherLabel } from '../../src/utils/weather';
import { buildGamificationData } from '../../src/utils/gamification';
import { PEST_STATUS_CONFIG } from '../../src/data/pests';
import { getNeedsWater, getWateringNeedsCount } from '../../src/utils/wateringStatus';
import { checkFrost } from '../../src/hooks/useFrostAlert';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

export default function DashboardScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const { activeGarden: garden, gardens: allGardens } = useActiveGarden();
  const allPlants = useCollection<Plant>('plants');
  const reminders = useCollection<GardenReminder>('reminders');
  const entries = useCollection<DiaryEntry>('diary_entries');

  // Filter plants to active garden
  const gardenPlantItems = useMemo(
    () => (garden ? allPlants.items.filter((p) => p.gardenId === garden.id) : allPlants.items),
    [allPlants.items, garden?.id]
  );
  const plants = useMemo(
    () => ({ ...allPlants, items: gardenPlantItems, count: gardenPlantItems.length }),
    [allPlants, gardenPlantItems]
  );

  useFocusEffect(
    useCallback(() => {
      allPlants.refresh();
      reminders.refresh();
      if (garden?.province) checkFrost(garden.province);
    }, [garden?.province])
  );

  const [quickLogPlant, setQuickLogPlant] = useState<Plant | null>(null);
  const [showWaterAllModal, setShowWaterAllModal] = useState(false);
  const [waterAllLiters, setWaterAllLiters] = useState('');
  const [waterAllMethod, setWaterAllMethod] = useState<'hand'|'drip'|'sprinkler'|'flood'>('hand');
  const [waterAllSaving, setWaterAllSaving] = useState(false);
  const [weeklyExpanded, setWeeklyExpanded] = useState(true);
  const [plantSearch, setPlantSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<import('../../src/models/plant').PlantStatus | null>(null);
  const [hideFinished, setHideFinished] = useState(true);
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'newest'>('default');

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

  const weeklyTasks = useMemo(() => {
    const tasks: Array<{ emoji: string; label: string; plantId: string }> = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const in7DaysStr = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    plants.items.forEach((p) => {
      const crop = CROPS_BY_ID[p.cropId];
      const plantEntries = entriesByPlant.get(p.id) ?? [];

      if (getNeedsWater(p, crop, plantEntries)) {
        tasks.push({ emoji: '💧', label: t('home.taskWater', { name: p.name }), plantId: p.id });
      }
      if (p.pestStatus === 'active') {
        tasks.push({ emoji: '🐛', label: t('home.taskPest', { name: p.name }), plantId: p.id });
      }
      if (p.transplantDate && p.transplantDate >= todayStr && p.transplantDate <= in7DaysStr) {
        tasks.push({ emoji: '🪴', label: t('home.taskTransplant', { name: p.name }), plantId: p.id });
      }
      if (p.firstHarvestDate && p.firstHarvestDate >= todayStr && p.firstHarvestDate <= in7DaysStr) {
        tasks.push({ emoji: '🧺', label: t('home.taskHarvest', { name: p.name }), plantId: p.id });
      } else if (p.sowingDate && !['harvesting', 'finished'].includes(p.status)) {
        const dth = (p.varietyId ? VARIETIES_BY_ID[p.varietyId]?.daysToHarvest : null) ?? crop?.daysToHarvest;
        if (dth) {
          const midDays = Math.round((dth[0] + dth[1]) / 2);
          const estDate = new Date(new Date(p.sowingDate + 'T12:00:00').getTime() + midDays * 86_400_000);
          const estStr = estDate.toISOString().split('T')[0];
          if (estStr >= todayStr && estStr <= in7DaysStr) {
            tasks.push({ emoji: '🧺', label: t('home.taskEstHarvest', { name: p.name }), plantId: p.id });
          }
        }
      }
      if (['growing', 'fruiting', 'harvesting'].includes(p.status)) {
        const lastEntry = [...plantEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
        const ref = lastEntry?.date ?? p.sowingDate;
        if (ref) {
          const daysInactive = Math.floor((Date.now() - new Date(ref + 'T12:00:00').getTime()) / 86_400_000);
          if (daysInactive > 10) {
            tasks.push({ emoji: '👁️', label: t('home.taskNeglected', { name: p.name, days: daysInactive }), plantId: p.id });
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
          tasks.push({ emoji: '🧴', label: t('home.taskCarencia', { name: p.name, days: daysLeft }), plantId: p.id });
        }
      }
    });
    return tasks;
  }, [plants.items, entriesByPlant, t]);

  const yearHarvestKg = useMemo(() => {
    const year = new Date().getFullYear().toString();
    return entries.items
      .filter((e) => e.type === 'harvest' && e.date.startsWith(year) && (e.data as any)?.unit !== 'units')
      .reduce((sum, e) => {
        const w = (e.data as any)?.weight;
        const n = typeof w === 'string' ? parseFloat(w) : typeof w === 'number' ? w : 0;
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
  }, [entries.items]);

  const lastWateredByPlant = useMemo(() => {
    const idx = new Map<string, string>();
    for (const e of entries.items) {
      if (e.plantId && e.type === 'watering') {
        const existing = idx.get(e.plantId);
        if (!existing || e.date > existing) idx.set(e.plantId, e.date);
      }
    }
    return idx;
  }, [entries.items]);

  const filteredPlants = useMemo(() => {
    let result = plants.items;
    if (hideFinished && !statusFilter) result = result.filter((p) => p.status !== 'finished');
    if (plantSearch.trim()) {
      const q = plantSearch.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.variety?.toLowerCase().includes(q));
    }
    if (statusFilter) result = result.filter((p) => p.status === statusFilter);
    if (sortBy === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'newest') result = [...result].sort((a, b) => (b.sowingDate ?? '').localeCompare(a.sowingDate ?? ''));
    return result;
  }, [plants.items, plantSearch, statusFilter, hideFinished, sortBy]);

  const finishedCount = useMemo(
    () => plants.items.filter((p) => p.status === 'finished').length,
    [plants.items]
  );

  const zoneConfig = garden ? CLIMATE_ZONE_CONFIG[garden.climateZone] : null;
  const harvestingCount = plants.items.filter((p) => p.status === 'harvesting').length;
  const activeReminders = reminders.items.filter((r) => r.enabled).length;
  const activePests = plants.items.filter((p) => p.pestStatus === 'active' || p.pestStatus === 'treated').length;
  const needsWaterCount = useMemo(
    () => getWateringNeedsCount(plants.items, CROPS_BY_ID, entries.items),
    [plants.items, entries.items]
  );
  const lunar = useMemo(() => getLunarDay(), []);
  const { weather, loading: weatherLoading } = useWeather(garden?.province);
  const streak = useMemo(
    () => buildGamificationData(plants.items, entries.items).streak,
    [plants.items, entries.items]
  );

  const currentMonth = new Date().getMonth() + 1;
  const sowingData = useMemo(() => {
    if (!garden?.climateZone) return null;
    return getSowingNow(garden.climateZone, currentMonth);
  }, [garden?.climateZone, currentMonth]);

  // Update home screen widget snapshot whenever garden data changes
  useEffect(() => {
    if (!garden) return;
    const nextReminder = reminders.items
      .filter((r) => r.enabled)
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

  function handleWaterAll() {
    if (!garden?.id || plants.count === 0) return;
    setWaterAllLiters('');
    setWaterAllMethod('hand');
    setShowWaterAllModal(true);
  }

  async function confirmWaterAll() {
    const gardenId = garden?.id;
    if (!gardenId) return;
    setWaterAllSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const activePlants = plants.items.filter((p) => p.status !== 'finished');
    const litersNum = parseFloat(waterAllLiters);
    const perPlantLiters = !isNaN(litersNum) && litersNum > 0 && activePlants.length > 0
      ? (litersNum / activePlants.length).toFixed(1)
      : undefined;
    try {
      await Promise.all(
        activePlants.map((p) =>
          entries.create({
            gardenId,
            plantId: p.id,
            type: 'watering',
            date: today,
            ...(perPlantLiters || waterAllMethod !== 'hand'
              ? { data: { ...(perPlantLiters ? { liters: perPlantLiters } : {}), method: waterAllMethod } }
              : {}),
          })
        )
      );
      setShowWaterAllModal(false);
    } finally {
      setWaterAllSaving(false);
    }
  }

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function getHealthColor(plant: Plant, needsWater: boolean): string {
    if (plant.status === 'finished') return colors.textDisabled;
    if (plant.pestStatus === 'active') return '#EF5350';
    if (needsWater) return '#FFA726';
    const lastDate = lastWateredByPlant.get(plant.id) ?? plant.sowingDate;
    if (lastDate) {
      const daysAgo = Math.floor((Date.now() - new Date(lastDate + 'T12:00:00').getTime()) / 86_400_000);
      if (daysAgo > 14) return '#EF5350';
      if (daysAgo > 7) return '#FFA726';
    }
    return '#4CAF50';
  }

  function renderPlantCard({ item }: { item: Plant }) {
    const crop = CROPS_BY_ID[item.cropId];
    const statusConfig = PLANT_STATUS_CONFIG[item.status];
    const plantEntries = entriesByPlant.get(item.id) ?? [];
    const needsWater = getNeedsWater(item, crop, plantEntries);
    const healthColor = getHealthColor(item, needsWater);
    return (
      <Pressable
        onPress={() => router.push(`/plant/${item.id}`)}
        style={({ pressed }) => [s.plantCard, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Card padded={false} style={s.plantCardInner}>
          <View style={[s.plantImageBox, { backgroundColor: colors.surfaceAlt }]}>
            {item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={s.plantPhoto} />
            ) : (
              <Text style={s.plantEmoji}>{crop?.emoji ?? '🌱'}</Text>
            )}
            {/* Pest badge */}
            {item.pestStatus && item.pestStatus !== 'none' && (
              <View style={[s.pestBadge, { backgroundColor: PEST_STATUS_CONFIG[item.pestStatus].color }]}>
                <Text style={s.pestBadgeText}>{PEST_STATUS_CONFIG[item.pestStatus].emoji}</Text>
              </View>
            )}
            {/* Water badge */}
            {needsWater && (
              <View style={[s.waterBadge, { backgroundColor: '#29B6F6' }]}>
                <Text style={s.waterBadgeText}>💧</Text>
              </View>
            )}
            {/* Quick log button */}
            <Pressable
              onPress={(e) => { e.stopPropagation(); setQuickLogPlant(item); }}
              style={[s.quickLogBtn, { backgroundColor: colors.primary }]}
              hitSlop={4}
            >
              <Ionicons name="add" size={14} color="#fff" />
            </Pressable>
          </View>
          <View style={s.plantInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: healthColor }} />
              <Text style={[s.plantName, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            {item.variety ? (
              <Text style={[s.plantVariety, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.variety}
              </Text>
            ) : null}
            <View style={s.plantFooter}>
              <View style={[s.statusBadge, { backgroundColor: statusConfig.color + '22' }]}>
                <Text style={[s.statusText, { color: statusConfig.color }]}>
                  {statusConfig.emoji} {statusConfig.label}
                </Text>
              </View>
              {item.sowingDate && item.status !== 'finished' && (() => {
                const days = Math.floor(
                  (Date.now() - new Date(item.sowingDate + 'T12:00:00').getTime()) / 86_400_000
                );
                if (days < 1) return null;
                return (
                  <View style={[s.daysChip, { backgroundColor: colors.primary + '12' }]}>
                    <Text style={[s.daysChipText, { color: colors.primary }]}>{days}d</Text>
                  </View>
                );
              })()}
              {(() => {
                const lastWateredDate = lastWateredByPlant.get(item.id);
                if (!lastWateredDate) return null;
                const days = Math.floor((Date.now() - new Date(lastWateredDate + 'T12:00:00').getTime()) / 86_400_000);
                if (days < 1) return null;
                return (
                  <View style={[s.wateredChip, { backgroundColor: '#29B6F618' }]}>
                    <Text style={[s.wateredChipText, { color: '#29B6F6' }]}>💧{days}d</Text>
                  </View>
                );
              })()}
            </View>
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {garden?.name ?? t('home.defaultGardenName')}
          </Text>
          <View style={s.headerBadgesRow}>
            {zoneConfig && (
              <View style={[s.zoneBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[s.zoneBadgeText, { color: colors.primary }]}>
                  {zoneConfig.emoji} {t(`zone.${garden.climateZone}`)}
                </Text>
              </View>
            )}
            {garden?.gardenType && garden.gardenType !== 'huerto' && (
              <View style={[s.streakBadge, { backgroundColor: '#4CAF5018' }]}>
                <Text style={[s.streakBadgeText, { color: '#2E7D32' }]}>
                  {GARDEN_TYPE_CONFIG[garden.gardenType].emoji} {t(`gardenType.${garden.gardenType}`)}
                </Text>
              </View>
            )}
            {streak >= 2 && (
              <View style={[s.streakBadge, { backgroundColor: '#FF6D0022' }]}>
                <Text style={s.streakBadgeText}>{t('home.streak', { count: streak })}</Text>
              </View>
            )}
          </View>
        </View>
        {allGardens.length > 1 && (
          <Pressable
            onPress={() => router.push('/gardens' as any)}
            style={({ pressed }) => [s.mapBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1, marginRight: spacing.sm }]}
            hitSlop={8}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push('/garden/map')}
          style={({ pressed }) => [s.mapBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <Ionicons name="map-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={filteredPlants}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={s.columnWrapper}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Stats row */}
            <View style={s.statsRow}>
              <StatCard
                emoji="🌱"
                value={plants.count}
                label={t('home.stats.plants')}
                onPress={() => router.push('/plant/new')}
              />
              <StatCard
                emoji="🧺"
                value={harvestingCount}
                label={t('home.stats.harvesting')}
                onPress={() => setStatusFilter(statusFilter === 'harvesting' ? null : 'harvesting')}
              />
              <StatCard
                emoji="🔔"
                value={activeReminders}
                label={t('home.stats.reminders')}
                onPress={() => router.push('/settings/notifications' as any)}
              />
              {activePests > 0 && (
                <StatCard
                  emoji="🐛"
                  value={activePests}
                  label={t('home.stats.pests')}
                  onPress={() => router.push('/disease-guide' as any)}
                />
              )}
              {needsWaterCount > 0 && (
                <StatCard
                  emoji="💧"
                  value={needsWaterCount}
                  label={t('home.stats.needsWater')}
                  onPress={handleWaterAll}
                />
              )}
              {yearHarvestKg > 0 && (
                <StatCard
                  emoji="⚖️"
                  value={`${yearHarvestKg.toFixed(1)}kg`}
                  label={t('home.stats.yearKg')}
                  onPress={() => router.push('/stats')}
                />
              )}
            </View>

            {/* Lunar widget */}
            <Pressable
              onPress={() => router.push('/(tabs)/calendar' as any)}
              style={({ pressed }) => [
                s.lunarCard,
                {
                  backgroundColor: glassAvailable ? 'transparent' : colors.surface,
                  borderColor: colors.border,
                  overflow: 'hidden',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
              <View style={s.lunarLeft}>
                <Text style={s.lunarMoonEmoji}>{lunar.phaseEmoji}</Text>
                <View style={[s.lunarIllumBar, { backgroundColor: colors.border }]}>
                  <View style={[s.lunarIllumFill, { width: `${lunar.illumination}%` as any, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[s.lunarIllumText, { color: colors.textSecondary }]}>{lunar.illumination}%</Text>
              </View>
              <View style={s.lunarCenter}>
                <Text style={[s.lunarPhaseName, { color: colors.text }]}>{t(lunar.phaseKey)}</Text>
                <Text style={[s.lunarGardening, { color: colors.primary }]}>
                  {lunar.gardeningEmoji} {t(`lunar.gardeningLabel.${lunar.gardeningType}`)}
                </Text>
                <Text style={[s.lunarRec, { color: colors.textSecondary }]} numberOfLines={2}>
                  {t(`lunar.recommendation.${lunar.gardeningType}`)}
                </Text>
              </View>
              <View style={s.lunarRight}>
                <Text style={[s.lunarDay, { color: colors.textDisabled }]}>{t('home.lunarDay')}</Text>
                <Text style={[s.lunarDayNum, { color: colors.text }]}>{lunar.dayInCycle}</Text>
              </View>
            </Pressable>

            {/* Weather widget */}
            {(weather || weatherLoading) && (
              <View style={[s.weatherCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {weatherLoading || !weather ? (
                  <View style={s.weatherLoading}>
                    <Text style={[s.weatherLoadingText, { color: colors.textSecondary }]}>
                      {t('home.weatherLoading')}
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Today row */}
                    <View style={s.weatherTodayRow}>
                      <Text style={s.weatherMainEmoji}>{getWeatherLabel(weather.today.weatherCode).emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.weatherProvince, { color: colors.textSecondary }]}>
                          {weather.province}
                        </Text>
                        <Text style={[s.weatherLabel, { color: colors.text }]}>
                          {t(getWeatherLabel(weather.today.weatherCode).key)}
                        </Text>
                      </View>
                      <View style={s.weatherTemps}>
                        <Text style={[s.weatherTempMax, { color: colors.text }]}>{weather.today.tempMax}°</Text>
                        <Text style={[s.weatherTempMin, { color: colors.textSecondary }]}>{weather.today.tempMin}°</Text>
                      </View>
                    </View>

                    {/* Forecast mini row */}
                    <View style={[s.forecastRow, { borderTopColor: colors.border }]}>
                      {weather.forecast.map((day) => {
                        const lbl = getWeatherLabel(day.weatherCode);
                        const date = new Date(day.date + 'T12:00:00');
                        const intlLocale = i18n.language === 'val' ? 'ca-ES' : i18n.language;
                        const dayName = new Intl.DateTimeFormat(intlLocale, { weekday: 'short' }).format(date);
                        return (
                          <View key={day.date} style={s.forecastDay}>
                            <Text style={[s.forecastDayName, { color: colors.textSecondary }]}>
                              {dayName.charAt(0).toUpperCase() + dayName.slice(1, 3)}
                            </Text>
                            <Text style={s.forecastEmoji}>{lbl.emoji}</Text>
                            <Text style={[s.forecastTemp, { color: colors.text }]}>{day.tempMax}°</Text>
                            {day.rainProbability > 0 && (
                              <Text style={s.forecastRain}>💧{day.rainProbability}%</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Watering advice */}
                    <View style={[
                      s.wateringAdviceBanner,
                      {
                        backgroundColor:
                          weather.wateringAdvice === 'skip' ? '#29B6F6' + '18' :
                          weather.wateringAdvice === 'reduce' ? '#FFA726' + '18' :
                          colors.surfaceAlt,
                        borderColor:
                          weather.wateringAdvice === 'skip' ? '#29B6F6' :
                          weather.wateringAdvice === 'reduce' ? '#FFA726' :
                          colors.border,
                      },
                    ]}>
                      <Text style={[s.wateringAdviceText, { color: colors.text }]}>
                        {t(weather.wateringKey, weather.wateringParams)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Sow Now card */}
            {sowingData && (sowingData.now.length > 0 || sowingData.soon.length > 0) && (
              <View style={[s.sowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {sowingData.now.length > 0 && (
                  <>
                    <Text style={[s.sowSectionLabel, { color: colors.primary }]}>
                      🌱 {t('home.sowNowTitle')}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sowScroll}>
                      <View style={s.sowRow}>
                        {sowingData.now.map((crop) => (
                          <Pressable
                            key={crop.id}
                            onPress={() => router.push(`/plant/new?cropId=${crop.id}` as any)}
                            style={({ pressed }) => [
                              s.sowChip,
                              { backgroundColor: colors.primary + '18', borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
                            ]}
                          >
                            <Text style={s.sowChipEmoji}>{crop.emoji}</Text>
                            <Text style={[s.sowChipName, { color: colors.text }]} numberOfLines={1}>
                              {t('crops.' + crop.id + '.name')}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                )}
                {sowingData.soon.length > 0 && (
                  <>
                    <Text style={[s.sowSectionLabel, { color: colors.textSecondary, marginTop: sowingData.now.length > 0 ? 10 : 0 }]}>
                      🕐 {t('home.sowSoonTitle')}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sowScroll}>
                      <View style={s.sowRow}>
                        {sowingData.soon.map((crop) => (
                          <Pressable
                            key={crop.id}
                            onPress={() => router.push(`/plant/new?cropId=${crop.id}` as any)}
                            style={({ pressed }) => [
                              s.sowChip,
                              { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                            ]}
                          >
                            <Text style={s.sowChipEmoji}>{crop.emoji}</Text>
                            <Text style={[s.sowChipName, { color: colors.textSecondary }]} numberOfLines={1}>
                              {t('crops.' + crop.id + '.name')}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                )}
              </View>
            )}

            {/* Weekly tasks */}
            {plants.count > 0 && (
              <View style={[s.weeklyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  onPress={() => setWeeklyExpanded((v) => !v)}
                  style={s.weeklyHeader}
                  hitSlop={8}
                >
                  <Text style={[s.weeklySectionTitle, { color: colors.text }]}>
                    📋 {t('home.weeklyTasks')}
                    {weeklyTasks.length > 0 && (
                      <Text style={[s.weeklyBadge, { color: colors.primary }]}> ({weeklyTasks.length})</Text>
                    )}
                  </Text>
                  <Ionicons
                    name={weeklyExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {weeklyExpanded && (
                  weeklyTasks.length === 0 ? (
                    <Text style={[s.weeklyEmpty, { color: colors.textSecondary }]}>
                      {t('home.weeklyTasksEmpty')}
                    </Text>
                  ) : (
                    weeklyTasks.map((task, i) => (
                      <Pressable
                        key={i}
                        onPress={() => router.push(`/plant/${task.plantId}`)}
                        style={({ pressed }) => [
                          s.weeklyRow,
                          { borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Text style={s.weeklyEmoji}>{task.emoji}</Text>
                        <Text style={[s.weeklyLabel, { color: colors.text }]} numberOfLines={1}>
                          {task.label}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
                      </Pressable>
                    ))
                  )
                )}
              </View>
            )}

            {/* Stats link */}
            <Pressable
              onPress={() => router.push('/stats')}
              style={({ pressed }) => [
                s.statsLink,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
              <Text style={[s.statsLinkText, { color: colors.primary }]}>{t('home.viewStats')}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>

            {/* Section title + Regar todo */}
            {plants.count > 0 && (
              <>
                <View style={s.sectionRow}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>{t('home.myPlants')}</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                    <Pressable
                      onPress={() => setSortBy((cur) => cur === 'default' ? 'name' : cur === 'name' ? 'newest' : 'default')}
                      style={[
                        s.sortBtn,
                        {
                          backgroundColor: sortBy !== 'default' ? colors.primary + '18' : colors.surfaceAlt,
                          borderColor: sortBy !== 'default' ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons name="swap-vertical-outline" size={13} color={sortBy !== 'default' ? colors.primary : colors.textSecondary} />
                      <Text style={[s.sortBtnText, { color: sortBy !== 'default' ? colors.primary : colors.textSecondary }]}>
                        {sortBy === 'name' ? t('home.sortName') : sortBy === 'newest' ? t('home.sortNewest') : t('home.sortDefault')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleWaterAll}
                      style={({ pressed }) => [
                        s.waterAllBtn,
                        { backgroundColor: '#29B6F6' + '22', borderColor: '#29B6F6', opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={s.waterAllText}>{t('home.waterAll')}</Text>
                    </Pressable>
                  </View>
                </View>
                {hideFinished && finishedCount > 0 && !statusFilter && (
                  <Pressable onPress={() => setHideFinished(false)} style={s.showFinishedLink}>
                    <Text style={[s.showFinishedText, { color: colors.textSecondary }]}>
                      {t('home.showFinished', { count: finishedCount })}
                    </Text>
                  </Pressable>
                )}
                {!hideFinished && finishedCount > 0 && (
                  <Pressable onPress={() => setHideFinished(true)} style={s.showFinishedLink}>
                    <Text style={[s.showFinishedText, { color: colors.textSecondary }]}>
                      {t('home.hideFinished')}
                    </Text>
                  </Pressable>
                )}
                {plants.count > 4 && (
                  <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={14} color={colors.textSecondary} />
                    <TextInput
                      value={plantSearch}
                      onChangeText={setPlantSearch}
                      placeholder={t('home.searchPlants')}
                      placeholderTextColor={colors.textDisabled}
                      style={[{ flex: 1, color: colors.text, fontSize: fontSize.sm, marginLeft: 6 }]}
                    />
                    {plantSearch.length > 0 && (
                      <Pressable onPress={() => setPlantSearch('')} hitSlop={8}>
                        <Ionicons name="close-circle" size={14} color={colors.textDisabled} />
                      </Pressable>
                    )}
                  </View>
                )}
                {plants.count > 2 && (() => {
                  const statusCounts = new Map<string, number>();
                  plants.items.forEach((p) => statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1));
                  const presentStatuses = (Object.keys(PLANT_STATUS_CONFIG) as import('../../src/models/plant').PlantStatus[])
                    .filter((st) => statusCounts.has(st));
                  if (presentStatuses.length < 2) return null;
                  return (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: spacing.sm }}
                      contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}
                    >
                      <Pressable
                        onPress={() => setStatusFilter(null)}
                        style={[
                          s.filterChip,
                          {
                            backgroundColor: !statusFilter ? colors.primary + '22' : colors.surfaceAlt,
                            borderColor: !statusFilter ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[s.filterChipText, { color: !statusFilter ? colors.primary : colors.textSecondary }]}>
                          {t('home.filterAll')} ({plants.items.length})
                        </Text>
                      </Pressable>
                      {presentStatuses.map((st) => {
                        const cfg = PLANT_STATUS_CONFIG[st];
                        const active = statusFilter === st;
                        const count = statusCounts.get(st) ?? 0;
                        return (
                          <Pressable
                            key={st}
                            onPress={() => setStatusFilter(active ? null : st)}
                            style={[
                              s.filterChip,
                              {
                                backgroundColor: active ? cfg.color + '22' : colors.surfaceAlt,
                                borderColor: active ? cfg.color : colors.border,
                              },
                            ]}
                          >
                            <Text style={[s.filterChipText, { color: active ? cfg.color : colors.textSecondary }]}>
                              {cfg.emoji} {t('plantStatus.' + st)} ({count})
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  );
                })()}
              </>
            )}
          </>
        }
        ListEmptyComponent={
          !plants.loading ? (
            <EmptyState
              emoji="🌱"
              title={t('home.emptyTitle')}
              description={t('home.emptyDesc')}
              ctaLabel={t('home.addPlant')}
              onCta={() => router.push('/plant/new')}
            />
          ) : null
        }
        renderItem={renderPlantCard}
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/plant/new')}
        style={({ pressed }) => [
          s.fab,
          { ...shadows.lg, backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <QuickLogModal
        plant={quickLogPlant}
        visible={quickLogPlant !== null}
        onClose={() => setQuickLogPlant(null)}
      />

      {/* Bulk water modal */}
      <Modal visible={showWaterAllModal} transparent animationType="slide" onRequestClose={() => setShowWaterAllModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setShowWaterAllModal(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={[{ backgroundColor: glassAvailable ? 'transparent' : colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, paddingBottom: 36, gap: spacing.lg, overflow: 'hidden' }]}>
              {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.sm }} />
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text }}>
              💧 {t('home.waterAllTitle')}
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
              {t('home.waterAllMessage', { count: plants.items.filter(p => p.status !== 'finished').length })}
            </Text>
            <View>
              <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: fontWeight.semibold }}>
                {t('entryNew.liters')} ({t('home.waterAllLitersHint')})
              </Text>
              <TextInput
                value={waterAllLiters}
                onChangeText={setWaterAllLiters}
                placeholder="50"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                style={{ borderWidth: 1.5, borderRadius: radii.md, padding: spacing.lg, fontSize: fontSize.md, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
              />
            </View>
            <View>
              <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: fontWeight.semibold }}>
                {t('entryNew.waterMethod')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {(['hand','drip','sprinkler','flood'] as const).map((m) => (
                  <Pressable key={m} onPress={() => setWaterAllMethod(m)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1.5, gap: 6, backgroundColor: waterAllMethod === m ? colors.primary + '22' : colors.surface, borderColor: waterAllMethod === m ? colors.primary : colors.border }}>
                    <Text style={{ fontSize: 16 }}>{m === 'hand' ? '🪣' : m === 'drip' ? '💧' : m === 'sprinkler' ? '🌦️' : '🌊'}</Text>
                    <Text style={{ fontSize: fontSize.sm, color: waterAllMethod === m ? colors.primary : colors.textSecondary, fontWeight: fontWeight.medium }}>{t('waterMethod.' + m)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable
              onPress={confirmWaterAll}
              disabled={waterAllSaving}
              style={[{ backgroundColor: '#29B6F6', paddingVertical: spacing.lg, borderRadius: radii.lg, alignItems: 'center', opacity: waterAllSaving ? 0.6 : 1 }]}>
              {waterAllSaving ? <ActivityIndicator color="#fff" /> : (
                <Text style={{ color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{t('home.waterAllConfirm')}</Text>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    headerBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: 2,
      flexWrap: 'wrap',
    },
    zoneBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    zoneBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    streakBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    streakBadgeText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      color: '#FF6D00',
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      flex: 1,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
    },
    waterAllBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    waterAllText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      color: '#29B6F6',
    },
    listContent: { paddingBottom: 100 },
    columnWrapper: {
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    plantCard: { flex: 1 },
    plantCardInner: { flex: 1, overflow: 'hidden' },
    plantImageBox: {
      width: '100%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pestBadge: {
      position: 'absolute',
      top: 6,
      left: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pestBadgeText: { fontSize: 12 },
    waterBadge: {
      position: 'absolute',
      top: 6,
      right: 34,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    waterBadgeText: { fontSize: 12 },
    quickLogBtn: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plantPhoto: { width: '100%', height: '100%' },
    plantEmoji: { fontSize: 48 },
    plantInfo: { padding: spacing.md },
    plantName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    plantVariety: { fontSize: fontSize.xs, marginTop: 1 },
    statusBadge: {
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    statusText: { fontSize: 10, fontWeight: fontWeight.semibold },
    plantFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, flexWrap: 'wrap' },
    daysChip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: radii.full },
    daysChipText: { fontSize: 9, fontWeight: fontWeight.bold },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.xl,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    filterChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    mapBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weatherCard: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    weatherLoading: { padding: spacing.lg, alignItems: 'center' },
    weatherLoadingText: { fontSize: fontSize.sm },
    weatherTodayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
    },
    weatherMainEmoji: { fontSize: 36 },
    weatherProvince: { fontSize: fontSize.xs, marginBottom: 2 },
    weatherLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    weatherTemps: { alignItems: 'flex-end' },
    weatherTempMax: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    weatherTempMin: { fontSize: fontSize.sm },
    forecastRow: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    forecastDay: { flex: 1, alignItems: 'center', gap: 2 },
    forecastDayName: { fontSize: 10, fontWeight: fontWeight.semibold },
    forecastEmoji: { fontSize: 18 },
    forecastTemp: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    forecastRain: { fontSize: 9, color: '#29B6F6' },
    wateringAdviceBanner: {
      margin: spacing.md,
      marginTop: 0,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    wateringAdviceText: { fontSize: fontSize.xs, lineHeight: 18 },
    lunarCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    lunarLeft: { alignItems: 'center', gap: 4, width: 48 },
    lunarMoonEmoji: { fontSize: 28 },
    lunarIllumBar: { width: 40, height: 4, borderRadius: 2, overflow: 'hidden' },
    lunarIllumFill: { height: 4, borderRadius: 2 },
    lunarIllumText: { fontSize: 10 },
    lunarCenter: { flex: 1, gap: 2 },
    lunarPhaseName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    lunarGardening: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    lunarRec: { fontSize: 11, lineHeight: 15, marginTop: 2 },
    lunarRight: { alignItems: 'center', minWidth: 32 },
    lunarDay: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
    lunarDayNum: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    weeklyCard: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    weeklyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    weeklySectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    weeklyBadge: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    weeklyEmpty: {
      fontSize: fontSize.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    weeklyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    weeklyEmoji: { fontSize: 16, width: 22, textAlign: 'center' },
    weeklyLabel: { flex: 1, fontSize: fontSize.sm },
    statsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    statsLinkText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    sowCard: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.md,
    },
    sowSectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    sowScroll: { marginHorizontal: -spacing.xs },
    sowRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xs },
    sowChip: {
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1.5,
      minWidth: 72,
      gap: 3,
    },
    sowChipEmoji: { fontSize: 22 },
    sowChipName: { fontSize: 10, fontWeight: fontWeight.medium, textAlign: 'center' },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wateredChip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: radii.full },
    wateredChipText: { fontSize: 9, fontWeight: fontWeight.bold },
    sortBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    sortBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    showFinishedLink: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xs,
      marginBottom: spacing.sm,
    },
    showFinishedText: { fontSize: fontSize.xs, textDecorationLine: 'underline' },
  });
