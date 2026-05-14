import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ENTRY_TYPE_CONFIG, type DiaryEntry, type EntryType } from '../../src/models/diary-entry';

const ALL_TYPES: EntryType[] = [
  'watering', 'sowing', 'transplant', 'fertilizing',
  'harvest', 'pruning', 'pest', 'treatment', 'photo', 'note',
];

export default function EditEntryScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const entries = useCollection<DiaryEntry>('diary_entries');
  const entry = entries.getById(id);

  const [selectedType, setSelectedType] = useState<EntryType>(entry?.type ?? 'watering');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().split('T')[0]);
  const [photoUri, setPhotoUri] = useState<string | null>(entry?.photoUri ?? null);
  const [harvestWeight, setHarvestWeight] = useState(String(entry?.data?.weight ?? ''));
  const [harvestUnits, setHarvestUnits] = useState(String(entry?.data?.units ?? ''));
  const [saving, setSaving] = useState(false);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (!entry) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.lg }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.notFound, { color: colors.textSecondary }]}>{t('entryEdit.notFound')}</Text>
      </SafeAreaView>
    );
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleSave() {
    setSaving(true);
    const harvestData =
      selectedType === 'harvest' && (harvestWeight || harvestUnits)
        ? {
            ...(harvestWeight ? { weight: harvestWeight } : {}),
            ...(harvestUnits ? { units: harvestUnits } : {}),
          }
        : undefined;
    try {
      await entries.update(id, {
        type: selectedType,
        date,
        notes: notes.trim() || undefined,
        photoUri: photoUri ?? undefined,
        data: harvestData,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(t('entryEdit.deleteTitle'), t('entryEdit.deleteDesc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await entries.remove(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('entryEdit.title')}</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={12}>
          <Text style={[{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }, saving && { opacity: 0.5 }]}>
            {t('entryEdit.save')}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <View style={s.body}>
            {/* Entry type grid */}
            <Text style={[s.label, { color: colors.textSecondary }]}>{t('entryNew.activityType')}</Text>
            <View style={s.typeGrid}>
              {ALL_TYPES.map((type) => {
                const cfg = ENTRY_TYPE_CONFIG[type];
                const active = selectedType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setSelectedType(type)}
                    style={[
                      s.typeChip,
                      {
                        backgroundColor: active ? cfg.color + '22' : colors.surface,
                        borderColor: active ? cfg.color : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>{cfg.emoji}</Text>
                    <Text style={[s.typeLabel, { color: active ? cfg.color : colors.textSecondary }]}>
                      {t('diary.filters.' + type)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Date */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>{t('entryNew.date')}</Text>
            <View style={[s.dateBtnsRow, { marginBottom: spacing.sm }]}>
              {([0, 1, 2] as const).map((days) => {
                const d = new Date();
                d.setDate(d.getDate() - days);
                const dateStr = d.toISOString().split('T')[0];
                const active = date === dateStr;
                const label = days === 0 ? t('entryNew.today') : days === 1 ? t('entryNew.yesterday') : t('entryNew.twoDaysAgo');
                return (
                  <Pressable
                    key={days}
                    onPress={() => setDate(dateStr)}
                    style={[
                      s.dateBtn,
                      {
                        backgroundColor: active ? colors.primary + '22' : colors.surfaceAlt,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[s.dateBtnText, { color: active ? colors.primary : colors.textSecondary }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder={t('entryNew.datePlaceholder')}
              placeholderTextColor={colors.textDisabled}
              style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              keyboardType="numeric"
            />

            {/* Notes */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('entryNew.notes')}</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t('entryNew.notesPlaceholder')}
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[s.input, s.textarea, { backgroundColor: colors.surface, borderColor: notes ? colors.primary : colors.border, color: colors.text }]}
            />

            {/* Harvest extras */}
            {selectedType === 'harvest' && (
              <>
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('entryNew.harvest')}</Text>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.weightKg')}</Text>
                    <TextInput
                      value={harvestWeight}
                      onChangeText={setHarvestWeight}
                      placeholder="0.5"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="decimal-pad"
                      style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.units')}</Text>
                    <TextInput
                      value={harvestUnits}
                      onChangeText={setHarvestUnits}
                      placeholder="12"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="number-pad"
                      style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Photo */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('entryNew.photo')}</Text>
            <Pressable onPress={pickPhoto} style={s.photoRow}>
              {photoUri ? (
                <View>
                  <Image source={{ uri: photoUri }} style={s.photoPreview} />
                  <Text style={[s.changePhotoText, { color: colors.primary }]}>{t('entryEdit.changePhoto')}</Text>
                </View>
              ) : (
                <View style={[s.photoPlaceholder, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 }}>{t('entryNew.addPhoto')}</Text>
                </View>
              )}
            </Pressable>

            {/* Delete */}
            <Pressable onPress={handleDelete} style={s.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[s.deleteText, { color: colors.error }]}>{t('entryEdit.delete')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
      padding: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    body: { padding: spacing.xl },
    label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8, marginBottom: spacing.sm },
    inputLabel: { fontSize: fontSize.xs, marginBottom: spacing.xs },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    typeChip: {
      width: '22%',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 4,
    },
    typeLabel: { fontSize: 10, fontWeight: fontWeight.medium, textAlign: 'center' },
    dateBtnsRow: { flexDirection: 'row', gap: spacing.sm },
    dateBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    dateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    input: { borderWidth: 1.5, borderRadius: radii.md, padding: spacing.lg, fontSize: fontSize.md },
    textarea: { minHeight: 100 },
    photoRow: { alignItems: 'flex-start' },
    photoPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoPreview: { width: 120, height: 100, borderRadius: radii.lg },
    changePhotoText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginTop: spacing.xs },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.xl,
      padding: spacing.md,
    },
    deleteText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    notFound: { textAlign: 'center', marginTop: 80, fontSize: fontSize.lg },
  });
