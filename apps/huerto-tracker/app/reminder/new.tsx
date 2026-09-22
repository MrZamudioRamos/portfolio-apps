import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { Button } from '../../src/components/ActionButton';
import { useReminders, NotificationPermissionDeniedError, localReminderDate, type ReminderFrequency } from '@portfolio/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ActivityIndicator,
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
import { type Plant } from '../../src/models/plant';
import { useCollection } from '@portfolio/storage';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { usePro } from '../../src/hooks/usePro';
import { track, EVENTS } from '../../src/analytics';
import { TimePicker } from '../../src/components/TimePicker';
import { goBackOr } from '../../src/utils/navigation';

const TYPES: ReminderType[] = ['watering', 'fertilizing', 'harvest_check', 'custom'];
// every_2_days/every_3_days removed: expo can't fire them at a fixed time, so
// they were mapped to daily — keeping them in the picker would mislead users.
const FREQUENCIES: ReminderFrequency[] = ['daily', 'weekly', 'once'];
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
  const { plantId, title: titleParam, type: typeParam, frequency: frequencyParam, weekday: weekdayParam, date: dateParam } = useLocalSearchParams<{
    plantId?: string;
    title?: string;
    type?: string;
    frequency?: string;
    weekday?: string;
    date?: string;
  }>();

  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const reminders = useReminders<GardenReminder>('reminders');
  const { isPro } = usePro();

  const { t, i18n } = useTranslation();
  const initialType: ReminderType = TYPES.includes(typeParam as ReminderType) ? typeParam as ReminderType : 'watering';
  const initialFrequency: ReminderFrequency = FREQUENCIES.includes(frequencyParam as ReminderFrequency) ? frequencyParam as ReminderFrequency : 'daily';
  const parsedDate = parseLocalDate(dateParam);
  const parsedWeekday = Number(weekdayParam);
  const initialWeekday = parsedDate
    ? (parsedDate.getDay() === 0 ? 1 : parsedDate.getDay() + 1)
    : Number.isInteger(parsedWeekday) && parsedWeekday >= 1 && parsedWeekday <= 7 ? parsedWeekday : 2;
  const [selectedPlantId, setSelectedPlantId] = useState<string | undefined>(plantId);
  const [type, setType] = useState<ReminderType>(initialType);
  const [title, setTitle] = useState(() => typeof titleParam === 'string' && titleParam.trim()
    ? titleParam.trim().slice(0, 80)
    : t('reminderDefaultTitle.' + initialType));
  const [frequency, setFrequency] = useState<ReminderFrequency>(initialFrequency);
  const [weekday, setWeekday] = useState<number>(initialWeekday);
  const [suggestedDate, setSuggestedDate] = useState<string | undefined>(parsedDate ? localIsoDate(parsedDate) : undefined);
  const [hour, setHour] = useState(() => {
    const todayKey = localIsoDate(new Date());
    const now = new Date();
    return parsedDate && localIsoDate(parsedDate) === todayKey && now.getHours() >= 8
      ? Math.min(now.getHours() + 1, 23)
      : 8;
  });
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const busy = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!saved) return;
    const timeout = setTimeout(() => {
      goBackOr(router);
    }, 1200);
    return () => clearTimeout(timeout);
  }, [router, saved]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  const calendarDays = useMemo(() => {
    const anchor = frequency === 'once' && suggestedDate ? parseLocalDate(suggestedDate) ?? new Date() : new Date();
    const mondayOffset = (anchor.getDay() + 6) % 7;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - mondayOffset);
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      // Expo notifications use 1 = Sunday, 2 = Monday ... 7 = Saturday.
      const day = date.getDay() === 0 ? 1 : date.getDay() + 1;
      const label = formatter.format(date).replace('.', '').slice(0, 1).toUpperCase();
      return { key: localIsoDate(date), day, label, number: date.getDate() };
    });
  }, [frequency, i18n.language, suggestedDate]);

  const today = new Date().getDay();
  const todayWeekday = today === 0 ? 1 : today + 1;
  const activeCalendarDay = frequency === 'weekly' || frequency === 'once' ? weekday : todayWeekday;
  const selectedCalendarDay = frequency === 'once' && suggestedDate
    ? {
      day: activeCalendarDay,
      label: new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(parseLocalDate(suggestedDate) ?? new Date()).replace('.', '').slice(0, 1).toUpperCase(),
      number: Number(suggestedDate.slice(8, 10)),
    }
    : calendarDays.find((item) => item.day === activeCalendarDay) ?? calendarDays[0];

  function handleFrequencyChange(next: ReminderFrequency) {
    setFrequency(next);
    if (next === 'once' && frequency !== 'weekly') setWeekday(todayWeekday);
    if (next !== 'once') setSuggestedDate(undefined);
  }

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
    if (frequency === 'once' && suggestedDate && !localReminderDate(suggestedDate, { hour, minute })) {
      Alert.alert('Elige una hora futura', 'La fecha o la hora seleccionada ya ha pasado. Cambia el día o la hora para poder programar el aviso.');
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
        plantId: selectedPlantId ?? undefined,
        type,
        title: title.trim() || t('reminderDefaultTitle.' + type),
        frequency,
        weekday: frequency === 'weekly' || frequency === 'once' ? weekday : undefined,
        dueDate: frequency === 'once' ? suggestedDate : undefined,
        time: { hour, minute },
        enabled: true,
      });
      setSaved(true);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    } catch (error) {
      setPermissionError(error instanceof NotificationPermissionDeniedError);
      setSaveError(!(error instanceof NotificationPermissionDeniedError));
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={s.body}>
          <View style={s.greetingRow}>
            <View style={s.greetingCopy}>
              <Text style={[s.greeting, { color: colors.textSecondary }]}>{t('reminderNew.subtitle')}</Text>
              <Text style={[s.greetingTitle, { color: colors.text }]}>{t('reminderNew.title')}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={() => goBackOr(router)}
              style={({ pressed }) => [s.closeButton, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {plants.loading && plants.items.length === 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.loading')}</Text>
            </View>
          )}

          <Text style={[s.label, { color: colors.textSecondary, marginTop: 0 }]}>{t('reminderNew.weekdayLabel')}</Text>
          <View style={s.calendarStrip}>
            {calendarDays.map((item) => {
              const active = activeCalendarDay === item.day;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${item.label} ${item.number}`}
                  onPress={() => {
                    setWeekday(item.day);
                    if (frequency === 'once') setSuggestedDate(item.key);
                    else { setSuggestedDate(undefined); setFrequency('weekly'); }
                  }}
                  style={({ pressed }) => [s.calendarDay, { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.border, opacity: pressed ? 0.72 : 1 }]}
                >
                  <Text style={[s.calendarDayLabel, { color: active ? colors.background : colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[s.calendarDayNumber, { color: active ? colors.background : colors.text }]}>{item.number}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[s.summaryStage, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <View style={[s.summaryIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name={TYPE_ICONS[type]} size={21} color={colors.primary} />
            </View>
            <View style={s.summaryCopy}>
              <Text style={[s.previewLabel, { color: colors.textSecondary }]}>{t('reminderNew.previewLabel')}</Text>
              <Text style={[s.summaryTitle, { color: colors.text }]} numberOfLines={1}>
                {title.trim() || t('reminderDefaultTitle.' + type)}
              </Text>
              <Text style={[s.summaryMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {t('reminderFrequency.' + frequency)}{frequency === 'weekly' || frequency === 'once' ? ` · ${selectedCalendarDay?.label} ${selectedCalendarDay?.number}` : ''}
              </Text>
            </View>
            <View style={s.previewTimeBlock}>
              <Text style={[s.scoreTime, { color: colors.text }]}>{String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}</Text>
              <Ionicons name="notifications-outline" size={17} color={colors.primary} />
            </View>
          </View>

          <Text style={[s.label, { color: colors.textSecondary }]}>{t('entryNew.plant')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: !selectedPlantId }}
                onPress={() => setSelectedPlantId(undefined)}
                    style={({ pressed }) => [s.plantChip, { backgroundColor: !selectedPlantId ? colors.primary + '18' : colors.surface, borderColor: !selectedPlantId ? colors.primary : colors.border, opacity: pressed ? 0.72 : 1 }]}
              >
                <Ionicons name="leaf-outline" size={17} color={!selectedPlantId ? colors.primary : colors.textSecondary} />
                <Text style={[s.plantChipLabel, { color: !selectedPlantId ? colors.primary : colors.textSecondary }]}>{t('entryNew.general')}</Text>
              </Pressable>
              {plants.items.filter((p) => p.gardenId === activeGarden?.id).map((p) => {
                const selected = selectedPlantId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setSelectedPlantId(p.id)}
                    style={[s.plantChip, { backgroundColor: selected ? colors.primary + '18' : colors.surface, borderColor: selected ? colors.primary : colors.border }]}
                  >
                    <Ionicons name="leaf-outline" size={17} color={selected ? colors.primary : colors.textSecondary} />
                    <Text style={[s.plantChipLabel, { color: selected ? colors.primary : colors.textSecondary }]} numberOfLines={1}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {permissionError && (
            <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
              <Text accessibilityRole="alert" style={{ color: colors.error }}>{t('reminderNew.permissionError')}</Text>
              <Pressable accessibilityRole="button" onPress={openSystemSettings} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>{t('common.openSettings')}</Text>
              </Pressable>
            </View>
          )}
          {saveError && <Text accessibilityRole="alert" style={{ color: colors.error }}>{t('reminderNew.saveError')}</Text>}
          {saved && (
            <View accessibilityRole="alert" style={[s.savedFeedback, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '36' }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.savedTitle, { color: colors.primary }]}>{t('reminderNew.saved')}</Text>
                <Text style={[s.savedDesc, { color: colors.textSecondary }]}>{t('reminderNew.savedDesc')}</Text>
              </View>
            </View>
          )}
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
                    accessibilityState={{ checked: active }}
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
          <View style={[s.inputShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="create-outline" size={19} color={colors.textSecondary} />
            <TextInput
              value={title}
              onChangeText={(value) => setTitle(value.slice(0, 80))}
              maxLength={80}
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
                  onPress={() => handleFrequencyChange(f)}
                  style={[s.segmentOption, { backgroundColor: active ? colors.primary : 'transparent' }]}
                >
                  <Text style={[s.segmentText, { color: active ? colors.background : colors.textSecondary }]}>{t('reminderFrequency.' + f)}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Native iOS spinner / Android clock / web time input */}
          <TimePicker
            hour={hour}
            minute={minute}
            label={t('reminderNew.hourLabel')}
            hint={t('reminderNew.timeHint')}
            confirmLabel={t('common.save')}
            onChange={(nextHour, nextMinute) => { setHour(nextHour); setMinute(nextMinute); }}
          />

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

function parseLocalDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
      width: 44,
      height: 44,
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderRadius: radii.lg,
      marginBottom: spacing.sm,
    },
    summaryIcon: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryCopy: { flex: 1, gap: 2, minWidth: 0 },
    previewLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    scoreTime: { fontSize: fontSize.xl, lineHeight: 28, fontWeight: fontWeight.bold, letterSpacing: 0.2 },
    previewTimeBlock: { alignItems: 'flex-end', gap: 2 },
    summaryTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    summaryMeta: { fontSize: fontSize.xs },
    savedFeedback: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderRadius: radii.md, marginBottom: spacing.md },
    savedTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    savedDesc: { fontSize: fontSize.xs, marginTop: 2 },
    plantChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    plantChipLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, maxWidth: 120 },
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
    segmentOption: { flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
    segmentText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textAlign: 'center' },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.xl,
      borderTopWidth: 1,
    },
  });
