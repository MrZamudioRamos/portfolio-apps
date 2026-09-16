import { usePurchases, type PlanId } from '@portfolio/billing';
import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { scheduleDateAlert, requestPermissions } from '@portfolio/notifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { track, EVENTS } from '../src/analytics';

const TRIAL_REMINDER_KEY = '@portfolio/huerto/trial_reminder_enabled';
const TRIAL_REMINDER_NOTIF_ID = '@portfolio/huerto/trial_reminder_notif_id';
const TRIAL_DAYS = 7;
type PaywallIcon = keyof typeof Ionicons.glyphMap;

const MAIN_FEATURE_KEYS: Array<{ icon: PaywallIcon; key: string }> = [
  { icon: 'sparkles-outline', key: 'paywall.features.careAutopilot' },
  { icon: 'home-outline', key: 'paywall.features.gardens' },
  { icon: 'leaf-outline', key: 'paywall.features.plants' },
  { icon: 'map-outline', key: 'paywall.features.gardenMap' },
  { icon: 'chatbubble-ellipses-outline', key: 'paywall.features.aiDiagnosis' },
  { icon: 'notifications-outline', key: 'paywall.features.reminders' },
];

const EXTRA_FEATURE_KEYS: Array<{ icon: PaywallIcon; key: string }> = [
  { icon: 'share-outline', key: 'paywall.features.csvExport' },
  { icon: 'cloud-outline', key: 'paywall.features.backup' },
  { icon: 'trophy-outline', key: 'paywall.features.gamification' },
  { icon: 'people-outline', key: 'paywall.features.companions' },
];

const PROMISE_KEYS: Array<{ icon: PaywallIcon; key: string }> = [
  { icon: 'calendar-outline', key: 'paywall.promises.plan' },
  { icon: 'shield-checkmark-outline', key: 'paywall.promises.protect' },
  { icon: 'receipt-outline', key: 'paywall.promises.keep' },
];

const STITCH_COMPARISON_ROWS = [
  { label: 'Comprobar la humedad a 2 cm', free: true, pro: true },
  { label: 'Asistente IA y diagnóstico de plagas', free: false, pro: true },
  { label: 'Medidor de luz y lux', free: false, pro: true },
  { label: 'Simulador de sombras', free: false, pro: true },
  { label: 'Rotación e historial del huerto', free: false, pro: true },
] as const;

