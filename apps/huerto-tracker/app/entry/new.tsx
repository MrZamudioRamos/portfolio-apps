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
import { CROPS_BY_ID } from '../../src/data/crops';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';

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

  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');

  const gardenId = activeGarden?.id ?? '';

  const [selectedType, setSelectedType] = useState<EntryType>('watering');
  const [selectedPlantId, setSelectedPlantId] = useState<string | undefined>(paramPlantId);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // watering
  const [waterLiters, setWaterLiters] = useState('');
  const [waterMethod, setWaterMethod] = useState<'hand'|'drip'|'sprinkler'|'flood'>('hand');
  // harvest
  const [harvestWeight, setHarvestWeight] = useState('');
  const [harvestUnits, setHarvestUnits] = useState('');
  const [harvestQuality, setHarvestQuality] = useState(0);
  // fertilizing
  const [fertProduct, setFertProduct] = useState('');
  const [fertAmount, setFertAmount] = useState('');
  const [fertUnit, setFertUnit] = useState<'g'|'kg'|'ml'|'L'>('g');
  // treatment
  const [treatProduct, setTreatProduct] = useState('');
  const [treatDose, setTreatDose] = useState('');
  const [treatWaitDays, setTreatWaitDays] = useState('');
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
    let entryData: Record<string, unknown> | undefined;
    if (selectedType === 'harvest' && (harvestWeight || harvestUnits || harvestQuality)) {
      entryData = {
        ...(harvestWeight ? { weight: harvestWeight } : {}),
        ...(harvestUnits ? { units: harvestUnits } : {}),
        ...(harvestQuality ? { quality: harvestQuality } : {}),
      };
    } else if (selectedType === 'watering' && (waterLiters || waterMethod !== 'hand')) {
      entryData = {
        ...(waterLiters ? { liters: waterLiters } : {}),
        method: waterMethod,
      };
    } else if (selectedType === 'fertilizing' && (fertProduct || fertAmount)) {
      entryData = {
        ...(fertProduct ? { product: fertProduct } : {}),
        ...(fertAmount ? { amount: fertAmount, unit: fertUnit } : {}),
      };
    } else if (selectedType === 'treatment' && (treatProduct || treatDose || treatWaitDays)) {
      entryData = {
        ...(treatProduct ? { product: treatProduct } : {}),
        ...(treatDose ? { dose: treatDose } : {}),
        ...(treatWaitDays ? { waitDays: Number(treatWaitDays) } : {}),
      };
    }
    try {
      await entries.create({
        gardenId,
        ...(selectedPlantId ? { plantId: selectedPlantId } : {}),
        type: selectedType,
        date,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(photoUri ? { photoUri } : {}),
        ...(entryData ? { data: entryData } : {}),
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
                        backgroundColor: active ? colors.primary + '22' : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>{cfg.emoji}</Text>
                    <Text style={[s.typeLabel, { color: active ? colors.primary : colors.textSecondary }]}>
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
                    <Text style={{ fontSize: 16 }}>{CROPS_BY_ID[p.cropId]?.emoji ?? '🌱'}</Text>
                    <Text style={[s.plantChipLabel, { color: selectedPlantId === p.id ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Date */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.md }]}>{t('entryNew.date')}</Text>
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

            {/* Watering extras */}
            {selectedType === 'watering' && (
              <>
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('entryNew.watering')}</Text>
                <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.liters')}</Text>
                    <TextInput
                      value={waterLiters}
                      onChangeText={setWaterLiters}
                      placeholder={t('entryNew.litersPlaceholder')}
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="decimal-pad"
                      style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    />
                  </View>
                </View>
                <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.waterMethod')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {(['hand','drip','sprinkler','flood'] as const).map((m) => (
                    <Pressable key={m} onPress={() => setWaterMethod(m)}
                      style={[s.methodChip, { backgroundColor: waterMethod === m ? colors.primary + '22' : colors.surface, borderColor: waterMethod === m ? colors.primary : colors.border }]}>
                      <Text style={{ fontSize: 18 }}>{m === 'hand' ? '🪣' : m === 'drip' ? '💧' : m === 'sprinkler' ? '🌦️' : '🌊'}</Text>
                      <Text style={[s.methodLabel, { color: waterMethod === m ? colors.primary : colors.textSecondary }]}>{t('waterMethod.' + m)}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

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
                <Text style={[s.inputLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>{t('entryNew.harvestQuality')}</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                  {[1,2,3,4,5].map((star) => (
                    <Pressable key={star} onPress={() => setHarvestQuality(star === harvestQuality ? 0 : star)} hitSlop={8}>
                      <Text style={{ fontSize: 28 }}>{star <= harvestQuality ? '⭐' : '☆'}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Fertilizing extras */}
            {selectedType === 'fertilizing' && (
              <>
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('entryNew.fertilizing')}</Text>
                <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.fertProduct')}</Text>
                <TextInput
                  value={fertProduct}
                  onChangeText={setFertProduct}
                  placeholder={t('entryNew.fertProductPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginBottom: spacing.sm }]}
                />
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.fertAmount')}</Text>
                    <TextInput
                      value={fertAmount}
                      onChangeText={setFertAmount}
                      placeholder="50"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="decimal-pad"
                      style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.fertUnit')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {(['g','kg','ml','L'] as const).map((u) => (
                        <Pressable key={u} onPress={() => setFertUnit(u)}
                          style={[s.unitChip, { backgroundColor: fertUnit === u ? colors.primary + '22' : colors.surface, borderColor: fertUnit === u ? colors.primary : colors.border }]}>
                          <Text style={{ fontSize: fontSize.sm, color: fertUnit === u ? colors.primary : colors.textSecondary, fontWeight: fontWeight.semibold }}>{u}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Treatment extras */}
            {selectedType === 'treatment' && (
              <>
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('entryNew.treatment')}</Text>
                <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.treatProduct')}</Text>
                <TextInput
                  value={treatProduct}
                  onChangeText={setTreatProduct}
                  placeholder={t('entryNew.treatProductPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginBottom: spacing.sm }]}
                />
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.treatDose')}</Text>
                    <TextInput
                      value={treatDose}
                      onChangeText={setTreatDose}
                      placeholder={t('entryNew.treatDosePlaceholder')}
                      placeholderTextColor={colors.textDisabled}
                      style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.treatWaitDays')}</Text>
                    <TextInput
                      value={treatWaitDays}
                      onChangeText={setTreatWaitDays}
                      placeholder={t('entryNew.treatWaitDaysPlaceholder')}
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
    dateBtnsRow: { flexDirection: 'row', gap: spacing.sm },
    dateBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    dateBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    methodChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 6,
    },
    methodLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    unitChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      alignItems: 'center',
    },
  });
