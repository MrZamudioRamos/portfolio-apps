import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
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
import { CROPS_BY_ID, CATEGORY_CONFIG } from '../../src/data/crops';
import type { Plant } from '../../src/models/plant';

export default function EditPlantScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const plants = useCollection<Plant>('plants');
  const plant = plants.getById(id);
  const crop = plant ? CROPS_BY_ID[plant.cropId] : null;

  const [plantName, setPlantName] = useState(plant?.name ?? '');
  const [variety, setVariety] = useState(plant?.variety ?? '');
  const [sowingDate, setSowingDate] = useState(plant?.sowingDate ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(plant?.photoUri ?? null);
  const [saving, setSaving] = useState(false);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (!plant || !crop) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.notFound, { color: colors.textSecondary }]}>
          {t('plantDetail.notFound')}
        </Text>
      </SafeAreaView>
    );
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
    if (!plantName.trim()) return;
    setSaving(true);
    try {
      await plants.update(id, {
        name: plantName.trim(),
        variety: variety.trim() || undefined,
        sowingDate: sowingDate.trim() || undefined,
        photoUri: photoUri ?? undefined,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('plantEdit.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.formContainer} showsVerticalScrollIndicator={false}>
          {/* Crop info (read-only) */}
          <View style={[s.cropRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={{ fontSize: 32 }}>{crop.emoji}</Text>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[s.cropName, { color: colors.text }]}>{t('crops.' + crop.id + '.name')}</Text>
              <Text style={[s.cropCategory, { color: colors.textSecondary }]}>
                {t('cropCategory.' + crop.category)}
              </Text>
            </View>
            <View style={[s.fixedBadge, { backgroundColor: colors.border }]}>
              <Text style={[s.fixedBadgeText, { color: colors.textSecondary }]}>
                {t('plantEdit.cropFixed')}
              </Text>
            </View>
          </View>

          {/* Name */}
          <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.xl }]}>
            {t('plantNew.nameLabel')}
          </Text>
          <TextInput
            value={plantName}
            onChangeText={setPlantName}
            placeholder={t('plantNew.namePlaceholder')}
            placeholderTextColor={colors.textDisabled}
            style={[
              s.input,
              {
                backgroundColor: colors.surface,
                borderColor: plantName ? colors.primary : colors.border,
                color: colors.text,
              },
            ]}
          />

          {/* Variety */}
          <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
            {t('plantNew.varietyLabel')}
          </Text>
          <TextInput
            value={variety}
            onChangeText={setVariety}
            placeholder={t('plantNew.varietyPlaceholder')}
            placeholderTextColor={colors.textDisabled}
            style={[
              s.input,
              {
                backgroundColor: colors.surface,
                borderColor: variety ? colors.primary : colors.border,
                color: colors.text,
              },
            ]}
          />

          {/* Sowing date */}
          <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
            {t('plantNew.sowingDate')}
          </Text>
          <TextInput
            value={sowingDate}
            onChangeText={setSowingDate}
            placeholder={t('entryNew.datePlaceholder')}
            placeholderTextColor={colors.textDisabled}
            style={[
              s.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            keyboardType="numeric"
          />

          {/* Photo */}
          <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
            {t('plantNew.photo')}
          </Text>
          <Pressable onPress={pickPhoto} style={s.photoRow}>
            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={s.photoPreview} />
                <Text style={[s.changePhotoText, { color: colors.primary }]}>
                  {t('plantEdit.changePhoto')}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  s.photoPlaceholder,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <Text style={{ fontSize: 28 }}>📷</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 }}>
                  {t('plantNew.addPhoto')}
                </Text>
              </View>
            )}
          </Pressable>

          <Button
            title={t('plantEdit.save')}
            onPress={handleSave}
            disabled={!plantName.trim()}
            loading={saving}
            size="lg"
            style={{ marginTop: spacing.xl }}
          />
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
    formContainer: { padding: spacing.xl, paddingBottom: 60 },
    label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.8, marginBottom: spacing.sm },
    cropRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    cropName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    cropCategory: { fontSize: fontSize.xs, marginTop: 2 },
    fixedBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
    },
    fixedBadgeText: { fontSize: 10, fontWeight: fontWeight.medium },
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
    changePhotoText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginTop: spacing.xs, textAlign: 'center' },
    notFound: { textAlign: 'center', marginTop: 80, fontSize: fontSize.lg },
    backBtn: { padding: spacing.lg },
  });
