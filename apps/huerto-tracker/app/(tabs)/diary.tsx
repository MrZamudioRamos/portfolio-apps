import { useColors, useTheme, EmptyState, type Theme } from '@portfolio/ui';
import { Illustration } from '../../src/components/Illustration';
import { useCollection } from '@portfolio/storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BOTTOM_CLEARANCE } from './_layout';
import { formatRelative } from '@portfolio/shared';
import { ENTRY_TYPE_CONFIG, type DiaryEntry, type EntryType } from '../../src/models/diary-entry';
import { type Plant } from '../../src/models/plant';
import { CROPS_BY_ID } from '../../src/data/crops';
import { useTranslation } from 'react-i18next';
import { useCsvExport } from '../../src/hooks/useCsvExport';
import { useCustomCrops } from '../../src/hooks/useCustomCrops';
import { usePro } from '../../src/hooks/usePro';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { CopilotStep } from 'react-native-copilot';
import { SemillitaTourProvider, WalkView } from '../../src/components/SemillitaTourProvider';
import { useTourAutoStart } from '../../src/hooks/useTourAutoStart';
import { useCoachingLevel } from '../../src/hooks/useCoachingLevel';

const ALL_TYPES: Array<EntryType | 'all'> = [
  'all', 'watering', 'sowing', 'harvest', 'fertilizing', 'transplant',
  'pest', 'treatment', 'pruning', 'photo', 'note',
];

