import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { usePro } from '../src/hooks/usePro';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../src/data/crops';
import type { DiaryEntry, EntryType } from '../src/models/diary-entry';
import { ENTRY_TYPE_CONFIG } from '../src/models/diary-entry';
import type { Plant } from '../src/models/plant';
import { buildGamificationData, evaluateBadges, sortBadges, getUnlockedCount, TIER_COLORS } from '../src/utils/gamification';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { useCustomCrops } from '../src/hooks/useCustomCrops';
import { CollectionError } from '../src/components/CollectionError';

const BAR_MAX_H = 72;

function getLast6Months(locale: string): { key: string; label: string }[] {
  const now = new Date();
  const intlLocale = locale === 'val' ? 'ca-ES' : locale;
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = new Intl.DateTimeFormat(intlLocale, { month: 'short' }).format(d);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: label.charAt(0).toUpperCase() + label.slice(1, 3),
    };
  });
}

function calcStreak(entries: DiaryEntry[]): number {
  const dateSet = new Set(entries.map((e) => e.date.slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (dateSet.has(d.toISOString().slice(0, 10))) streak++;
    else break;
  }
  return streak;
}

export default function StatsScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, isDark } = useTheme();
  const router = useRouter();
  const { i18n } = useTranslation();

  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const { isPro } = usePro();
  const { activeGarden, refreshActiveId } = useActiveGarden();

  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([plants.refresh(), entries.refresh()]);
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => {
    void refreshActiveId().catch(() => {});
    void plants.refresh().catch(() => {});
    void entries.refresh().catch(() => {});
  }, []));
  const { customCropsById } = useCustomCrops();

  const gardenId = activeGarden?.id;
  const gamData = useMemo(
    () => {
      const filteredPlants = gardenId ? plants.items.filter((p) => p.gardenId === gardenId) : [];
      const filteredEntries = gardenId ? entries.items.filter((e) => e.gardenId === gardenId) : [];
      return buildGamificationData(filteredPlants, filteredEntries);
    },
    [plants.items, entries.items, gardenId]
  );
  const badges = useMemo(() => sortBadges(evaluateBadges(gamData)), [gamData]);
  const unlockedCount = useMemo(() => getUnlockedCount(badges), [badges]);

  const stats = useMemo(() => {
    const allEntries = gardenId
      ? entries.items.filter((e) => e.gardenId === gardenId)
      : entries.items;
    const allPlants = gardenId
      ? plants.items.filter((p) => p.gardenId === gardenId)
      : plants.items;
    const harvestEntries = allEntries.filter((e) => e.type === 'harvest');

    // Monthly activity (last 6 months)
    const months = getLast6Months(i18n.language);
    const monthCounts = months.map((m) => ({
      ...m,
      count: allEntries.filter((e) => e.date.startsWith(m.key)).length,
    }));
    const maxMonthCount = Math.max(...monthCounts.map((m) => m.count), 1);

    // Activity breakdown by type
    const typeCounts = Object.fromEntries(
      (Object.keys(ENTRY_TYPE_CONFIG) as EntryType[]).map((t) => [
        t,
        allEntries.filter((e) => e.type === t).length,
      ])
    ) as Record<EntryType, number>;
    const topTypes = (Object.keys(typeCounts) as EntryType[])
      .filter((t) => typeCounts[t] > 0)
      .sort((a, b) => typeCounts[b] - typeCounts[a])
      .slice(0, 6);

    // Top plants by entry count
    const plantEntryCounts = new Map<string, number>();
    allEntries.forEach((e) => {
      if (e.plantId) plantEntryCounts.set(e.plantId, (plantEntryCounts.get(e.plantId) ?? 0) + 1);
    });
    const topPlants = [...plantEntryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([plantId, count]) => {
        const plant = allPlants.find((p) => p.id === plantId);
        const crop = plant ? (CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId]) : null;
        return { plantId, count, name: plant?.name ?? '—', emoji: crop?.emoji ?? '🌱' };
      });

    // Harvest weight total (stored as kg, may be string or number)
    const totalWeight = harvestEntries.reduce((sum, e) => {
      const d = e.data as any;
      const w = d?.weightGrams ?? d?.weight;
      const parsed = typeof w === 'string' ? parseFloat(w) : typeof w === 'number' ? w : 0;
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);

    // Top crops by harvest (count + kg + avg quality)
    const cropHarvestData = new Map<string, { count: number; kg: number; qualitySum: number; qualityCount: number }>();
    harvestEntries.forEach((e) => {
      if (e.plantId) {
        const plant = allPlants.find((p) => p.id === e.plantId);
        if (plant) {
          const prev = cropHarvestData.get(plant.cropId) ?? { count: 0, kg: 0, qualitySum: 0, qualityCount: 0 };
          const d = e.data as any;
          const w = d?.weightGrams ?? d?.weight;
          const unit = d?.unit;
          const parsed = unit !== 'units' && typeof w !== 'undefined'
            ? (typeof w === 'string' ? parseFloat(w) : typeof w === 'number' ? w : 0)
            : 0;
          const q = Number((e.data as any)?.quality ?? 0);
          cropHarvestData.set(plant.cropId, {
            count: prev.count + 1,
            kg: prev.kg + (isNaN(parsed) ? 0 : parsed),
            qualitySum: prev.qualitySum + q,
            qualityCount: q > 0 ? prev.qualityCount + 1 : prev.qualityCount,
          });
        }
      }
    });
    const topCrops = [...cropHarvestData.entries()]
      .sort((a, b) => (b[1].kg || b[1].count) - (a[1].kg || a[1].count))
      .slice(0, 4)
      .map(([cropId, data]) => ({
        crop: CROPS_BY_ID[cropId] ?? customCropsById[cropId],
        count: data.count,
        kg: data.kg,
        avgQuality: data.qualityCount > 0 ? data.qualitySum / data.qualityCount : null,
      }))
      .filter((x) => x.crop);

    // Harvest by year
    const harvestByYear = new Map<number, { count: number; kg: number }>();
    harvestEntries.forEach((e) => {
      const year = new Date(e.date).getFullYear();
      const prev = harvestByYear.get(year) ?? { count: 0, kg: 0 };
      const dt = e.data as any;
      const w = dt?.weightGrams ?? dt?.weight;
      const parsed = typeof w === 'string' ? parseFloat(w) : typeof w === 'number' ? w : 0;
      harvestByYear.set(year, { count: prev.count + 1, kg: prev.kg + (isNaN(parsed) ? 0 : parsed) });
    });
    const currentYear = new Date().getFullYear();
    const yearlyHarvest = [currentYear, currentYear - 1]
      .filter((y) => harvestByYear.has(y))
      .map((y) => ({ year: y, ...harvestByYear.get(y)! }));

    // Success rate
    const totalPlants = allPlants.length;
    const successPlants = allPlants.filter((p) => p.status === 'harvesting' || p.status === 'finished').length;
    const successRate = totalPlants > 0 ? Math.round((successPlants / totalPlants) * 100) : null;

    // Average days sowing → first harvest
    const avgDaysArr = allPlants
      .filter((p) => p.sowingDate && p.firstHarvestDate)
      .map((p) => Math.floor((new Date(p.firstHarvestDate! + 'T12:00:00').getTime() - new Date(p.sowingDate! + 'T12:00:00').getTime()) / 86_400_000));
    const avgDays = avgDaysArr.length > 0 ? Math.round(avgDaysArr.reduce((s, d) => s + d, 0) / avgDaysArr.length) : null;

    // Water stats
    const wateringEntries = allEntries.filter((e) => e.type === 'watering');
    const soilCheckEntries = allEntries.filter(
      (e) => e.type === 'watering' || (e.type === 'note' && (e.data as any)?.soilCheck === 'moist' || e.type === 'note' && (e.data as any)?.soilCheck === 'dry')
    );
    const moistSoilChecks = allEntries.filter((e) => e.type === 'note' && (e.data as any)?.soilCheck === 'moist').length;
    const totalLiters = wateringEntries.reduce((sum, e) => {
      const l = (e.data as any)?.liters;
      const parsed = typeof l === 'string' ? parseFloat(l) : typeof l === 'number' ? l : 0;
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);
    const litersPerKg = totalWeight > 0 && totalLiters > 0 ? totalLiters / totalWeight : null;

    // Average harvest quality
    const qualityHarvests = harvestEntries.filter((e) => (e.data as any)?.quality);
    const avgQuality = qualityHarvests.length > 0
      ? qualityHarvests.reduce((s, e) => s + Number((e.data as any).quality), 0) / qualityHarvests.length
      : null;

    return {
      totalEntries: allEntries.length,
      totalHarvests: harvestEntries.length,
      totalWeight: totalWeight > 0 ? totalWeight : null,
      streak: calcStreak(allEntries),
      monthCounts,
      maxMonthCount,
      typeCounts,
      topTypes,
      topPlants,
      topCrops,
      yearlyHarvest,
      successRate,
      avgDays,
      totalLiters: totalLiters > 0 ? totalLiters : null,
      litersPerKg,
      avgQuality,
      soilChecks: soilCheckEntries.length,
      moistSoilChecks,
      healthyPlants: allPlants.filter((plant) => plant.pestStatus !== 'active').length,
      activePlants: allPlants.filter((plant) => plant.status !== 'finished').length,
    };
  }, [entries.items, plants.items, i18n.language, activeGarden?.id, customCropsById]);

  const { t } = useTranslation();

  const barAnims = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const anims = stats.monthCounts.map((m, i) => {
      const h = stats.maxMonthCount > 0
        ? Math.max((m.count / stats.maxMonthCount) * BAR_MAX_H, m.count > 0 ? 6 : 2)
        : 2;
      barAnims[i].setValue(0);
      return Animated.timing(barAnims[i], {
        toValue: h,
        duration: 450,
        delay: i * 55,
        useNativeDriver: false,
      });
    });
    Animated.parallel(anims).start();
  }, [stats.monthCounts]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.statsHeader, { borderBottomColor: colors.border }]}>
        <View style={s.statsHeaderRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.statsBackButton}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={[s.statsBackText, { color: colors.primary }]}>Volver a Mi Huerto</Text>
          </Pressable>
          <View style={s.statsHeaderActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Compartir estadísticas" hitSlop={8}>
              <Ionicons name="share-outline" size={19} color={colors.primary} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Filtrar por período" hitSlop={8}>
              <Ionicons name="options-outline" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>
        <Text style={[s.statsHeaderTitle, { color: colors.text }]}>Estadísticas y Cosechas</Text>
      </View>

      {(plants.loading || entries.loading) && plants.items.length === 0 && entries.items.length === 0 && (
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg }} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.loading')}</Text>
        </View>
      )}

      {(plants.error || entries.error) && (
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.md }}>
          <CollectionError onRetry={() => Promise.all([plants.refresh(), entries.refresh()]).catch(() => {})} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.statsFilterRow}>
          <View style={[s.statsChip, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '40' }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[s.statsChipText, { color: colors.primary }]}>Mis Datos (Mayo 2025)</Text>
          </View>
          <View style={[s.statsChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="leaf-outline" size={14} color={colors.textSecondary} />
            <Text style={[s.statsChipText, { color: colors.textSecondary }]}>Huerto Nuevo</Text>
          </View>
        </View>
        <View style={[s.companionCallout, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={[s.companionAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="leaf" size={18} color={colors.primary} />
          </View>
          <Text style={[s.companionText, { color: colors.text }]}>Semillita: cada dato cuenta para cuidar mejor tu huerto.</Text>
        </View>
        <View style={[s.statsHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.statsHeroTop}>
            <View style={[s.statsHeroIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="leaf-outline" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.statsHeroTitleRow}>
                <Text style={[s.statsHeroEyebrow, { color: colors.primary }]}>
                  {t('stats.stitchEyebrow', { defaultValue: isPro ? 'Semilla Tracker Pro' : 'Semilla Tracker' })}
                </Text>
                {isPro && <Ionicons name="sparkles" size={16} color={colors.primary} />}
              </View>
              <Text style={[s.statsHeroTitle, { color: colors.text }]}>
                {t('stats.stitchHeading', { defaultValue: 'Estadísticas y cosechas' })}
              </Text>
              <Text style={[s.statsHeroDesc, { color: colors.textSecondary }]}>
                {t('stats.stitchDesc', { defaultValue: 'Evolución de salud, rachas de diagnóstico y cosechas de tu huerto.' })}
              </Text>
            </View>
          </View>
          <View style={[s.statsCallout, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '35' }]}>
            <Ionicons name="finger-print-outline" size={18} color={colors.primary} />
            <Text style={[s.statsCalloutText, { color: colors.text }]}>
              {stats.moistSoilChecks > 0
                ? t('stats.stitchCalloutSaved', { defaultValue: `Has esperado antes de regar ${stats.moistSoilChecks} ${stats.moistSoilChecks === 1 ? 'vez' : 'veces'} gracias al tacto a 2 cm.` })
                : t('stats.stitchCallout', { defaultValue: 'Cada comprobación a 2 cm convierte el cuidado en una decisión consciente.' })}
            </Text>
          </View>
        </View>

        <View style={s.stitchKpiGrid}>
          <View style={[s.stitchKpi, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="flame-outline" size={21} color={colors.secondary} />
            <Text style={[s.stitchKpiValue, { color: colors.text }]}>{stats.streak}</Text>
            <Text style={[s.stitchKpiLabel, { color: colors.textSecondary }]}>Racha Verde</Text>
          </View>
          <View style={[s.stitchKpi, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="finger-print-outline" size={21} color={colors.primary} />
            <Text style={[s.stitchKpiValue, { color: colors.text }]}>{stats.totalLiters !== null ? `${Math.round(stats.totalLiters)} L` : '—'}</Text>
            <Text style={[s.stitchKpiLabel, { color: colors.textSecondary }]}>Agua Ahorrada</Text>
          </View>
          <View style={[s.stitchKpi, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="heart-outline" size={21} color={colors.primary} />
            <Text style={[s.stitchKpiValue, { color: colors.text }]}>{stats.healthyPlants}/{stats.activePlants || stats.healthyPlants}</Text>
            <Text style={[s.stitchKpiLabel, { color: colors.textSecondary }]}>Macetas Sanas</Text>
          </View>
          <View style={[s.stitchKpi, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="basket-outline" size={21} color={colors.accent} />
            <Text style={[s.stitchKpiValue, { color: colors.text }]}>{stats.totalWeight !== null ? `${stats.totalWeight.toFixed(1)} kg` : '—'}</Text>
            <Text style={[s.stitchKpiLabel, { color: colors.textSecondary }]}>Cosechas Totales</Text>
          </View>
        </View>

        {/* Key stats */}
        <View style={[s.keyStatsGrid, { display: 'none' }]}>
          <KeyStat icon="book-outline" value={stats.totalEntries} label={t('stats.entries')} colors={colors} s={s} />
          <KeyStat icon="basket-outline" value={stats.totalHarvests} label={t('stats.harvests')} colors={colors} s={s} />
          <KeyStat
            icon="flame-outline"
            value={stats.streak}
            label={t('stats.activeDays', { count: stats.streak })}
            colors={colors}
            s={s}
          />
          <KeyStat
            icon="bar-chart-outline"
            value={stats.totalWeight !== null ? `${stats.totalWeight.toFixed(2)} kg` : '—'}
            label={t('stats.harvested')}
            colors={colors}
            s={s}
          />
          {stats.successRate !== null && (
            <KeyStat
              icon="trophy-outline"
              value={`${stats.successRate}%`}
              label={t('stats.successRate')}
              colors={colors}
              s={s}
            />
          )}
          {stats.avgDays !== null && (
            <KeyStat
              icon="time-outline"
              value={`${stats.avgDays}d`}
              label={t('stats.avgDaysToHarvest')}
              colors={colors}
              s={s}
            />
          )}
          {stats.totalLiters !== null && (
            <KeyStat
              icon="water-outline"
              value={`${Math.round(stats.totalLiters)} L`}
              label={t('stats.totalLiters')}
              colors={colors}
              s={s}
            />
          )}
          {stats.litersPerKg !== null && (
            <KeyStat
              icon="water-outline"
              value={`${Math.round(stats.litersPerKg)} L/kg`}
              label={t('stats.litersPerKg')}
              colors={colors}
              s={s}
            />
          )}
          {stats.avgQuality !== null && (
            <KeyStat
              icon="star-outline"
              value={stats.avgQuality.toFixed(1)}
              label={t('stats.avgQuality')}
              colors={colors}
              s={s}
            />
          )}
        </View>

        {/* Monthly activity bar chart */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>{t('stats.monthlyActivity')}</Text>
        <Card padded style={s.card}>
          <View style={s.barChart}>
            {stats.monthCounts.map((m, i) => {
              const isCurrentMonth = m.key === new Date().toISOString().slice(0, 7);
              return (
                <View key={m.key} style={s.barCol}>
                  {m.count > 0 && (
                    <Text style={[s.barValue, { color: colors.textSecondary }]}>{m.count}</Text>
                  )}
                  <Animated.View
                    style={[
                      s.bar,
                      {
                        height: barAnims[i],
                        backgroundColor: isCurrentMonth ? colors.primary : colors.primaryLight,
                        opacity: m.count === 0 ? 0.2 : 1,
                      },
                    ]}
                  />
                  <Text style={[s.barLabel, { color: isCurrentMonth ? colors.primary : colors.textSecondary, fontWeight: isCurrentMonth ? fontWeight.bold : fontWeight.regular }]}>
                    {m.label}
                  </Text>
                </View>
              );
            })}
          </View>
          {stats.totalEntries === 0 && (
            <Text style={[s.emptyNote, { color: colors.textDisabled }]}>
              {t('stats.noActivity')}
            </Text>
          )}
        </Card>

        {/* Activity breakdown */}
        {stats.topTypes.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{t('stats.activityBreakdown')}</Text>
            <Card padded style={s.card}>
              {stats.topTypes.map((type, i) => {
                const cfg = ENTRY_TYPE_CONFIG[type];
                const count = stats.typeCounts[type];
                const pct = stats.totalEntries > 0 ? count / stats.totalEntries : 0;
                return (
                  <View key={type}>
                    {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                    <View style={s.breakdownRow}>
                      <Text style={{ fontSize: 18, width: 28 }}>{cfg.emoji}</Text>
                      <Text style={[s.breakdownLabel, { color: colors.text }]}>{t('diary.filters.' + type)}</Text>
                      <View style={s.breakdownBarTrack}>
                        <View
                          style={[
                            s.breakdownBar,
                            { width: `${pct * 100}%`, backgroundColor: cfg.color },
                          ]}
                        />
                      </View>
                      <Text style={[s.breakdownCount, { color: colors.textSecondary }]}>{count}</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Top plants */}
        {stats.topPlants.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{t('stats.topPlants')}</Text>
            <Card padded style={s.card}>
              {stats.topPlants.map((item, i) => (
                <View key={item.plantId}>
                  {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                  <View style={s.rankRow}>
                    <Text style={[s.rankNum, { color: colors.textDisabled }]}>#{i + 1}</Text>
                    <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                    <Text style={[s.rankName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={[s.rankBadge, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={[s.rankBadgeText, { color: colors.primary }]}>
                        {t('stats.entryCount', { count: item.count })}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Top crops by harvest */}
        {stats.topCrops.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{t('stats.topCrops')}</Text>
            <Card padded style={s.card}>
              {stats.topCrops.map((item, i) => (
                <View key={item.crop.id}>
                  {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                  <View style={s.rankRow}>
                    <Text style={[s.rankNum, { color: colors.textDisabled }]}>#{i + 1}</Text>
                    <Text style={{ fontSize: 22 }}>{item.crop.emoji}</Text>
                    <Text style={[s.rankName, { color: colors.text }]}>
                      {t('crops.' + item.crop.id + '.name', { defaultValue: item.crop.name })}
                    </Text>
                    <View style={{ gap: 3, alignItems: 'flex-end' }}>
                      {item.kg > 0 && (
                        <View style={[s.rankBadge, { backgroundColor: '#FF704322' }]}>
                          <Text style={[s.rankBadgeText, { color: '#FF7043' }]}>
                            ⚖️ {item.kg.toFixed(1)} kg
                          </Text>
                        </View>
                      )}
                      <View style={[s.rankBadge, { backgroundColor: colors.surfaceAlt }]}>
                        <Text style={[s.rankBadgeText, { color: colors.textSecondary }]}>
                          {t('stats.harvestCount', { count: item.count })}
                        </Text>
                      </View>
                      {item.avgQuality !== null && (
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                          {'⭐'.repeat(Math.round(item.avgQuality))} {item.avgQuality.toFixed(1)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Yearly harvest comparison */}
        {stats.yearlyHarvest.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{t('stats.harvestByYear')}</Text>
            <Card padded style={s.card}>
              {stats.yearlyHarvest.map((item, i) => {
                const isCurrent = item.year === new Date().getFullYear();
                return (
                  <View key={item.year}>
                    {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                    <View style={s.rankRow}>
                      <Text style={[s.rankNum, { color: isCurrent ? colors.primary : colors.textDisabled, fontWeight: isCurrent ? fontWeight.bold : fontWeight.regular }]}>
                        {item.year}
                      </Text>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[s.rankName, { color: colors.text }]}>
                          {t('stats.harvestCount', { count: item.count })}
                        </Text>
                        {item.kg > 0 && (
                          <Text style={[s.breakdownLabel, { color: colors.textSecondary }]}>
                            {item.kg.toFixed(2)} kg
                          </Text>
                        )}
                      </View>
                      {isCurrent && (
                        <View style={[s.rankBadge, { backgroundColor: colors.primary + '18' }]}>
                          <Text style={[s.rankBadgeText, { color: colors.primary }]}>
                            {t('stats.currentYear')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Badges / Achievements — Pro only */}
        <View style={s.badgesTitleRow}>
          <Text style={[s.sectionTitle, { color: colors.text, marginTop: spacing.sm, marginBottom: 0 }]}>
            {t('stats.achievements')}
          </Text>
          {isPro && (
            <View style={[s.badgesCountBadge, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[s.badgesCountText, { color: colors.primary }]}>
                {unlockedCount}/{badges.length}
              </Text>
            </View>
          )}
        </View>
        {isPro ? (
          <View style={s.badgesGrid}>
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  s.badgeCard,
                  {
                    backgroundColor: badge.unlocked ? colors.surface : colors.surfaceAlt,
                    borderColor: badge.unlocked ? TIER_COLORS[badge.tier] : colors.border,
                    opacity: badge.unlocked ? 1 : 0.5,
                  },
                ]}
              >
                {badge.unlocked ? (
                  <Text style={[s.badgeEmoji, { opacity: 1 }]}>{badge.emoji}</Text>
                ) : (
                  <Ionicons name="lock-closed-outline" size={28} color={colors.textDisabled} />
                )}
                <Text
                  style={[
                    s.badgeName,
                    { color: badge.unlocked ? colors.text : colors.textDisabled },
                  ]}
                  numberOfLines={2}
                >
                  {badge.name}
                </Text>
                {badge.unlocked && (
                  <View style={[s.tierDot, { backgroundColor: TIER_COLORS[badge.tier] }]} />
                )}
              </View>
            ))}
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/paywall?source=achievements' as any)}
            style={[s.badgesGrid, { backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', minHeight: 120 }]}
          >
            <Ionicons name="trophy-outline" size={36} color={colors.primary} style={{ marginBottom: spacing.sm }} />
            {unlockedCount > 0 && (
              <View style={[s.badgesCountBadge, { backgroundColor: colors.primary + '22', marginBottom: spacing.sm }]}>
                <Text style={[s.badgesCountText, { color: colors.primary }]}>
                  {t('stats.achievementsProHint', { count: unlockedCount })}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center' }}>
              {t('stats.achievementsPro')}
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.primary, marginTop: spacing.sm }}>
              {t('stats.achievementsProBtn')}
            </Text>
          </Pressable>
        )}

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function KeyStat({
  icon, value, label, colors, s,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  colors: ReturnType<typeof useColors>;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[s.keyStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={28} color={colors.primary} />
      <Text style={[s.keyStatValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.keyStatLabel, { color: colors.textSecondary }]}>{label}</Text>
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
    scroll: { padding: spacing.xl, paddingTop: spacing.lg },
    statsHeader: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderBottomWidth: 1, gap: spacing.xs },
    statsHeaderRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statsBackButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
    statsBackText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    statsHeaderTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, paddingBottom: spacing.xs },
    statsHeaderActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    statsFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    statsChip: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.full, borderWidth: 1 },
    statsChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    companionCallout: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.md },
    companionAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    companionText: { flex: 1, fontSize: fontSize.sm, lineHeight: 19 },
    statsHero: { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.md },
    statsHeroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg },
    statsHeroIcon: { width: 48, height: 48, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
    statsHeroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    statsHeroEyebrow: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.3 },
    statsHeroTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 2 },
    statsHeroDesc: { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs },
    statsCallout: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.lg, borderRadius: radii.md, borderWidth: 1 },
    statsCalloutText: { flex: 1, fontSize: fontSize.sm, lineHeight: 19 },
    stitchKpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    stitchKpi: { width: '48%', minHeight: 108, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: 4 },
    stitchKpiValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    stitchKpiLabel: { fontSize: fontSize.xs, lineHeight: 16 },
    keyStatsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    keyStat: {
      width: '47%',
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      alignItems: 'center',
      gap: 4,
    },
    keyStatValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    keyStatLabel: { fontSize: fontSize.xs, textAlign: 'center' },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    card: { marginBottom: spacing.xl },
    barChart: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: BAR_MAX_H + 40,
      paddingBottom: 0,
    },
    barCol: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
    barValue: { fontSize: 9, fontWeight: fontWeight.semibold },
    bar: { width: 24, borderRadius: 4, minHeight: 2 },
    barLabel: { fontSize: fontSize.xs },
    emptyNote: { textAlign: 'center', fontSize: fontSize.sm, marginTop: spacing.md },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
    breakdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    breakdownLabel: { width: 90, fontSize: fontSize.sm },
    breakdownBarTrack: {
      flex: 1,
      height: 8,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 4,
      overflow: 'hidden',
    },
    breakdownBar: { height: 8, borderRadius: 4, minWidth: 4 },
    breakdownCount: { width: 28, textAlign: 'right', fontSize: fontSize.sm },
    rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    rankNum: { width: 20, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    rankName: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium },
    rankBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full },
    rankBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    badgesTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    badgesCountBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
    },
    badgesCountText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    badgesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    badgeCard: {
      width: '30%',
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      gap: 4,
      position: 'relative',
    },
    badgeEmoji: { fontSize: 28 },
    badgeName: {
      fontSize: 10,
      fontWeight: fontWeight.semibold,
      textAlign: 'center',
      lineHeight: 14,
    },
    tierDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 4,
    },
  });
