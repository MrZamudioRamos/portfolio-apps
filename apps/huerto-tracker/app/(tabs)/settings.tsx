import { useOnboarding } from '@portfolio/shared';
import { useSession, signOut } from '@portfolio/supabase';
import { useColors, useTheme, Card, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { usePro as usePurchases } from '../../src/hooks/usePro';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CLIMATE_ZONE_CONFIG } from '../../src/data/zones';
import type { Garden } from '../../src/models/garden';
import type { Plant } from '../../src/models/plant';
import type { DiaryEntry } from '../../src/models/diary-entry';
import type { GardenReminder } from '../../src/models/reminder';
import { saveLanguage, SUPPORTED_LANGS, LANG_LABELS, type SupportedLang } from '../../src/i18n';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';

// TODO: replace with real App Store URL once published
const APP_STORE_URL = 'https://apps.apple.com/app/id<APP_STORE_ID>';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { reset: resetOnboarding } = useOnboarding('huerto');

  const { t, i18n } = useTranslation();
  const gardens = useCollection<Garden>('gardens');
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const reminders = useCollection<GardenReminder>('reminders');
  const { isPro, activePlan } = usePurchases();
  const { isGuest, user } = useSession();

  const { activeGarden: garden } = useActiveGarden();
  const zoneConfig = garden ? CLIMATE_ZONE_CONFIG[garden.climateZone] : null;
  const [showLangModal, setShowLangModal] = useState(false);

  useFocusEffect(useCallback(() => { gardens.refresh(); }, []));

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function deleteAllData() {
    Alert.alert(
      t('settings.data.deleteTitle'),
      t('settings.data.deleteDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.data.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              ...plants.items.map((p) => plants.remove(p.id)),
              ...entries.items.map((e) => entries.remove(e.id)),
              ...reminders.items.map((r) => reminders.remove(r.id)),
              ...gardens.items.map((g) => gardens.remove(g.id)),
            ]);
            await resetOnboarding();
            router.replace('/onboarding');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <Text style={[s.pageTitle, { color: colors.text }]}>{t('settings.title')}</Text>

        {/* ── Cuenta ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('settings.sections.account')}</Text>
        <Card padded style={s.card}>
          {isGuest ? (
            <View style={s.guestRow}>
              <View style={s.guestInfo}>
                <Text style={[s.guestTitle, { color: colors.text }]}>{t('settings.account.guestTitle')}</Text>
                <Text style={[s.guestDesc, { color: colors.textSecondary }]}>
                  {t('settings.account.guestDesc')}
                </Text>
              </View>
              <Button
                title={t('settings.account.signIn')}
                variant="primary"
                size="sm"
                onPress={() => router.push('/auth' as any)}
              />
            </View>
          ) : (
            <>
              <Row
                icon="person-circle-outline"
                label={t('settings.account.email')}
                value={user?.email ?? '—'}
                colors={colors}
                s={s}
              />
              <Separator colors={colors} />
              <RowAction
                icon="log-out-outline"
                label={t('settings.account.signOut')}
                colors={colors}
                s={s}
                onPress={() => {
                  Alert.alert(t('settings.account.signOutTitle'), t('settings.account.signOutDesc'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('settings.account.signOut'), style: 'destructive', onPress: () => signOut() },
                  ]);
                }}
                destructive
              />
            </>
          )}
        </Card>

        {/* ── Mi huerto ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('settings.sections.garden')}</Text>
        <Card padded style={s.card}>
          <Row
            icon="leaf-outline"
            label={t('settings.garden.name')}
            value={garden?.name ?? '—'}
            colors={colors}
            s={s}
          />
          <Separator colors={colors} />
          <Row
            icon="location-outline"
            label={t('settings.garden.province')}
            value={garden?.province ?? '—'}
            colors={colors}
            s={s}
          />
          <Separator colors={colors} />
          <Row
            icon="cloud-outline"
            label={t('settings.garden.climateZone')}
            value={zoneConfig ? `${zoneConfig.emoji} ${zoneConfig.label}` : '—'}
            colors={colors}
            s={s}
          />
          <Separator colors={colors} />
          <RowAction
            icon="map-outline"
            label={t('settings.garden.map')}
            colors={colors}
            s={s}
            onPress={() => router.push('/garden/map')}
          />
          <Separator colors={colors} />
          <RowAction
            icon="create-outline"
            label={t('settings.garden.edit')}
            colors={colors}
            s={s}
            onPress={() => router.push('/garden/edit')}
          />
          <Separator colors={colors} />
          <RowAction
            icon="swap-horizontal-outline"
            label={t('settings.garden.manageGardens')}
            colors={colors}
            s={s}
            onPress={() => router.push('/gardens' as any)}
          />
        </Card>

        {/* ── Suscripción ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('settings.sections.subscription')}</Text>
        <Card padded style={s.card}>
          <View style={s.proRow}>
            <View style={s.proInfo}>
              <View
                style={[
                  s.freeBadge,
                  isPro
                    ? { backgroundColor: colors.primary + '18', borderColor: colors.primary }
                    : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <Text style={[s.freeBadgeText, { color: isPro ? colors.primary : colors.textSecondary }]}>
                  {isPro ? t('settings.subscription.proPlan') : t('settings.subscription.freePlan')}
                </Text>
              </View>
              <Text style={[s.proDesc, { color: colors.textSecondary }]}>
                {isPro
                  ? t(activePlan === 'annual' ? 'settings.subscription.activeAnnual' : 'settings.subscription.activeMonthly')
                  : t('settings.subscription.freeLimit')}
              </Text>
            </View>
            {!isPro && (
              <Button
                title={t('settings.subscription.viewPlans')}
                variant="primary"
                size="sm"
                onPress={() => router.push('/paywall')}
              />
            )}
          </View>
        </Card>

        {/* ── Herramientas ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('settings.sections.tools')}</Text>
        <Card padded style={s.card}>
          <RowAction
            icon="git-network-outline"
            label={t('settings.tools.companions')}
            badge={isPro ? undefined : 'Pro'}
            colors={colors}
            s={s}
            onPress={() => router.push('/companions')}
          />
          <Separator colors={colors} />
          <RowAction
            icon="bar-chart-outline"
            label={t('settings.tools.stats')}
            colors={colors}
            s={s}
            badge={isPro ? undefined : 'Pro parcial'}
            onPress={() => router.push('/stats')}
          />
          <Separator colors={colors} />
          <RowAction
            icon="cash-outline"
            label={t('costs.title')}
            colors={colors}
            s={s}
            badge={isPro ? undefined : 'Pro'}
            onPress={() => router.push('/costs' as any)}
          />
          <Separator colors={colors} />
          <RowAction
            icon="bug-outline"
            label={t('settings.tools.diseaseGuide')}
            colors={colors}
            s={s}
            onPress={() => router.push('/disease-guide' as any)}
          />
          <Separator colors={colors} />
          <RowAction
            icon="refresh-circle-outline"
            label={t('settings.rotation')}
            colors={colors}
            s={s}
            onPress={() => router.push('/rotation' as any)}
          />
        </Card>

        {/* ── Estadísticas ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('settings.sections.summary')}</Text>
        <Card padded style={s.card}>
          <Row icon="leaf-outline" label={t('settings.summary.activePlants')} value={String(plants.count)} colors={colors} s={s} />
          <Separator colors={colors} />
          <Row icon="journal-outline" label={t('settings.summary.diaryEntries')} value={String(entries.count)} colors={colors} s={s} />
          <Separator colors={colors} />
          <Row icon="notifications-outline" label={t('settings.summary.reminders')} value={String(reminders.count)} colors={colors} s={s} />
        </Card>

        {/* ── Idioma ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('settings.sections.language')}</Text>
        <Card padded style={s.card}>
          <Pressable
            style={({ pressed }) => [s.rowContainer, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => setShowLangModal(true)}
          >
            <Ionicons name="language-outline" size={18} color={colors.textSecondary} />
            <Text style={[s.rowLabel, { color: colors.text }]}>{t('settings.sections.language')}</Text>
            <Text style={[s.rowValue, { color: colors.textSecondary }]}>
              {LANG_LABELS[i18n.language as SupportedLang] ?? i18n.language}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
          </Pressable>
        </Card>

        {/* Language modal */}
        <Modal visible={showLangModal} transparent animationType="fade">
          <Pressable style={s.langModalOverlay} onPress={() => setShowLangModal(false)}>
            <Pressable style={[s.langModalSheet, { backgroundColor: glassAvailable ? 'transparent' : colors.surface, borderColor: glassAvailable ? 'transparent' : colors.border }]} onPress={() => {}}>
                {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
              <Text style={[s.langModalTitle, { color: colors.text }]}>{t('settings.sections.language')}</Text>
              {SUPPORTED_LANGS.map((lang, idx) => {
                const active = i18n.language === lang;
                return (
                  <Pressable
                    key={lang}
                    onPress={() => { saveLanguage(lang as SupportedLang); setShowLangModal(false); }}
                    style={[
                      s.langOption,
                      {
                        borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: colors.border,
                        backgroundColor: active ? colors.primary + '11' : 'transparent',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.langOptionLabel, { color: colors.text }]}>
                        {LANG_LABELS[lang as SupportedLang]}
                      </Text>
                      <Text style={[s.langOptionCode, { color: colors.textSecondary }]}>
                        {lang.toUpperCase()}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Notificaciones ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('settings.sections.notifications')}</Text>
        <Card padded style={s.card}>
          <RowAction
            icon="notifications-outline"
            label={t('settings.notifications.seasonal')}
            colors={colors}
            s={s}
            onPress={() => router.push('/settings/notifications')}
          />
        </Card>

        {/* ── Datos ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('settings.sections.data')}</Text>
        <Card padded style={s.card}>
          <RowAction
            icon="cloud-upload-outline"
            label={t('settings.data.backup')}
            colors={colors}
            s={s}
            onPress={() => router.push('/settings/backup')}
          />
          <Separator colors={colors} />
          <RowAction
            icon="trash-outline"
            label={t('settings.data.deleteAll')}
            colors={colors}
            s={s}
            onPress={deleteAllData}
            destructive
          />
        </Card>

        {/* ── App ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('settings.sections.app')}</Text>
        <Card padded style={s.card}>
          <Row icon="information-circle-outline" label={t('settings.app.version')} value={APP_VERSION} colors={colors} s={s} />
          <Separator colors={colors} />
          <RowAction
            icon="star-outline"
            label={t('settings.app.rate')}
            colors={colors}
            s={s}
            onPress={() => Linking.openURL(APP_STORE_URL)}
          />
          <Separator colors={colors} />
          <RowAction
            icon="shield-checkmark-outline"
            label={t('settings.app.privacy')}
            colors={colors}
            s={s}
            onPress={() => Linking.openURL('https://mrzamudioramos.github.io/huerto-tracker/privacy-policy.html')}
          />
          <Separator colors={colors} />
          <RowAction
            icon="mail-outline"
            label={t('settings.app.contact')}
            colors={colors}
            s={s}
            onPress={() => Linking.openURL('mailto:rikkardo22@gmail.com')}
          />
        </Card>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon, label, value, colors, s,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.rowContainer}>
      <Ionicons name={icon as never} size={18} color={colors.textSecondary} />
      <Text style={[s.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[s.rowValue, { color: colors.textSecondary }]}>{value}</Text>
    </View>
  );
}

function RowAction({
  icon, label, colors, s, onPress, destructive, badge,
}: {
  icon: string;
  label: string;
  colors: ReturnType<typeof useColors>;
  s: ReturnType<typeof makeStyles>;
  onPress: () => void;
  destructive?: boolean;
  badge?: string;
}) {
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  return (
    <Pressable style={({ pressed }) => [s.rowContainer, { opacity: pressed ? 0.6 : 1 }]} onPress={onPress}>
      <Ionicons name={icon as never} size={18} color={destructive ? colors.error : colors.textSecondary} />
      <Text style={[s.rowLabel, { color: destructive ? colors.error : colors.text, flex: 1 }]}>
        {label}
      </Text>
      {badge && (
        <View style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full, marginRight: spacing.xs }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: fontWeight.bold }}>⭐ {badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
    </Pressable>
  );
}

function Separator({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 2 }} />;
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
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
    pageTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, marginTop: spacing.lg, marginBottom: spacing.xl },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
      marginTop: spacing.xl,
    },
    card: { gap: spacing.xs },
    rowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.md,
    },
    rowLabel: { flex: 1, fontSize: fontSize.md },
    rowValue: { fontSize: fontSize.md },
    guestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    guestInfo: { flex: 1, gap: 2 },
    guestTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    guestDesc: { fontSize: fontSize.xs, lineHeight: 16 },
    proRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    proInfo: { gap: 4 },
    freeBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    freeBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    proDesc: { fontSize: fontSize.xs },
    langModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    langModalSheet: {
      width: '100%',
      borderRadius: radii.xl,
      borderWidth: 1,
      overflow: 'hidden',
    },
    langModalTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      textAlign: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
    langOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    langOptionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    langOptionCode: { fontSize: fontSize.xs, marginTop: 1 },
  });
