import { usePurchases, type PlanId } from '@portfolio/billing';
import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { scheduleDateAlert, requestPermissions } from '@portfolio/notifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TRIAL_REMINDER_KEY = '@portfolio/huerto/trial_reminder_enabled';
const TRIAL_REMINDER_NOTIF_ID = '@portfolio/huerto/trial_reminder_notif_id';
const TRIAL_DAYS = 7;

const PRO_FEATURE_KEYS = [
  { emoji: '🏡', key: 'paywall.features.gardens' },
  { emoji: '🌱', key: 'paywall.features.plants' },
  { emoji: '🤖', key: 'paywall.features.aiDiagnosis' },
  { emoji: '💶', key: 'paywall.features.costsRoi' },
  { emoji: '📤', key: 'paywall.features.csvExport' },
  { emoji: '🏆', key: 'paywall.features.gamification' },
  { emoji: '🤝', key: 'paywall.features.companions' },
  { emoji: '📄', key: 'paywall.features.pdf' },
  { emoji: '☁️', key: 'paywall.features.backup' },
];

export default function PaywallScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { isPro, activePlan, purchasing, offerings, purchase, restore } = usePurchases();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('annual');
  const [trialReminderOn, setTrialReminderOn] = useState(true);

  useEffect(() => {
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
          <Text style={s.heroEmoji}>{isPro ? '🏆' : '🌻'}</Text>
          <Text style={[s.heroTitle, { color: colors.text }]}>
            {isPro ? t('paywall.titlePro') : t('paywall.title')}
          </Text>
          <Text style={[s.heroSub, { color: colors.textSecondary }]}>
            {isPro
              ? t('paywall.subtitlePro', { plan: activePlan ?? 'monthly' })
              : t('paywall.subtitle')}
          </Text>
        </View>

        {/* Features */}
        <View style={[s.featuresCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {PRO_FEATURE_KEYS.map((feat, i) => (
            <View
              key={i}
              style={[
                s.featureRow,
                i < PRO_FEATURE_KEYS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              <View style={[s.featureIconBox, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={{ fontSize: 18 }}>{feat.emoji}</Text>
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
            <Text style={{ fontSize: 22 }}>🔔</Text>
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
          />
        )}

        {!isPro && !purchasing && (
          <Text style={[s.trialNote, { color: colors.textSecondary }]}>
            {t('paywall.trialNote')}
          </Text>
        )}

        {!isPro && (
          <Pressable onPress={handleRestore} style={s.restoreBtn} disabled={purchasing}>
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
