import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollection } from '@portfolio/storage';
import { CollectionError } from '../../src/components/CollectionError';
import { CLIMATE_ZONE_CONFIG } from '../../src/data/zones';
import { useSeasonalAlerts } from '../../src/hooks/useSeasonalAlerts';
import { useFrostAlert } from '../../src/hooks/useFrostAlert';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { usePlantNotifications } from '../../src/hooks/usePlantNotifications';
import type { GardenReminder } from '../../src/models/reminder';
import { REMINDER_TYPE_CONFIG } from '../../src/models/reminder';

type SmartNotificationPreference = 'morningCheck' | 'heatWave' | 'wind' | 'weeklySummary' | 'quietHours';

type SmartNotificationPreferences = Record<SmartNotificationPreference, boolean>;

const SMART_NOTIFICATION_DEFAULTS: SmartNotificationPreferences = {
  morningCheck: true,
  heatWave: true,
  wind: false,
  weeklySummary: true,
  quietHours: true,
};

const SMART_NOTIFICATION_KEYS: Record<SmartNotificationPreference, string> = {
  morningCheck: '@huerto/notifications/morning-check',
  heatWave: '@huerto/notifications/heat-wave',
  wind: '@huerto/notifications/wind',
  weeklySummary: '@huerto/notifications/weekly-summary',
  quietHours: '@huerto/notifications/quiet-hours',
};

