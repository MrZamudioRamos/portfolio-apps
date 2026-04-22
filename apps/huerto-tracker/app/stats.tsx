import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../src/data/crops';
import type { DiaryEntry, EntryType } from '../src/models/diary-entry';
import { ENTRY_TYPE_CONFIG } from '../src/models/diary-entry';
import type { Plant } from '../src/models/plant';
import type { Garden } from '../src/models/garden';

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const BAR_MAX_H = 72;

function getLast6Months(): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MONTH_SHORT[d.getMonth()],
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

  const gardens = useCollection<Garden>('gardens');
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');

  const stats = useMemo(() => {
    const allEntries = entries.items;
    const harvestEntries = allEntries.filter((e) => e.type === 'harvest');

    // Monthly activity (last 6 months)
    const months = getLast6Months();
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
        const plant = plants.items.find((p) => p.id === plantId);
        const crop = plant ? CROPS_BY_ID[plant.cropId] : null;
        return { plantId, count, name: plant?.name ?? '—', emoji: crop?.emoji ?? '🌱' };
      });

    // Harvest weight total
    const totalWeight = harvestEntries.reduce((sum, e) => {
      const w = (e.data as any)?.weight;
      return sum + (typeof w === 'number' ? w : 0);
    }, 0);

    // Top crops by harvest
    const cropHarvestCounts = new Map<string, number>();
    harvestEntries.forEach((e) => {
      if (e.plantId) {
        const plant = plants.items.find((p) => p.id === e.plantId);
        if (plant) cropHarvestCounts.set(plant.cropId, (cropHarvestCounts.get(plant.cropId) ?? 0) + 1);
      }
    });
    const topCrops = [...cropHarvestCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cropId, count]) => ({ crop: CROPS_BY_ID[cropId], count }))
      .filter((x) => x.crop);

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
    };
  }, [entries.items, plants.items]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  const garden = gardens.items[0];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Estadísticas</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Key stats */}
        <View style={s.keyStatsGrid}>
          <KeyStat emoji="📓" value={stats.totalEntries} label="Entradas" colors={colors} s={s} />
          <KeyStat emoji="🧺" value={stats.totalHarvests} label="Cosechas" colors={colors} s={s} />
          <KeyStat
            emoji="⚡"
            value={stats.streak}
            label={stats.streak === 1 ? 'día activo' : 'días activos'}
            colors={colors}
            s={s}
          />
          <KeyStat
            emoji="⚖️"
            value={stats.totalWeight !== null ? `${stats.totalWeight} g` : '—'}
            label="Cosechado"
            colors={colors}
            s={s}
          />
        </View>

        {/* Monthly activity bar chart */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Actividad mensual</Text>
        <Card padded style={s.card}>
          <View style={s.barChart}>
            {stats.monthCounts.map((m) => {
              const h = stats.maxMonthCount > 0
                ? Math.max((m.count / stats.maxMonthCount) * BAR_MAX_H, m.count > 0 ? 6 : 2)
                : 2;
              const isCurrentMonth = m.key === new Date().toISOString().slice(0, 7);
              return (
                <View key={m.key} style={s.barCol}>
                  {m.count > 0 && (
                    <Text style={[s.barValue, { color: colors.textSecondary }]}>{m.count}</Text>
                  )}
                  <View
                    style={[
                      s.bar,
                      {
                        height: h,
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
              Sin actividad aún. ¡Empieza registrando algo!
            </Text>
          )}
        </Card>

        {/* Activity breakdown */}
        {stats.topTypes.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Desglose de actividad</Text>
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
                      <Text style={[s.breakdownLabel, { color: colors.text }]}>{cfg.label}</Text>
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
            <Text style={[s.sectionTitle, { color: colors.text }]}>Plantas más activas</Text>
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
                        {item.count} {item.count === 1 ? 'entrada' : 'entradas'}
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
            <Text style={[s.sectionTitle, { color: colors.text }]}>Cultivos más cosechados</Text>
            <Card padded style={s.card}>
              {stats.topCrops.map((item, i) => (
                <View key={item.crop.id}>
                  {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                  <View style={s.rankRow}>
                    <Text style={[s.rankNum, { color: colors.textDisabled }]}>#{i + 1}</Text>
                    <Text style={{ fontSize: 22 }}>{item.crop.emoji}</Text>
                    <Text style={[s.rankName, { color: colors.text }]}>{item.crop.name}</Text>
                    <View style={[s.rankBadge, { backgroundColor: '#FF704322' }]}>
                      <Text style={[s.rankBadgeText, { color: '#FF7043' }]}>
                        {item.count} {item.count === 1 ? 'cosecha' : 'cosechas'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function KeyStat({
  emoji, value, label, colors, s,
}: {
  emoji: string;
  value: number | string;
  label: string;
  colors: ReturnType<typeof useColors>;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[s.keyStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={s.keyStatEmoji}>{emoji}</Text>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    scroll: { padding: spacing.xl, paddingTop: spacing.lg },
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
    keyStatEmoji: { fontSize: 28 },
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
  });
