import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import * as ImagePicker from 'expo-image-picker';
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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../../src/data/crops';
import { VARIETIES_BY_CROP, type VarietyInfo } from '../../src/data/varieties';
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
  const [varietyId, setVarietyId] = useState<string | null>(plant?.varietyId ?? null);
  const [sowingDate, setSowingDate] = useState(plant?.sowingDate ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(plant?.photoUri ?? null);
  const [harvestGoalKg, setHarvestGoalKg] = useState(
    plant?.harvestGoalKg ? String(plant.harvestGoalKg) : ''
  );
  const [notes, setNotes] = useState(plant?.notes ?? '');
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

  const cropVarieties = plant ? (VARIETIES_BY_CROP[plant.cropId] ?? []) : [];

  function handleSelectVariety(v: VarietyInfo | null) {
    if (v === null) {
      setVarietyId(null);
      setVariety('');
    } else {
      setVarietyId(v.id);
      setVariety(v.name);
    }
  }

  async function handleSave() {
    if (!plantName.trim()) return;
    setSaving(true);
    try {
      const goalParsed = parseFloat(harvestGoalKg);
      await plants.update(id, {
        name: plantName.trim(),
        variety: variety.trim() || undefined,
        varietyId: varietyId ?? undefined,
        sowingDate: sowingDate.trim() || undefined,
        photoUri: photoUri ?? undefined,
        harvestGoalKg: !isNaN(goalParsed) && goalParsed > 0 ? goalParsed : undefined,
        notes: notes.trim() || undefined,
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
        <Pressable
          onPress={handleSave}
          disabled={!plantName.trim() || saving}
          hitSlop={12}
          style={{ opacity: !plantName.trim() || saving ? 0.4 : 1 }}
        >
          <Text style={[{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>
            {t('common.save')}
          </Text>
        </Pressable>
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
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[s.input, s.dateButton, { backgroundColor: colors.surface, borderColor: sowingDate ? colors.primary : colors.border }]}
          >
            <Ionicons name="calendar-outline" size={18} color={sowingDate ? colors.primary : colors.textSecondary} />
            <Text style={{ color: sowingDate ? colors.text : colors.textDisabled, fontSize: fontSize.md, flex: 1 }}>
              {sowingDate || t('entryNew.datePlaceholder')}
            </Text>
            {sowingDate && (
              <Pressable onPress={() => setSowingDate('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </Pressable>

          {/* Date picker modal for iOS / inline for Android */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={sowingDate ? new Date(sowingDate) : new Date()}
              mode="date"
              display="default"
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setSowingDate(date.toISOString().split('T')[0]);
              }}
            />
          )}
          {showDatePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="slide" visible>
              <Pressable style={s.dateModalOverlay} onPress={() => setShowDatePicker(false)}>
                <Pressable style={[s.dateModalSheet, { backgroundColor: colors.surface }]}>
                  <View style={[s.dateModalHandle, { backgroundColor: colors.border }]} />
                  <DateTimePicker
                    value={sowingDate ? new Date(sowingDate) : new Date()}
                    mode="date"
                    display="spinner"
                    onChange={(_, date) => {
                      if (date) setSowingDate(date.toISOString().split('T')[0]);
                    }}
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

          {/* Harvest goal */}
          <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
            {t('plantEdit.harvestGoalLabel')}
          </Text>
          <TextInput
            value={harvestGoalKg}
            onChangeText={setHarvestGoalKg}
            placeholder={t('plantEdit.harvestGoalPlaceholder')}
            placeholderTextColor={colors.textDisabled}
            style={[
              s.input,
              { backgroundColor: colors.surface, borderColor: harvestGoalKg ? colors.primary : colors.border, color: colors.text },
            ]}
            keyboardType="decimal-pad"
          />

          {/* Notes */}
          <Text style={[s.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
            {t('plantEdit.notesLabel')}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('plantEdit.notesPlaceholder')}
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={[
              s.input,
              s.notesInput,
              { backgroundColor: colors.surface, borderColor: notes ? colors.primary : colors.border, color: colors.text },
            ]}
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
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dateModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    dateModalSheet: {
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingTop: spacing.sm,
      alignItems: 'center',
    },
    dateModalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      marginBottom: spacing.md,
    },
    notesInput: { minHeight: 80 },
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
