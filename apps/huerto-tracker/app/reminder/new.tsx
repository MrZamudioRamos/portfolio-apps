import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { Button } from '../../src/components/ActionButton';
import { useReminders, NotificationPermissionDeniedError, type ReminderFrequency } from '@portfolio/notifications';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Linking,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type GardenReminder, type ReminderType } from '../../src/models/reminder';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { usePro } from '../../src/hooks/usePro';
import { track, EVENTS } from '../../src/analytics';

const TYPES: ReminderType[] = ['watering', 'fertilizing', 'harvest_check', 'custom'];
// every_2_days/every_3_days removed: expo can't fire them at a fixed time, so
// they were mapped to daily — keeping them in the picker would mislead users.
const FREQUENCIES: ReminderFrequency[] = ['daily', 'weekly', 'once'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();
const TYPE_ICONS: Record<ReminderType, keyof typeof Ionicons.glyphMap> = {
  watering: 'water-outline',
  fertilizing: 'leaf-outline',
  harvest_check: 'basket-outline',
  custom: 'notifications-outline',
};

export default function ReminderNewScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();

  const { activeGarden } = useActiveGarden();
  const reminders = useReminders<GardenReminder>('reminders');
  const { isPro } = usePro();

  const { t, i18n } = useTranslation();
  const [type, setType] = useState<ReminderType>('watering');
  const [title, setTitle] = useState(() => t('reminderDefaultTitle.watering'));
  const [frequency, setFrequency] = useState<ReminderFrequency>('daily');
  const [weekday, setWeekday] = useState<number>(2);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const busy = useRef(false);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  const calendarDays = useMemo(() => {
    const today = new Date();
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      // Expo notifications use 1 = Sunday, 2 = Monday ... 7 = Saturday.
      const day = date.getDay() === 0 ? 1 : date.getDay() + 1;
      const label = formatter.format(date).replace('.', '').slice(0, 1).toUpperCase();
      return { key: date.toISOString().slice(0, 10), day, label, number: date.getDate() };
    });
  }, [i18n.language]);

  const today = new Date().getDay();
  const activeCalendarDay = frequency === 'weekly' ? weekday : (today === 0 ? 1 : today + 1);

  function weekdayLabel(day: number) {
    const date = new Date(2024, 0, day === 1 ? 7 : 7 + day - 1);
    const label = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1, 3);
  }

  function handleTypeChange(tp: ReminderType) {
    setType(tp);
    setTitle(t('reminderDefaultTitle.' + tp));
  }

  async function openSystemSettings() {
    if (Platform.OS === 'web') return;
    try { await Linking.openSettings(); } catch { /* The inline recovery copy remains visible. */ }
  }

  async function handleSave() {
    if (busy.current) return;
    const gardenId = activeGarden?.id;
    if (!gardenId) {
      Alert.alert(t('reminderNew.noGardenTitle'), t('reminderNew.noGardenDesc'));
      return;
    }
    const gardenReminderCount = reminders.items.filter((r) => r.gardenId === gardenId).length;
    if (!isPro && gardenReminderCount >= 3) {
      router.push('/paywall?source=reminders' as any);
      return;
    }
    busy.current = true;
    setSaving(true);
    setSaveError(false);
    setPermissionError(false);
    try {
      await reminders.create({
        gardenId,
        plantId: plantId ?? undefined,
        type,
        title: title.trim() || t('reminderDefaultTitle.' + type),
        frequency,
        weekday: frequency === 'weekly' ? weekday : undefined,
        time: { hour, minute },
        enabled: true,
      });
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } catch (error) {
      setPermissionError(error instanceof NotificationPermissionDeniedError);
      setSaveError(!(error instanceof NotificationPermissionDeniedError));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={s.body}>
          <View style={s.greetingRow}>
            <View style={s.greetingCopy}>
              <Text style={[s.greeting, { color: colors.textSecondary }]}>{t('reminderNew.subtitle')}</Text>
              <Text style={[s.greetingTitle, { color: colors.text }]}>{t('reminderNew.title')}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={() => router.back()}
              style={[s.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={s.calendarStrip}>
            {calendarDays.map((item) => {
              const active = activeCalendarDay === item.day;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${item.label} ${item.number}`}
                  onPress={() => { setFrequency('weekly'); setWeekday(item.day); }}
                  style={[s.calendarDay, { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.border }]}
                >
                  <Text style={[s.calendarDayLabel, { color: active ? colors.background : colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[s.calendarDayNumber, { color: active ? colors.background : colors.text }]}>{item.number}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[s.summaryStage, { backgroundColor: glassAvailable ? 'transparent' : colors.surfaceAlt, borderColor: colors.border, overflow: 'hidden' }]}>
            {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
            <View style={[s.scoreRing, { borderColor: colors.primary + '36', borderTopColor: colors.primary, borderRightColor: colors.primary }]}>
              <View style={s.scoreRingInner}>
                <Text style={[s.scoreTime, { color: colors.text }]}>{String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}</Text>
                <Text style={[s.scoreLabel, { color: colors.textSecondary }]}>{t('reminderNew.previewLabel')}</Text>
              </View>
            </View>
            <Text style={[s.summaryTitle, { color: colors.text }]} numberOfLines={1}>
              {title.trim() || t('reminderDefaultTitle.' + type)}
            </Text>
            <Text style={[s.summaryMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {t('reminderFrequency.' + frequency)}{frequency === 'weekly' ? ` · ${weekdayLabel(weekday)}` : ''}
            </Text>
          </View>

          <View style={[s.contextCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.contextIcon, { backgroundColor: colors.secondary + '24' }]}>
              <Ionicons name="sunny-outline" size={20} color={colors.secondary} />
            </View>
            <View style={s.contextCopy}>
              <Text style={[s.contextTitle, { color: colors.text }]}>{t('reminderNew.subtitleDesc')}</Text>
              <Text style={[s.contextMeta, { color: colors.textSecondary }]}>{t('reminderNew.timeHint')}</Text>
            </View>
            <Ionicons name={TYPE_ICONS[type]} size={18} color={colors.primary} />
          </View>

          {permissionError && (
            <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
              <Text accessibilityRole="alert" style={{ color: colors.error }}>{t('reminderNew.permissionError')}</Text>
              <Pressable accessibilityRole="button" onPress={openSystemSettings} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>{t('common.openSettings')}</Text>
              </Pressable>
            </View>
          )}
          {saveError && <Text accessibilityRole="alert" style={{ color: colors.error }}>{t('reminderNew.saveError')}</Text>}
          {/* Type selector */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('reminderNew.typeLabel')}</Text>
          <View style={s.typeGrid}>
            {TYPES.map((tp) => {
              const active = type === tp;
              return (
                <Pressable
                  key={tp}
                  onPress={() => handleTypeChange(tp)}
                  style={[
                    s.typeCard,
                    {
                      backgroundColor: active ? colors.primary + '18' : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={s.typeCardContent}>
                    <View style={[s.typeIcon, { backgroundColor: active ? colors.primary + '20' : colors.surfaceAlt }]}>
                      <Ionicons name={TYPE_ICONS[tp]} size={20} color={active ? colors.primary : colors.textSecondary} />
                    </View>
                    <Text style={[s.typeLabel, { color: active ? colors.primary : colors.text }]}>{t('reminderType.' + tp)}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>

          {/* Title */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('reminderNew.titleLabel')}</Text>
          <View style={[s.inputShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="create-outline" size={19} color={colors.textSecondary} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={[s.input, { color: colors.text, fontSize: fontSize.md }]}
              placeholderTextColor={colors.textDisabled}
              returnKeyType="done"
            />
          </View>

          {/* Frequency */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('reminderNew.frequencyLabel')}</Text>
          <View style={[s.segment, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            {FREQUENCIES.map((f) => {
              const active = frequency === f;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setFrequency(f)}
                  style={[s.segmentOption, { backgroundColor: active ? colors.primary : 'transparent' }]}
                >
                  <Text style={[s.segmentText, { color: active ? colors.background : colors.textSecondary }]}>{t('reminderFrequency.' + f)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Time picker */}
          <View style={[s.timePanel, { backgroundColor: glassAvailable ? 'transparent' : colors.surfaceAlt, borderColor: colors.border, overflow: 'hidden' }]}>
            {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
            <View style={s.timeHeading}>
              <View style={s.timeHeadingCopy}>
                <View style={[s.timeIcon, { backgroundColor: colors.primary + '1c' }]}>
                  <Ionicons name="time-outline" size={19} color={colors.primary} />
                </View>
                <View>
                  <Text style={[s.timeLabel, { color: colors.text }]}>{t('reminderNew.hourLabel')}</Text>
                  <Text style={[s.timeHint, { color: colors.textSecondary }]}>{t('reminderNew.timeHint')}</Text>
                </View>
              </View>
              <Text style={[s.timeValue, { color: colors.text }]}>{String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}</Text>
            </View>
            <View style={s.hourGrid}>
              {HOURS.map((h) => {
                const active = hour === h;
                return (
                  <Pressable
                    key={h}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`${String(h).padStart(2, '0')}:00`}
                    onPress={() => setHour(h)}
                    style={[s.timeChip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[s.timeChipText, { color: active ? colors.background : colors.text }]}>{String(h).padStart(2, '0')}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[s.minuteLabel, { color: colors.textSecondary }]}>{t('reminderNew.minuteLabel')}</Text>
            <View style={s.minuteRow}>
              {MINUTES.map((m) => {
                const active = minute === m;
                return (
                  <Pressable
                    key={m}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`:${String(m).padStart(2, '0')}`}
                    onPress={() => setMinute(m)}
                    style={[s.minuteChip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[s.timeChipText, { color: active ? colors.background : colors.text }]}>{String(m).padStart(2, '0')}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title={saving ? t('common.saving') : t('reminderNew.create')}
          variant="primary"
          size="lg"
          onPress={handleSave}
          disabled={saving}
          style={{ flex: 1 }}
        />
      </View>
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
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    greetingCopy: { flex: 1, gap: 2 },
    greeting: { fontSize: fontSize.sm },
    greetingTitle: { fontSize: 27, lineHeight: 32, fontWeight: fontWeight.bold },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { padding: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
    calendarStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    calendarDay: {
      width: 39,
      height: 58,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    calendarDayLabel: { fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase' },
    calendarDayNumber: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    summaryStage: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderRadius: 24,
      marginBottom: spacing.sm,
    },
    scoreRing: {
      width: 154,
      height: 154,
      borderRadius: 77,
      borderWidth: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      transform: [{ rotate: '-28deg' }],
    },
    scoreRingInner: {
      width: 124,
      height: 124,
      borderRadius: 62,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '28deg' }],
    },
    scoreTime: { fontSize: 30, lineHeight: 36, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
    scoreLabel: { fontSize: fontSize.xs, marginTop: 2 },
    summaryTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    summaryMeta: { fontSize: fontSize.xs },
    contextCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderWidth: 1,
      borderRadius: 18,
      marginBottom: spacing.sm,
    },
    contextIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    contextCopy: { flex: 1, gap: 2 },
    contextTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    contextMeta: { fontSize: fontSize.xs, lineHeight: 16 },
    label: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    typeCard: {
      width: '47%',
      minHeight: 58,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    typeCardContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    typeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    typeLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, flexShrink: 1 },
    inputShell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
    },
    input: {
      flex: 1,
      paddingVertical: spacing.md,
    },
    segment: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1, gap: 4 },
    segmentOption: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
    segmentText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textAlign: 'center' },
    timePanel: { marginTop: spacing.lg, padding: spacing.md, borderRadius: 14, borderWidth: 1 },
    timeHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    timeHeadingCopy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    timeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    timeLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    timeHint: { fontSize: fontSize.xs, marginTop: 2 },
    timeValue: { fontSize: 24, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
    hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    minuteLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: spacing.lg, marginBottom: spacing.sm },
    timeChip: {
      width: 44,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    minuteRow: { flexDirection: 'row', gap: spacing.md },
    minuteChip: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.xl,
      borderTopWidth: 1,
    },
  });
