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
    const pct = progress !== null ? Math.round(progress * 100) : null;

    return (
      <Pressable
        onPress={() => router.push(`/project/${item.id}`)}
        style={({ pressed }) => [s.card, { ...shadows.md, opacity: pressed ? 0.92 : 1 }]}
      >
        {/* Yarn color header band */}
        <View style={[s.cardBand, { backgroundColor: item.yarnColor }]}>
          <Text style={s.cardCraftEmoji}>{craft.emoji}</Text>
          {pct !== null && (
            <View style={s.pctBadge}>
              <Text style={[s.pctText, { color: item.yarnColor }]}>{pct}%</Text>
            </View>
          )}
        </View>

        {/* Card body */}
        <View style={[s.cardBody, { backgroundColor: colors.surface }]}>
          <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={s.cardStats}>
            <Text style={[s.cardRowBig, { color: item.yarnColor }]}>{item.currentRow}</Text>
            {item.totalRows ? (
              <Text style={[s.cardRowSmall, { color: colors.textSecondary }]}>
                /{item.totalRows} {t('projects.rows')}
              </Text>
            ) : (
              <Text style={[s.cardRowSmall, { color: colors.textSecondary }]}>
                {t('projects.rows')}
              </Text>
            )}
          </View>

          {progress !== null && (
            <View style={[s.progressBg, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[s.progressFill, {
                width: `${Math.min(pct!, 100)}%`,
                backgroundColor: item.yarnColor,
              }]} />
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>{t('projects.title')}</Text>
          {!isPro && (
            <Text style={[s.freeHint, { color: colors.textDisabled }]}>
              {projects.count}/{FREE_LIMIT} {t('projects.rows')} · {' '}
              <Text style={{ color: colors.primary }} onPress={() => router.push('/paywall')}>
                {t('projects.upgrade')}
              </Text>
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => router.push('/stats')}
          style={({ pressed }) => [
            s.statsBtn,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={renderProject}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🧶</Text>
            <Text style={[s.emptyTitle, { color: colors.text }]}>{t('projects.empty_title')}</Text>
            <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>{t('projects.empty_desc')}</Text>
            <Pressable
              onPress={handleNew}
              style={[s.emptyBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={s.emptyBtnText}>{t('projects.new_button')}</Text>
            </Pressable>
          </View>
        }
      />

      {/* FAB */}
      {sorted.length > 0 && (
        <Pressable
          onPress={handleNew}
          style={({ pressed }) => [
            s.fab,
            { backgroundColor: colors.primary, ...shadows.lg, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}
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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    freeHint: { fontSize: fontSize.xs, marginTop: 2 },
    statsBtn: {
      width: 40, height: 40,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
    row: { gap: spacing.md, marginBottom: spacing.md },

    // Card
    card: {
      flex: 1,
      borderRadius: radii.xl ?? 20,
      overflow: 'hidden',
    },
    cardBand: {
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardCraftEmoji: { fontSize: 32 },
    pctBadge: {
      position: 'absolute',
      top: 8,
      right: 10,
      backgroundColor: 'rgba(255,255,255,0.85)',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    pctText: { fontSize: 11, fontWeight: '700' },
    cardBody: { padding: spacing.md, gap: spacing.xs },
    cardName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    cardStats: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
    cardRowBig: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    cardRowSmall: { fontSize: fontSize.sm },
    progressBg: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
    progressFill: { height: '100%', borderRadius: 3 },

    // Empty
    empty: { alignItems: 'center', paddingTop: 80, gap: spacing.lg },
    emptyEmoji: { fontSize: 72 },
    emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    emptyDesc: { fontSize: fontSize.md, textAlign: 'center', paddingHorizontal: spacing.xl },
    emptyBtn: {
      paddingHorizontal: spacing['2xl'],
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      marginTop: spacing.sm,
    },
    emptyBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },

    fab: {
      position: 'absolute', bottom: 24, right: 24,
      width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center',
    },
  });
