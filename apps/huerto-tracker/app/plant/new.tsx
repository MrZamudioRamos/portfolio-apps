import { useColors, useTheme, Button, Card, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useSession } from '@portfolio/supabase';
import { usePurchases } from '@portfolio/billing';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS, CROPS_BY_ID, CROPS_BY_CATEGORY, CATEGORY_CONFIG, type CropInfo } from '../../src/data/crops';
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
    paramCropId ? (CROPS_BY_ID[paramCropId]?.name ?? '') : ''
  );
  const [variety, setVariety] = useState('');
  const [sowingDate, setSowingDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCrop = selectedCropId ? CROPS_BY_ID[selectedCropId] : null;

  const filteredSections = useMemo(() => {
    if (!cropSearch.trim()) return SECTIONS;
    const q = cropSearch.toLowerCase();
    return SECTIONS.map((s) => ({
      ...s,
      data: s.data.filter((c) => c.name.toLowerCase().includes(q)),
    })).filter((s) => s.data.length > 0);
  }, [cropSearch]);

  function handleSelectCrop(crop: CropInfo) {
    setSelectedCropId(crop.id);
    if (!plantName) setPlantName(crop.name);
    setShowCropPicker(false);
    setCropSearch('');
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
        sowingDate,
        status: 'seedling',
        ...(photoUri ? { photoUri } : {}),
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
        <Text style={[s.headerTitle, { color: colors.text }]}>Nueva planta</Text>
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
              <Text style={[s.label, { color: colors.textSecondary }]}>CULTIVO</Text>
              {selectedCrop ? (
                <Pressable
                  onPress={() => setShowCropPicker(true)}
                  style={[s.selectedCrop, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary }]}
                >
                  <Text style={{ fontSize: 32 }}>{selectedCrop.emoji}</Text>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[s.cropName, { color: colors.text }]}>{selectedCrop.name}</Text>
                    <Text style={[s.cropCategory, { color: colors.textSecondary }]}>
                      {CATEGORY_CONFIG[selectedCrop.category].label}
                    </Text>
                  </View>
                  <Text style={[s.changeText, { color: colors.primary }]}>Cambiar</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setShowCropPicker(true)}
                  style={[s.cropPickerBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                >
                  <Text style={{ fontSize: 28 }}>🌱</Text>
                  <Text style={[{ color: colors.textSecondary, fontSize: fontSize.md, marginLeft: spacing.md }]}>
                    Seleccionar cultivo
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                </Pressable>
              )}

              {/* Plant name */}
              <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>NOMBRE</Text>
              <TextInput
                value={plantName}
                onChangeText={setPlantName}
                placeholder="Nombre de tu planta"
                placeholderTextColor={colors.textDisabled}
                style={[s.input, { backgroundColor: colors.surface, borderColor: plantName ? colors.primary : colors.border, color: colors.text }]}
              />

              {/* Variety */}
              <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                VARIEDAD <Text style={{ fontWeight: '400' }}>(opcional)</Text>
              </Text>
              <TextInput
                value={variety}
                onChangeText={setVariety}
                placeholder="Ej: Cherry, Romana, Negra de Crimea..."
                placeholderTextColor={colors.textDisabled}
                style={[s.input, { backgroundColor: colors.surface, borderColor: variety ? colors.primary : colors.border, color: colors.text }]}
              />

              {/* Sowing date */}
              <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>FECHA DE SIEMBRA</Text>
              <TextInput
                value={sowingDate}
                onChangeText={setSowingDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.textDisabled}
                style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                keyboardType="numeric"
              />

              {/* Photo */}
              <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
                FOTO <Text style={{ fontWeight: '400' }}>(opcional)</Text>
              </Text>
              <Pressable onPress={pickPhoto} style={s.photoRow}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={s.photoPreview} />
                ) : (
                  <View style={[s.photoPlaceholder, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 28 }}>📷</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 }}>
                      Añadir foto
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Save button */}
              <Button
                title="Añadir planta 🌱"
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
            <Text style={[s.modalTitle, { color: colors.text }]}>Seleccionar cultivo</Text>
            <Pressable onPress={() => { setShowCropPicker(false); setCropSearch(''); }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                Cerrar
              </Text>
            </Pressable>
          </View>

          <View style={[s.searchBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
            <TextInput
              value={cropSearch}
              onChangeText={setCropSearch}
              placeholder="Buscar cultivo..."
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
                  {CATEGORY_CONFIG[section.title].emoji} {CATEGORY_CONFIG[section.title].label.toUpperCase()}
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
                    {item.name}
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
  });
