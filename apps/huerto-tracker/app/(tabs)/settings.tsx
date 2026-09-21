import { useOnboarding } from '@portfolio/shared';
import { useSession, signOut, deleteAccount, deleteAllForUser } from '@portfolio/supabase';
import { cancelAllReminders } from '@portfolio/notifications';
import { useColors, useTheme, Card, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePro as usePurchases } from '../../src/hooks/usePro';
import { useCustomCrops } from '../../src/hooks/useCustomCrops';
import type { CostEntry } from '../../src/models/cost-entry';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CLIMATE_ZONE_CONFIG } from '../../src/data/zones';
import type { Garden } from '../../src/models/garden';
import type { Plant } from '../../src/models/plant';
import type { DiaryEntry } from '../../src/models/diary-entry';
import type { GardenReminder } from '../../src/models/reminder';
import { saveLanguage, SUPPORTED_LANGS, LANG_LABELS, type SupportedLang } from '../../src/i18n';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { useThemePreference, type ThemePreference } from '../../src/hooks/useThemePreference';
import { CollectionError } from '../../src/components/CollectionError';
import { syncToCloud } from '../../src/sync/syncAll';
import { resetAnalyticsUser, track, EVENTS } from '../../src/analytics';

// The production URL is filled after App Store Connect assigns the app ID.
// Never ship a placeholder URL: Linking.openURL rejects it on iOS.
const APP_STORE_URL = '';
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
  const { collection: customCropsCollection } = useCustomCrops();
  const costEntriesCollection = useCollection<CostEntry>('cost_entries');

  const { activeGarden: garden } = useActiveGarden();
  const zoneConfig = garden ? CLIMATE_ZONE_CONFIG[garden.climateZone] : null;
  const [showLangModal, setShowLangModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const [highContrast, setHighContrast] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem('@portfolio/settings/high_contrast'),
      AsyncStorage.getItem('@portfolio/settings/haptics'),
    ]).then(([contrast, haptics]) => {
      setHighContrast(contrast === 'true');
      if (haptics !== null) setHapticsEnabled(haptics !== 'false');
    }).catch(() => {});
  }, []);

  async function updateHighContrast(value: boolean) {
    setHighContrast(value);
    await AsyncStorage.setItem('@portfolio/settings/high_contrast', String(value));
  }

  async function updateHaptics(value: boolean) {
    setHapticsEnabled(value);
    await AsyncStorage.setItem('@portfolio/settings/haptics', String(value));
  }

  function openSystemSettings(permission: string) {
    if (Platform.OS === 'web') {
      Alert.alert('Permisos del sistema', `Gestiona el permiso de ${permission} desde los ajustes del dispositivo.`);
      return;
    }
    void Linking.openSettings().catch(() => Alert.alert('Permisos del sistema', 'No se han podido abrir los ajustes del dispositivo.'));
  }

  function openAppStore() {
    if (!APP_STORE_URL) {
      Alert.alert('Próximamente', 'La ficha de Semilla en App Store estará disponible cuando se publique la aplicación.');
      return;
    }
    void Linking.openURL(APP_STORE_URL).catch(() => Alert.alert('No disponible', 'No se ha podido abrir App Store.'));
  }

  useFocusEffect(useCallback(() => { void gardens.refresh().catch(() => {}); }, []));

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  // Wipe every local store + scheduled notifications (+ onboarding flag unless
  // keepOnboarding). Used by sign-out, data wipe and account deletion.
  async function clearLocalData(opts?: { keepOnboarding?: boolean }) {
    await Promise.all([
      plants.removeMany(plants.items.map((p) => p.id)),
      entries.removeMany(entries.items.map((e) => e.id)),
      reminders.removeMany(reminders.items.map((r) => r.id)),
      customCropsCollection.removeMany(customCropsCollection.items.map((c) => c.id)),
      costEntriesCollection.removeMany(costEntriesCollection.items.map((c) => c.id)),
      gardens.removeMany(gardens.items.map((g) => g.id)),
    ]);

    // Hard-clear every @portfolio/ key (covers soft-delete tombstones,
    // layouts and any future keys without needing to update this list).
    const allKeys = await AsyncStorage.getAllKeys();
    const portfolioKeys = allKeys.filter((k) => k.startsWith('@portfolio/'));
    if (portfolioKeys.length > 0) await AsyncStorage.multiRemove(portfolioKeys);

    await cancelAllReminders();
    if (!opts?.keepOnboarding) await resetOnboarding();
  }

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
            try {
              // Delete all user data from Supabase by user_id (covers unsynced rows too)
              if (!isGuest && user?.id) {
                await Promise.allSettled([
                  deleteAllForUser('diary_entries', user.id),
                  deleteAllForUser('reminders', user.id),
                  deleteAllForUser('plants', user.id),
                  deleteAllForUser('cost_entries', user.id),
                  deleteAllForUser('custom_crops', user.id),
                  deleteAllForUser('garden_layouts', user.id),
                  deleteAllForUser('user_profiles', user.id),
                  // gardens last: cascade deletes garden_layouts
                  deleteAllForUser('gardens', user.id),
                ]);
              }

              await clearLocalData();

              // Sign out to prevent syncFromCloud restoring Supabase data.
              // Even if signOut rejects (network blip), local data is already wiped,
              // so the next launch will surface the auth screen via useSession.
              try {
                if (!isGuest) await signOut();
              } catch (signOutErr) {
                console.warn('[settings] signOut after deleteAllData failed:', signOutErr);
              }

              router.replace('/onboarding');
            } catch (e) {
              Alert.alert(t('common.error'), t('settings.data.deleteError'));
            }
          },
        },
      ]
    );
  }

  function handleDeleteAccount() {
    // Two-step confirm: account deletion is irreversible (Apple 5.1.1(v)).
    Alert.alert(
      t('settings.account.deleteAccountTitle'),
      t('settings.account.deleteAccountDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.account.deleteAccountConfirm'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.account.deleteAccountFinalTitle'),
              t('settings.account.deleteAccountFinalDesc'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.account.deleteAccountConfirm'),
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      // Server deletes the auth user; DB cascade wipes all cloud data.
                      try {
                        await deleteAccount();
                      } catch {
                        Alert.alert(t('settings.account.deleteAccountError'));
                        return;
                      }
                      await clearLocalData();
                      track(EVENTS.accountDeleted);
                      resetAnalyticsUser();
                      await signOut().catch(() => {});
                      router.replace('/welcome');
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  if (process.env.EXPO_PUBLIC_STITCH_CLONE !== 'false') {
    const stitchAppearance = themePreference === 'light' ? 'Claro' : themePreference === 'dark' ? 'Oscuro' : 'Sistema';
    return <StitchSettingsScreen colors={colors} router={router} appearance={stitchAppearance} onAppearanceChange={(value) => { void setThemePreference(value === 'Claro' ? 'light' : value === 'Oscuro' ? 'dark' : 'system'); }} onDeleteAccount={handleDeleteAccount} onDeleteData={deleteAllData} onExport={() => void Share.share({ message: `Resumen de Semilla: ${gardens.items.length} huertos, ${plants.items.length} plantas y ${entries.items.length} anotaciones.` }).catch(() => Alert.alert('Exportar bitácora', 'No se ha podido abrir el menú de compartir.'))} />;
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {(gardens.loading || plants.loading || entries.loading || reminders.loading || costEntriesCollection.loading) &&
          gardens.items.length === 0 && plants.items.length === 0 && entries.items.length === 0 && reminders.items.length === 0 && costEntriesCollection.items.length === 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md }} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.loading')}</Text>
          </View>
        )}
        {(gardens.error || plants.error || entries.error || reminders.error || costEntriesCollection.error) && (
          <View style={{ marginBottom: spacing.md }}>
            <CollectionError onRetry={() => Promise.all([
              gardens.refresh(),
              plants.refresh(),
              entries.refresh(),
              reminders.refresh(),
              costEntriesCollection.refresh(),
            ]).catch(() => {})} />
          </View>
        )}
        <Text style={[s.pageTitle, { color: colors.text }]}>{t('settings.title')}</Text>

        <View style={[s.settingsHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.settingsHeroTop}>
            <View style={[s.settingsAvatar, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person" size={24} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingsHeroTitle, { color: colors.text }]}>{isGuest ? t('settings.account.guestTitle') : (user?.email ?? t('settings.account.email'))}</Text>
              <Text style={[s.settingsHeroSubtitle, { color: colors.textSecondary }]}>{t('settings.heroSubtitle', { defaultValue: 'Tu espacio de cultivo y tus preferencias' })}</Text>
              <View style={[s.settingsPlanBadge, { backgroundColor: isPro ? colors.primary + '18' : colors.surfaceAlt, borderColor: isPro ? colors.primary : colors.border }]}>
                <Ionicons name={isPro ? 'sparkles-outline' : 'leaf-outline'} size={13} color={isPro ? colors.primary : colors.textSecondary} />
                <Text style={{ color: isPro ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: fontWeight.bold }}>{isPro ? t('settings.subscription.proPlan') : t('settings.subscription.freePlan')}</Text>
              </View>
            </View>
          </View>
          <View style={[s.settingsHeroGarden, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.settingsHeroGardenName, { color: colors.text }]}>{garden?.name ?? t('home.defaultGardenName')}</Text>
              <Text style={[s.settingsHeroGardenMeta, { color: colors.textSecondary }]}>
                {[garden?.province, zoneConfig?.label, 'L · cm · °C'].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.textDisabled} />
          </View>
        </View>

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
                    {
                      text: t('settings.account.signOut'),
                      style: 'destructive',
                      onPress: async () => {
                        // Push any unsynced changes while the session is still
                        // valid, then wipe local data so the next account on this
                        // device doesn't see the previous user's plants/gardens.
                        if (user?.id) {
                          const synced = await syncToCloud(user.id);
                          if (!synced) {
                            Alert.alert(
                              t('common.error'),
                              t('settings.account.syncIncomplete', {
                                defaultValue: 'No se han podido sincronizar todos tus datos. Mantendremos la sesión abierta para que puedas intentarlo de nuevo.',
                              }),
                            );
                            return;
                          }
                        }
                        await clearLocalData({ keepOnboarding: true });
                        await signOut().catch(() => {});
                        resetAnalyticsUser();
                        router.replace('/welcome');
                      },
                    },
                  ]);
                }}
                destructive
              />
              <Separator colors={colors} />
              <RowAction
                icon="trash-outline"
                label={t('settings.account.deleteAccount')}
                colors={colors}
                s={s}
                onPress={handleDeleteAccount}
                destructive
                loading={isDeleting}
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
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <Text style={[s.freeBadgeText, { color: isPro ? colors.primaryDark : colors.textSecondary }]}>
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
                onPress={() => router.push('/paywall?source=settings' as any)}
              />
            )}
          </View>
        </Card>


        {/* ── Experiencia ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Experiencia y accesibilidad</Text>
        <Card padded style={s.card}>
          <Text style={[s.rowTitle, { color: colors.text }]}>Apariencia</Text>
          <Text style={[s.rowSub, { color: colors.textSecondary }]}>Elige cómo se ve Semilla en este dispositivo.</Text>
          <View style={[s.appearanceSegment, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            {([
              ['light', 'Claro', 'sunny-outline'],
              ['dark', 'Oscuro', 'moon-outline'],
              ['system', 'Sistema', 'phone-portrait-outline'],
            ] as Array<[ThemePreference, string, string]>).map(([value, label, icon]) => {
              const selected = themePreference === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => { void setThemePreference(value); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[s.appearanceOption, selected && { backgroundColor: colors.surface, borderColor: colors.primary }]}
                >
                  <Ionicons name={icon as never} size={15} color={selected ? colors.primary : colors.textSecondary} />
                  <Text style={[s.appearanceOptionText, { color: selected ? colors.primary : colors.textSecondary }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Separator colors={colors} />
          <View style={s.preferenceRow}>
            <View style={s.preferenceCopy}>
              <Text style={[s.rowLabel, { color: colors.text }]}>Alto contraste</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>Aumenta la legibilidad de textos y controles.</Text>
            </View>
            <Switch value={highContrast} onValueChange={(value) => void updateHighContrast(value)} trackColor={{ true: colors.primary }} thumbColor="#fff" />
          </View>
          <Separator colors={colors} />
          <View style={s.preferenceRow}>
            <View style={s.preferenceCopy}>
              <Text style={[s.rowLabel, { color: colors.text }]}>Respuesta háptica</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>Una señal sutil al completar cuidados.</Text>
            </View>
            <Switch value={hapticsEnabled} onValueChange={(value) => void updateHaptics(value)} trackColor={{ true: colors.primary }} thumbColor="#fff" />
          </View>
        </Card>

        {/* ── Permisos ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Permisos del sistema</Text>
        <Card padded style={s.card}>
          <Text style={[s.rowSub, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Se gestionan en los ajustes de iOS para proteger tu privacidad.</Text>
          <RowAction icon="camera-outline" label="Cámara" colors={colors} s={s} onPress={() => openSystemSettings('la cámara')} />
          <Separator colors={colors} />
          <RowAction icon="images-outline" label="Fotos" colors={colors} s={s} onPress={() => openSystemSettings('las fotos')} />
          <Separator colors={colors} />
          <RowAction icon="notifications-outline" label="Notificaciones" colors={colors} s={s} onPress={() => openSystemSettings('las notificaciones')} />
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
          <Separator colors={colors} />
          <Row icon="information-circle-outline" label={t('settings.app.version')} value={APP_VERSION} colors={colors} s={s} />
          <Separator colors={colors} />
          <RowAction
            icon="star-outline"
            label={t('settings.app.rate')}
            colors={colors}
            s={s}
            onPress={openAppStore}
          />
          <Separator colors={colors} />
          <RowAction
            icon="shield-checkmark-outline"
            label={t('settings.app.privacy')}
            colors={colors}
            s={s}
            onPress={() => Linking.openURL('https://semillaapp.app/privacy-policy.html')}
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

function StitchSettingsScreen({ colors, router, appearance, onAppearanceChange, onDeleteAccount, onDeleteData, onExport }: { colors: ReturnType<typeof useColors>; router: ReturnType<typeof useRouter>; appearance: 'Claro' | 'Oscuro' | 'Sistema'; onAppearanceChange: (value: 'Claro' | 'Oscuro' | 'Sistema') => void; onDeleteAccount: () => void; onDeleteData: () => void; onExport: () => void }) {
  const [contrast, setContrast] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const rows = [
    { icon: 'leaf-outline' as const, title: 'Huerto activo', value: 'Balcón Principal Sur (Madrid)', onPress: () => router.push('/gardens' as any) },
    { icon: 'thermometer-outline' as const, title: 'Ubicación meteorológica', value: 'Madrid Centro (AEMET)', onPress: () => Alert.alert('Ubicación meteorológica', 'Usamos Madrid Centro (AEMET) para orientar los avisos de calor, lluvia y riego.') },
    { icon: 'resize-outline' as const, title: 'Unidades de medida', value: 'Métrica (L, cm, °C)', onPress: () => Alert.alert('Unidades de medida', 'Semilla utiliza litros, centímetros y grados Celsius en todo el huerto.') },
  ];
  const showProfileInfo = () => Alert.alert('Perfil', 'La cuenta se gestiona con tu acceso seguro. Puedes cambiar de correo desde la pantalla de inicio de sesión.');
  return <SafeAreaView style={[settingsStitch.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={settingsStitch.content}>
      <View style={[settingsStitch.header, { borderBottomColor: colors.border }]}><Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver a Mi Huerto" style={settingsStitch.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={[settingsStitch.backText, { color: colors.text }]}>Mi Huerto</Text></Pressable><Text style={[settingsStitch.headerTitle, { color: colors.text }]}>Ajustes</Text><Pressable onPress={() => Alert.alert('Sobre Semilla', 'Semilla te acompaña a cuidar un huerto urbano sin adivinar cuándo regar. Versión 1.0.0.')} accessibilityRole="button" accessibilityLabel="Información"><Ionicons name="information-circle-outline" size={22} color={colors.primary} /></Pressable></View>
      <View style={[settingsStitch.profile, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[settingsStitch.avatar, { backgroundColor: colors.primary + '20' }]}><Ionicons name="person" size={26} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[settingsStitch.profileName, { color: colors.text }]}>Carlos García</Text><Text style={[settingsStitch.profileMeta, { color: colors.textSecondary }]}>carlos@huertourbano.es · Jardinero Urbano · Semilla Pro</Text></View><Pressable onPress={showProfileInfo} accessibilityRole="button" accessibilityLabel="Editar perfil"><Ionicons name="create-outline" size={19} color={colors.primary} /></Pressable></View>
      <Text style={[settingsStitch.active, { color: colors.textSecondary }]}>▣  Huerto activo: <Text style={{ color: colors.text, fontWeight: '800' }}>Balcón Principal Sur</Text> · Madrid ☀</Text>
      <Pressable onPress={() => router.push('/mascot-picker' as any)} accessibilityRole="button" accessibilityLabel="Mascota oficial Semillín" style={[settingsStitch.mascotLink, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><View style={[settingsStitch.mascotLinkIcon, { backgroundColor: '#FFE2A0' }]}><Ionicons name="sparkles" size={17} color="#A46300" /></View><View style={{ flex: 1 }}><Text style={[settingsStitch.rowTitle, { color: colors.text }]}>Mascota oficial</Text><Text style={[settingsStitch.rowValue, { color: colors.textSecondary }]}>Semillín · Brote con personalidad</Text></View><Ionicons name="chevron-forward" size={17} color={colors.textDisabled} /></Pressable>
      <SettingsSection title="ESPACIO Y CLIMA" colors={colors}><View style={[settingsStitch.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{rows.map((row, index) => <Pressable key={row.title} onPress={row.onPress} accessibilityRole="button" style={[settingsStitch.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}><Ionicons name={row.icon as any} size={19} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[settingsStitch.rowTitle, { color: colors.text }]}>{row.title}</Text><Text style={[settingsStitch.rowValue, { color: colors.textSecondary }]}>{row.value}</Text></View><Ionicons name="chevron-forward" size={17} color={colors.textDisabled} /></Pressable>)}<View style={settingsStitch.inline}><Ionicons name="hardware-chip-outline" size={18} color={colors.primary} /><Text style={[settingsStitch.rowTitle, { color: colors.text }]}>Sensor templado</Text></View></View></SettingsSection>
      <SettingsSection title="EXPERIENCIA Y ACCESIBILIDAD" colors={colors}><View style={[settingsStitch.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[settingsStitch.rowTitle, { color: colors.text }]}>Paleta de apariencia</Text><View style={[settingsStitch.segment, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>{(['Claro', 'Oscuro', 'Sistema'] as const).map((item) => <Pressable key={item} onPress={() => onAppearanceChange(item)} accessibilityRole="button" style={[settingsStitch.segmentItem, appearance === item && { backgroundColor: colors.primary }]}><Text style={{ color: appearance === item ? '#fff' : colors.textSecondary, fontWeight: '800', fontSize: 12 }}>{item}</Text></Pressable>)}</View><SettingSwitch icon="text-outline" title="Texto grande y contraste" subtitle="Modo exterior sol brillante" value={contrast} onChange={setContrast} colors={colors} /><SettingSwitch icon="phone-portrait-outline" title="Respuesta háptica" subtitle="Confirmación táctil de riego" value={haptics} onChange={setHaptics} colors={colors} /></View></SettingsSection>
      <SettingsSection title="PERMISOS DE IOS" colors={colors}><View style={[settingsStitch.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><PermissionRow icon="camera-outline" title="Cámara" subtitle="Escanear plantas y plagas" status="Permitido" colors={colors} /><PermissionRow icon="images-outline" title="Fotos" subtitle="Evidencia de diario botánico" status="Permitido" colors={colors} /><PermissionRow icon="notifications-outline" title="Notificaciones" subtitle="Alertas matutinas de riego" status="Activadas" colors={colors} /></View></SettingsSection>
      <SettingsSection title="NOTIFICACIONES Y DATOS" colors={colors}><View style={[settingsStitch.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Pressable onPress={() => router.push('/settings/notifications')} style={settingsStitch.row}><Ionicons name="water-outline" size={19} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[settingsStitch.rowTitle, { color: colors.text }]}>Preferencias de avisos y riego</Text><Text style={[settingsStitch.rowValue, { color: colors.textSecondary }]}>Reglas de humedad de sustrato 2cm</Text></View><Ionicons name="chevron-forward" size={17} color={colors.textDisabled} /></Pressable><Pressable onPress={() => router.push('/settings/backup')} style={[settingsStitch.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}><Ionicons name="cloud-done-outline" size={19} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[settingsStitch.rowTitle, { color: colors.text }]}>Copia de seguridad y sincronización</Text><Text style={[settingsStitch.rowValue, { color: colors.textSecondary }]}>Última copia: Hoy 10:30</Text></View><Ionicons name="chevron-forward" size={17} color={colors.textDisabled} /></Pressable><Pressable onPress={onExport} style={[settingsStitch.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}><Ionicons name="share-outline" size={19} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[settingsStitch.rowTitle, { color: colors.text }]}>Exportar cuaderno de bitácora</Text><Text style={[settingsStitch.rowValue, { color: colors.textSecondary }]}>Descargar historial en JSON o CSV</Text></View><Ionicons name="download-outline" size={17} color={colors.textDisabled} /></Pressable></View></SettingsSection>
      <SettingsSection title="ZONA DE PELIGRO" colors={colors}><View style={[settingsStitch.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Pressable onPress={() => router.replace('/welcome')} style={settingsStitch.row}><Ionicons name="log-out-outline" size={19} color={colors.error} /><Text style={[settingsStitch.rowTitle, { color: colors.error, flex: 1 }]}>Cerrar sesión</Text><Ionicons name="chevron-forward" size={17} color={colors.error} /></Pressable><Pressable onPress={onDeleteAccount} style={[settingsStitch.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}><Ionicons name="trash-outline" size={19} color={colors.error} /><View style={{ flex: 1 }}><Text style={[settingsStitch.rowTitle, { color: colors.error }]}>Eliminar cuenta y datos del huerto</Text><Text style={[settingsStitch.rowValue, { color: colors.error }]}>Esta acción no se puede deshacer</Text></View><Ionicons name="chevron-forward" size={17} color={colors.error} /></Pressable><Pressable onPress={onDeleteData} style={settingsStitch.row}><Ionicons name="trash-outline" size={19} color={colors.error} /><Text style={[settingsStitch.rowTitle, { color: colors.error, flex: 1 }]}>Borrar datos locales del huerto</Text><Ionicons name="chevron-forward" size={17} color={colors.error} /></Pressable></View></SettingsSection>
      <Text style={[settingsStitch.footer, { color: colors.textSecondary }]}>Semilla · Cultivado en España{`\n`}Versión 2.4.1 (Build 184) · Huerto Fresco</Text>
    </ScrollView>
  </SafeAreaView>;
}

function SettingsSection({ title, colors, children }: { title: string; colors: ReturnType<typeof useColors>; children: React.ReactNode }) { return <View style={settingsStitch.section}><Text style={[settingsStitch.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>{children}</View>; }
function SettingSwitch({ icon, title, subtitle, value, onChange, colors }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; value: boolean; onChange: (value: boolean) => void; colors: ReturnType<typeof useColors> }) { return <View style={[settingsStitch.switchRow, { borderTopColor: colors.border }]}><Ionicons name={icon} size={19} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[settingsStitch.rowTitle, { color: colors.text }]}>{title}</Text><Text style={[settingsStitch.rowValue, { color: colors.textSecondary }]}>{subtitle}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary + '80' }} thumbColor={value ? colors.primary : colors.surface} /></View>; }
function PermissionRow({ icon, title, subtitle, status, colors }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; status: string; colors: ReturnType<typeof useColors> }) { return <View style={settingsStitch.row}><Ionicons name={icon} size={19} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[settingsStitch.rowTitle, { color: colors.text }]}>{title}</Text><Text style={[settingsStitch.rowValue, { color: colors.textSecondary }]}>{subtitle}</Text></View><Text style={[settingsStitch.status, { color: colors.primary }]}>{status}</Text></View>; }

const settingsStitch = StyleSheet.create({
  container: { flex: 1 }, content: { paddingHorizontal: 18, paddingBottom: 120 }, header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth }, back: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 86, minHeight: 44 }, backText: { fontSize: 14, fontWeight: '700' }, headerTitle: { fontSize: 18, fontWeight: '800' }, profile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginTop: 16, borderRadius: 16, borderWidth: 1 }, avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }, profileName: { fontSize: 17, fontWeight: '800' }, profileMeta: { fontSize: 12, lineHeight: 18, marginTop: 3 }, active: { fontSize: 12, marginTop: 12, marginHorizontal: 4 }, section: { marginTop: 22 }, sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8 }, card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' }, row: { minHeight: 66, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 }, inline: { minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: StyleSheet.hairlineWidth }, rowTitle: { fontSize: 14, fontWeight: '800' }, rowValue: { fontSize: 12, lineHeight: 17, marginTop: 2 }, status: { fontSize: 11, fontWeight: '800' }, segment: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 10, borderWidth: 1, marginTop: 11, marginBottom: 2 }, segmentItem: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, switchRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 11, paddingTop: 11 }, footer: { textAlign: 'center', fontSize: 11, lineHeight: 18, marginVertical: 26 }, mascotLink: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12, borderRadius: 14, borderWidth: 1 }, mascotLinkIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});

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
  icon, label, colors, s, onPress, destructive, badge, loading,
}: {
  icon: string;
  label: string;
  colors: ReturnType<typeof useColors>;
  s: ReturnType<typeof makeStyles>;
  onPress: () => void;
  destructive?: boolean;
  badge?: string;
  loading?: boolean;
}) {
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [s.rowContainer, { opacity: pressed || loading ? 0.6 : 1 }]}
      onPress={loading ? undefined : onPress}
      disabled={loading}
    >
      <Ionicons name={icon as never} size={18} color={destructive ? colors.error : colors.textSecondary} />
      <Text style={[s.rowLabel, { color: destructive ? colors.error : colors.text, flex: 1 }]}>
        {label}
      </Text>
      {badge && (
        <View style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full, marginRight: spacing.xs }}>
          <Text style={{ color: colors.background, fontSize: 10, fontWeight: fontWeight.bold }}>⭐ {badge}</Text>
        </View>
      )}
      {loading
        ? <ActivityIndicator size="small" color={colors.error} />
        : <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />}
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
    settingsHero: { padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, marginBottom: spacing.sm, gap: spacing.md },
    settingsHeroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    settingsAvatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
    settingsHeroTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    settingsHeroSubtitle: { fontSize: fontSize.xs, lineHeight: 17, marginTop: 2 },
    settingsPlanBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full, borderWidth: 1, marginTop: spacing.xs },
    settingsHeroGarden: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1 },
    settingsHeroGardenName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    settingsHeroGardenMeta: { fontSize: fontSize.xs, marginTop: 2 },
    sectionLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
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
    rowTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    rowSub: { fontSize: fontSize.xs, lineHeight: 17, marginTop: 2 },
    appearanceSegment: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, borderRadius: radii.lg, borderWidth: 1, marginTop: spacing.md, marginBottom: spacing.sm },
    appearanceOption: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: radii.md, borderWidth: 1, borderColor: 'transparent' },
    appearanceOptionText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    preferenceCopy: { flex: 1, gap: 2 },
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
      borderRadius: radii.sm,
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
