import { useColors, useTheme, Card, EmptyState, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS, CATEGORY_CONFIG } from '../../src/data/crops';
import type { Garden } from '../../src/models/garden';
import type { CropInfo } from '../../src/data/crops';
import { getLunarDay, getMonthGardeningProfile } from '../../src/utils/lunar';
import { isContainerFriendly, getContainerInfo } from '../../src/data/containers';
import { GARDEN_TYPE_CONFIG } from '../../src/models/garden';

export default function CalendarScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());

  const gardens = useCollection<Garden>('gardens');
  const garden = gardens.items[0];
  const zone = garden?.climateZone ?? 'mediterranea';
  const gardenType = garden?.gardenType ?? 'huerto';
  const isContainer = gardenType !== 'huerto';

  useFocusEffect(
    useCallback(() => {
      gardens.refresh();
    }, [])
  );

  const intlLocale = i18n.language === 'val' ? 'ca-ES' : i18n.language;
  const MONTH_NAMES = useMemo(
    () => Array.from({ length: 12 }, (_, i) =>
      new Intl.DateTimeFormat(intlLocale, { month: 'long' }).format(new Date(2024, i, 1))
    ),
    [intlLocale]
  );

  const availableCrops = useMemo(
    () => {
      const base = CROPS.filter((c) => c.sowingMonths[zone]?.includes(month));
      return isContainer ? base.filter((c) => isContainerFriendly(c.id)) : base;
    },
    [zone, month, isContainer]
  );

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
    return (
      <Card padded style={s.cropCard}>
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
        <Text style={[s.headerZone, { color: colors.textSecondary }]}>
          {t('calendar.zone', { zone: t(`zone.${zone}`) })}
        </Text>
      </View>

      {/* Month navigation */}
      <View style={[s.monthNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable onPress={prevMonth} hitSlop={16} style={s.navArrow}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={[s.monthName, { color: colors.text }]}>{monthNameCap}</Text>
          <Text style={[s.yearText, { color: colors.textSecondary }]}>{year}</Text>
        </View>
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
    headerZone: { fontSize: fontSize.sm, marginTop: 2 },
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
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: 40, gap: spacing.md },
    cropCard: { gap: spacing.sm },
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
  });