export default function NotificationsSettingsScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { enabled, loading, toggle, nextPreview, zone } = useSeasonalAlerts();
  const { activeGarden } = useActiveGarden();
  const reminders = useCollection<GardenReminder>('reminders');
  const { enabled: frostEnabled, loading: frostLoading, toggle: toggleFrost } = useFrostAlert(activeGarden?.province);
  const plantNotifs = usePlantNotifications();
  const [smartPreferences, setSmartPreferences] = useState<SmartNotificationPreferences>(SMART_NOTIFICATION_DEFAULTS);

  useEffect(() => {
    let mounted = true;
    void Promise.all(
      (Object.keys(SMART_NOTIFICATION_KEYS) as SmartNotificationPreference[]).map(async (preference) => [
        preference,
        await AsyncStorage.getItem(SMART_NOTIFICATION_KEYS[preference]),
      ] as const)
    ).then((entries) => {
      if (!mounted) return;
      setSmartPreferences((current) => {
        const next = { ...current };
        entries.forEach(([preference, value]) => {
          if (value !== null) next[preference] = value === 'true';
        });
        return next;
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const updateSmartPreference = async (preference: SmartNotificationPreference, value: boolean) => {
    setSmartPreferences((current) => ({ ...current, [preference]: value }));
    await AsyncStorage.setItem(SMART_NOTIFICATION_KEYS[preference], String(value));
  };

  const zoneConfig = zone ? CLIMATE_ZONE_CONFIG[zone] : null;
  const gardenReminders = useMemo(
    () => reminders.items.filter((reminder) => !activeGarden?.id || reminder.gardenId === activeGarden.id),
    [reminders.items, activeGarden?.id]
  );

  const { t } = useTranslation();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (process.env.EXPO_PUBLIC_STITCH_CLONE !== 'false') {
    return <StitchNotificationsScreen colors={colors} onBack={() => router.back()} />;
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('notifications.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <Card padded style={{ ...s.card, borderColor: colors.primary + '55', backgroundColor: colors.primary + '0d' }}>
          <View style={s.toggleRow}>
            <View style={[s.iconBox, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>{t('absence.openTitle')}</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>{t('absence.openDesc')}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('absence.openCta')} onPress={() => router.push('/absence' as any)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs }}>
              <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            </Pressable>
          </View>
        </Card>

        <View style={[s.preventiveBanner, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '55' }]}>
          <View style={[s.preventiveIcon, { backgroundColor: colors.accent + '2b' }]}>
            <Ionicons name="finger-print-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.rowTitle, { color: colors.text }]}>
              {t('notifications.preventiveTitle', { defaultValue: 'Cuidado preventivo' })}
            </Text>
            <Text style={[s.rowSub, { color: colors.textSecondary }]}>
              {t('notifications.preventiveDesc', {
                defaultValue: 'Nunca riegues a ciegas: comprueba siempre la humedad a 2 cm de profundidad.',
              })}
            </Text>
          </View>
        </View>

        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
          {t('notifications.smartLabel', { defaultValue: 'Avisos inteligentes' })}
        </Text>
        <Card padded style={s.card}>
          {[
            {
              key: 'morningCheck' as const,
              icon: 'finger-print-outline' as const,
              title: t('notifications.morningCheckTitle', { defaultValue: 'Comprobar sustrato · 09:00' }),
              desc: t('notifications.morningCheckDesc', {
                defaultValue: 'Recordatorio condicional para tocar el sustrato antes de regar.',
              }),
            },
            {
              key: 'heatWave' as const,
              icon: 'sunny-outline' as const,
              title: t('notifications.heatWaveTitle', { defaultValue: 'Ola de calor · >32 °C' }),
              desc: t('notifications.heatWaveDesc', { defaultValue: 'Revisa las macetas y el ritmo de evaporación.' }),
            },
            {
              key: 'wind' as const,
              icon: 'flag-outline' as const,
              title: t('notifications.windTitle', { defaultValue: 'Rachas de viento' }),
              desc: t('notifications.windDesc', { defaultValue: 'Protege los cultivos sensibles y los semilleros.' }),
            },
            {
              key: 'weeklySummary' as const,
              icon: 'calendar-outline' as const,
              title: t('notifications.weeklySummaryTitle', { defaultValue: 'Resumen semanal · domingo' }),
              desc: t('notifications.weeklySummaryDesc', { defaultValue: 'Un repaso breve del estado de tu huerto.' }),
            },
            {
              key: 'quietHours' as const,
              icon: 'moon-outline' as const,
              title: t('notifications.quietHoursTitle', { defaultValue: 'Silencio nocturno · 22:00–08:00' }),
              desc: t('notifications.quietHoursDesc', { defaultValue: 'No recibirás avisos durante las horas de descanso.' }),
            },
          ].map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
              <View style={s.preferenceRow}>
                <View style={[s.preferenceIcon, { backgroundColor: colors.primary + '14' }]}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[s.rowSub, { color: colors.textSecondary }]}>{item.desc}</Text>
                </View>
                <Switch
                  value={smartPreferences[item.key]}
                  onValueChange={(value) => void updateSmartPreference(item.key, value)}
                  accessibilityLabel={item.title}
                  accessibilityHint={item.desc}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </React.Fragment>
          ))}
        </Card>

        {/* Seasonal alerts toggle */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('notifications.seasonalLabel')}</Text>
        <Card padded style={s.card}>
          <View style={s.toggleRow}>
            <View style={[s.iconBox, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>
                {t('notifications.sowingReminders')}
              </Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                {t('notifications.sowingRemindersDesc')}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggle}
              disabled={loading}
              accessibilityLabel={t('notifications.sowingReminders')}
              accessibilityHint={t('notifications.sowingRemindersDesc')}
              trackColor={{ true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {zoneConfig && (
            <>
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <View style={s.zoneRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={[s.rowSub, { color: colors.textSecondary, flex: 1 }]}>
                  {t('notifications.basedOnZone')}{' '}
                  <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>
                    {zoneConfig.emoji} {zoneConfig.label}
                  </Text>
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* Frost alerts toggle */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('notifications.frostLabel')}</Text>
        <Card padded style={s.card}>
          <View style={s.toggleRow}>
            <View style={[s.iconBox, { backgroundColor: '#29B6F618' }]}>
              <Ionicons name="thermometer-outline" size={20} color="#29B6F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>
                {t('notifications.frostAlerts')}
              </Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                {t('notifications.frostAlertsDesc')}
              </Text>
            </View>
            <Switch
              value={frostEnabled}
              onValueChange={toggleFrost}
              disabled={frostLoading}
              accessibilityLabel={t('notifications.frostAlerts')}
              accessibilityHint={t('notifications.frostAlertsDesc')}
              trackColor={{ true: '#29B6F6' }}
              thumbColor="#fff"
            />
          </View>
          {!activeGarden?.province && (
            <>
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                {t('notifications.frostNoProvince')}
              </Text>
            </>
          )}
        </Card>

        {/* Next alert preview */}
        {enabled && nextPreview && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('notifications.nextAlertLabel')}</Text>
            <Card padded style={s.card}>
              <View style={s.previewHeader}>
                <View style={[s.iconBox, { backgroundColor: '#4CAF5018' }]}>
                  <Ionicons name="notifications-outline" size={20} color="#4CAF50" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: colors.text }]}>
                    {t('notifications.nextAlertDate', { month: nextPreview.monthLabel })}
                  </Text>
                  <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                    {t('notifications.nextAlertCrops', { count: nextPreview.total })}
                  </Text>
                </View>
              </View>
              <View style={[s.cropChipsRow, { marginTop: spacing.md }]}>
                {nextPreview.crops.map((c) => (
                  <View
                    key={c.id}
                    style={[s.cropChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  >
                    <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
                    <Text style={[s.cropChipText, { color: colors.text }]}>{c.name}</Text>
                  </View>
                ))}
                {nextPreview.total > 4 && (
                  <View style={[s.cropChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <Text style={[s.cropChipText, { color: colors.textSecondary }]}>
                      +{nextPreview.total - 4} {t('common.more')}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </>
        )}

        {/* Plant-level notifications */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('notifications.plantLabel')}</Text>
        <Card padded style={s.card}>
          {/* Transplant */}
          <View style={s.toggleRow}>
            <View style={[s.iconBox, { backgroundColor: '#4CAF5018' }]}>
              <Ionicons name="flower-outline" size={20} color="#4CAF50" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>{t('notifications.transplantTitle')}</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                {plantNotifs.counts.transplant > 0
                  ? t('notifications.plantCount', { count: plantNotifs.counts.transplant })
                  : t('notifications.transplantDesc')}
              </Text>
            </View>
            <Switch
              value={plantNotifs.enabled.transplant}
              onValueChange={(v) => plantNotifs.toggle('transplant', v)}
              disabled={plantNotifs.loading}
              accessibilityLabel={t('notifications.transplantTitle')}
              accessibilityHint={t('notifications.transplantDesc')}
              trackColor={{ true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Harvest */}
          <View style={s.toggleRow}>
            <View style={[s.iconBox, { backgroundColor: '#FF704318' }]}>
              <Ionicons name="basket-outline" size={20} color="#FF7043" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>{t('notifications.harvestTitle')}</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                {plantNotifs.counts.harvest > 0
                  ? t('notifications.plantCount', { count: plantNotifs.counts.harvest })
                  : t('notifications.harvestDesc')}
              </Text>
            </View>
            <Switch
              value={plantNotifs.enabled.harvest}
              onValueChange={(v) => plantNotifs.toggle('harvest', v)}
              disabled={plantNotifs.loading}
              accessibilityLabel={t('notifications.harvestTitle')}
              accessibilityHint={t('notifications.harvestDesc')}
              trackColor={{ true: '#FF7043' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Treatment clearance */}
          <View style={s.toggleRow}>
            <View style={[s.iconBox, { backgroundColor: '#26C6DA18' }]}>
              <Ionicons name="flask-outline" size={20} color="#26C6DA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: colors.text }]}>{t('notifications.treatmentTitle')}</Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                {plantNotifs.counts.treatment > 0
                  ? t('notifications.plantCount', { count: plantNotifs.counts.treatment })
                  : t('notifications.treatmentDesc')}
              </Text>
            </View>
            <Switch
              value={plantNotifs.enabled.treatment}
              onValueChange={(v) => plantNotifs.toggle('treatment', v)}
              disabled={plantNotifs.loading}
              accessibilityLabel={t('notifications.treatmentTitle')}
              accessibilityHint={t('notifications.treatmentDesc')}
              trackColor={{ true: '#26C6DA' }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('notifications.remindersLabel')}</Text>
        <Card padded style={s.card}>
          {reminders.error ? (
            <CollectionError onRetry={() => reminders.refresh().catch(() => {})} />
          ) : reminders.loading ? (
            <Text style={[s.rowSub, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
          ) : gardenReminders.length === 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>{t('notifications.remindersEmpty')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/reminder/new' as any)}
                style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>{t('notifications.remindersEmptyCta')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {gardenReminders.map((reminder, index) => {
                const config = REMINDER_TYPE_CONFIG[reminder.type];
                const time = `${String(reminder.time.hour).padStart(2, '0')}:${String(reminder.time.minute).padStart(2, '0')}`;
                return (
                  <React.Fragment key={reminder.id}>
                    {index > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${reminder.title}, ${time}`}
                      onPress={() => router.push(`/reminder/edit?id=${reminder.id}` as any)}
                      style={({ pressed }) => [s.reminderRow, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Text style={{ fontSize: 22 }}>{config.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.rowTitle, { color: colors.text }]} numberOfLines={1}>{reminder.title}</Text>
                        <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                          {t('reminderFrequency.' + reminder.frequency)} · {time}
                        </Text>
                      </View>
                      <Text style={{ color: reminder.enabled ? colors.success : colors.textDisabled, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                        {reminder.enabled ? t('plantDetail.active') : t('plantDetail.paused')}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                    </Pressable>
                  </React.Fragment>
                );
              })}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/reminder/new' as any)}
                style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', marginTop: spacing.sm, opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>{t('notifications.remindersEmptyCta')}</Text>
              </Pressable>
            </>
          )}
        </Card>

        {/* How it works */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('notifications.howLabel')}</Text>
        <Card padded style={s.card}>
          {[
            {
              icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
              title: t('notifications.how1Title'),
              desc: t('notifications.how1Desc'),
            },
            {
              icon: 'globe-outline' as keyof typeof Ionicons.glyphMap,
              title: t('notifications.how2Title'),
              desc: t('notifications.how2Desc'),
            },
            {
              icon: 'phone-portrait-outline' as keyof typeof Ionicons.glyphMap,
              title: t('notifications.how3Title'),
              desc: t('notifications.how3Desc'),
            },
          ].map((item, i, arr) => (
            <View key={item.title}>
              {i > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
              <View style={s.howRow}>
                <Ionicons name={item.icon} size={22} color={colors.primary} style={{ width: 32 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[s.rowSub, { color: colors.textSecondary }]}>{item.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </Card>

        {!zone && (
          <View style={[s.warningBox, { backgroundColor: colors.warning + '18', borderColor: colors.warning }]}>
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <Text style={[s.warningText, { color: colors.text }]}>
              {t('notifications.noZoneWarning')}
            </Text>
          </View>
        )}

        <View style={{ height: spacing['2xl'] }} />
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    card: { marginBottom: 0 },
    preventiveBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.md,
      marginTop: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    preventiveIcon: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 68 },
    preferenceIcon: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    reminderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
    zoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.sm },
    rowTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, marginBottom: 2 },
    rowSub: { fontSize: fontSize.xs, lineHeight: 17 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
    previewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cropChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    cropChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.full,
      borderWidth: 1,
      gap: spacing.xs,
    },
    cropChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginTop: spacing.lg,
    },
    warningText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
  });

function StitchNotificationsScreen({ colors, onBack }: { colors: ReturnType<typeof useColors>; onBack: () => void }) {
  const [morning, setMorning] = useState(true);
  const [heat, setHeat] = useState(true);
  const [wind, setWind] = useState(false);
  const [frost, setFrost] = useState(true);
  const [weekly, setWeekly] = useState(true);
  const [quiet, setQuiet] = useState(true);
  const Row = ({ icon, title, description, value, onChange }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; value: boolean; onChange: (value: boolean) => void }) => (
    <View style={[notificationStitch.row, { borderBottomColor: colors.border }]}>
      <View style={[notificationStitch.icon, { backgroundColor: colors.surfaceAlt }]}><Ionicons name={icon} size={19} color={colors.primary} /></View>
      <View style={{ flex: 1 }}><Text style={[notificationStitch.rowTitle, { color: colors.text }]}>{title}</Text><Text style={[notificationStitch.rowDescription, { color: colors.textSecondary }]}>{description}</Text></View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary + '88' }} thumbColor={value ? colors.primary : colors.surface} />
    </View>
  );

  return (
    <SafeAreaView style={[notificationStitch.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[notificationStitch.header, { borderBottomColor: colors.border }]}><Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Volver" style={notificationStitch.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={[notificationStitch.backText, { color: colors.text }]}>Ajustes</Text></Pressable><Text style={[notificationStitch.title, { color: colors.text }]}>Notificaciones</Text><View style={{ width: 82 }} /></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={notificationStitch.content}>
        <View style={[notificationStitch.hero, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><View style={[notificationStitch.heroIcon, { backgroundColor: colors.primary + '20' }]}><Ionicons name="notifications-outline" size={24} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[notificationStitch.heroTitle, { color: colors.text }]}>Cuida sin estar pendiente</Text><Text style={[notificationStitch.heroText, { color: colors.textSecondary }]}>Semillita adapta los avisos al clima y silencia el riego si la tierra ya está húmeda.</Text></View></View>
        <Text style={[notificationStitch.section, { color: colors.textSecondary }]}>CUIDADO PREVENTIVO</Text>
        <View style={[notificationStitch.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row icon="finger-print-outline" title="Comprobación matutina" description="Recordatorio diario a las 09:00 · 2 cm de sustrato" value={morning} onChange={setMorning} />
          <Row icon="sunny-outline" title="Olas de calor en terraza" description="Avisar cuando la previsión supere 32°C" value={heat} onChange={setHeat} />
          <Row icon="speedometer-outline" title="Ráfagas de viento" description="Afianzar jardineras si aumenta el viento" value={wind} onChange={setWind} />
          <Row icon="snow-outline" title="Heladas tardías" description="Avisar cuando la temperatura baje de 5°C" value={frost} onChange={setFrost} />
        </View>
        <View style={[notificationStitch.rule, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '66' }]}><Ionicons name="water-outline" size={20} color={colors.primaryDark} /><Text style={[notificationStitch.ruleText, { color: colors.text }]}>Los avisos de riego se silencian automáticamente si llueve en tu zona o si ya registraste sustrato húmedo.</Text></View>
        <Text style={[notificationStitch.section, { color: colors.textSecondary }]}>RITMO Y RESUMEN</Text>
        <View style={[notificationStitch.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Row icon="calendar-outline" title="Resumen semanal · domingo" description="Salud de tus macetas, rachas y próximos cuidados" value={weekly} onChange={setWeekly} /><Row icon="moon-outline" title="Silencio nocturno · 22:00–08:00" description="No recibir avisos mientras descansas" value={quiet} onChange={setQuiet} /></View>
        <Text style={[notificationStitch.footer, { color: colors.textSecondary }]}>Puedes cambiar los permisos del sistema desde Ajustes del iPhone. Las preferencias de Semillita se guardan en este dispositivo.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const notificationStitch = StyleSheet.create({
  container: { flex: 1 }, header: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 }, back: { minHeight: 44, minWidth: 82, flexDirection: 'row', alignItems: 'center', gap: 2 }, backText: { fontSize: 15, fontWeight: '700' }, title: { fontSize: 17, fontWeight: '800' }, content: { padding: 16, gap: 13, paddingBottom: 28 }, hero: { borderRadius: 20, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12 }, heroIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }, heroTitle: { fontSize: 17, fontWeight: '800' }, heroText: { fontSize: 13, lineHeight: 19, marginTop: 5 }, section: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 4 }, card: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 14 }, row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1 }, icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, rowTitle: { fontSize: 14, fontWeight: '800' }, rowDescription: { fontSize: 12, lineHeight: 17, marginTop: 2 }, rule: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 9 }, ruleText: { flex: 1, fontSize: 12, lineHeight: 17 }, footer: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8, marginTop: 2 },
});