function DiaryInner() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const coachLevel = useCoachingLevel();
  useTourAutoStart('diary', { firstStep: 'add', disabled: coachLevel !== 'full' });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, []);

  const [activeFilter, setActiveFilter] = useState<EntryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    setRefreshError(false);
    try {
      await Promise.all([entries.refresh(), plants.refresh()]);
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();

  const entries = useCollection<DiaryEntry>('diary_entries');
  const plants = useCollection<Plant>('plants');
  const { exportEntries, exporting } = useCsvExport();
  const { customCropsById } = useCustomCrops();
  const { isPro } = usePro();
  const { activeGarden, refreshActiveId } = useActiveGarden();

  const lastDataRefresh = useRef(0);
  useFocusEffect(
    useCallback(() => {
      refreshActiveId();
      const now = Date.now();
      if (now - lastDataRefresh.current > 5_000) {
        lastDataRefresh.current = now;
        entries.refresh();
        plants.refresh();
      }
    }, [])
  );

  const gardenEntries = useMemo(
    () => activeGarden?.id ? entries.items.filter((e) => e.gardenId === activeGarden.id) : [],
    [entries.items, activeGarden?.id]
  );

  const plantsById = useMemo(
    () => Object.fromEntries(
      plants.items
        .filter((p) => activeGarden?.id && p.gardenId === activeGarden.id)
        .map((p) => [p.id, p])
    ),
    [plants.items, activeGarden?.id]
  );

  const filtered = useMemo(() => {
    const sorted = [...gardenEntries].sort(
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
  }, [gardenEntries, activeFilter, plantId, searchQuery, plantsById]);

  const typeCounts = useMemo(() => {
    const base = plantId ? gardenEntries.filter((e) => e.plantId === plantId) : gardenEntries;
    const counts: Record<string, number> = { all: base.length };
    base.forEach((e) => { counts[e.type] = (counts[e.type] ?? 0) + 1; });
    return counts;
  }, [gardenEntries, plantId]);

  const sections = useMemo(() => {
    const groups = new Map<string, DiaryEntry[]>();
    filtered.forEach((entry) => {
      const day = entry.date.slice(0, 10);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(entry);
    });
    return [...groups.entries()].map(([date, data]) => ({ date, data }));
  }, [filtered]);

  const hasFilters = activeFilter !== 'all' || Boolean(plantId) || Boolean(searchQuery.trim());
  const clearFilters = () => {
    setActiveFilter('all');
    setSearchQuery('');
    if (plantId) router.setParams({ plantId: undefined } as any);
  };

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function renderEntry({ item }: { item: DiaryEntry }) {
    const config = ENTRY_TYPE_CONFIG[item.type];
    const plant = item.plantId ? plantsById[item.plantId] : null;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/entry/edit?id=${item.id}` as any)}
        style={({ pressed }) => [
          s.entryCard,
          {
            backgroundColor: colors.surface,
            borderLeftColor: config.color,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}
      >
        <View style={[s.entryIconBadge, { backgroundColor: config.color + '20' }]}>
          <Text style={{ fontSize: 22 }}>{config.emoji}</Text>
        </View>

        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={s.entryTitleRow}>
            <Text style={[s.entryType, { color: colors.text }]}>
              {t(`diary.filters.${item.type}`)}
            </Text>
            <Text style={[s.entryDate, { color: colors.textSecondary }]}>
              {formatRelative(item.date, i18n.language)}
            </Text>
          </View>

          {plant && !plantId && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); router.push(`/plant/${plant.id}` as any); }}
              hitSlop={4}
            >
              <Text style={[s.entryPlant, { color: colors.primary }]}>
                {CROPS_BY_ID[plant.cropId]?.emoji ?? '🌱'} {plant.name}
              </Text>
            </Pressable>
          )}

          {item.notes ? (
            <Text style={[s.entryNotes, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}

          {item.data && Object.keys(item.data).length > 0 ? (
            <View style={s.harvestData}>
              {((item.data as any).weightGrams ?? (item.data as any).weight) ? (
                <Text style={[s.harvestChip, { color: colors.warning, backgroundColor: colors.warning + '18' }]}>
                  ⚖️ {(item.data as any).weightGrams ?? (item.data as any).weight} kg
                </Text>
              ) : null}
              {(item.data as any).units ? (
                <Text style={[s.harvestChip, { color: colors.primary, backgroundColor: colors.surfaceAlt }]}>
                  🔢 {(item.data as any).units} uds
                </Text>
              ) : null}
              {(item.data as any).quality ? (
                <Text style={[s.harvestChip, { color: colors.secondary, backgroundColor: colors.secondary + '18' }]}>
                  {'⭐'.repeat(Number((item.data as any).quality))}
                </Text>
              ) : null}
              {(item.data as any).liters ? (
                <Text style={[s.harvestChip, { color: colors.water, backgroundColor: colors.water + '18' }]}>
                  💧 {(item.data as any).liters} L
                </Text>
              ) : null}
              {(item.data as any).product ? (
                <Text style={[s.harvestChip, { color: colors.textSecondary, backgroundColor: colors.surfaceAlt }]} numberOfLines={1}>
                  {(item.data as any).product}
                </Text>
              ) : null}
              {(item.data as any).waitDays ? (
                <Text style={[s.harvestChip, { color: colors.error, backgroundColor: colors.error + '18' }]}>
                  {t('diary.waitDaysChip', { days: (item.data as any).waitDays })}
                </Text>
              ) : null}
              {(item.data as any).amount ? (
                <Text style={[s.harvestChip, { color: colors.warning, backgroundColor: colors.warning + '18' }]}>
                  {(item.data as any).amount} {(item.data as any).unit ?? ''}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={s.entryThumb} />
        ) : null}
      </Pressable>
    );
  }

  const filteredPlant = plantId ? plantsById[plantId] : null;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {plantId && (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color={colors.primary} />
              </Pressable>
            )}
            <Text style={[s.headerTitle, { color: colors.text }]}>{t('diary.title')}</Text>
          </View>
          {entries.items.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('diary.exportCsv')}
              onPress={() => {
                if (!isPro) {
                  router.push('/paywall?source=csv_export' as any);
                  return;
                }
                exportEntries(gardenEntries, Object.values(plantsById), customCropsById);
              }}
              hitSlop={8}
              disabled={exporting}
            >
              {exporting
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name={isPro ? 'share-outline' : 'lock-closed-outline'} size={22} color={colors.primary} />
              }
            </Pressable>
          )}
        </View>
        {filteredPlant && (
          <View style={[s.plantFilterBanner, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[s.plantFilterText, { color: colors.primary }]}>
              {CROPS_BY_ID[filteredPlant.cropId]?.emoji ?? '🌱'} {filteredPlant.name}
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
                  backgroundColor: isActive ? colors.primary + '22' : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              {type !== 'all' && (
                <Text style={{ fontSize: 13, marginRight: 4 }}>
                  {ENTRY_TYPE_CONFIG[type as EntryType].emoji}
                </Text>
              )}
              <Text style={[s.filterLabel, { color: isActive ? colors.primary : colors.text, fontWeight: isActive ? fontWeight.semibold : fontWeight.medium }]}>
                {t(`diary.filters.${type}`)}
              </Text>
              {count > 0 && (
                <Text style={[s.filterCount, { color: isActive ? colors.primary : colors.textSecondary }]}>
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
            accessibilityLabel={t('diary.search')}
            placeholder={t('diary.search')}
            placeholderTextColor={colors.textDisabled}
            style={[{ flex: 1, color: colors.text, fontSize: fontSize.sm, marginLeft: 6 }]}
          />
          {searchQuery.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={14} color={colors.textDisabled} />
            </Pressable>
          )}
        </View>
      )}

      {/* List grouped by date */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {refreshError && (
        <View accessibilityRole="alert" style={{ marginHorizontal: spacing.xl, marginBottom: spacing.sm, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.error + '66', backgroundColor: colors.error + '12', gap: spacing.sm }}>
          <Text style={{ color: colors.text }}>{t('errorScreen.desc')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('errorScreen.retry')} onPress={onRefresh} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>{t('errorScreen.retry')}</Text>
          </Pressable>
        </View>
      )}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderSectionHeader={({ section: { date } }) => (
          <View style={[s.sectionHeader, { backgroundColor: colors.background }]}>
            <View style={[s.sectionDot, { backgroundColor: colors.primary }]} />
            <Text style={[s.sectionHeaderText, { color: colors.textSecondary }]}>
              {formatRelative(date, i18n.language)}
            </Text>
            <View style={[s.sectionLine, { backgroundColor: colors.border }]} />
          </View>
        )}
        ListEmptyComponent={
          !entries.loading ? (
            <EmptyState
              illustration={<Illustration name="diary-empty" size={128} />}
              title={t(hasFilters ? 'diary.noResultsTitle' : 'diary.emptyTitle')}
              description={t(hasFilters ? 'diary.noResultsDesc' : 'diary.emptyDesc')}
              ctaLabel={t(hasFilters ? 'diary.clearFilters' : 'diary.newEntry')}
              onCta={hasFilters ? clearFilters : () => router.push('/entry/new')}
            />
          ) : (
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )
        }
      />

      </Animated.View>

      {/* FAB */}
      <CopilotStep text={t('coach.diary')} order={1} name="add">
        <WalkView style={[s.fab, { ...shadows.lg, backgroundColor: colors.primary, bottom: insets.bottom + FLOATING_TAB_BOTTOM_CLEARANCE + 12 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('diary.newEntry')}
            onPress={() => router.push(plantId ? `/entry/new?plantId=${plantId}` : '/entry/new' as any)}
            style={({ pressed }) => [
              { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 28, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="add" size={28} color={colors.background} />
          </Pressable>
        </WalkView>
      </CopilotStep>
    </SafeAreaView>
  );
}

export default function DiaryScreen() {
  return (
    <SemillitaTourProvider>
      <DiaryInner />
    </SemillitaTourProvider>
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
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingTop: spacing.lg,
    },
    sectionDot: { width: 6, height: 6, borderRadius: 3 },
    sectionLine: { flex: 1, height: StyleSheet.hairlineWidth },
    sectionHeaderText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
    entryCard: {
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
    harvestData: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
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
