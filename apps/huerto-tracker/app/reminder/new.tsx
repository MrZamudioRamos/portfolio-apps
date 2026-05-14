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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REMINDER_TYPE_CONFIG, type GardenReminder, type ReminderType } from '../../src/models/reminder';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';

const TYPES: ReminderType[] = ['watering', 'fertilizing', 'harvest_check', 'custom'];
const FREQUENCIES: ReminderFrequency[] = ['daily', 'every_2_days', 'every_3_days', 'weekly', 'once'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export default function ReminderNewScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();

  const { activeGarden } = useActiveGarden();
  const reminders = useReminders<GardenReminder>('reminders');

  const [type, setType] = useState<ReminderType>('watering');
  const [title, setTitle] = useState(REMINDER_TYPE_CONFIG['watering'].defaultTitle);
  const [frequency, setFrequency] = useState<ReminderFrequency>('daily');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function handleTypeChange(tp: ReminderType) {
    setType(tp);
    setTitle(REMINDER_TYPE_CONFIG[tp].defaultTitle);
  }

  async function handleSave() {
    const gardenId = activeGarden?.id;
    if (!gardenId) {
      Alert.alert(t('reminderNew.noGardenTitle'), t('reminderNew.noGardenDesc'));
      return;
    }
    setSaving(true);
    try {
      await reminders.create({
        gardenId,
        plantId: plantId ?? undefined,
        type,
        title: title.trim() || REMINDER_TYPE_CONFIG[type].defaultTitle,
        frequency,
        time: { hour, minute },
        enabled: true,
      });
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('reminderNew.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('reminderNew.title')}</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={s.body}>
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
                  <Text
                    style={[
                      s.typeLabel,
                      { color: active ? colors.primary : colors.text },
                    ]}
                  >
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
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                fontSize: fontSize.md,
              },
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
                    <Text
                      style={[
                        s.chipText,
                        { color: active ? '#fff' : colors.text },
                      ]}
                    >
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
    body: { padding: spacing.xl },
    label: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
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
    preview: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
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
