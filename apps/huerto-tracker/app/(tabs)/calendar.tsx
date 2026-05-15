import { useColors, useTheme, Card, EmptyState, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS, CROPS_BY_ID, CATEGORY_CONFIG, type CropCategory } from '../../src/data/crops';
import { CROP_IMAGES } from '../../src/data/cropImages';
import { VARIETIES_BY_ID } from '../../src/data/varieties';
import { getSeasonalTip } from '../../src/data/seasonalTips';
import type { CropInfo } from '../../src/data/crops';
import { getLunarDay, getMonthGardeningProfile } from '../../src/utils/lunar';
import { isContainerFriendly, getContainerInfo } from '../../src/data/containers';
import { GARDEN_TYPE_CONFIG } from '../../src/models/garden';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import type { Plant } from '../../src/models/plant';

export default function CalendarScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());
  const [categoryFilter, setCategoryFilter] = useState<CropCategory | null>(null);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const { activeGarden: garden } = useActiveGarden();
  const allPlants = useCollection<Plant>('plants');
  const gardenPlants = useMemo(
    () => allPlants.items.filter((p) => p.gardenId === garden?.id && p.status !== 'finished'),
    [allPlants.items, garden?.id]
  );

  const upcomingHarvests = useMemo(() => {
    const today = new Date();
    const in45DaysMs = today.getTime() + 45 * 86_400_000;
    const results: { plant: Plant; estDate: Date; daysLeft: number; isReady: boolean }[] = [];
    gardenPlants.forEach((p) => {
      const crop = CROPS_BY_ID[p.cropId];
      if (!crop) return;
      let estDate: Date | null = null;
      if (p.firstHarvestDate) {
        estDate = new Date(p.firstHarvestDate + 'T12:00:00');
      } else if (p.sowingDate) {
        const dth = (p.varietyId ? VARIETIES_BY_ID[p.varietyId]?.daysToHarvest : null) ?? crop.daysToHarvest;
        const midDays = Math.round((dth[0] + dth[1]) / 2);
        estDate = new Date(new Date(p.sowingDate + 'T12:00:00').getTime() + midDays * 86_400_000);
      }
      if (!estDate) return;
      const daysLeft = Math.ceil((estDate.getTime() - today.getTime()) / 86_400_000);
      if (daysLeft <= 45 || p.status === 'harvesting') {
        results.push({ plant: p, estDate, daysLeft, isReady: daysLeft <= 0 || p.status === 'harvesting' || p.status === 'fruiting' });
      }
    });
    return results.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [gardenPlants]);

  const zone = garden?.climateZone ?? 'mediterranea';
  const gardenType = garden?.gardenType ?? 'huerto';
  const isContainer = gardenType !== 'huerto';
  const hemisphere = garden?.hemisphere ?? 'norte';
  const effectiveMonth = hemisphere === 'sur' ? ((month - 1 + 6) % 12) + 1 : month;

  const intlLocale = i18n.language === 'val' ? 'ca-ES' : i18n.language;
  const MONTH_NAMES = useMemo(
    () => Array.from({ length: 12 }, (_, i) =>
      new Intl.DateTimeFormat(intlLocale, { month: 'long' }).format(new Date(2024, i, 1))
    ),
    [intlLocale]
  );

  const availableCrops = useMemo(
    () => {
      let base = CROPS.filter((c) => c.sowingMonths[zone]?.includes(effectiveMonth));
      if (isContainer) base = base.filter((c) => isContainerFriendly(c.id));
      if (categoryFilter) base = base.filter((c) => c.category === categoryFilter);
      return base;
    },
    [zone, effectiveMonth, isContainer, categoryFilter]
  );

  const presentCategories = useMemo(() => {
    const all = CROPS.filter((c) => c.sowingMonths[zone]?.includes(effectiveMonth));
    const cats = new Set(all.map((c) => c.category));
    return (Object.keys(CATEGORY_CONFIG) as CropCategory[]).filter((cat) => cats.has(cat));
  }, [zone, effectiveMonth]);

  const today = new Date();
  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();
  const lunar = useMemo(
    () => isCurrentMonth ? getLunarDay() : null,
    [isCurrentMonth]
  );
  const monthProfile = useMemo(
    () => getMonthGardeningProfile(year, month),
    [year, month]
  );

  const seasonalTip = useMemo(
    () => getSeasonalTip(zone as any, month),
    [zone, month]
  );

  const GARDENING_COLORS: Record<string, string> = {
    frutos: '#E53935',
    hojas: '#43A047',
    raices: '#6D4C41',
    flores: '#8E24AA',
    descanso: '#757575',
  };
  const GARDENING_EMOJI: Record<string, string> = {
    frutos: '🍅', hojas: '🥬', raices: '🥕', flores: '🌸', descanso: '😴',
  };

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const monthName = MONTH_NAMES[month - 1];
  const monthNameCap = monthName ? monthName.charAt(0).toUpperCase() + monthName.slice(1) : '';

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function getSunLabel(sun: string): string {
    if (sun === 'full') return t('calendar.fullSun');
    if (sun === 'partial') return t('calendar.partialShade');
    return t('calendar.shade');
  }

  const WATER_LABEL: Record<string, string> = { high: '💧💧💧', medium: '💧💧', low: '💧' };

  function renderCropItem({ item }: { item: CropInfo }) {
    const [minDays, maxDays] = item.daysToHarvest;
    const category = CATEGORY_CONFIG[item.category];
    const containerInfo = getContainerInfo(item.id);
    const cropImageUrl = CROP_IMAGES[item.id];
    const showImage = !!cropImageUrl && !imageError[item.id];
    return (
      <Card padded style={s.cropCard}>
        {showImage && (
          <View style={[s.cropImageWrapper, { backgroundColor: colors.surfaceAlt }]}>
            <Image
              source={{ uri: cropImageUrl }}
              style={s.cropImage}
              resizeMode="cover"
              onError={() => setImageError((prev) => ({ ...prev, [item.id]: true }))}
            />
          </View>
        )}
        <View style={s.cropHeader}>
          <Text style={s.cropEmoji}>{item.emoji}</Text>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[s.cropName, { color: colors.text }]}>
              {t(`crops.${item.id}.name`, { defaultValue: item.name })}
            </Text>
            <Text style={[s.cropCategory, { color: colors.primary }]}>
              {t(`cropCategory.${item.category}`, { defaultValue: category.label })}
            </Text>
          </View>
        </View>

        <View style={s.cropMeta}>
          <View style={[s.metaChip, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.metaText, { color: colors.textSecondary }]}>
              {t('calendar.days', { min: minDays, max: maxDays })}
            </Text>
          </View>
          <View style={[s.metaChip, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.metaText, { color: colors.textSecondary }]}>
              {getSunLabel(item.sunNeeds)}
            </Text>
          </View>
          <View style={[s.metaChip, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.metaText, { color: colors.textSecondary }]}>
              {WATER_LABEL[item.waterNeeds]}
            </Text>
          </View>
        </View>

        {isContainer && containerInfo && (
          <View style={[s.containerChip, { backgroundColor: '#4CAF5018', borderColor: '#4CAF50' }]}>
            <Text style={s.containerChipText}>
              {t('calendar.containerInfo', { liters: containerInfo.minLiters, tip: containerInfo.tip })}
            </Text>
          </View>
        )}

        <Text style={[s.tipText, { color: colors.textSecondary, borderTopColor: colors.border }]}>
          💡 {t(`crops.${item.id}.tips`, { defaultValue: item.tips })}
        </Text>

        <Button
          title={t('calendar.addToGarden')}
          variant="secondary"
          size="sm"
          onPress={() => router.push(`/plant/new?cropId=${item.id}`)}
          style={{ marginTop: spacing.md }}
        />
      </Card>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('calendar.title')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={[s.headerZone, { color: colors.textSecondary }]}>
            {t('calendar.zone', { zone: t(`zone.${zone}`) })}
          </Text>
          {hemisphere === 'sur' && (
            <View style={[s.hemisphereTag, { backgroundColor: '#1565C018', borderColor: '#1565C066' }]}>
              <Text style={{ fontSize: 11, color: '#1565C0' }}>🌎 Sur</Text>
            </View>
          )}
        </View>
      </View>

      {/* Month navigation */}
      <View style={[s.monthNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable onPress={prevMonth} hitSlop={16} style={s.navArrow}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}
          style={{ alignItems: 'center' }}
          hitSlop={8}
        >
          <Text style={[s.monthName, { color: colors.text }]}>{monthNameCap}</Text>
          <Text style={[s.yearText, { color: isCurrentMonth ? colors.primary : colors.textSecondary }]}>
            {year}{!isCurrentMonth ? ' ·  ' + t('calendar.today') : ''}
          </Text>
        </Pressable>
        <Pressable onPress={nextMonth} hitSlop={16} style={s.navArrow}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Container mode banner */}
      {isContainer && (
        <View style={[s.containerBanner, { backgroundColor: '#4CAF5018', borderColor: '#4CAF50' }]}>
          <Text style={s.containerBannerEmoji}>{GARDEN_TYPE_CONFIG[gardenType].emoji}</Text>
          <Text style={[s.containerBannerText, { color: colors.text }]}>
            <Text style={{ fontWeight: fontWeight.semibold }}>{t(`gardenType.${gardenType}`)}</Text>
            {' — '}{t('calendar.containerBanner')}
          </Text>
        </View>
      )}

      {/* Lunar banner */}
      <View style={[s.lunarBanner, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View style={s.lunarBannerLeft}>
          {lunar ? (
            <>
              <Text style={s.lunarBannerMoon}>{lunar.phaseEmoji}</Text>
              <View>
                <Text style={[s.lunarBannerPhase, { color: colors.text }]}>{t(lunar.phaseKey)}</Text>
                <Text style={[s.lunarBannerDay, { color: colors.textSecondary }]}>
                  {t('calendar.lunarDayIllum', { day: lunar.dayInCycle, illum: lunar.illumination })}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={s.lunarBannerMoon}>🌙</Text>
              <View>
                <Text style={[s.lunarBannerPhase, { color: colors.text }]}>{t('calendar.lunarProfile')}</Text>
                <Text style={[s.lunarBannerDay, { color: colors.textSecondary }]}>{t('calendar.lunarBasis')}</Text>
              </View>
            </>
          )}
        </View>
        <View style={[s.lunarBannerBadge, { backgroundColor: GARDENING_COLORS[monthProfile] + '22' }]}>
          <Text style={[s.lunarBannerBadgeText, { color: GARDENING_COLORS[monthProfile] }]}>
            {GARDENING_EMOJI[monthProfile]} {t(`lunar.monthLabel.${monthProfile}`)}
          </Text>
        </View>
      </View>

      {/* Upcoming harvests */}
      {upcomingHarvests.length > 0 && (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={[{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8, color: colors.textSecondary, marginBottom: spacing.xs, paddingHorizontal: spacing.xl }]}>
            🧺 {t('calendar.upcomingHarvests')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
            {upcomingHarvests.slice(0, 8).map(({ plant, daysLeft, isReady }) => {
              const crop = CROPS_BY_ID[plant.cropId];
              const color = isReady ? '#FF7043' : daysLeft <= 7 ? '#FFA726' : '#4CAF50';
              return (
                <Pressable
                  key={plant.id}
                  onPress={() => router.push(`/plant/${plant.id}` as any)}
                  style={[s.harvestCard, { backgroundColor: color + '18', borderColor: color + '66' }]}
                >
                  <Text style={{ fontSize: 22 }}>{crop?.emoji ?? '🌱'}</Text>
                  <Text style={[s.harvestCardName, { color: colors.text }]} numberOfLines={1}>{plant.name}</Text>
                  <View style={[s.harvestDaysBadge, { backgroundColor: color + '33' }]}>
                    <Text style={[s.harvestDaysText, { color }]}>
                      {isReady ? '🍽️ ' + t('calendar.harvestReady') : `${daysLeft}d`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Seasonal tip */}
      <View style={[s.lunarBanner, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, marginTop: spacing.sm }]}>
        <Text style={{ fontSize: 22 }}>{seasonalTip.emoji}</Text>
        <Text style={[{ flex: 1, fontSize: fontSize.sm, lineHeight: 20, color: colors.text }]}>
          {t(seasonalTip.key)}
        </Text>
      </View>

      {/* Category filter chips */}
      {presentCategories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm, paddingVertical: spacing.xs }}
          style={{ marginBottom: spacing.xs }}
        >
          <Pressable
            onPress={() => setCategoryFilter(null)}
            style={[
              s.catChip,
              {
                backgroundColor: !categoryFilter ? colors.primary + '22' : colors.surfaceAlt,
                borderColor: !categoryFilter ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[s.catChipText, { color: !categoryFilter ? colors.primary : colors.textSecondary }]}>
              {t('calendar.catAll')}
            </Text>
          </Pressable>
          {presentCategories.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const active = categoryFilter === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategoryFilter(active ? null : cat)}
                style={[
                  s.catChip,
                  {
                    backgroundColor: active ? colors.primary + '22' : colors.surfaceAlt,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[s.catChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                  {cfg.emoji} {t(`cropCategory.${cat}`, { defaultValue: cfg.label })}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Subtitle + link to companions */}
      <View style={s.subTitleRow}>
        <Text style={[s.subTitle, { color: colors.textSecondary, flex: 1, marginBottom: 0 }]}>
          {availableCrops.length > 0
            ? t('calendar.cropsCount', { count: availableCrops.length, month: monthName })
            : null}
        </Text>
        <Pressable
          onPress={() => router.push('/companions')}
          style={({ pressed }) => [s.companionsLink, { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[s.companionsLinkText, { color: colors.primary }]}>{t('calendar.companions')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={availableCrops}
        keyExtractor={(item) => item.id}
        renderItem={renderCropItem}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            emoji="💤"
            title={t('calendar.emptyCrops', { month: monthName })}
            description={t('calendar.emptyCropsDesc')}
          />
        }
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
    header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
    headerTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    headerZone: { fontSize: fontSize.sm },
    hemisphereTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      marginTop: spacing.sm,
    },
    navArrow: { padding: spacing.xs },
    monthName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    yearText: { fontSize: fontSize.sm },
    containerBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.xl,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    containerBannerEmoji: { fontSize: 20 },
    containerBannerText: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
    containerChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    containerChipText: { fontSize: fontSize.xs, lineHeight: 16, color: '#2E7D32' },
    lunarBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: spacing.xl,
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: spacing.sm,
    },
    lunarBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    lunarBannerMoon: { fontSize: 24 },
    lunarBannerPhase: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    lunarBannerDay: { fontSize: fontSize.xs, marginTop: 1 },
    lunarBannerBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full },
    lunarBannerBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    subTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    subTitle: { fontSize: fontSize.sm },
    companionsLink: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    companionsLinkText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    catChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    catChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: 40, gap: spacing.md },
    cropCard: { gap: spacing.sm },
    cropImageWrapper: {
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: spacing.xs,
    },
    cropImage: {
      width: '100%',
      height: 140,
    },
    cropHeader: { flexDirection: 'row', alignItems: 'center' },
    cropEmoji: { fontSize: 36 },
    cropName: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
    cropCategory: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginTop: 2 },
    cropMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metaChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
    },
    metaText: { fontSize: fontSize.xs },
    tipText: {
      fontSize: fontSize.sm,
      lineHeight: 20,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    harvestCard: {
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      gap: 4,
      minWidth: 80,
    },
    harvestCardName: { fontSize: 10, fontWeight: fontWeight.semibold, textAlign: 'center' },
    harvestDaysBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    harvestDaysText: { fontSize: 11, fontWeight: fontWeight.bold },
  });
