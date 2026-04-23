import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { usePurchases } from '@portfolio/billing';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FEATURES: Array<{ label: string; free: boolean; pro: boolean }> = [
  { label: 'Row counter',          free: true,  pro: true  },
  { label: 'Stitch counter',       free: true,  pro: true  },
  { label: 'Haptic feedback',      free: true,  pro: true  },
  { label: 'Tap anywhere',         free: true,  pro: true  },
  { label: '2 projects',           free: true,  pro: false },
  { label: 'Unlimited projects',   free: false, pro: true  },
  { label: 'Row notes',            free: false, pro: true  },
  { label: 'Stats & streaks',      free: false, pro: true  },
  { label: 'Color themes',         free: false, pro: true  },
  { label: 'Export to PDF',        free: false, pro: true  },
];

export default function PaywallScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { offerings, purchase, restore, purchasing } = usePurchases();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function handlePurchase(planId: 'monthly' | 'annual') {
    await purchase(planId);
    router.back();
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Close */}
        <Pressable onPress={() => router.back()} style={s.closeBtn} hitSlop={12}>
          <Text style={[s.closeText, { color: colors.textSecondary }]}>✕</Text>
        </Pressable>

        {/* Hero */}
        <Text style={s.hero}>🧶</Text>
        <Text style={[s.title, { color: colors.text }]}>{t('paywall.title')}</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>{t('paywall.subtitle')}</Text>

        {/* Feature table */}
        <View style={[s.table, { borderColor: colors.border }]}>
          <View style={[s.tableHeader, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.tableHeaderCell, { color: colors.textSecondary, flex: 2 }]} />
            <Text style={[s.tableHeaderCell, { color: colors.textSecondary }]}>{t('paywall.features_free')}</Text>
            <Text style={[s.tableHeaderCell, { color: colors.primary }]}>{t('paywall.features_pro')}</Text>
          </View>
          {FEATURES.map((f, i) => (
            <View
              key={f.label}
              style={[
                s.tableRow,
                { borderTopColor: colors.border },
                i % 2 === 1 && { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <Text style={[s.featureLabel, { color: colors.text }]}>{f.label}</Text>
              <Text style={s.featureCheck}>{f.free ? '✓' : '—'}</Text>
              <Text style={[s.featureCheck, { color: colors.primary }]}>{f.pro ? '✓' : '—'}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={s.plans}>
          {/* Monthly */}
          <Pressable
            onPress={() => handlePurchase('monthly')}
            disabled={purchasing}
            style={({ pressed }) => [
              s.planCard,
              { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[s.planName, { color: colors.text }]}>{t('paywall.monthly')}</Text>
            <Text style={[s.planPrice, { color: colors.text }]}>
              {offerings.monthly.priceString}
            </Text>
            <Text style={[s.planTrial, { color: colors.primary }]}>
              {t('paywall.trial', { days: 3 })}
            </Text>
          </Pressable>

          {/* Annual — highlighted */}
          <Pressable
            onPress={() => handlePurchase('annual')}
            disabled={purchasing}
            style={({ pressed }) => [
              s.planCard,
              s.planCardFeatured,
              { borderColor: colors.primary, backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[s.bestValueBadge, { backgroundColor: '#fff' }]}>
              <Text style={[s.bestValueText, { color: colors.primary }]}>{t('paywall.best_value')}</Text>
            </View>
            <Text style={[s.planName, { color: '#fff' }]}>{t('paywall.annual')}</Text>
            <Text style={[s.planPrice, { color: '#fff' }]}>
              {offerings.annual.priceString}
            </Text>
            <Text style={[s.planSavings, { color: '#fff' + 'CC' }]}>
              {offerings.annual.savingsLabel}
            </Text>
            <Text style={[s.planTrial, { color: '#fff' }]}>
              {t('paywall.trial', { days: 7 })}
            </Text>
          </Pressable>
        </View>

        {purchasing && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}

        <Pressable onPress={restore} style={s.restoreBtn}>
          <Text style={[s.restoreText, { color: colors.textDisabled }]}>{t('paywall.restore')}</Text>
        </Pressable>
      </ScrollView>
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
    scroll: { padding: spacing.xl, gap: spacing.lg },
    closeBtn: { alignSelf: 'flex-end' },
    closeText: { fontSize: fontSize.lg },
    hero: { fontSize: 64, textAlign: 'center' },
    title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, textAlign: 'center' },
    subtitle: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
    table: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    tableHeaderCell: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
    featureLabel: { flex: 2, fontSize: fontSize.sm },
    featureCheck: { flex: 1, fontSize: fontSize.sm, textAlign: 'center', color: '#9E9E9E' },
    plans: { flexDirection: 'row', gap: spacing.md },
    planCard: {
      flex: 1,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      alignItems: 'center',
      gap: spacing.xs,
    },
    planCardFeatured: { borderWidth: 2 },
    bestValueBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      marginBottom: spacing.xs,
    },
    bestValueText: { fontSize: 10, fontWeight: fontWeight.bold },
    planName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    planPrice: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    planSavings: { fontSize: fontSize.xs },
    planTrial: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    restoreBtn: { alignItems: 'center', paddingVertical: spacing.md },
    restoreText: { fontSize: fontSize.sm },
  });
