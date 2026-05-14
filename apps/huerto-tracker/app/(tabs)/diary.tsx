import { useColors, useTheme, Card, EmptyState, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatRelative } from '@portfolio/shared';
import { ENTRY_TYPE_CONFIG, type DiaryEntry, type EntryType } from '../../src/models/diary-entry';
import { type Plant } from '../../src/models/plant';
import { useTranslation } from 'react-i18next';

const ALL_TYPES: Array<EntryType | 'all'> = [
  'all', 'watering', 'sowing', 'harvest', 'fertilizing', 'transplant',
  'pest', 'treatment', 'pruning', 'photo', 'note',
];

export default function DiaryScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [activeFilter, setActiveFilter] = useState<EntryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();

  const entries = useCollection<DiaryEntry>('diary_entries');
  const plants = useCollection<Plant>('plants');

  useFocusEffect(
    useCallback(() => {
      entries.refresh();
      plants.refresh();
    }, [])
  );

  const plantsById = useMemo(
    () => Object.fromEntries(plants.items.map((p) => [p.id, p])),
    [plants.items]
  );

  const filtered = useMemo(() => {
    const sorted = [...entries.items].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const byPlant = plantId ? sorted.filter((e) => e.plantId === plantId) : sorted;
    const byType = activeFilter === 'all' ? byPlant : byPlant.filter((e) => e.type === activeFilter);
    if (!searchQuery.trim()) return byType;
    const q = searchQuery.toLowerCase();
    return byType.filter((e) => {
      const plant = plantsById[e.plantId ?? ''];
      return (
        e.notes?.toLowerCase().includes(q) ||
        plant?.name.toLowerCase().includes(q) ||
        plant?.variety?.toLowerCase().includes(q)
      );
    });
  }, [entries.items, activeFilter, plantId, searchQuery, plantsById]);

  const typeCounts = useMemo(() => {
    const base = plantId ? entries.items.filter((e) => e.plantId === plantId) : entries.items;
    const counts: Record<string, number> = { all: base.length };
    base.forEach((e) => { counts[e.type] = (counts[e.type] ?? 0) + 1; });
    return counts;
  }, [entries.items, plantId]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function renderEntry({ item }: { item: DiaryEntry }) {
    const config = ENTRY_TYPE_CONFIG[item.type];
    const plant = item.plantId ? plantsById[item.plantId] : null;

    return (
      <Card padded style={s.entryCard}>
        <View style={s.entryRow}>
          <View style={[s.entryIconBadge, { backgroundColor: config.color + '22' }]}>
            <Text style={{ fontSize: 22 }}>{config.emoji}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <View style={s.entryTitleRow}>
              <Text style={[s.entryType, { color: colors.text }]}>{t(`diary.filters.${item.type}`)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[s.entryDate, { color: colors.textSecondary }]}>
                  {formatRelative(item.date)}
                </Text>
                <Pressable onPress={() => router.push(`/entry/edit?id=${item.id}`)} hitSlop={8}>
                  <Ionicons name="pencil-outline" size={14} color={colors.textDisabled} />
                </Pressable>
              </View>
            </View>
            {plant && (
              <Text style={[s.entryPlant, { color: colors.primary }]}>
                🌱 {plant.name}
              </Text>
            )}
            {item.notes ? (
              <Text style={[s.entryNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.notes}
              </Text>
            ) : null}
            {item.data?.weight || item.data?.units ? (
              <View style={s.harvestData}>
                {item.data.weight ? (
                  <Text style={[s.harvestChip, { color: colors.primary, backgroundColor: colors.surfaceAlt }]}>
                    ⚖️ {item.data.weight as string} kg
                  </Text>
                ) : null}
                {item.data.units ? (
                  <Text style={[s.harvestChip, { color: colors.primary, backgroundColor: colors.surfaceAlt }]}>
                    🔢 {item.data.units as string} uds
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={s.entryThumb} />
          ) : null}
        </View>
      </Card>
    );
  }

  const filteredPlant = plantId ? plantsById[plantId] : null;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {plantId && (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color={colors.primary} />
            </Pressable>
          )}
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('diary.title')}</Text>
        </View>
        {filteredPlant && (
          <View style={[s.plantFilterBanner, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[s.plantFilterText, { color: colors.primary }]}>
              🌱 {filteredPlant.name}
            </Text>
            <Pressable onPress={() => router.setParams({ plantId: undefined } as any)} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersContainer}
        style={s.filtersScroll}
      >
        {ALL_TYPES.filter((type) => type === 'all' || (typeCounts[type] ?? 0) > 0).map((type) => {
          const isActive = activeFilter === type;
          const count = typeCounts[type] ?? 0;
          return (
            <Pressable
              key={type}
              onPress={() => setActiveFilter(type)}
              style={[
                s.filterChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              {type !== 'all' && (
                <Text style={{ fontSize: 13, marginRight: 4 }}>
                  {ENTRY_TYPE_CONFIG[type as EntryType].emoji}
                </Text>
              )}
              <Text style={[s.filterLabel, { color: isActive ? '#fff' : colors.text }]}>
                {t(`diary.filters.${type}`)}
              </Text>
              {count > 0 && (
                <Text style={[s.filterCount, { color: isActive ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                  {count}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Search bar */}
      {entries.items.length > 5 && (
        <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={14} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('diary.search')}
            placeholderTextColor={colors.textDisabled}
            style={[{ flex: 1, color: colors.text, fontSize: fontSize.sm, marginLeft: 6 }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={14} color={colors.textDisabled} />
            </Pressable>
          )}
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !entries.loading ? (
            <EmptyState
              emoji="📔"
              title={t('diary.emptyTitle')}
              description={t('diary.emptyDesc')}
              ctaLabel={t('diary.newEntry')}
              onCta={() => router.push('/entry/new')}
            />
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/entry/new')}
        style={({ pressed }) => [
          s.fab,
          { ...shadows.lg, backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
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
    filtersScroll: { flexGrow: 0 },
    filtersContainer: {
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      paddingBottom: spacing.md,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    filterLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    filterCount: { fontSize: 10, fontWeight: fontWeight.bold, marginLeft: 3 },
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
    plantFilterBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radii.full,
      borderWidth: 1,
      alignSelf: 'flex-start',
      gap: spacing.sm,
    },
    plantFilterText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: 100, gap: spacing.sm },
    entryCard: {},
    entryRow: { flexDirection: 'row', alignItems: 'flex-start' },
    entryIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    entryTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    entryType: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    entryDate: { fontSize: fontSize.xs },
    entryPlant: { fontSize: fontSize.sm, marginTop: 2, fontWeight: fontWeight.medium },
    entryNotes: { fontSize: fontSize.sm, marginTop: 4, lineHeight: 18 },
    harvestData: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
    harvestChip: { fontSize: fontSize.xs, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
    entryThumb: { width: 52, height: 52, borderRadius: radii.sm, marginLeft: spacing.sm },
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
