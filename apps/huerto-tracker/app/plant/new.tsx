import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { createStore, useCollection } from '@portfolio/storage';
import { useSession } from '@portfolio/supabase';
import { usePro as usePurchases } from '../../src/hooks/usePro';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import * as ImagePicker from 'expo-image-picker';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID, CROPS_BY_CATEGORY, CATEGORY_CONFIG, type CropInfo } from '../../src/data/crops';
import { CROP_IMAGES } from '../../src/data/cropImages';
import { useCustomCrops } from '../../src/hooks/useCustomCrops';
import { dateToStr, todayStr } from '../../src/utils/dateStr';
import { VARIETIES_BY_CROP, type VarietyInfo } from '../../src/data/varieties';
import { getCompanions } from '../../src/data/companions';
import { PLANT_STATUS_CONFIG, type Plant, type PropagationMethod } from '../../src/models/plant';
import type { DiaryEntry } from '../../src/models/diary-entry';
import { track, EVENTS } from '../../src/analytics';
import { persistPickedImage } from '../../src/utils/persistImage';
import { successHaptic, tapHaptic } from '../../src/utils/haptics';
import { ScalePress } from '../../src/components/ScalePress';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

const STATIC_SECTIONS = (Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map((cat) => ({
  title: cat,
  data: CROPS_BY_CATEGORY[cat],
}));

// 4 key milestones for the visual stage picker (matching GrowIt's Inicio/Plántula/Floración/Cosecha)
const QUICK_STAGES: Plant['status'][] = ['seedling', 'growing', 'flowering', 'harvesting'];

export default function NewPlantScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { cropId: paramCropId, scan: scanParam, status: statusParam, fromOnboarding } = useLocalSearchParams<{ cropId?: string; scan?: string; status?: string; fromOnboarding?: string }>();

  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const diaryStore = useMemo(() => createStore<DiaryEntry>('diary_entries'), []);
  const { isGuest } = useSession();
  const { isPro, loading: proLoading } = usePurchases();

  const plantLimit = isGuest ? 3 : isPro ? Infinity : 20;
  const gardenPlantCount = activeGarden?.id
    ? plants.items.filter((p) => p.gardenId === activeGarden.id).length
    : plants.count;
  const atLimit = !proLoading && gardenPlantCount >= plantLimit;

  const { collection: customCropsCollection, customCropsById } = useCustomCrops();

  // 2-step flow: 'select' → 'details'. Skip step 1 if crop pre-selected (scan / SowNow)
  const [step, setStep] = useState<'select' | 'details'>(paramCropId ? 'details' : 'select');

  const [selectedCropId, setSelectedCropId] = useState<string | null>(paramCropId ?? null);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [cropSearch, setCropSearch] = useState('');
  const [pickerImgErr, setPickerImgErr] = useState<Record<string, boolean>>({});
  const [plantName, setPlantName] = useState(() => {
    if (!paramCropId) return '';
    const staticCrop = CROPS_BY_ID[paramCropId];
    return staticCrop ? (t('crops.' + paramCropId + '.name') || staticCrop.name) : '';
  });
  const [variety, setVariety] = useState('');
  const [varietyId, setVarietyId] = useState<string | null>(null);
  const [sowingDate, setSowingDate] = useState(todayStr());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [propagationMethod, setPropagationMethod] = useState<PropagationMethod>('seed');
  // Stage selector — replaces the hidden initialStatus param
  const [selectedStatus, setSelectedStatus] = useState<Plant['status']>(() => {
    const VALID: Plant['status'][] = ['seedling','transplanted','growing','flowering','fruiting','harvesting','finished'];
    return (VALID.includes(statusParam as Plant['status']) ? statusParam : 'seedling') as Plant['status'];
  });
  const [saving, setSaving] = useState(false);
  const isAiFilled = scanParam === '1';

  const selectedCrop = selectedCropId
    ? (CROPS_BY_ID[selectedCropId] ?? customCropsById[selectedCropId] ?? null)
    : null;

  const filteredSections = useMemo(() => {
    const q = cropSearch.trim().toLowerCase();
    const staticSections = STATIC_SECTIONS.map((sec) => ({
      ...sec,
      data: q
        ? sec.data.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              t('crops.' + c.id + '.name').toLowerCase().includes(q)
          )
        : sec.data,
    })).filter((sec) => sec.data.length > 0);

    const customMatches = customCropsCollection.items.filter((cc) =>
      !q || cc.name.toLowerCase().includes(q)
    );
    const mycropsSection =
      customMatches.length > 0
        ? [{ title: '__mycrops__' as any, data: customMatches.map((cc) => customCropsById[cc.id]).filter(Boolean) as CropInfo[] }]
        : [];

    return [...mycropsSection, ...staticSections];
  }, [cropSearch, t, customCropsCollection.items, customCropsById]);

  const cropVarieties = selectedCropId ? (VARIETIES_BY_CROP[selectedCropId] ?? []) : [];

  function handleSelectCrop(crop: CropInfo) {
    setSelectedCropId(crop.id);
    if (!plantName) {
      const label = crop.isCustom ? crop.name : (t('crops.' + crop.id + '.name') || crop.name);
      setPlantName(label);
    }
    setShowCropPicker(false);
    setCropSearch('');
    setVarietyId(null);
    setVariety('');
    setStep('details'); // advance to form step
  }

  function handleSelectVariety(v: VarietyInfo | null) {
    if (v === null) {
      setVarietyId(null);
      setVariety('');
    } else {
      setVarietyId(v.id);
      setVariety(v.name);
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(await persistPickedImage(result.assets[0].uri));
  }

  async function handleSave() {
    if (!selectedCropId || !plantName.trim()) return;
    if (atLimit) {
      router.push('/paywall');
      return;
    }
    const gardenId = activeGarden?.id;
    if (!gardenId) return;
    setSaving(true);
    try {
      const newPlant = await plants.create({
        gardenId,
        cropId: selectedCropId,
        name: plantName.trim(),
        ...(variety.trim() ? { variety: variety.trim() } : {}),
        ...(varietyId ? { varietyId } : {}),
        sowingDate,
        status: selectedStatus,
        propagationMethod,
        ...(photoUri ? { photoUri } : {}),
      });
      await diaryStore.create({
        gardenId,
        plantId: newPlant.id,
        type: 'sowing',
        date: sowingDate,
      });
      track(EVENTS.plantAdded, { cropId: selectedCropId, fromScan: isAiFilled });
      successHaptic();
      if (fromOnboarding === '1') router.replace('/(tabs)');
      else if (isAiFilled && router.canGoBack()) router.dismissAll();
      else if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  }

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function goBack() {
    if (step === 'details' && !paramCropId) {
      setStep('select');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  const cropName = selectedCrop
    ? (selectedCrop.isCustom ? selectedCrop.name : t('crops.' + selectedCrop.id + '.name'))
    : '';

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Ionicons
            name={step === 'details' && !paramCropId ? 'arrow-back' : 'close'}
            size={24}
            color={colors.textSecondary}
          />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('plantNew.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── STEP 1: Choose how to add ── */}
      {step === 'select' && (
        <View style={s.entryContainer}>
          <Text style={[s.entrySubtitle, { color: colors.textSecondary }]}>
            {t('plantNew.selectCrop')}
          </Text>

          {isPro && (
            <ScalePress
              onPress={() => router.push('/plant/scan' as any)}
              style={[s.entryBtn, { backgroundColor: colors.primary, ...shadows.md }]}
            >
              <View style={[s.entryBtnIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="scan-outline" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.entryBtnTitle, { color: '#fff' }]}>{t('plantNew.scanTitle')}</Text>
                <Text style={[s.entryBtnDesc, { color: 'rgba(255,255,255,0.75)' }]}>{t('plantNew.scanDesc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
            </ScalePress>
          )}

          <ScalePress
            onPress={() => setShowCropPicker(true)}
            style={[s.entryBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5, ...shadows.sm }]}
          >
            <View style={[s.entryBtnIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="search-outline" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.entryBtnTitle, { color: colors.text }]}>{t('plantNew.cropPickerTitle')}</Text>
              <Text style={[s.entryBtnDesc, { color: colors.textSecondary }]}>{t('catalog.title')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          </ScalePress>
        </View>
      )}

      {/* ── STEP 2: Plant details ── */}
      {step === 'details' && (
        <>
          {isAiFilled && (
            <View style={[s.aiBanner, { backgroundColor: colors.primary + '18', borderBottomColor: colors.primary + '33' }]}>
              <Text style={[s.aiBannerText, { color: colors.primary }]}>{t('plantScan.aiFilled')}</Text>
            </View>
          )}

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Crop hero — prominent image + name + change link */}
              {selectedCrop && (
                <View style={[s.cropHero, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                  <View style={[s.cropHeroImg, { backgroundColor: colors.surfaceAlt }]}>
                    {CROP_IMAGES[selectedCrop.id] && !pickerImgErr[selectedCrop.id] ? (
                      <Image
                        source={{ uri: CROP_IMAGES[selectedCrop.id] }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                        onError={() => setPickerImgErr(p => ({ ...p, [selectedCrop.id]: true }))}
                      />
                    ) : (
                      <Text style={{ fontSize: 38 }}>{selectedCrop.emoji}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cropHeroName, { color: colors.text }]}>{cropName}</Text>
                    <Text style={[s.cropHeroCategory, { color: colors.textSecondary }]}>
                      {t('cropCategory.' + selectedCrop.category)}
                    </Text>
                  </View>
                  <Pressable onPress={() => setShowCropPicker(true)} hitSlop={8}>
                    <Text style={[s.changeText, { color: colors.primary }]}>{t('plantNew.changeCrop')}</Text>
                  </Pressable>
                </View>
              )}

              <View style={s.formContainer}>
                {/* Companion hint */}
                {selectedCrop && (() => {
                  const companions = getCompanions(selectedCrop.id).slice(0, 4);
                  if (!companions.length) return null;
                  return (
                    <View style={[s.companionHint, { backgroundColor: '#4CAF5012', borderColor: '#4CAF5055' }]}>
                      <Text style={[s.companionHintText, { color: '#2E7D32' }]}>
                        🤝 {t('plantNew.goodWith')}{' '}
                        {companions.map((c) => `${c.emoji} ${t('crops.' + c.id + '.name', { defaultValue: c.name })}`).join('  ')}
                      </Text>
                    </View>
                  );
                })()}

                {/* Plant name */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('plantNew.nameLabel')}</Text>
                <TextInput
                  value={plantName}
                  onChangeText={setPlantName}
                  placeholder={t('plantNew.namePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  style={[s.input, { backgroundColor: colors.surface, borderColor: plantName ? colors.primary : colors.border, color: colors.text }]}
                />

                {/* Variety */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                  {t('plantNew.varietyLabel')}
                </Text>
                {cropVarieties.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: spacing.sm }}
                    contentContainerStyle={{ gap: spacing.sm, paddingBottom: 2 }}
                  >
                    <Pressable
                      onPress={() => handleSelectVariety(null)}
                      style={[s.varietyChip, { backgroundColor: !varietyId ? colors.primary + '22' : colors.surface, borderColor: !varietyId ? colors.primary : colors.border }]}
                    >
                      <Text style={[s.varietyChipText, { color: !varietyId ? colors.primary : colors.textSecondary }]}>
                        🌱 {t('plantNew.varietyGeneric')}
                      </Text>
                    </Pressable>
                    {cropVarieties.map((v) => {
                      const active = varietyId === v.id;
                      return (
                        <Pressable
                          key={v.id}
                          onPress={() => handleSelectVariety(v)}
                          style={[s.varietyChip, { backgroundColor: active ? colors.primary + '22' : colors.surface, borderColor: active ? colors.primary : colors.border }]}
                        >
                          <Text style={[s.varietyChipText, { color: active ? colors.primary : colors.text }]}>
                            {t('varieties.' + v.id, { defaultValue: v.name })}
                          </Text>
                          <Text style={[s.varietyChipDays, { color: colors.textSecondary }]}>
                            {v.daysToHarvest[0]}–{v.daysToHarvest[1]}d
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
                <TextInput
                  value={variety}
                  onChangeText={(text) => { setVariety(text); setVarietyId(null); }}
                  placeholder={t('plantNew.varietyPlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  style={[s.input, { backgroundColor: colors.surface, borderColor: variety ? colors.primary : colors.border, color: colors.text }]}
                />

                {/* Growth stage — visual 4-chip picker */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>{t('plantNew.stageLabel')}</Text>
                <View style={s.stageRow}>
                  {QUICK_STAGES.map((stage) => {
                    const cfg = PLANT_STATUS_CONFIG[stage];
                    const active = selectedStatus === stage;
                    return (
                      <Pressable
                        key={stage}
                        onPress={() => { setSelectedStatus(stage); tapHaptic(); }}
                        style={[s.stageChip, { backgroundColor: active ? cfg.color + '20' : colors.surface, borderColor: active ? cfg.color : colors.border }]}
                      >
                        <Text style={{ fontSize: 26 }}>{cfg.emoji}</Text>
                        <Text style={[s.stageLabel, { color: active ? cfg.color : colors.textSecondary }]} numberOfLines={1}>
                          {t('plantStatus.' + stage)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Propagation method — 4 chips in one row */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>{t('plantNew.propagationLabel')}</Text>
                <View style={s.methodRow}>
                  {([
                    { value: 'seed',     emoji: '🌱', key: 'plantNew.propSeed' },
                    { value: 'cutting',  emoji: '✂️', key: 'plantNew.propCutting' },
                    { value: 'division', emoji: '🌿', key: 'plantNew.propDivision' },
                    { value: 'bought',   emoji: '🛒', key: 'plantNew.propBought' },
                  ] as const).map((opt) => {
                    const active = propagationMethod === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => { setPropagationMethod(opt.value); tapHaptic(); }}
                        style={[s.methodChip, { backgroundColor: active ? colors.primary + '22' : colors.surface, borderColor: active ? colors.primary : colors.border }]}
                      >
                        <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                        <Text style={[s.methodLabel, { color: active ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                          {t(opt.key)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Sowing date */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>{t('plantNew.sowingDate')}</Text>
                <View style={[s.dateBtnsRow, { marginBottom: spacing.sm }]}>
                  {([0, 1] as const).map((days) => {
                    const d = new Date();
                    d.setDate(d.getDate() - days);
                    const dateStr = dateToStr(d);
                    const active = sowingDate === dateStr;
                    return (
                      <Pressable
                        key={days}
                        onPress={() => setSowingDate(dateStr)}
                        style={[s.dateBtn, { backgroundColor: active ? colors.primary + '22' : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border }]}
                      >
                        <Text style={[s.dateBtnText, { color: active ? colors.primary : colors.textSecondary }]}>
                          {days === 0 ? t('entryNew.today') : t('entryNew.yesterday')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.text, fontSize: fontSize.md, flex: 1 }}>{sowingDate}</Text>
                </Pressable>

                {showDatePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={new Date(sowingDate)}
                    mode="date"
                    display="default"
                    onChange={(_, date) => { setShowDatePicker(false); if (date) setSowingDate(dateToStr(date)); }}
                  />
                )}
                {showDatePicker && Platform.OS === 'ios' && (
                  <Modal transparent animationType="slide" visible>
                    <Pressable style={s.dateModalOverlay} onPress={() => setShowDatePicker(false)}>
                      <Pressable style={[s.dateModalSheet, { backgroundColor: glassAvailable ? 'transparent' : colors.surface, overflow: 'hidden' }]} onPress={() => {}}>
                        {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
                        <View style={[s.dateModalHandle, { backgroundColor: colors.border }]} />
                        <DateTimePicker
                          value={new Date(sowingDate)}
                          mode="date"
                          display="spinner"
                          onChange={(_, date) => { if (date) setSowingDate(dateToStr(date)); }}
                          style={{ width: '100%' }}
                        />
                        <Button
                          title={t('common.save')}
                          onPress={() => setShowDatePicker(false)}
                          size="lg"
                          style={{ margin: spacing.xl, marginTop: 0 }}
                        />
                      </Pressable>
                    </Pressable>
                  </Modal>
                )}

                {/* Photo */}
                <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                  {t('plantNew.photo')}
                </Text>
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
                        {t('plantNew.addPhoto')}
                      </Text>
                    </>
                  )}
                </Pressable>

                {/* Save */}
                <Button
                  title={t('plantNew.addPlant')}
                  onPress={handleSave}
                  disabled={!selectedCropId || !plantName.trim()}
                  loading={saving}
                  size="lg"
                  style={{ marginTop: spacing.xl }}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </>
      )}

      {/* Crop picker modal — available from both steps */}
      <Modal visible={showCropPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{t('plantNew.cropPickerTitle')}</Text>
            <Pressable onPress={() => { setShowCropPicker(false); setCropSearch(''); setPickerImgErr({}); }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>

          <View style={[s.searchBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              value={cropSearch}
              onChangeText={setCropSearch}
              placeholder={t('plantNew.cropSearch')}
              placeholderTextColor={colors.textDisabled}
              style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}
              autoFocus
            />
          </View>

          <SectionList
            sections={filteredSections}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => (
              <View style={[s.categoryHeader, { backgroundColor: colors.background }]}>
                {section.title === '__mycrops__' ? (
                  <Text style={[s.categoryTitle, { color: colors.textSecondary }]}>
                    ⭐ {t('customCrop.mycrops').toUpperCase()}
                  </Text>
                ) : (
                  <Text style={[s.categoryTitle, { color: colors.textSecondary }]}>
                    {(CATEGORY_CONFIG as any)[section.title]?.emoji} {t('cropCategory.' + section.title).toUpperCase()}
                  </Text>
                )}
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectCrop(item)}
                style={({ pressed }) => [
                  s.cropRow,
                  {
                    backgroundColor: item.id === selectedCropId ? colors.surfaceAlt : pressed ? colors.surfaceAlt : colors.surface,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                {CROP_IMAGES[item.id] && !pickerImgErr[item.id] ? (
                  <Image
                    source={{ uri: CROP_IMAGES[item.id] }}
                    style={s.pickerThumb}
                    resizeMode="cover"
                    onError={() => setPickerImgErr(p => ({ ...p, [item.id]: true }))}
                  />
                ) : (
                  <View style={[s.pickerThumb, { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>
                    {item.isCustom ? item.name : t('crops.' + item.id + '.name')}
                  </Text>
                </View>
                {item.id === selectedCropId && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </Pressable>
            )}
            ListFooterComponent={
              <Pressable
                onPress={() => router.push('/crop/new' as any)}
                style={[s.cropRow, { borderBottomWidth: 0, justifyContent: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>
                  {t('customCrop.addNew')}
                </Text>
              </Pressable>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </SafeAreaView>
      </Modal>
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
    aiBanner: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    aiBannerText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },

    // Step 1 — entry
    entryContainer: {
      flex: 1,
      padding: spacing.xl,
      gap: spacing.lg,
      justifyContent: 'center',
    },
    entrySubtitle: {
      fontSize: fontSize.md,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    entryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: radii.xl,
      gap: spacing.md,
    },
    entryBtnIcon: {
      width: 52,
      height: 52,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    entryBtnTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    entryBtnDesc: { fontSize: fontSize.xs, marginTop: 2 },

    // Step 2 — crop hero
    cropHero: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cropHeroImg: {
      width: 72,
      height: 72,
      borderRadius: radii.lg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cropHeroName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    cropHeroCategory: { fontSize: fontSize.xs, marginTop: 2 },
    changeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

    // Form
    formContainer: { padding: spacing.xl, gap: 0 },
    label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8, marginBottom: spacing.sm },
    input: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      padding: spacing.lg,
      fontSize: fontSize.md,
    },

    // Stage selector — 4 chips equal width
    stageRow: { flexDirection: 'row', gap: spacing.sm },
    stageChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: 4,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 4,
    },
    stageLabel: { fontSize: 9, fontWeight: fontWeight.semibold, textAlign: 'center' },

    // Propagation — 4 equal chips in one row
    methodRow: { flexDirection: 'row', gap: spacing.sm },
    methodChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: 4,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 3,
    },
    methodLabel: { fontSize: 9, fontWeight: fontWeight.medium, textAlign: 'center' },

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
    dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    dateModalSheet: { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: spacing.sm, alignItems: 'center' },
    dateModalHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: spacing.md },

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

    // Variety
    varietyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
      gap: 4,
    },
    varietyChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    varietyChipDays: { fontSize: 10 },

    // Companion hint
    companionHint: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.md },
    companionHintText: { fontSize: fontSize.xs, lineHeight: 18 },

    // Crop picker modal
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    categoryHeader: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xs },
    categoryTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8 },
    cropRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickerThumb: { width: 52, height: 52, borderRadius: radii.md, overflow: 'hidden' },
  });
