import { useColors, useTheme, Card, EmptyState, StatCard, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { GardenWidget } from '../../src/widgets/GardenWidget';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../../src/data';
import type { Garden } from '../../src/models/garden';
import { PLANT_STATUS_CONFIG, type Plant } from '../../src/models/plant';
import type { GardenReminder } from '../../src/models/reminder';
import { CLIMATE_ZONE_CONFIG } from '../../src/data/zones';
import { GARDEN_TYPE_CONFIG } from '../../src/models/garden';
import { getLunarDay } from '../../src/utils/lunar';
import { QuickLogModal } from '../../src/components/QuickLogModal';
import type { DiaryEntry } from '../../src/models/diary-entry';
import { useWeather } from '../../src/hooks/useWeather';
import { getWeatherLabel } from '../../src/utils/weather';
import { buildGamificationData } from '../../src/utils/gamification';
import { PEST_STATUS_CONFIG } from '../../src/data/pests';

export default function DashboardScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const gardens = useCollection<Garden>('gardens');
  const plants = useCollection<Plant>('plants');
  const reminders = useCollection<GardenReminder>('reminders');

  useFocusEffect(
    useCallback(() => {
      plants.refresh();
      reminders.refresh();
    }, [])
  );

  const entries = useCollection<DiaryEntry>('diary_entries');

  const [quickLogPlant, setQuickLogPlant] = useState<Plant | null>(null);

  const garden = gardens.items[0];
  const zoneConfig = garden ? CLIMATE_ZONE_CONFIG[garden.climateZone] : null;
  const harvestingCount = plants.items.filter((p) => p.status === 'harvesting').length;
  const activeReminders = reminders.items.filter((r) => r.enabled).length;
  const activePests = plants.items.filter((p) => p.pestStatus === 'active' || p.pestStatus === 'treated').length;
  const lunar = useMemo(() => getLunarDay(), []);
  const { weather, loading: weatherLoading } = useWeather(garden?.province);
  const streak = useMemo(
    () => buildGamificationData(plants.items, entries.items).streak,
    [plants.items, entries.items]
  );

  const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

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

  async function handleWaterAll() {
    const gardenId = garden?.id;
    if (!gardenId || plants.count === 0) return;
    Alert.alert(
      t('home.waterAllTitle'),
      t('home.waterAllMessage', { count: plants.count }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('home.waterAllConfirm'),
          onPress: async () => {
            const today = new Date().toISOString().split('T')[0];
            await Promise.all(
              plants.items.map((p) =>
                entries.create({ gardenId, plantId: p.id, type: 'watering', date: today })
              )
            );
          },
        },
      ]
    );
  }

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function renderPlantCard({ item }: { item: Plant }) {
    const crop = CROPS_BY_ID[item.cropId];
    const statusConfig = PLANT_STATUS_CONFIG[item.status];
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
            <Text style={[s.plantName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.variety ? (
              <Text style={[s.plantVariety, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.variety}
              </Text>
            ) : null}
            <View style={[s.statusBadge, { backgroundColor: statusConfig.color + '22' }]}>
              <Text style={[s.statusText, { color: statusConfig.color }]}>
                {statusConfig.emoji} {statusConfig.label}
              </Text>
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
            {garden?.name ?? 'Mi Huerto'}
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
        <Pressable
          onPress={() => router.push('/garden/map')}
          style={({ pressed }) => [s.mapBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <Ionicons name="map-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={plants.items}
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
                onPress={() => {}}
              />
              <StatCard
                emoji="🧺"
                value={harvestingCount}
                label={t('home.stats.harvesting')}
                onPress={() => {}}
              />
              <StatCard
                emoji="🔔"
                value={activeReminders}
                label={t('home.stats.reminders')}
                onPress={() => {}}
              />
              {activePests > 0 && (
                <StatCard
                  emoji="🐛"
                  value={activePests}
                  label={t('home.stats.pests')}
                  onPress={() => {}}
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
              <View style={s.sectionRow}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>{t('home.myPlants')}</Text>
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
  });
