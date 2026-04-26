import { useOnboarding } from '@portfolio/shared';
import { Button, Card, useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CLIMATE_ZONE_CONFIG, PROVINCES, PROVINCE_ZONES } from '../src/data';
import type { Garden } from '../src/models';
import { GARDEN_TYPE_CONFIG, type GardenType } from '../src/models/garden';

type Step = 0 | 1 | 2;

export default function OnboardingScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { complete } = useOnboarding('huerto');
  const gardens = useCollection<Garden>('gardens');

  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(0);
  const [province, setProvince] = useState('');
  const [provinceSearch, setProvinceSearch] = useState('');
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [gardenName, setGardenName] = useState('');
  const [gardenType, setGardenType] = useState<GardenType>('huerto');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const climateZone = province ? PROVINCE_ZONES[province] : null;
  const zoneConfig = climateZone ? CLIMATE_ZONE_CONFIG[climateZone] : null;

  const filteredProvinces = PROVINCES.filter((p) =>
    p.toLowerCase().includes(provinceSearch.toLowerCase())
  );

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

  async function handleCreate() {
    if (!gardenName.trim() || !province || !climateZone) return;
    setSaving(true);
    try {
      await gardens.create({
        name: gardenName.trim(),
        climateZone,
        province,
        gardenType,
        ...(photoUri ? { photoUri } : {}),
      });
      await complete();
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  }

  const s = styles(colors, spacing, fontSize, fontWeight, radii);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Step dots */}
      {step > 0 && (
        <View style={s.dots}>
          {([0, 1, 2] as Step[]).map((i) => (
            <View
              key={i}
              style={[
                s.dot,
                {
                  backgroundColor:
                    i <= step ? colors.primary : colors.border,
                  width: i === step ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* ── STEP 0: Bienvenida ── */}
      {step === 0 && (
        <View style={s.stepContainer}>
          <View style={s.heroSection}>
            <Text style={s.heroEmoji}>🌱</Text>
            <Text style={[s.heroTitle, { color: colors.text }]}>{t('onboarding.step1Title')}</Text>
            <Text style={[s.heroDesc, { color: colors.textSecondary }]}>
              {t('onboarding.step1Desc')}
            </Text>
          </View>
          <Button title={t('onboarding.start')} onPress={() => setStep(1)} size="lg" />
        </View>
      )}

      {/* ── STEP 1: Provincia ── */}
      {step === 1 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.stepContainer}
        >
          <View style={s.stepContent}>
            <Text style={[s.stepTitle, { color: colors.text }]}>{t('onboarding.step2Title')}</Text>
            <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
              {t('onboarding.step2Desc')}
            </Text>

            <Pressable
              onPress={() => setShowProvincePicker(true)}
              style={[
                s.provinceButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: province ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: province ? colors.text : colors.textDisabled, fontSize: fontSize.md }}>
                {province || t('onboarding.selectProvince')}
              </Text>
              <Text style={{ fontSize: 18 }}>›</Text>
            </Pressable>

            {climateZone && zoneConfig && (
              <Card style={s.zoneCard} padded>
                <Text style={{ fontSize: 28 }}>{zoneConfig.emoji}</Text>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[s.zoneTitle, { color: colors.primary }]}>
                    {t('onboarding.zone', { label: zoneConfig.label })}
                  </Text>
                  <Text style={[s.zoneDesc, { color: colors.textSecondary }]}>
                    {zoneConfig.description}
                  </Text>
                </View>
              </Card>
            )}
          </View>

          <View style={s.stepActions}>
            <Pressable onPress={() => setStep(0)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.continue')}
              onPress={() => setStep(2)}
              disabled={!province}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── STEP 2: Crear huerto ── */}
      {step === 2 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.stepContainer}
        >
          <View style={s.stepContent}>
            <Text style={[s.stepTitle, { color: colors.text }]}>{t('onboarding.step3Title')}</Text>
            <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
              {t('onboarding.step3Desc')}
            </Text>

            {/* Garden type selector */}
            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>{t('onboarding.gardenTypeLabel')}</Text>
            <View style={s.gardenTypeRow}>
              {(Object.entries(GARDEN_TYPE_CONFIG) as [GardenType, typeof GARDEN_TYPE_CONFIG[GardenType]][]).map(([key, cfg]) => {
                const active = gardenType === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setGardenType(key)}
                    style={[
                      s.gardenTypeBtn,
                      {
                        backgroundColor: active ? colors.primary + '22' : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 24 }}>{cfg.emoji}</Text>
                    <Text style={[s.gardenTypeName, { color: active ? colors.primary : colors.textSecondary }]}>
                      {cfg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Photo picker */}
            <Pressable onPress={pickPhoto} style={s.photoPicker}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={s.photoImage} />
              ) : (
                <View style={[s.photoPlaceholder, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 32 }}>📷</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 }}>
                    {t('plantNew.addPhoto')}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Garden name input */}
            <TextInput
              value={gardenName}
              onChangeText={setGardenName}
              placeholder={t('onboarding.gardenNamePlaceholder')}
              placeholderTextColor={colors.textDisabled}
              style={[
                s.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: gardenName ? colors.primary : colors.border,
                  color: colors.text,
                },
              ]}
              maxLength={40}
              autoFocus
              returnKeyType="done"
            />
          </View>

          <View style={s.stepActions}>
            <Pressable onPress={() => setStep(1)} style={s.backButton}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>{t('onboarding.back')}</Text>
            </Pressable>
            <Button
              title={t('onboarding.create')}
              onPress={handleCreate}
              disabled={!gardenName.trim()}
              loading={saving}
              size="lg"
              style={{ flex: 1, marginLeft: spacing.md }}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── Province picker modal ── */}
      <Modal visible={showProvincePicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{t('onboarding.selectProvince')}</Text>
            <Pressable onPress={() => { setShowProvincePicker(false); setProvinceSearch(''); }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                {t('onboarding.closeSearch')}
              </Text>
            </Pressable>
          </View>

          <View style={[s.searchContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
            <TextInput
              value={provinceSearch}
              onChangeText={setProvinceSearch}
              placeholder={t('onboarding.provinceSearch')}
              placeholderTextColor={colors.textDisabled}
              style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredProvinces}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const zone = PROVINCE_ZONES[item];
              const zc = CLIMATE_ZONE_CONFIG[zone];
              const isSelected = item === province;
              return (
                <Pressable
                  onPress={() => {
                    setProvince(item);
                    setShowProvincePicker(false);
                    setProvinceSearch('');
                  }}
                  style={[
                    s.provinceRow,
                    {
                      backgroundColor: isSelected ? colors.surfaceAlt : colors.surface,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>
                      {item}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                      {zc.emoji} {zc.label}
                    </Text>
                  </View>
                  {isSelected && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { flex: 1 },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      paddingTop: spacing.lg,
    },
    dot: { height: 8, borderRadius: 4 },
    stepContainer: { flex: 1, padding: spacing.xl, justifyContent: 'space-between' },
    stepContent: { flex: 1, justifyContent: 'center' },
    stepActions: { flexDirection: 'row', alignItems: 'center' },
    heroSection: { alignItems: 'center', paddingVertical: spacing['3xl'] },
    heroEmoji: { fontSize: 80, marginBottom: spacing.xl },
    heroTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, textAlign: 'center', marginBottom: spacing.md },
    heroDesc: { fontSize: fontSize.lg, textAlign: 'center', lineHeight: 26 },
    stepTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    stepSubtitle: { fontSize: fontSize.md, lineHeight: 22, marginBottom: spacing['2xl'] },
    provinceButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: radii.md,
      borderWidth: 1.5,
      marginBottom: spacing.lg,
    },
    zoneCard: { flexDirection: 'row', alignItems: 'center' },
    zoneTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    zoneDesc: { fontSize: fontSize.sm, marginTop: 2 },
    backButton: { paddingVertical: spacing.md, paddingRight: spacing.md },
    inputLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
    gardenTypeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    gardenTypeBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 4,
    },
    gardenTypeName: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },
    photoPicker: { alignItems: 'center', marginBottom: spacing.xl },
    photoPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoImage: { width: 100, height: 100, borderRadius: 50 },
    input: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      padding: spacing.lg,
      fontSize: fontSize.md,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    provinceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
  });
