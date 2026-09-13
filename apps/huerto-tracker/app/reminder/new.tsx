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
const WEEKDAYS = [2, 3, 4, 5, 6, 7, 1] as const;
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
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('reminderNew.title')}</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={s.body}>
          <View style={[s.summaryHero, { backgroundColor: glassAvailable ? 'transparent' : colors.surface, borderColor: colors.border, overflow: 'hidden' }]}>
            {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
            <View style={[s.summaryHeroIcon, { backgroundColor: colors.primary + '1c' }]}>
              <Ionicons name={TYPE_ICONS[type]} size={24} color={colors.primary} />
            </View>
            <View style={s.summaryHeroCopy}>
              <Text style={[s.summaryEyebrow, { color: colors.primary }]}>{t('reminderNew.previewLabel')}</Text>
              <Text style={[s.summaryTitle, { color: colors.text }]} numberOfLines={1}>
                {title.trim() || t('reminderDefaultTitle.' + type)}
              </Text>
              <Text style={[s.summaryMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {t('reminderFrequency.' + frequency)}{frequency === 'weekly' ? ` · ${weekdayLabel(weekday)}` : ''}
              </Text>
            </View>
            <Text style={[s.summaryTime, { color: colors.text }]}>
              {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
            </Text>
          </View>

          <View style={s.intro}>
            <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
            <Text style={[s.introDesc, { color: colors.textSecondary }]}>{t('reminderNew.subtitleDesc')}</Text>
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

          {/* Hour picker */}
          {frequency === 'weekly' && (
            <>
              <Text style={[s.label, { color: colors.textSecondary }]}>{t('reminderNew.weekdayLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {WEEKDAYS.map((day) => {
                    const active = weekday === day;
                    return (
                      <Pressable
                        key={day}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        accessibilityLabel={weekdayLabel(day)}
                        onPress={() => setWeekday(day)}
                        style={[s.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}
                      >
                        <Text style={[s.chipText, { color: active ? '#fff' : colors.text }]}>{weekdayLabel(day)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}

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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    body: { padding: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
    summaryHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderRadius: 18,
      marginBottom: spacing.sm,
    },
    summaryHeroIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryHeroCopy: { flex: 1, minWidth: 0, gap: 3 },
    summaryEyebrow: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 1.1, textTransform: 'uppercase' },
    summaryTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    summaryMeta: { fontSize: fontSize.xs },
    summaryTime: { fontSize: 22, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
    intro: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
    },
    introDesc: { flex: 1, fontSize: fontSize.sm, lineHeight: 18 },
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
    chip: {
      minWidth: 44,
      minHeight: 40,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
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
