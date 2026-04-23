import { useColors, useTheme, Card, EmptyState, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS, CROPS_BY_ID, CATEGORY_CONFIG } from '../../src/data/crops';
import type { Garden } from '../../src/models/garden';
import type { CropInfo } from '../../src/data/crops';

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2024, i, 1))
);

const SUN_LABEL: Record<string, string> = { full: '☀️ Pleno sol', partial: '⛅ Semisombra', shade: '🌑 Sombra' };
const WATER_LABEL: Record<string, string> = { high: '💧💧💧', medium: '💧💧', low: '💧' };

export default function CalendarScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());

  const gardens = useCollection<Garden>('gardens');
  const garden = gardens.items[0];
  const zone = garden?.climateZone ?? 'mediterranea';

  useFocusEffect(
    useCallback(() => {
      gardens.refresh();
    }, [])
  );

  const availableCrops = useMemo(
    () => CROPS.filter((c) => c.sowingMonths[zone]?.includes(month)),
    [zone, month]
  );

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const monthName = MONTH_NAMES[month - 1];

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function renderCropItem({ item }: { item: CropInfo }) {
    const [minDays, maxDays] = item.daysToHarvest;
    const category = CATEGORY_CONFIG[item.category];
    return (
      <Card padded style={s.cropCard}>
        <View style={s.cropHeader}>
          <Text style={s.cropEmoji}>{item.emoji}</Text>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[s.cropName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[s.cropCategory, { color: colors.primary }]}>
              {category.label}
            </Text>
          </View>
        </View>

        <View style={s.cropMeta}>
          <View style={[s.metaChip, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.metaText, { color: colors.textSecondary }]}>
              🗓 {minDays}–{maxDays} días
            </Text>
          </View>
          <View style={[s.metaChip, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.metaText, { color: colors.textSecondary }]}>
              {SUN_LABEL[item.sunNeeds]}
            </Text>
          </View>
          <View style={[s.metaChip, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.metaText, { color: colors.textSecondary }]}>
              {WATER_LABEL[item.waterNeeds]}
            </Text>
          </View>
        </View>

        <Text style={[s.tipText, { color: colors.textSecondary, borderTopColor: colors.border }]}>
          💡 {item.tips}
        </Text>

        <Button
          title="Añadir al huerto"
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
        <Text style={[s.headerTitle, { color: colors.text }]}>Calendario de siembra</Text>
        <Text style={[s.headerZone, { color: colors.textSecondary }]}>
          Zona {garden?.climateZone ?? '…'}
        </Text>
      </View>

      {/* Month navigation */}
      <View style={[s.monthNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable onPress={prevMonth} hitSlop={16} style={s.navArrow}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={[s.monthName, { color: colors.text }]}>
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
          </Text>
          <Text style={[s.yearText, { color: colors.textSecondary }]}>{year}</Text>
        </View>
        <Pressable onPress={nextMonth} hitSlop={16} style={s.navArrow}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Subtitle */}
      <Text style={[s.subTitle, { color: colors.textSecondary }]}>
        {availableCrops.length > 0
          ? `${availableCrops.length} cultivos para sembrar en ${monthName}`
          : null}
      </Text>

      <FlatList
        data={availableCrops}
        keyExtractor={(item) => item.id}
        renderItem={renderCropItem}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            emoji="💤"
            title={`Sin siembras en ${monthName}`}
            description={`No hay cultivos recomendados para tu zona en este mes. Consulta meses cercanos.`}
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
    subTitle: { paddingHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: spacing.sm, fontSize: fontSize.sm },
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
