import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { usePurchases } from '@portfolio/billing';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CRAFT_CONFIG, type Project } from '../src/models/project';

const FREE_LIMIT = 2;

export default function ProjectsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { isPro } = usePurchases();

  const projects = useCollection<Project>('stitch_projects');

  useFocusEffect(useCallback(() => { projects.refresh(); }, []));

  const sorted = useMemo(
    () => [...projects.items].sort(
      (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
    ),
    [projects.items]
  );

  const atLimit = !isPro && projects.count >= FREE_LIMIT;

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function handleNew() {
    if (atLimit) { router.push('/paywall'); return; }
    router.push('/project/new');
  }

  function renderProject({ item }: { item: Project }) {
    const craft = CRAFT_CONFIG[item.craftType];
    const progress = item.totalRows ? item.currentRow / item.totalRows : null;

    return (
      <Pressable
        onPress={() => router.push(`/project/${item.id}`)}
        style={({ pressed }) => [s.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
      >
        {/* Color stripe */}
        <View style={[s.colorStripe, { backgroundColor: item.yarnColor }]} />

        <View style={s.cardContent}>
          <View style={s.cardHeader}>
            <Text style={s.craftEmoji}>{craft.emoji}</Text>
            <Text style={[s.projectName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <View style={s.cardStats}>
            <Text style={[s.rowCount, { color: colors.primary }]}>
              {item.currentRow}
              {item.totalRows ? (
                <Text style={[s.rowTotal, { color: colors.textSecondary }]}>
                  {' '}{t('projects.of')} {item.totalRows}
                </Text>
              ) : null}
            </Text>
            <Text style={[s.rowLabel, { color: colors.textSecondary }]}>
              {t('projects.rows')}
            </Text>
          </View>

          {progress !== null && (
            <View style={[s.progressBg, { backgroundColor: colors.surfaceAlt }]}>
              <View
                style={[
                  s.progressFill,
                  { backgroundColor: colors.primary, width: `${Math.min(progress * 100, 100)}%` },
                ]}
              />
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} style={s.chevron} />
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>{t('projects.title')}</Text>
        <Pressable
          onPress={() => router.push('/stats')}
          style={({ pressed }) => [s.statsBtn, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <Ionicons name="bar-chart-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {!isPro && (
        <View style={[s.freeBanner, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[s.freeBannerText, { color: colors.textSecondary }]}>
            {t('projects.free_limit')}
          </Text>
          <Pressable onPress={() => router.push('/paywall')}>
            <Text style={[s.upgradeText, { color: colors.primary }]}>{t('projects.upgrade')}</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={renderProject}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🧶</Text>
            <Text style={[s.emptyTitle, { color: colors.text }]}>{t('projects.empty_title')}</Text>
            <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>{t('projects.empty_desc')}</Text>
          </View>
        }
      />

      {/* FAB */}
      <Pressable
        onPress={handleNew}
        style={({ pressed }) => [
          s.fab,
          { backgroundColor: colors.primary, ...shadows.lg, opacity: pressed ? 0.85 : 1 },
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    title: { flex: 1, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    statsBtn: { padding: spacing.xs },
    freeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    freeBannerText: { fontSize: fontSize.xs },
    upgradeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    list: { paddingHorizontal: spacing.xl, paddingBottom: 100, gap: spacing.md },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    colorStripe: { width: 6, alignSelf: 'stretch' },
    cardContent: { flex: 1, padding: spacing.md, gap: spacing.sm },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    craftEmoji: { fontSize: 18 },
    projectName: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    cardStats: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
    rowCount: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    rowTotal: { fontSize: fontSize.md, fontWeight: fontWeight.regular },
    rowLabel: { fontSize: fontSize.sm },
    progressBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    chevron: { paddingRight: spacing.md },
    empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
    emptyEmoji: { fontSize: 64 },
    emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    emptyDesc: { fontSize: fontSize.md, textAlign: 'center' },
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
