import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { useReminders, type ReminderFrequency } from '@portfolio/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REMINDER_TYPE_CONFIG, type GardenReminder, type ReminderType } from '../../src/models/reminder';

const TYPES: ReminderType[] = ['watering', 'fertilizing', 'harvest_check', 'custom'];
const FREQUENCIES: ReminderFrequency[] = ['daily', 'every_2_days', 'every_3_days', 'weekly', 'once'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export default function ReminderEditScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const reminders = useReminders<GardenReminder>('reminders');
  const reminder = reminders.getById(id);

  const [type, setType] = useState<ReminderType>(reminder?.type ?? 'watering');
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [frequency, setFrequency] = useState<ReminderFrequency>(reminder?.frequency ?? 'daily');
  const [hour, setHour] = useState(reminder?.time.hour ?? 8);
  const [minute, setMinute] = useState(reminder?.time.minute ?? 0);
  const [enabled, setEnabled] = useState(reminder?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

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

  async function handleSave() {
    setSaving(true);
    try {
      await reminders.update(id, {
        type,
        title: title.trim() || REMINDER_TYPE_CONFIG[type].defaultTitle,
        frequency,
        time: { hour, minute },
        enabled,
      });
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('reminderEdit.saveError'));
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
            await reminders.remove(id);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('reminderEdit.title')}</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={s.body}>
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
              const cfg = REMINDER_TYPE_CONFIG[tp];
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
                  <Text style={{ fontSize: 28 }}>{cfg.emoji}</Text>
                  <Text style={[s.typeLabel, { color: active ? colors.primary : colors.text }]}>
                    {t('reminderType.' + tp)}
                  </Text>
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
                    style={[
                      s.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
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
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('reminderNew.hourLabel')}</Text>
          <FlatList
            horizontal
            data={HOURS}
            keyExtractor={(h) => String(h)}
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: spacing.md }}
            contentContainerStyle={{ gap: spacing.sm }}
            renderItem={({ item: h }) => {
              const active = hour === h;
              return (
                <Pressable
                  onPress={() => setHour(h)}
                  style={[
                    s.timeChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[s.timeChipText, { color: active ? '#fff' : colors.text }]}>
                    {String(h).padStart(2, '0')}
                  </Text>
                </Pressable>
              );
            }}
          />

          {/* Minute picker */}
          <Text style={[s.label, { color: colors.textSecondary }]}>{t('reminderNew.minuteLabel')}</Text>
          <View style={[s.minuteRow, { marginBottom: spacing.xl }]}>
            {MINUTES.map((m) => {
              const active = minute === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMinute(m)}
                  style={[
                    s.minuteChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[s.timeChipText, { color: active ? '#fff' : colors.text }]}>
                    :{String(m).padStart(2, '0')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Preview */}
          <View style={[s.preview, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[{ color: colors.textSecondary, fontSize: fontSize.sm }]}>
              {REMINDER_TYPE_CONFIG[type].emoji} {title || REMINDER_TYPE_CONFIG[type].defaultTitle}
            </Text>
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
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      alignItems: 'center',
      gap: spacing.sm,
    },
    typeLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, textAlign: 'center' },
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
    timeChip: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    minuteRow: { flexDirection: 'row', gap: spacing.md },
    minuteChip: {
      flex: 1,
      height: 44,
      borderRadius: radii.md,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    preview: { padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1 },
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
