import { useColors, useTheme, Button, Card, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useSession } from '@portfolio/supabase';
import { usePro as usePurchases } from '../../src/hooks/usePro';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { CROPS, CROPS_BY_ID, CROPS_BY_CATEGORY, CATEGORY_CONFIG, type CropInfo } from '../../src/data/crops';
import { VARIETIES_BY_CROP, type VarietyInfo } from '../../src/data/varieties';
import type { Garden } from '../../src/models/garden';
import type { Plant } from '../../src/models/plant';

const SECTIONS = (Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map((cat) => ({
  title: cat,
  data: CROPS_BY_CATEGORY[cat],
}));

export default function NewPlantScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();

  const { t } = useTranslation();
  const { cropId: paramCropId } = useLocalSearchParams<{ cropId?: string }>();

  const gardens = useCollection<Garden>('gardens');
  const plants = useCollection<Plant>('plants');
  const { isGuest } = useSession();
  const { isPro } = usePurchases();

  // Tier limits: guest = 3, free registered = 10, pro = unlimited
  const plantLimit = isGuest ? 3 : isPro ? Infinity : 10;
  const atLimit = plants.count >= plantLimit;

  const [selectedCropId, setSelectedCropId] = useState<string | null>(paramCropId ?? null);
  const [showCropPicker, setShowCropPicker] = useState(!paramCropId);
  const [cropSearch, setCropSearch] = useState('');
  const [plantName, setPlantName] = useState(
    paramCropId ? (t('crops.' + paramCropId + '.name') || CROPS_BY_ID[paramCropId]?.name || '') : ''
  );
  const [variety, setVariety] = useState('');
  const [varietyId, setVarietyId] = useState<string | null>(null);
  const [sowingDate, setSowingDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCrop = selectedCropId ? CROPS_BY_ID[selectedCropId] : null;

  const filteredSections = useMemo(() => {
    if (!cropSearch.trim()) return SECTIONS;
    const q = cropSearch.toLowerCase();
    return SECTIONS.map((s) => ({
      ...s,
      data: s.data.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        t('crops.' + c.id + '.name').toLowerCase().includes(q)
      ),
    })).filter((s) => s.data.length > 0);
  }, [cropSearch, t]);

  const cropVarieties = selectedCropId ? (VARIETIES_BY_CROP[selectedCropId] ?? []) : [];

  function handleSelectCrop(crop: CropInfo) {
    setSelectedCropId(crop.id);
    if (!plantName) setPlantName(t('crops.' + crop.id + '.name') || crop.name);
    setShowCropPicker(false);
    setCropSearch('');
    setVarietyId(null);
    setVariety('');
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
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleSave() {
    if (!selectedCropId || !plantName.trim()) return;
    if (atLimit) {
      router.replace('/paywall');
      return;
    }
    const gardenId = gardens.items[0]?.id;
    if (!gardenId) return;
    setSaving(true);
    try {
      await plants.create({
        gardenId,
        cropId: selectedCropId,
        name: plantName.trim(),
        ...(variety.trim() ? { variety: variety.trim() } : {}),
        ...(varietyId ? { varietyId } : {}),
        sowingDate,
        status: 'seedling',
        ...(photoUri ? { photoUri } : {}),
      });
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
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
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('plantNew.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <SectionList
          sections={[{ title: '', data: ['form' as const] }]}
          keyExtractor={() => 'form'}
          renderSectionHeader={() => null}
          renderItem={() => (
            <View style={s.formContainer}>
              {/* Crop selector */}
              <Text style={[s.label, { color: colors.textSecondary }]}>{t('plantNew.cropLabel')}</Text>
              {selectedCrop ? (
                <Pressable
                  onPress={() => setShowCropPicker(true)}
                  style={[s.selectedCrop, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary }]}
                >
                  <Text style={{ fontSize: 32 }}>{selectedCrop.emoji}</Text>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[s.cropName, { color: colors.text }]}>{t('crops.' + selectedCrop.id + '.name')}</Text>
                    <Text style={[s.cropCategory, { color: colors.textSecondary }]}>
                      {t('cropCategory.' + selectedCrop.category)}
                    </Text>
                  </View>
                  <Text style={[s.changeText, { color: colors.primary }]}>{t('plantNew.changeCrop')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setShowCropPicker(true)}
                  style={[s.cropPickerBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                >
                  <Text style={{ fontSize: 28 }}>🌱</Text>
                  <Text style={[{ color: colors.textSecondary, fontSize: fontSize.md, marginLeft: spacing.md }]}>
                    {t('plantNew.selectCrop')}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                </Pressable>
              )}

              {/* Plant name */}
              <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>{t('plantNew.nameLabel')}</Text>
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
                    style={[
                      s.varietyChip,
                      {
                        backgroundColor: !varietyId ? colors.primary + '22' : colors.surface,
                        borderColor: !varietyId ? colors.primary : colors.border,
                      },
                    ]}
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
                        style={[
                          s.varietyChip,
                          {
                            backgroundColor: active ? colors.primary + '22' : colors.surface,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
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

              {/* Sowing date */}
              <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>{t('plantNew.sowingDate')}</Text>
              <TextInput
                value={sowingDate}
                onChangeText={setSowingDate}
                placeholder={t('entryNew.datePlaceholder')}
                placeholderTextColor={colors.textDisabled}
                style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                keyboardType="numeric"
              />

              {/* Photo */}
              <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                {t('plantNew.photo')}
              </Text>
              <Pressable onPress={pickPhoto} style={s.photoRow}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={s.photoPreview} />
                ) : (
                  <View style={[s.photoPlaceholder, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 28 }}>📷</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 }}>
                      {t('plantNew.addPhoto')}
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Save button */}
              <Button
                title={t('plantNew.addPlant')}
                onPress={handleSave}
                disabled={!selectedCropId || !plantName.trim()}
                loading={saving}
                size="lg"
                style={{ marginTop: spacing.xl }}
              />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </KeyboardAvoidingView>

      {/* Crop picker modal */}
      <Modal visible={showCropPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{t('plantNew.cropPickerTitle')}</Text>
            <Pressable onPress={() => { setShowCropPicker(false); setCropSearch(''); }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>

          <View style={[s.searchBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
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
                <Text style={[s.categoryTitle, { color: colors.textSecondary }]}>
                  {CATEGORY_CONFIG[section.title].emoji} {t('cropCategory.' + section.title).toUpperCase()}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectCrop(item)}
                style={({ pressed }) => [
                  s.cropRow,
                  {
                    backgroundColor:
                      item.id === selectedCropId
                        ? colors.surfaceAlt
                        : pressed
                        ? colors.surfaceAlt
                        : colors.surface,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>
                    {t('crops.' + item.id + '.name')}
                  </Text>
                </View>
                {item.id === selectedCropId && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </Pressable>
            )}
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
    formContainer: { padding: spacing.xl, gap: 0 },
    label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8, marginBottom: spacing.sm },
    selectedCrop: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: radii.md,
      borderWidth: 2,
    },
    cropPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
    },
    cropName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    cropCategory: { fontSize: fontSize.xs, marginTop: 2 },
    changeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    input: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      padding: spacing.lg,
      fontSize: fontSize.md,
    },
    photoRow: { alignItems: 'flex-start' },
    photoPlaceholder: {
      width: 90,
      height: 90,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoPreview: { width: 90, height: 90, borderRadius: radii.lg },
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
    categoryHeader: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    categoryTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8 },
    cropRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    varietyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
      gap: 4,
    },
    varietyChipText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
    },
    varietyChipDays: {
      fontSize: 10,
    },
  });