export default function PaywallScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { isPro, activePlan, loading: billingLoading, purchasing, isBillingAvailable, offerings, purchase, restore } = usePurchases();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('annual');
  const [trialReminderOn, setTrialReminderOn] = useState(true);
  const [showAll, setShowAll] = useState(true);
  const context = source === 'care_autopilot'
    ? { icon: 'sparkles-outline' as PaywallIcon, title: 'paywall.contextCareTitle', desc: 'paywall.contextCareDesc' }
    : source === 'absence_automation'
      ? { icon: 'briefcase-outline' as PaywallIcon, title: 'paywall.contextAbsenceTitle', desc: 'paywall.contextAbsenceDesc' }
      : source === 'map' || source === 'map_notes' || source === 'map_share'
        ? { icon: 'map-outline' as PaywallIcon, title: 'paywall.contextMapTitle', desc: 'paywall.contextMapDesc' }
      : null;

  useEffect(() => {
    track(EVENTS.paywallViewed, { source: source ?? 'direct' });
    AsyncStorage.getItem(TRIAL_REMINDER_KEY).then((raw) => {
      if (raw !== null) setTrialReminderOn(raw === '1');
    });
  }, []);

  async function toggleTrialReminder(value: boolean) {
    setTrialReminderOn(value);
    await AsyncStorage.setItem(TRIAL_REMINDER_KEY, value ? '1' : '0');
  }

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function handlePurchase() {
    if (isPro) {
      router.back();
      return;
    }
    const result = await purchase(selectedPlan);
    if (result.success) {
      track(EVENTS.purchaseCompleted, { plan: selectedPlan });
      if (trialReminderOn) {
        const granted = await requestPermissions();
        if (granted) {
          const fireAt = new Date(Date.now() + (TRIAL_DAYS - 1) * 86_400_000);
          const id = await scheduleDateAlert({
            date: fireAt,
            title: t('paywall.trialReminderNotifTitle'),
            body: t('paywall.trialReminderNotifBody'),
          });
          if (id) await AsyncStorage.setItem(TRIAL_REMINDER_NOTIF_ID, id);
        }
      }
      Alert.alert(
        t('paywall.successTitle'),
        t('paywall.successDesc'),
        [{ text: t('paywall.successBtn'), onPress: () => router.back() }]
      );
    } else {
      Alert.alert(t('common.error'), result.error ?? t('paywall.errorPurchase'));
    }
  }

  async function handleRestore() {
    const result = await restore();
    if (!result.success) {
      Alert.alert(t('common.error'), t('paywall.restoreError'));
      return;
    }
    if (result.found) {
      Alert.alert(t('paywall.restoreSuccessTitle'), t('paywall.restoreSuccessDesc'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } else {
      Alert.alert(t('paywall.restoreNoneTitle'), t('paywall.restoreNoneDesc'));
    }
  }

  const subscriptionPlans = [
    { ...offerings.monthly, highlight: false },
    { ...offerings.annual, highlight: true },
  ] as const;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Pressable onPress={() => router.back()} style={s.closeBtn} hitSlop={16}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Hero */}
        <View style={s.hero}>
          <Ionicons name={isPro ? 'trophy-outline' : 'sunny-outline'} size={52} color={colors.primary} />
          <Text style={[s.heroTitle, { color: colors.text }]}>
            {isPro ? t('paywall.titlePro') : t('paywall.stitchTitle', { defaultValue: 'Semilla Pro' })}
          </Text>
          <Text style={[s.heroSub, { color: colors.textSecondary }]}>
            {isPro
              ? t('paywall.subtitlePro', { plan: activePlan ?? 'monthly' })
              : t('paywall.stitchSubtitle', { defaultValue: 'Desbloquea todo el potencial de tu huerto' })}
          </Text>
        </View>

        {context && (
          <View style={[s.contextCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '55' }]}>
            <Ionicons name={context.icon} size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.contextTitle, { color: colors.text }]}>{t(context.title)}</Text>
              <Text style={[s.contextDesc, { color: colors.textSecondary }]}>{t(context.desc)}</Text>
            </View>
          </View>
        )}

        <View style={[s.careFreeCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '55' }]}>
          <View style={[s.careFreeIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="finger-print-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.careFreeTitle, { color: colors.text }]}>La comprobación a 2 cm siempre es gratis</Text>
            <Text style={[s.careFreeDesc, { color: colors.textSecondary }]}>El cuidado consciente de tus plantas no está detrás de un pago.</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        </View>

        <View style={[s.comparisonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.comparisonTitle, { color: colors.text }]}>Semilla Pro</Text>
          <Text style={[s.comparisonSub, { color: colors.textSecondary }]}>Más contexto para decidir mejor en cada cuidado.</Text>
          <View style={[s.comparisonHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.comparisonHeaderLabel, { color: colors.textSecondary }]}>FUNCIONES</Text>
            <Text style={[s.comparisonHeaderValue, { color: colors.textSecondary }]}>GRATIS</Text>
            <Text style={[s.comparisonHeaderValue, { color: colors.primary }]}>PRO</Text>
          </View>
          {STITCH_COMPARISON_ROWS.map((row, index) => (
            <View key={row.label} style={[s.comparisonRow, index < STITCH_COMPARISON_ROWS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[s.comparisonLabel, { color: colors.text }]}>{row.label}</Text>
              <Ionicons name={row.free ? 'checkmark' : 'close'} size={20} color={row.free ? colors.primary : colors.textDisabled} />
              <Ionicons name={row.pro ? 'checkmark' : 'close'} size={20} color={row.pro ? colors.primary : colors.textDisabled} />
            </View>
          ))}
        </View>

        <View style={[s.promiseCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[s.promiseTitle, { color: colors.text }]}>{t('paywall.promiseTitle')}</Text>
          <Text style={[s.promiseSub, { color: colors.textSecondary }]}>{t('paywall.promiseDesc')}</Text>
          {PROMISE_KEYS.map((promise) => (
            <View key={promise.key} style={s.promiseRow}>
              <Ionicons name={promise.icon} size={20} color={colors.primary} />
              <Text style={[s.promiseText, { color: colors.text }]}>{t(promise.key)}</Text>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={[s.featuresCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {MAIN_FEATURE_KEYS.map((feat, i) => (
            <View
              key={feat.key}
              style={[
                s.featureRow,
                { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              <View style={[s.featureIconBox, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name={feat.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[s.featureText, { color: colors.text }]}>{t(feat.key)}</Text>
              <Ionicons
                name={isPro ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={20}
                color={isPro ? colors.primary : colors.textDisabled}
              />
            </View>
          ))}

          <Pressable
            onPress={() => setShowAll((v) => !v)}
            style={[s.featureRow, { borderBottomWidth: showAll ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }]}
          >
            <Text style={[s.featureText, { color: colors.primary, fontSize: fontSize.sm }]}>
              {showAll ? t('paywall.showLess') : t('paywall.showAll')}
            </Text>
            <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
          </Pressable>

          {showAll && EXTRA_FEATURE_KEYS.map((feat, i) => (
            <View
              key={feat.key}
              style={[
                s.featureRow,
                i < EXTRA_FEATURE_KEYS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              <View style={[s.featureIconBox, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name={feat.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[s.featureText, { color: colors.text }]}>{t(feat.key)}</Text>
              <Ionicons
                name={isPro ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={20}
                color={isPro ? colors.primary : colors.textDisabled}
              />
            </View>
          ))}
        </View>

        {!isPro && !billingLoading && !isBillingAvailable && (
          <View
            accessibilityRole="alert"
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.xl, backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md }}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 }}>
              {t('paywall.billingUnavailable')}
            </Text>
          </View>
        )}

        {/* Plans — hidden when already Pro */}
        {!isPro && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('paywall.choosePlan')}</Text>
            <View style={s.plansRow}>
              {subscriptionPlans.map((plan) => {
                const active = selectedPlan === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => setSelectedPlan(plan.id)}
                    style={[
                      s.planCard,
                      {
                        backgroundColor: plan.highlight
                          ? active ? colors.primary : colors.surface
                          : active ? colors.primary + '18' : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                        borderWidth: active ? 2.5 : 1.5,
                        ...shadows.md,
                      },
                    ]}
                  >
                    {plan.highlight && (
                      <View style={[s.popularBadge, { backgroundColor: active ? '#fff' : colors.primary }]}>
                        <Text style={[s.popularText, { color: active ? colors.primary : '#fff' }]}>
                          {t('paywall.popular')}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={[
                        s.planLabel,
                        { color: plan.highlight && active ? '#fff' : active ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {plan.id === 'monthly' ? t('paywall.monthly') : t('paywall.annual')}
                    </Text>
                    <Text
                      style={[
                        s.planPrice,
                        { color: plan.highlight && active ? '#fff' : active ? colors.primary : colors.text },
                      ]}
                    >
                      {plan.priceString}
                    </Text>
                    <Text
                      style={[
                        s.planSub,
                        {
                          color:
                            plan.highlight && active
                              ? 'rgba(255,255,255,0.8)'
                              : active
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {plan.savingsLabel ?? t('paywall.cancelAnytime')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

          </>
        )}

        {/* Trial reminder switch */}
        {!isPro && (
          <View style={[s.trialSwitchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1, marginHorizontal: spacing.md }}>
              <Text style={[s.trialSwitchTitle, { color: colors.text }]}>
                {t('paywall.trialReminderTitle')}
              </Text>
              <Text style={[s.trialSwitchDesc, { color: colors.textSecondary }]}>
                {t('paywall.trialReminderDesc', { days: TRIAL_DAYS - 1 })}
              </Text>
            </View>
            <Switch
              value={trialReminderOn}
              onValueChange={toggleTrialReminder}
              trackColor={{ true: colors.primary }}
            />
          </View>
        )}

        {/* CTA */}
        {purchasing ? (
          <View style={s.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[{ color: colors.textSecondary, marginLeft: 10, fontSize: fontSize.md }]}>
              {t('paywall.processing')}
            </Text>
          </View>
        ) : (
          <Button
            title={isPro ? t('paywall.ctaDone') : t('paywall.ctaTrial')}
            onPress={handlePurchase}
            size="lg"
            style={{ marginTop: spacing.xl }}
            disabled={billingLoading || (!isPro && !isBillingAvailable)}
          />
        )}

        {!isPro && !purchasing && (
          <Text style={[s.trialNote, { color: colors.textSecondary }]}>
            {t('paywall.trialNote')}
          </Text>
        )}

        {!isPro && (
          <Pressable onPress={handleRestore} style={s.restoreBtn} disabled={purchasing || billingLoading || !isBillingAvailable}>
            <Text style={[s.restoreText, { color: colors.textSecondary }]}>{t('paywall.restore')}</Text>
          </Pressable>
        )}

        <Text style={[s.legal, { color: colors.textDisabled }]}>
          {t('paywall.legal')}
        </Text>
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
    closeBtn: {
      position: 'absolute',
      top: 52,
      right: spacing.xl,
      zIndex: 10,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 40, paddingTop: spacing.xl },
    hero: { alignItems: 'center', paddingVertical: spacing['2xl'] },
    heroEmoji: { fontSize: 64, marginBottom: spacing.lg },
    heroTitle: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.bold,
      textAlign: 'center',
      lineHeight: 34,
      marginBottom: spacing.md,
    },
    heroSub: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
    careFreeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      marginBottom: spacing.xl,
    },
    careFreeIcon: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    careFreeTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: 2 },
    careFreeDesc: { fontSize: fontSize.sm, lineHeight: 19 },
    comparisonCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: spacing.xl,
    },
    comparisonTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    comparisonSub: { fontSize: fontSize.sm, lineHeight: 20, paddingHorizontal: spacing.lg, marginTop: spacing.xs, marginBottom: spacing.md },
    comparisonHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1 },
    comparisonHeaderLabel: { flex: 1, fontSize: 11, fontWeight: fontWeight.semibold, letterSpacing: 0.6 },
    comparisonHeaderValue: { width: 42, textAlign: 'center', fontSize: 11, fontWeight: fontWeight.semibold, letterSpacing: 0.4 },
    comparisonRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
    comparisonLabel: { flex: 1, fontSize: fontSize.sm, lineHeight: 19 },
    contextCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.xl },
    contextEmoji: { fontSize: 28 },
    contextTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    contextDesc: { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs },
    promiseCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.lg,
      marginBottom: spacing.xl,
    },
    promiseTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    promiseSub: { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs, marginBottom: spacing.md },
    promiseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    promiseEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
    promiseText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
    featuresCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: spacing.xl,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    featureIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: { flex: 1, fontSize: fontSize.md },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: spacing.md,
    },
    plansRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    planCard: {
      flex: 1,
      borderRadius: radii.lg,
      padding: spacing.lg,
      alignItems: 'center',
      overflow: 'hidden',
    },
    popularBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      marginBottom: spacing.sm,
    },
    popularText: { fontSize: 11, fontWeight: fontWeight.bold },
    planLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    planPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
    planSub: { fontSize: fontSize.xs, marginTop: 4, textAlign: 'center' },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xl,
      height: 50,
    },
    trialNote: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.md },
    restoreBtn: { alignItems: 'center', padding: spacing.lg, marginTop: spacing.sm },
    restoreText: { fontSize: fontSize.sm },
    legal: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: spacing.lg },
    trialSwitchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginTop: spacing.md,
    },
    trialSwitchTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    trialSwitchDesc: { fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
  });
