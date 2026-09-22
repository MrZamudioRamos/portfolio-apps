import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useStreak } from '@portfolio/share';
import { usePickPhoto } from '../../src/hooks/usePickPhoto';
import { DatePickerModal } from '../../src/components/DatePickerModal';
import { successHaptic, tapHaptic } from '../../src/utils/haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShareModal, type ShareModalProps } from '../../src/components/ShareModal';
import {
  Image,
  ActivityIndicator,
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
import type { Plant } from '../../src/models/plant';
import { CROPS_BY_ID } from '../../src/data/crops';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { dateToStr, todayStr } from '../../src/utils/dateStr';
import { goBackOr } from '../../src/utils/navigation';

const ENTRY_TYPE_ICONS: Record<EntryType, keyof typeof Ionicons.glyphMap> = {
  watering: 'water-outline',
  sowing: 'leaf-outline',
  transplant: 'flower-outline',
  fertilizing: 'flask-outline',
  harvest: 'basket-outline',
  pruning: 'cut-outline',
  pest: 'bug-outline',
  treatment: 'medkit-outline',
  photo: 'camera-outline',
  note: 'document-text-outline',
};

const WATER_METHOD_ICONS: Record<'hand' | 'drip' | 'sprinkler' | 'flood', keyof typeof Ionicons.glyphMap> = {
  hand: 'beaker-outline',
  drip: 'water-outline',
  sprinkler: 'rainy-outline',
  flood: 'swap-vertical-outline',
};

const ALL_TYPES: EntryType[] = [
  'watering', 'sowing', 'transplant', 'fertilizing',
  'harvest', 'pruning', 'pest', 'treatment', 'photo', 'note',
];

export default function NewEntryScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { plantId: paramPlantId, type: paramType } = useLocalSearchParams<{ plantId?: string; type?: string }>();

  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const gardenId = activeGarden?.id ?? '';

  const initialEntryType = ALL_TYPES.includes(paramType as EntryType) ? paramType as EntryType : 'watering';
  const [selectedType, setSelectedType] = useState<EntryType>(initialEntryType);
  const [selectedPlantId, setSelectedPlantId] = useState<string | undefined>(paramPlantId);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayStr());
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [dateError, setDateError] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { pickFromGallery } = usePickPhoto({ aspect: [4, 3] });
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
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [shareModal, setShareModal] = useState<Omit<ShareModalProps, 'visible' | 'onClose'> | null>(null);
  const { registerActivity, isMilestone } = useStreak('huerto-tracker');

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => goBackOr(router), 1200);
    return () => clearTimeout(timer);
  }, [router, saved]);

  async function pickPhoto() {
    const result = await pickFromGallery();
    if (result.kind === 'success') setPhotoUri(result.uri);
  }

  async function handleSave() {
    if (!gardenId) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + 'T12:00:00').getTime())) {
      setDateError(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setDateError(false);
    setSaving(true);
    setSaveError(false);
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
    const validPlantId = selectedPlantId && plants.items.some(
      (p) => p.id === selectedPlantId && p.gardenId === gardenId
    ) ? selectedPlantId : undefined;
    try {
      await entries.create({
        gardenId,
        ...(validPlantId ? { plantId: validPlantId } : {}),
        type: selectedType,
        date,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(photoUri ? { photoUri } : {}),
        ...(entryData ? { data: entryData } : {}),
      });
      successHaptic();
      const { current, isNew } = await registerActivity();
      let triggered = false;
      if (!triggered && selectedType === 'harvest' && validPlantId) {
        const prevHarvests = entries.items.filter(
          (e) => e.plantId === validPlantId && e.type === 'harvest'
        );
        if (prevHarvests.length === 0) {
          const plant = plants.items.find((p) => p.id === validPlantId);
          const crop = plant ? CROPS_BY_ID[plant.cropId] : null;
          const sowDays = plant?.sowingDate
            ? Math.floor((Date.now() - new Date(plant.sowingDate + 'T12:00:00').getTime()) / 86_400_000)
            : null;
          setShareModal({
            eventType: 'first_harvest',
            title: t('share.firstHarvestTitle', { plant: plant?.name ?? '' }),
            primaryStat: sowDays != null ? `${sowDays}d` : '🎉',
            primaryStatLabel: sowDays != null ? t('share.sinceSowingLabel') : undefined,
            badgeIcon: crop?.emoji ?? '🧺',
          });
          triggered = true;
        }
      }
      if (!triggered && isNew && isMilestone(current)) {
        setShareModal({
          eventType: 'streak_milestone',
          title: t('share.streakTitle', { count: current }),
          primaryStat: `${current}`,
          primaryStatLabel: t('share.streakStatLabel'),
          badgeIcon: '🔥',
        });
        triggered = true;
      }
      if (!triggered) {
        setSaved(true);
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
      }
    } catch {
      setSaveError(true);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
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
      <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => goBackOr(router)}
          hitSlop={12}
          style={({ pressed }) => [s.headerButton, { opacity: pressed ? 0.55 : 1 }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('entryNew.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {(plants.loading || entries.loading) && plants.items.length === 0 && entries.items.length === 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md }} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.loading')}</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 112 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.body}>

            {saveError && (
              <View accessibilityRole="alert" style={[s.feedback, { backgroundColor: colors.error + '12', borderColor: colors.error + '55' }]}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
                <Text style={[s.feedbackText, { color: colors.error }]}>{t('entryNew.saveError')}</Text>
              </View>
            )}

            {saved && (
              <View accessibilityLiveRegion="polite" style={[s.feedback, { backgroundColor: colors.success + '12', borderColor: colors.success + '55' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.feedbackTitle, { color: colors.success }]}>{t('entryNew.saved')}</Text>
                  <Text style={[s.feedbackText, { color: colors.textSecondary }]}>{t('entryNew.savedDesc')}</Text>
                </View>
              </View>
            )}

            {/* Entry type — large, plain-language options */}
            <Text style={[s.label, { color: colors.textSecondary }]}>{t('entryNew.activityType')}</Text>
            <View style={s.typeGrid}>
              {ALL_TYPES.map((type) => {
                const cfg = ENTRY_TYPE_CONFIG[type];
                const active = selectedType === type;
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => { setSelectedType(type); tapHaptic(); }}
                    style={({ pressed }) => [s.typeChip, { backgroundColor: active ? cfg.color + '18' : colors.surface, borderColor: active ? cfg.color : colors.border, opacity: pressed ? 0.76 : 1 }]}
                  >
                    <View style={[s.typeChipIcon, { backgroundColor: active ? cfg.color + '22' : colors.surfaceAlt }]}>
                      <Ionicons name={ENTRY_TYPE_ICONS[type]} size={20} color={active ? cfg.color : colors.textSecondary} />
                    </View>
                    <Text style={[s.typeLabel, { color: active ? cfg.color : colors.text }]}>
                      {t('diary.filters.' + type)}
                    </Text>
                    {active && <Ionicons name="checkmark-circle" size={17} color={cfg.color} />}
                  </Pressable>
                );
              })}
            </View>

            {selectedType === 'watering' && (
              <View style={[s.careRule, { backgroundColor: colors.accent + '55', borderColor: colors.secondary + '66' }]}>
                <Ionicons name="water-outline" size={18} color={colors.primary} />
                <Text style={[s.careRuleText, { color: colors.text }]}>Primero toca la tierra a 2 cm: si sigue húmeda, no hace falta regar todavía.</Text>
              </View>
            )}

            {/* Plant selector */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>
              {t('entryNew.plant')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !selectedPlantId }}
                  onPress={() => setSelectedPlantId(undefined)}
                  style={({ pressed }) => [s.plantChip, { backgroundColor: !selectedPlantId ? colors.primary + '22' : colors.surface, borderColor: !selectedPlantId ? colors.primary : colors.border, opacity: pressed ? 0.75 : 1 }]}
                >
                  <Ionicons name="home-outline" size={17} color={!selectedPlantId ? colors.primary : colors.textSecondary} />
                  <Text style={[s.plantChipLabel, { color: !selectedPlantId ? colors.primary : colors.textSecondary }]}>
                    {t('entryNew.general')}
                  </Text>
                </Pressable>
                {plants.items.filter((p) => p.gardenId === gardenId).map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedPlantId === p.id }}
                    onPress={() => setSelectedPlantId(p.id)}
                    style={({ pressed }) => [s.plantChip, { backgroundColor: selectedPlantId === p.id ? colors.primary + '22' : colors.surface, borderColor: selectedPlantId === p.id ? colors.primary : colors.border, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Ionicons name="leaf-outline" size={17} color={selectedPlantId === p.id ? colors.primary : colors.textSecondary} />
                    <Text style={[s.plantChipLabel, { color: selectedPlantId === p.id ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Date — quick buttons + calendar picker */}
            <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.md }]}>{t('entryNew.date')}</Text>
            <DatePickerModal
              value={date}
              onChange={(nextDate) => { setDate(nextDate); setDateError(false); }}
              quickChips={[0, 1, 2]}
              i18nPrefix="entryNew"
              inputStyle={dateError ? [s.input, { borderColor: colors.error }] : s.input}
            />
            {dateError && (
              <View style={s.inlineError} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={[s.inlineErrorText, { color: colors.error }]}>{t('entryNew.invalidDateMsg')}</Text>
              </View>
            )}

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
              style={[s.input, s.textarea, { backgroundColor: colors.surface, borderColor: notes ? colors.primary : colors.border, color: colors.text }]}
            />

            {/* Watering extras */}
            {selectedType === 'watering' && (
              <>
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('entryNew.watering')}</Text>
                <View style={{ marginBottom: spacing.sm }}>
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
                <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('entryNew.waterMethod')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {(['hand','drip','sprinkler','flood'] as const).map((m) => (
                    <Pressable key={m} onPress={() => setWaterMethod(m)}
                      style={[s.methodChip, { backgroundColor: waterMethod === m ? colors.primary + '22' : colors.surface, borderColor: waterMethod === m ? colors.primary : colors.border }]}>
                      <Ionicons name={WATER_METHOD_ICONS[m]} size={18} color={waterMethod === m ? colors.primary : colors.textSecondary} />
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('entryNew.addPhoto')}
              onPress={pickPhoto}
              style={({ pressed }) => [s.photoArea, { backgroundColor: colors.surfaceAlt, borderColor: photoUri ? 'transparent' : colors.border, opacity: pressed ? 0.82 : 1 }]}
            >
              {photoUri ? (
                <>
                  <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={[s.photoBadge, { backgroundColor: colors.surface }]}>
                    <Ionicons name="checkmark" size={15} color={colors.success} />
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                    {t('entryNew.addPhoto')}
                  </Text>
                </>
              )}
            </Pressable>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title={t('entryNew.saveEntry')}
          onPress={handleSave}
          loading={saving}
          disabled={saving || saved}
          size="lg"
        />
      </View>

      {shareModal && (
        <ShareModal
          {...shareModal}
          visible
          onClose={() => { setShareModal(null); goBackOr(router); }}
        />
      )}
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
    container: { flex: 1, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden' },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: spacing.sm },
    feedback: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.lg },
    feedbackTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    feedbackText: { flex: 1, fontSize: fontSize.sm, lineHeight: 19 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
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
      width: '47%',
      minHeight: 70,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: spacing.sm,
    },
    typeChipIcon: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    careRule: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.md },
    careRuleText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
    plantChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 44,
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
    inlineError: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
    inlineErrorText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17 },
    photoArea: {
      height: 128,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photoBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 28, height: 28, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
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
    footer: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      ...Platform.select({
        web: { boxShadow: '0px -2px 5px rgba(0, 0, 0, 0.06)' },
        default: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 4 },
      }),
    },
  });
