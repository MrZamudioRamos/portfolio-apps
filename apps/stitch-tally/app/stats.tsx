import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { usePurchases } from '@portfolio/billing';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Project } from '../src/models/project';

function calcStreak(projects: Project[]): number {
  const allDates = new Set(
    projects.flatMap((p) => p.sessions.map((s) => s.date))
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (allDates.has(key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function calcAvgRows(projects: Project[]): number {
  const sessions = projects.flatMap((p) => p.sessions);
  if (sessions.length === 0) return 0;
  const total = sessions.reduce((acc, s) => acc + s.rowsCompleted, 0);
  return Math.round(total / sessions.length);
}

function calcEstCompletion(project: Project): string | null {
  if (!project.totalRows || project.currentRow === 0) return null;
  const remaining = project.totalRows - project.currentRow;
  const avg = calcAvgRows([project]);
  if (avg === 0) return null;
  const daysLeft = Math.ceil(remaining / avg);
  const date = new Date();
  date.setDate(date.getDate() + daysLeft);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StatsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { isPro } = usePurchases();

  const projects = useCollection<Project>('stitch_projects');

  const totalRows = useMemo(
    () => projects.items.reduce((acc, p) => acc + p.currentRow, 0),
    [projects.items]
  );
  const streak = useMemo(() => calcStreak(projects.items), [projects.items]);
  const avgRows = useMemo(() => calcAvgRows(projects.items), [projects.items]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (!isPro) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[s.back, { color: colors.primary }]}>←</Text>
          </Pressable>
          <Text style={[s.title, { color: colors.text }]}>{t('stats.title')}</Text>
        </View>
        <View style={s.proGate}>
          <Text style={{ fontSize: 64 }}>📊</Text>
          <Text style={[s.gateTitle, { color: colors.text }]}>Stats & Streaks</Text>
          <Text style={[s.gateDesc, { color: colors.textSecondary }]}>
            Upgrade to Pro to see your crafting journey, streaks and progress charts.
          </Text>
          <Pressable
            onPress={() => router.push('/paywall')}
            style={[s.upgradeBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={s.upgradeBtnText}>{t('projects.upgrade')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[s.back, { color: colors.primary }]}>←</Text>
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>{t('stats.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        <View style={s.statsRow}>
          <StatBlock emoji="🧶" value={totalRows} label={t('stats.total_rows')} colors={colors} s={s} />
          <StatBlock emoji="🔥" value={streak} label={t('stats.streak')} colors={colors} s={s} />
          <StatBlock emoji="📈" value={avgRows} label={t('stats.avg_rows')} colors={colors} s={s} />
        </View>

        {/* Per-project progress */}
        {projects.items.length === 0 ? (
          <View style={s.empty}>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>{t('stats.no_data')}</Text>
          </View>
        ) : (
          projects.items.map((p) => {
            const progress = p.totalRows ? p.currentRow / p.totalRows : null;
            const est = calcEstCompletion(p);
            return (
              <Card key={p.id} padded style={s.projectCard}>
                <View style={s.projectCardHeader}>
                  <View style={[s.colorDot, { backgroundColor: p.yarnColor }]} />
                  <Text style={[s.projectCardName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[s.projectCardRows, { color: colors.primary }]}>
                    {p.currentRow}{p.totalRows ? `/${p.totalRows}` : ''}
                  </Text>
                </View>
                {progress !== null && (
                  <View style={[s.progressBg, { backgroundColor: colors.surfaceAlt }]}>
                    <View style={[s.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: p.yarnColor }]} />
                  </View>
                )}
                {est && (
                  <Text style={[s.estText, { color: colors.textSecondary }]}>
                    {t('stats.est_completion')}: {est}
                  </Text>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBlock({ emoji, value, label, colors, s }: { emoji: string; value: number; label: string; colors: ReturnType<typeof useColors>; s: any }) {
  return (
    <View style={[s.statBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={[s.statValue, { color: colors.primary }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.textSecondary }]}>{label}</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
    back: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    scroll: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 60 },
    statsRow: { flexDirection: 'row', gap: spacing.md },
    statBlock: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, gap: 2 },
    statValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    statLabel: { fontSize: fontSize.xs, textAlign: 'center' },
    projectCard: { gap: spacing.sm },
    projectCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    colorDot: { width: 12, height: 12, borderRadius: 6 },
    projectCardName: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    projectCardRows: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    estText: { fontSize: fontSize.xs },
    empty: { alignItems: 'center', paddingVertical: spacing['3xl'] },
    emptyText: { fontSize: fontSize.md, textAlign: 'center' },
    proGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
    gateTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    gateDesc: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
    upgradeBtn: { paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md, borderRadius: radii.lg },
    upgradeBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  });
