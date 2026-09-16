import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { useReminders, NotificationPermissionDeniedError, type ReminderFrequency } from '@portfolio/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Platform,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REMINDER_TYPE_CONFIG, type GardenReminder, type ReminderType } from '../../src/models/reminder';
import { TimePicker } from '../../src/components/TimePicker';
import { CollectionError } from '../../src/components/CollectionError';

const TYPES: ReminderType[] = ['watering', 'fertilizing', 'harvest_check', 'custom'];
// every_2_days/every_3_days removed: expo can't fire them at a fixed time, so
// they were mapped to daily — keeping them in the picker would mislead users.
const FREQUENCIES: ReminderFrequency[] = ['daily', 'weekly', 'once'];
const WEEKDAYS = [2, 3, 4, 5, 6, 7, 1] as const;
const TYPE_ICONS: Record<ReminderType, keyof typeof Ionicons.glyphMap> = {
  watering: 'water-outline',
  fertilizing: 'leaf-outline',
  harvest_check: 'basket-outline',
  custom: 'notifications-outline',
};

export default function ReminderEditScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();

  const reminders = useReminders<GardenReminder>('reminders');
  const reminder = reminders.getById(id);

  const [type, setType] = useState<ReminderType>(reminder?.type ?? 'watering');
  const [title, setTitle] = useState(reminder?.title ?? '');
  // Normalize retired frequencies (every_2_days/every_3_days now behave as daily)
  // so the picker shows a valid, highlighted selection.
  const initialFrequency: ReminderFrequency =
    reminder && FREQUENCIES.includes(reminder.frequency) ? reminder.frequency : 'daily';
  const [frequency, setFrequency] = useState<ReminderFrequency>(initialFrequency);
  const [weekday, setWeekday] = useState<number>(reminder?.weekday ?? 2);
  const [hour, setHour] = useState(reminder?.time?.hour ?? 8);
  const [minute, setMinute] = useState(reminder?.time?.minute ?? 0);
  const [enabled, setEnabled] = useState(reminder?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  useEffect(() => {
    if (!saved) return;
    const timeout = setTimeout(() => router.back(), 1200);
    return () => clearTimeout(timeout);
  }, [router, saved]);

  useEffect(() => {
    if (!reminder) return;
    setType(reminder.type);
    setTitle(reminder.title);
    setFrequency(FREQUENCIES.includes(reminder.frequency) ? reminder.frequency : 'daily');
    setWeekday(reminder.weekday ?? 2);
    setHour(reminder.time?.hour ?? 8);
    setMinute(reminder.time?.minute ?? 0);
    setEnabled(reminder.enabled);
  }, [reminder?.id]);

  function weekdayLabel(day: number) {
    const date = new Date(2024, 0, day === 1 ? 7 : 7 + day - 1);
    const label = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1, 3);
  }

  if (reminders.loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.lg }} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (reminders.error) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.lg }} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
          <CollectionError onRetry={() => reminders.refresh().catch(() => {})} />
        </View>
      </SafeAreaView>
    );
  }

  if (!reminder) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.lg }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.notFound, { color: colors.textSecondary }]}>
          {t('reminderEdit.notFound')}
        </Text>
      </SafeAreaView>
    );
  }

  function handleTypeChange(newType: ReminderType) {
    setType(newType);
    if (title === REMINDER_TYPE_CONFIG[type].defaultTitle) {
      setTitle(REMINDER_TYPE_CONFIG[newType].defaultTitle);
    }
  }

  async function openSystemSettings() {
    if (Platform.OS === 'web') return;
    try { await Linking.openSettings(); } catch { /* The inline recovery copy remains visible. */ }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(false);
    setPermissionError(false);
    try {
      await reminders.update(id, {
        type,
        title: title.trim() || REMINDER_TYPE_CONFIG[type].defaultTitle,
        frequency,
        weekday: frequency === 'weekly' || frequency === 'once' ? weekday : undefined,
        time: { hour, minute },
        enabled,
      });
      setSaved(true);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    } catch (error) {
      if (error instanceof NotificationPermissionDeniedError) setPermissionError(true);
      else {
        setSaveError(true);
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
        Alert.alert(t('common.error'), t('reminderEdit.saveError'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      t('reminderEdit.deleteTitle'),
      t('reminderEdit.deleteDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            // Soft-delete syncs the tombstone to other devices on next push.
            await reminders.softRemove(id);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('reminderEdit.title')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={s.body}>
          {permissionError && (
            <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
              <Text accessibilityRole="alert" style={{ color: colors.error }}>{t('reminderEdit.permissionError')}</Text>
              <Pressable accessibilityRole="button" onPress={openSystemSettings} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>{t('common.openSettings')}</Text>
              </Pressable>
            </View>
          )}
          {saveError && <Text accessibilityRole="alert" style={{ color: colors.error, marginBottom: spacing.md }}>{t('reminderEdit.saveError')}</Text>}
          {saved && (
            <View accessibilityRole="alert" style={[s.savedFeedback, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '36' }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.savedTitle, { color: colors.primary }]}>{t('reminderEdit.saved')}</Text>
                <Text style={[s.savedDesc, { color: colors.textSecondary }]}>{t('reminderEdit.savedDesc')}</Text>
              </View>
            </View>
          )}
          {/* Enabled toggle */}
          <View style={[s.enabledRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.enabledLabel, { color: colors.text }]}>{t('reminderEdit.enabledLabel')}</Text>
              <Text style={[s.enabledDesc, { color: colors.textSecondary }]}>
                {enabled ? t('reminderEdit.enabledOn') : t('reminderEdit.enabledOff')}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ true: colors.primary }}
            />
          </View>

          {/* Type selector */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('reminderNew.typeLabel')}</Text>
          <View style={s.typeGrid}>
            {TYPES.map((tp) => {
              const active = type === tp;
              return (
                <Pressable
                  key={tp}
                  onPress={() => handleTypeChange(tp)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: type === tp }}
                  style={({ pressed }) => [
                    s.typeCard,
                    {
                      backgroundColor: active ? colors.primary + '18' : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.76 : 1,
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
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={[
              s.input,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, fontSize: fontSize.md },
            ]}
            placeholderTextColor={colors.textDisabled}
            returnKeyType="done"
          />

          {/* Frequency */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('reminderNew.frequencyLabel')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {FREQUENCIES.map((f) => {
                const active = frequency === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFrequency(f)}
                    style={({ pressed }) => [
                      s.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                        opacity: pressed ? 0.76 : 1,
                      },
                    ]}
                  >
                    <Text style={[s.chipText, { color: active ? '#fff' : colors.text }]}>
                      {t('reminderFrequency.' + f)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Hour picker */}
          {(frequency === 'weekly' || frequency === 'once') && (
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
                        style={({ pressed }) => [s.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border, opacity: pressed ? 0.76 : 1 }]}
                      >
                        <Text style={[s.chipText, { color: active ? '#fff' : colors.text }]}>{weekdayLabel(day)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}

          {/* Native iOS spinner / Android clock / web time input */}
          <TimePicker
            hour={hour}
            minute={minute}
            label={t('reminderNew.hourLabel')}
            hint={t('reminderNew.timeHint')}
            confirmLabel={t('common.save')}
            onChange={(nextHour, nextMinute) => { setHour(nextHour); setMinute(nextMinute); }}
          />

          {/* Preview */}
          <View style={[s.preview, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <View style={s.previewTitleRow}>
              <Ionicons name={TYPE_ICONS[type]} size={18} color={colors.primary} />
              <Text style={[{ color: colors.textSecondary, fontSize: fontSize.sm, flex: 1 }]}>
                {title || REMINDER_TYPE_CONFIG[type].defaultTitle}
              </Text>
            </View>
            <Text style={[{ color: colors.textDisabled, fontSize: fontSize.xs, marginTop: 4 }]}>
              {t('reminderFrequency.' + frequency)} · {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
            </Text>
          </View>

          {/* Delete */}
          <Pressable onPress={handleDelete} style={s.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[s.deleteText, { color: colors.error }]}>{t('reminderEdit.delete')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title={saving ? t('common.saving') : t('reminderEdit.save')}
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
    body: { padding: spacing.xl },
    enabledRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      marginBottom: spacing.sm,
    },
    enabledLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    enabledDesc: { fontSize: fontSize.xs, marginTop: 2 },
    savedFeedback: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderRadius: radii.md, marginBottom: spacing.md },
    savedTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    savedDesc: { fontSize: fontSize.xs, marginTop: 2 },
    label: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
    typeCard: {
      width: '47%',
      minHeight: 58,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    typeCardContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    typeIcon: { width: 34, height: 34, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
    typeLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, flexShrink: 1 },
    input: {
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    chipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    preview: { padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1 },
    previewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.xl,
      padding: spacing.md,
    },
    deleteText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.xl,
      borderTopWidth: 1,
    },
    notFound: { textAlign: 'center', marginTop: 80, fontSize: fontSize.lg },
  });
