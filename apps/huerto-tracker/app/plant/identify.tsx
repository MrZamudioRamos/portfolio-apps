import { useColors, useTheme, Button, Card, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { usePro as usePurchases } from '../../src/hooks/usePro';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../../src/data/crops';
import type { Plant } from '../../src/models/plant';
import type { DiaryEntry } from '../../src/models/diary-entry';
import { identifyPest, type PestDiagnosis } from '../../src/utils/pestIdentify';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';

const TYPE_COLOR: Record<string, string> = {
  plaga: '#EF5350',
  enfermedad: '#AB47BC',
  deficiencia: '#FFA726',
  saludable: '#4CAF50',
};

const CONFIDENCE_COLOR: Record<string, string> = {
  alta: '#4CAF50',
  media: '#FFA726',
  baja: '#EF5350',
};

const TREATMENT_COLOR: Record<string, { bg: string; text: string }> = {
  organico:   { bg: '#4CAF5022', text: '#2E7D32' },
  preventivo: { bg: '#2196F322', text: '#1565C0' },
  quimico:    { bg: '#FF572222', text: '#C62828' },
};

export default function IdentifyPlantScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { plantId, cropId } = useLocalSearchParams<{ plantId?: string; cropId?: string }>();
  const { isPro } = usePurchases();

  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const { activeGarden } = useActiveGarden();

  const plant = plantId ? plants.getById(plantId) : null;
  const resolvedCropId = cropId ?? plant?.cropId;
  const crop = resolvedCropId ? CROPS_BY_ID[resolvedCropId] : null;
  const gardenId = activeGarden?.id;

  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<PestDiagnosis | null>(null);
  const [errorKey, setErrorKey] = useState<'noKey' | 'generic' | null>(null);
  const [saved, setSaved] = useState(false);
  const [freeCreditUsed, setFreeCreditUsed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@semilla/free_identify_used').then(v => setFreeCreditUsed(v === 'true'));
  }, []);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function pickPhoto(fromCamera: boolean) {
    setErrorKey(null);
    setDiagnosis(null);
    setSaved(false);

    let result: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      });
    }

    if (!result.canceled) setPhoto(result.assets[0]);
  }

  async function analyze() {
    if (!photo) return;
    setAnalyzing(true);
    setErrorKey(null);
    setDiagnosis(null);
    setSaved(false);

    try {
      const cropName = crop ? t('crops.' + crop.id + '.name') : 'plant';
      const result = await identifyPest(photo.uri, cropName, i18n.language);
      setDiagnosis(result);
      if (!isPro && !freeCreditUsed) {
        await AsyncStorage.setItem('@semilla/free_identify_used', 'true');
        setFreeCreditUsed(true);
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      console.error('[identify] Error:', e.code, e.message, err);
      setErrorKey(e.code === 'NO_KEY' ? 'noKey' : 'generic');
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveToDiary() {
    if (!diagnosis || !gardenId) return;
    const notes = diagnosis.detected
      ? `${diagnosis.name}\n${diagnosis.description}${diagnosis.symptoms ? '\n' + diagnosis.symptoms : ''}`
      : t('identify.healthyDesc');

    await entries.create({
      gardenId,
      plantId: plantId ?? undefined,
      type: diagnosis.detected ? 'pest' : 'note',
      date: new Date().toISOString().split('T')[0],
      notes,
      ...(photo ? { photoUri: photo.uri } : {}),
    });
    setSaved(true);
  }

  /* ---- Paywall gate: free credit used up ---- */
  if (!isPro && freeCreditUsed === true) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text style={[s.title, { color: colors.text }]}>{t('identify.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.gateContainer}>
          <Text style={s.gateEmoji}>⭐</Text>
          <Text style={[s.gateTitle, { color: colors.text }]}>{t('identify.freeCreditUsed')}</Text>
          <Text style={[s.gateDesc, { color: colors.textSecondary }]}>{t('identify.freeCreditUsedDesc')}</Text>
          <Button
            title={t('identify.upgradePro')}
            onPress={() => router.push('/paywall')}
            size="lg"
            style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  /* ---- Main screen ---- */
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>{t('identify.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Free credit banner */}
        {!isPro && freeCreditUsed === false && (
          <View style={[s.freeBanner, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
            <Ionicons name="gift-outline" size={16} color={colors.primary} />
            <Text style={[s.freeBannerText, { color: colors.primary }]}>
              {t('identify.freeCredit')} — {t('identify.freeCreditDesc')}
            </Text>
          </View>
        )}

        {/* Photo area */}
        {!photo ? (
          /* No photo yet */
          <View style={[s.photoPlaceholder, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={s.placeholderEmoji}>📸</Text>
            <Text style={[s.placeholderText, { color: colors.textSecondary }]}>
              {t('identify.subtitle')}
            </Text>
            <View style={s.pickRow}>
              <Pressable
                onPress={() => pickPhoto(true)}
                style={[s.pickBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}
              >
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
                <Text style={[s.pickBtnText, { color: colors.primary }]}>{t('identify.takePhoto')}</Text>
              </Pressable>
              <Pressable
                onPress={() => pickPhoto(false)}
                style={[s.pickBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              >
                <Ionicons name="images-outline" size={20} color={colors.textSecondary} />
                <Text style={[s.pickBtnText, { color: colors.textSecondary }]}>{t('identify.fromGallery')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Photo preview */
          <View>
            <Image source={{ uri: photo.uri }} style={s.photoPreview} />
            <Pressable
              onPress={() => { setPhoto(null); setDiagnosis(null); setErrorKey(null); setSaved(false); }}
              style={s.retakeBtn}
            >
              <Ionicons name="refresh-outline" size={14} color={colors.primary} />
              <Text style={[s.retakeText, { color: colors.primary }]}>{t('identify.retake')}</Text>
            </Pressable>
          </View>
        )}

        {/* Analyze button */}
        {photo && !analyzing && !diagnosis && (
          <Button
            title={t('identify.analyze')}
            onPress={analyze}
            size="lg"
            style={{ marginTop: spacing.xl }}
          />
        )}

        {/* Loading */}
        {analyzing && (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[s.loadingText, { color: colors.textSecondary }]}>{t('identify.analyzing')}</Text>
          </View>
        )}

        {/* Error */}
        {errorKey && (
          <Card padded style={StyleSheet.flatten([s.errorCard, { borderColor: colors.error }])}>
            <Text style={[s.errorTitle, { color: colors.error }]}>{t('identify.error')}</Text>
            <Text style={[s.errorDesc, { color: colors.textSecondary }]}>
              {t(errorKey === 'noKey' ? 'identify.noKeyDesc' : 'identify.errorDesc')}
            </Text>
            <Button
              title={t('identify.analyze')}
              onPress={analyze}
              variant="secondary"
              size="sm"
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}

        {/* Diagnosis results */}
        {diagnosis && (
          <View style={s.resultsContainer}>
            {diagnosis.detected ? (
              <>
                {/* Problem header */}
                <View style={s.diagHeader}>
                  <View style={[s.typeBadge, { backgroundColor: (TYPE_COLOR[diagnosis.type] ?? '#999') + '22' }]}>
                    <Text style={[s.typeBadgeText, { color: TYPE_COLOR[diagnosis.type] ?? '#999' }]}>
                      {t('identify.problemType.' + diagnosis.type)}
                    </Text>
                  </View>
                  <View style={[s.confidenceBadge, { backgroundColor: (CONFIDENCE_COLOR[diagnosis.confidence] ?? '#999') + '22' }]}>
                    <Text style={[s.confidenceText, { color: CONFIDENCE_COLOR[diagnosis.confidence] ?? '#999' }]}>
                      {t('identify.confidence.' + diagnosis.confidence)}
                    </Text>
                  </View>
                </View>

                <Text style={[s.diagName, { color: colors.text }]}>{diagnosis.name}</Text>
                <Text style={[s.diagDesc, { color: colors.textSecondary }]}>{diagnosis.description}</Text>

                {/* Symptoms */}
                {!!diagnosis.symptoms && (
                  <Card padded style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.text }]}>{t('identify.symptomsLabel')}</Text>
                    <Text style={[s.sectionBody, { color: colors.textSecondary }]}>{diagnosis.symptoms}</Text>
                  </Card>
                )}

                {/* Treatments */}
                {diagnosis.treatments.length > 0 && (
                  <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.text }]}>{t('identify.treatmentsLabel')}</Text>
                    {diagnosis.treatments.map((tr, i) => {
                      const c = TREATMENT_COLOR[tr.type] ?? { bg: '#99999922', text: '#666' };
                      return (
                        <Card key={i} padded style={StyleSheet.flatten([s.treatmentCard, { borderColor: colors.border }])}>
                          <View style={s.treatmentHeader}>
                            <View style={[s.treatmentTypeBadge, { backgroundColor: c.bg }]}>
                              <Text style={[s.treatmentTypeText, { color: c.text }]}>
                                {t('identify.treatmentType.' + tr.type)}
                              </Text>
                            </View>
                            <Text style={[s.treatmentName, { color: colors.text }]}>{tr.name}</Text>
                          </View>
                          <Text style={[s.treatmentInstr, { color: colors.textSecondary }]}>
                            {tr.instructions}
                          </Text>
                        </Card>
                      );
                    })}
                  </View>
                )}
              </>
            ) : (
              /* Healthy */
              <View style={[s.healthyCard, { backgroundColor: '#4CAF5018', borderColor: '#4CAF50' }]}>
                <Text style={s.healthyEmoji}>✅</Text>
                <Text style={[s.healthyTitle, { color: '#2E7D32' }]}>{t('identify.healthy')}</Text>
                <Text style={[s.healthyDesc, { color: colors.textSecondary }]}>{t('identify.healthyDesc')}</Text>
              </View>
            )}

            {/* Save to diary */}
            {!saved ? (
              <Button
                title={t('identify.saveEntry')}
                onPress={saveToDiary}
                variant="secondary"
                size="lg"
                style={{ marginTop: spacing.xl }}
              />
            ) : (
              <View style={[s.savedBadge, { backgroundColor: '#4CAF5018' }]}>
                <Text style={[s.savedText, { color: '#2E7D32' }]}>{t('identify.saved')}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
      padding: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    body: { padding: spacing.xl, paddingBottom: 60 },

    /* Free credit banner */
    freeBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    freeBannerText: { flex: 1, fontSize: fontSize.sm, lineHeight: 18 },

    /* Gate */
    gateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl * 2 },
    gateEmoji: { fontSize: 48, marginBottom: spacing.lg },
    gateTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center', marginBottom: spacing.sm },
    gateDesc: { textAlign: 'center', fontSize: fontSize.md, lineHeight: 22 },

    /* Photo area */
    photoPlaceholder: {
      borderRadius: radii.lg,
      borderWidth: 2,
      borderStyle: 'dashed',
      padding: spacing.xl * 1.5,
      alignItems: 'center',
    },
    placeholderEmoji: { fontSize: 48, marginBottom: spacing.md },
    placeholderText: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.xl },
    pickRow: { flexDirection: 'row', gap: spacing.md },
    pickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
    },
    pickBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    photoPreview: { width: '100%', height: 240, borderRadius: radii.lg, resizeMode: 'cover' },
    retakeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-end',
      marginTop: spacing.sm,
    },
    retakeText: { fontSize: fontSize.sm },

    /* Loading */
    loadingContainer: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.lg },
    loadingText: { fontSize: fontSize.md },

    /* Error */
    errorCard: { borderWidth: 1, marginTop: spacing.xl },
    errorTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    errorDesc: { fontSize: fontSize.sm, lineHeight: 20 },

    /* Results */
    resultsContainer: { marginTop: spacing.xl },
    diagHeader: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    typeBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.full },
    typeBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    confidenceBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.full },
    confidenceText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    diagName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    diagDesc: { fontSize: fontSize.md, lineHeight: 22, marginBottom: spacing.lg },

    section: { marginBottom: spacing.lg },
    sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    sectionBody: { fontSize: fontSize.sm, lineHeight: 20 },

    treatmentCard: { marginBottom: spacing.sm },
    treatmentHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    treatmentTypeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full },
    treatmentTypeText: { fontSize: 11, fontWeight: fontWeight.bold },
    treatmentName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, flex: 1 },
    treatmentInstr: { fontSize: fontSize.sm, lineHeight: 19 },

    /* Healthy */
    healthyCard: {
      borderRadius: radii.lg,
      borderWidth: 1.5,
      padding: spacing.xl,
      alignItems: 'center',
    },
    healthyEmoji: { fontSize: 36, marginBottom: spacing.md },
    healthyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    healthyDesc: { fontSize: fontSize.md, textAlign: 'center' },

    /* Saved */
    savedBadge: {
      marginTop: spacing.xl,
      padding: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
    },
    savedText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  });
