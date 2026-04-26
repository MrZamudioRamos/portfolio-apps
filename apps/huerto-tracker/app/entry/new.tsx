import { useColors, useTheme, Button, Card, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
import type { Plant } from '../../src/models/plant';
import type { Garden } from '../../src/models/garden';

const ALL_TYPES: EntryType[] = [
  'watering', 'sowing', 'transplant', 'fertilizing',
  'harvest', 'pruning', 'pest', 'treatment', 'photo', 'note',
];

export default function NewEntryScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();

  const { t } = useTranslation();
  const { plantId: paramPlantId } = useLocalSearchParams<{ plantId?: string }>();

  const gardens = useCollection<Garden>('gardens');
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');

  const gardenId = gardens.items[0]?.id ?? '';

  const [selectedType, setSelectedType] = useState<EntryType>('watering');
  const [selectedPlantId, setSelectedPlantId] = useState<string | undefined>(paramPlantId);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [harvestWeight, setHarvestWeight] = useState('');
  const [harvestUnits, setHarvestUnits] = useState('');
  const [saving, setSaving] = useState(false);

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
    if (!gardenId) return;
    setSaving(true);
    const harvestData =
      selectedType === 'harvest' && (harvestWeight || harvestUnits)
        ? {
            ...(harvestWeight ? { weight: harvestWeight } : {}),
            ...(harvestUnits ? { units: harvestUnits } : {}),
          }
        : undefined;
    try {
      await entries.create({
        gardenId,
        ...(selectedPlantId ? { plantId: selectedPlantId } : {}),
        type: selectedType,
        date,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(photoUri ? { photoUri } : {}),
        ...(harvestData ? { data: harvestData } : {}),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('entryNew.title')}</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={12}>
          <Text style={[{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }, saving && { opacity: 0.5 }]}>
            {saving ? t('entryNew.saving') : t('entryNew.save')}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
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
                      {cfg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Plant selector */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>
              {t('entryNew.plant')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable
                  onPress={() => setSelectedPlantId(undefined)}
                  style={[
                    s.plantChip,
                    {
                      backgroundColor: !selectedPlantId ? colors.primary + '22' : colors.surface,
                      borderColor: !selectedPlantId ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>🏡</Text>
                  <Text style={[s.plantChipLabel, { color: !selectedPlantId ? colors.primary : colors.textSecondary }]}>
                    {t('entryNew.general')}
                  </Text>
                </Pressable>
                {plants.items.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelectedPlantId(p.id)}
                    style={[
                      s.plantChip,
                      {
                        backgroundColor: selectedPlantId === p.id ? colors.primary + '22' : colors.surface,
                        borderColor: selectedPlantId === p.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>🌱</Text>
                    <Text style={[s.plantChipLabel, { color: selectedPlantId === p.id ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Date */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.md }]}>{t('entryNew.date')}</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder={t('entryNew.datePlaceholder')}
              placeholderTextColor={colors.textDisabled}
              style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              keyboardType="numeric"
            />

            {/* Notes */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
              {t('entryNew.notes')}
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t('entryNew.notesPlaceholder')}
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                s.input,
                s.textarea,
                {
                  backgroundColor: colors.surface,
                  borderColor: notes ? colors.primary : colors.border,
                  color: colors.text,
                },
              ]}
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
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
              {t('entryNew.photo')}
            </Text>
            <Pressable onPress={pickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={s.photoPreview} />
              ) : (
                <View style={[s.photoPlaceholder, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 }}>
                    {t('entryNew.addPhoto')}
                  </Text>
                </View>
              )}
            </Pressable>

            <Button
              title={t('entryNew.saveEntry')}
              onPress={handleSave}
              loading={saving}
              size="lg"
              style={{ marginTop: spacing.xl }}
            />
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
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    typeChip: {
      width: '22%',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 4,
    },
    typeLabel: { fontSize: 10, fontWeight: fontWeight.medium, textAlign: 'center' },
    plantChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
      gap: 5,
    },
    plantChipLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, maxWidth: 80 },
    input: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      padding: spacing.lg,
      fontSize: fontSize.md,
    },
    textarea: { minHeight: 100 },
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
  });
