import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import * as ImagePicker from 'expo-image-picker';
import { persistPickedImage } from '../../src/utils/persistImage';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { dateToStr, todayStr } from '../../src/utils/dateStr';
import { tapHaptic } from '../../src/utils/haptics';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

const ALL_TYPES: EntryType[] = [
  'watering', 'sowing', 'transplant', 'fertilizing', 'harvest',
  'pruning', 'pest', 'treatment', 'photo', 'note',
];
const ROW1 = ALL_TYPES.slice(0, 5);
const ROW2 = ALL_TYPES.slice(5);

export default function EditEntryScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { activeGarden } = useActiveGarden();
  const entries = useCollection<DiaryEntry>('diary_entries');
  const entry = entries.getById(id);

  const [selectedType, setSelectedType] = useState<EntryType>(entry?.type ?? 'watering');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [date, setDate] = useState(entry?.date ?? todayStr());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(entry?.photoUri ?? null);
  // watering
  const [waterLiters, setWaterLiters] = useState(String((entry?.data as any)?.liters ?? ''));
  const [waterMethod, setWaterMethod] = useState<'hand'|'drip'|'sprinkler'|'flood'>((entry?.data as any)?.method ?? 'hand');
  // harvest
  const [harvestWeight, setHarvestWeight] = useState(String((entry?.data as any)?.weightGrams ?? (entry?.data as any)?.weight ?? ''));
  const [harvestUnits, setHarvestUnits] = useState(String(entry?.data?.units ?? ''));
  const [harvestQuality, setHarvestQuality] = useState<number>(Number((entry?.data as any)?.quality ?? 0));
  // fertilizing
  const [fertProduct, setFertProduct] = useState(String((entry?.data as any)?.product ?? ''));
  const [fertAmount, setFertAmount] = useState(String((entry?.data as any)?.amount ?? ''));
  const [fertUnit, setFertUnit] = useState<'g'|'kg'|'ml'|'L'>((entry?.data as any)?.unit ?? 'g');
  // treatment
  const [treatProduct, setTreatProduct] = useState(String((entry?.data as any)?.product ?? ''));
  const [treatDose, setTreatDose] = useState(String((entry?.data as any)?.dose ?? ''));
  const [treatWaitDays, setTreatWaitDays] = useState(String((entry?.data as any)?.waitDays ?? ''));
  const [saving, setSaving] = useState(false);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (!entry || (activeGarden && entry.gardenId !== activeGarden.id)) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.lg }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.notFound, { color: colors.textSecondary }]}>{t('entryEdit.notFound')}</Text>
      </SafeAreaView>
    );
  }

  const selectedCfg = ENTRY_TYPE_CONFIG[selectedType];

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(await persistPickedImage(result.assets[0].uri));
  }

  async function handleSave() {
    setSaving(true);
    let entryData: Record<string, unknown> | undefined;
    if (selectedType === 'harvest' && (harvestWeight || harvestUnits || harvestQuality)) {
      entryData = {
        ...(harvestWeight ? { weightGrams: parseFloat(harvestWeight) || undefined } : {}),
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
      await entries.update(id, {
        type: selectedType,
        date,
        notes: notes.trim() || undefined,
        photoUri: photoUri ?? undefined,
        data: entryData,
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
          await entries.softRemove(id);
          router.back();
        },
      },
    ]);
  }

  function renderTypeChip(type: EntryType) {
    const cfg = ENTRY_TYPE_CONFIG[type];
    const active = selectedType === type;
    return (
      <Pressable
        key={type}
        onPress={() => { setSelectedType(type); tapHaptic(); }}
        style={[s.typeChip, { backgroundColor: active ? cfg.color + '22' : colors.surface, borderColor: active ? cfg.color : colors.border }]}
      >
        <View style={[s.typeChipIcon, { backgroundColor: active ? cfg.color + '30' : colors.surfaceAlt }]}>
          <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
        </View>
        <Text style={[s.typeLabel, { color: active ? cfg.color : colors.textSecondary }]} numberOfLines={1}>
          {t('diary.filters.' + type)}
        </Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header — tinted with selected type color */}
      <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: selectedCfg.color + '10' }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={{ fontSize: 20 }}>{selectedCfg.emoji}</Text>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('entryEdit.title')}</Text>
        </View>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={12}>
          <Text style={[{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }, saving && { opacity: 0.5 }]}>
            {t('entryEdit.save')}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <View style={s.body}>
            {/* Entry type — 2 rows of 5 */}
            <Text style={[s.label, { color: colors.textSecondary }]}>{t('entryNew.activityType')}</Text>
            <View style={{ gap: spacing.sm }}>
              <View style={s.typeRow}>{ROW1.map(renderTypeChip)}</View>
              <View style={s.typeRow}>{ROW2.map(renderTypeChip)}</View>
            </View>

            {/* Date */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>{t('entryNew.date')}</Text>
            <View style={[s.dateBtnsRow, { marginBottom: spacing.sm }]}>
              {([0, 1, 2] as const).map((days) => {
                const d = new Date();
                d.setDate(d.getDate() - days);
                const dateStr = dateToStr(d);
                const active = date === dateStr;
                const label = days === 0 ? t('entryNew.today') : days === 1 ? t('entryNew.yesterday') : t('entryNew.twoDaysAgo');
                return (
                  <Pressable
                    key={days}
                    onPress={() => setDate(dateStr)}
                    style={[s.dateBtn, { backgroundColor: active ? colors.primary + '22' : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[s.dateBtnText, { color: active ? colors.primary : colors.textSecondary }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[s.input, s.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={{ color: colors.text, fontSize: fontSize.md, flex: 1 }}>{date}</Text>
            </Pressable>

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={new Date(date + 'T12:00:00')}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(dateToStr(d)); }}
              />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
              <Modal transparent animationType="slide" visible>
                <Pressable style={s.dateModalOverlay} onPress={() => setShowDatePicker(false)}>
                  <Pressable style={[s.dateModalSheet, { backgroundColor: glassAvailable ? 'transparent' : colors.surface, overflow: 'hidden' }]} onPress={() => {}}>
                    {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
                    <View style={[s.dateModalHandle, { backgroundColor: colors.border }]} />
                    <DateTimePicker
                      value={new Date(date + 'T12:00:00')}
                      mode="date"
                      display="spinner"
                      onChange={(_, d) => { if (d) setDate(dateToStr(d)); }}
                      style={{ width: '100%' }}
                    />
                    <Button title={t('common.save')} onPress={() => setShowDatePicker(false)} size="lg" style={{ margin: spacing.xl, marginTop: 0 }} />
                  </Pressable>
                </Pressable>
              </Modal>
            )}

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

            {/* Watering extras */}
            {selectedType === 'watering' && (
              <View style={[s.extraCard, { backgroundColor: colors.water + '10', borderColor: colors.water + '44' }]}>
                <Text style={[s.extraCardTitle, { color: colors.water }]}>💧 {t('entryNew.watering')}</Text>
                <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.liters')}</Text>
                <TextInput
                  value={waterLiters}
                  onChangeText={setWaterLiters}
                  placeholder={t('entryNew.litersPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="decimal-pad"
                  style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                />
                <Text style={[s.inputLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>{t('entryNew.waterMethod')}</Text>
                <View style={s.methodRow}>
                  {(['hand','drip','sprinkler','flood'] as const).map((m) => (
                    <Pressable key={m} onPress={() => setWaterMethod(m)}
                      style={[s.methodChip, { flex: 1, backgroundColor: waterMethod === m ? colors.water + '22' : colors.surface, borderColor: waterMethod === m ? colors.water : colors.border }]}>
                      <Text style={{ fontSize: 16 }}>{m === 'hand' ? '🪣' : m === 'drip' ? '💧' : m === 'sprinkler' ? '🌦️' : '🌊'}</Text>
                      <Text style={[s.methodLabel, { color: waterMethod === m ? colors.water : colors.textSecondary }]} numberOfLines={1}>{t('waterMethod.' + m)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Harvest extras */}
            {selectedType === 'harvest' && (
              <View style={[s.extraCard, { backgroundColor: '#FF704310', borderColor: '#FF704344' }]}>
                <Text style={[s.extraCardTitle, { color: '#E65100' }]}>🧺 {t('entryNew.harvest')}</Text>
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
              </View>
            )}

            {/* Fertilizing extras */}
            {selectedType === 'fertilizing' && (
              <View style={[s.extraCard, { backgroundColor: '#4CAF5010', borderColor: '#4CAF5044' }]}>
                <Text style={[s.extraCardTitle, { color: '#2E7D32' }]}>🌿 {t('entryNew.fertilizing')}</Text>
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
              </View>
            )}

            {/* Treatment extras */}
            {selectedType === 'treatment' && (
              <View style={[s.extraCard, { backgroundColor: '#EF535010', borderColor: '#EF535044' }]}>
                <Text style={[s.extraCardTitle, { color: '#C62828' }]}>🧴 {t('entryNew.treatment')}</Text>
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
              </View>
            )}

            {/* Photo — full-width area */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('entryNew.photo')}</Text>
            <Pressable
              onPress={pickPhoto}
              style={[s.photoArea, { backgroundColor: colors.surfaceAlt, borderColor: photoUri ? 'transparent' : colors.border }]}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                    {t('entryNew.addPhoto')}
                  </Text>
                </>
              )}
            </Pressable>
            {photoUri && (
              <Pressable onPress={() => setPhotoUri(null)} style={{ alignSelf: 'center', marginTop: spacing.xs }}>
                <Text style={{ color: colors.error, fontSize: fontSize.xs }}>{t('entryEdit.removePhoto')}</Text>
              </Pressable>
            )}

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
    // Type grid — 2 rows of 5
    typeRow: { flexDirection: 'row', gap: spacing.sm },
    typeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: 2,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 4,
    },
    typeChipIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeLabel: { fontSize: 9, fontWeight: fontWeight.medium, textAlign: 'center' },
    // Date
    dateBtnsRow: { flexDirection: 'row', gap: spacing.sm },
    dateBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    dateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    input: { borderWidth: 1.5, borderRadius: radii.md, padding: spacing.lg, fontSize: fontSize.md },
    textarea: { minHeight: 100 },
    dateButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    dateModalSheet: { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: spacing.sm, alignItems: 'center' },
    dateModalHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: spacing.md },
    // Extra data cards
    extraCard: {
      marginTop: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 1.5,
      gap: spacing.sm,
    },
    extraCardTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
    methodRow: { flexDirection: 'row', gap: spacing.sm },
    methodChip: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: 4,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 3,
    },
    methodLabel: { fontSize: 9, fontWeight: fontWeight.medium, textAlign: 'center' },
    unitChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      alignItems: 'center',
    },
    // Photo
    photoArea: {
      height: 140,
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
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
