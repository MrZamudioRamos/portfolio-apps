import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { usePro as usePurchases } from '../../src/hooks/usePro';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../../src/data/crops';
import { scanPlant, type PlantScanResult } from '../../src/utils/plantScan';

const CONFIDENCE_COLOR: Record<string, string> = {
  alta: '#4CAF50',
  media: '#FFA726',
  baja: '#EF5350',
};

const STAGE_TO_STATUS: Record<string, string> = {
  seedling: 'seedling',
  vegetative: 'growing',
  flowering: 'flowering',
  fruiting: 'fruiting',
  dormant: 'finished',
};

const SNAP_TIPS = ['tip1', 'tip2', 'tip3', 'tip4'] as const;

export default function PlantScanScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isPro } = usePurchases();

  const [showTips, setShowTips] = useState(true);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PlantScanResult | null>(null);
  const [errorKey, setErrorKey] = useState<'noKey' | 'generic' | null>(null);

  const cropNames = useMemo(
    () => Object.fromEntries(Object.entries(CROPS_BY_ID).map(([id, c]) => [id, c.name])),
    []
  );

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function pickPhoto(fromCamera: boolean) {
    setErrorKey(null);
    setResult(null);

    let res: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      });
    }
    if (!res.canceled) setPhoto(res.assets[0]);
  }

  async function analyze() {
    if (!photo) return;
    setAnalyzing(true);
    setErrorKey(null);
    setResult(null);

    try {
      const scan = await scanPlant(photo.uri, i18n.language, cropNames);
      setResult(scan);
    } catch (err: unknown) {
      const e = err as { code?: string };
      setErrorKey(e.code === 'NO_KEY' ? 'noKey' : 'generic');
    } finally {
      setAnalyzing(false);
    }
  }

  function useThisPlant() {
    if (!result) return;
    const params: Record<string, string> = { scan: '1' };
    if (result.cropId) params.cropId = result.cropId;
    if (result.growthStage) params.status = STAGE_TO_STATUS[result.growthStage] ?? 'seedling';
    router.replace({ pathname: '/plant/new', params });
  }

  if (!isPro) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text style={[s.title, { color: colors.text }]}>{t('plantScan.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.gate}>
          <Text style={s.gateEmoji}>🌿</Text>
          <Text style={[s.gateTitle, { color: colors.text }]}>{t('plantScan.proTitle')}</Text>
          <Text style={[s.gateDesc, { color: colors.textSecondary }]}>{t('plantScan.proDesc')}</Text>
          <Button
            title={t('plantScan.upgradePro')}
            onPress={() => router.push('/paywall')}
            size="lg"
            style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[s.title, { color: colors.text }]}>{t('plantScan.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Photo area */}
        {!photo ? (
          <View style={[s.photoPlaceholder, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={s.placeholderEmoji}>🌱</Text>
            <Text style={[s.placeholderHint, { color: colors.textSecondary }]}>
              {t('plantScan.subtitle')}
            </Text>
            <View style={s.pickRow}>
              <Pressable
                onPress={() => pickPhoto(true)}
                style={[s.pickBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}
              >
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
                <Text style={[s.pickBtnText, { color: colors.primary }]}>{t('plantScan.takePhoto')}</Text>
              </Pressable>
              <Pressable
                onPress={() => pickPhoto(false)}
                style={[s.pickBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              >
                <Ionicons name="images-outline" size={20} color={colors.textSecondary} />
                <Text style={[s.pickBtnText, { color: colors.textSecondary }]}>{t('plantScan.fromGallery')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View>
            <Image source={{ uri: photo.uri }} style={s.photoPreview} />
            <Pressable
              onPress={() => { setPhoto(null); setResult(null); setErrorKey(null); }}
              style={s.retakeBtn}
            >
              <Ionicons name="refresh-outline" size={14} color={colors.primary} />
              <Text style={[s.retakeText, { color: colors.primary }]}>{t('plantScan.retake')}</Text>
            </Pressable>
          </View>
        )}

        {/* Analyze */}
        {photo && !analyzing && !result && (
          <Button
            title={t('plantScan.analyze')}
            onPress={analyze}
            size="lg"
            style={{ marginTop: spacing.xl }}
          />
        )}

        {/* Loading */}
        {analyzing && (
          <View style={s.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[s.loadingText, { color: colors.textSecondary }]}>{t('plantScan.analyzing')}</Text>
          </View>
        )}

        {/* Error */}
        {errorKey && (
          <View style={[s.errorCard, { backgroundColor: colors.error + '12', borderColor: colors.error }]}>
            <Text style={[s.errorTitle, { color: colors.error }]}>{t('plantScan.error')}</Text>
            <Text style={[s.errorDesc, { color: colors.textSecondary }]}>
              {t(errorKey === 'noKey' ? 'plantScan.noKeyDesc' : 'plantScan.errorDesc')}
            </Text>
          </View>
        )}

        {/* Result */}
        {result && (
          <View style={s.result}>
            {result.identified ? (
              <>
                {/* Crop identified */}
                <View style={[s.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.resultHeader}>
                    <Text style={s.cropEmoji}>
                      {result.cropId ? (CROPS_BY_ID[result.cropId]?.emoji ?? '🌱') : '🌱'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cropName, { color: colors.text }]}>{result.cropName}</Text>
                      <View style={[s.confidenceBadge, { backgroundColor: (CONFIDENCE_COLOR[result.confidence] ?? '#999') + '22' }]}>
                        <Text style={[s.confidenceText, { color: CONFIDENCE_COLOR[result.confidence] ?? '#999' }]}>
                          {t('plantScan.confidence.' + result.confidence)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Growth stage */}
                  <View style={[s.stageRow, { borderTopColor: colors.border }]}>
                    <Text style={[s.stageLabel, { color: colors.textSecondary }]}>{t('plantScan.stage')}</Text>
                    <Text style={[s.stageValue, { color: colors.text }]}>
                      {t('plantScan.growthStage.' + result.growthStage)}
                    </Text>
                  </View>

                  {/* Notes */}
                  {!!result.notes && (
                    <Text style={[s.notes, { color: colors.textSecondary, borderTopColor: colors.border }]}>
                      {result.notes}
                    </Text>
                  )}
                </View>

                <Button
                  title={t('plantScan.useThis')}
                  onPress={useThisPlant}
                  size="lg"
                  style={{ marginTop: spacing.lg }}
                />
              </>
            ) : (
              /* Not identified */
              <View style={[s.notFound, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={s.notFoundEmoji}>🔍</Text>
                <Text style={[s.notFoundTitle, { color: colors.text }]}>{t('plantScan.notIdentified')}</Text>
                <Text style={[s.notFoundDesc, { color: colors.textSecondary }]}>{t('plantScan.notIdentifiedDesc')}</Text>
              </View>
            )}

            <Pressable
              onPress={() => router.replace('/plant/new')}
              style={[s.manualBtn, { borderColor: colors.border }]}
            >
              <Text style={[s.manualBtnText, { color: colors.textSecondary }]}>
                {t('plantScan.tryManual')}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Snap Tips modal */}
      <Modal visible={showTips} transparent animationType="slide">
        <View style={s.tipsOverlay}>
          <View style={[s.tipsSheet, { backgroundColor: colors.surface }]}>
            <View style={[s.tipsHandle, { backgroundColor: colors.border }]} />
            <Text style={s.tipsEmoji}>📸</Text>
            <Text style={[s.tipsTitle, { color: colors.text }]}>{t('plantScan.tipsTitle')}</Text>
            {SNAP_TIPS.map((key) => (
              <View key={key} style={s.tipRow}>
                <Text style={[s.tipCheck, { color: colors.primary }]}>✓</Text>
                <Text style={[s.tipText, { color: colors.textSecondary }]}>{t(`plantScan.${key}`)}</Text>
              </View>
            ))}
            <Button
              title={t('plantScan.gotIt')}
              onPress={() => setShowTips(false)}
              size="lg"
              style={{ marginTop: spacing.xl }}
            />
          </View>
        </View>
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
      padding: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    body: { padding: spacing.xl, paddingBottom: 60 },

    gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl * 2 },
    gateEmoji: { fontSize: 48, marginBottom: spacing.lg },
    gateTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center', marginBottom: spacing.sm },
    gateDesc: { textAlign: 'center', fontSize: fontSize.md, lineHeight: 22 },

    photoPlaceholder: {
      borderRadius: radii.lg,
      borderWidth: 2,
      borderStyle: 'dashed',
      padding: spacing.xl * 1.5,
      alignItems: 'center',
    },
    placeholderEmoji: { fontSize: 48, marginBottom: spacing.md },
    placeholderHint: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.xl },
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

    loading: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.lg },
    loadingText: { fontSize: fontSize.md },

    errorCard: {
      marginTop: spacing.xl,
      padding: spacing.lg,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    errorTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    errorDesc: { fontSize: fontSize.sm, lineHeight: 20 },

    result: { marginTop: spacing.xl },
    resultCard: {
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
    },
    cropEmoji: { fontSize: 40 },
    cropName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: 4 },
    confidenceBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    confidenceText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    stageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    stageLabel: { fontSize: fontSize.sm },
    stageValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    notes: {
      padding: spacing.lg,
      fontSize: fontSize.sm,
      lineHeight: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
    },

    notFound: {
      borderRadius: radii.lg,
      borderWidth: 1.5,
      padding: spacing.xl,
      alignItems: 'center',
    },
    notFoundEmoji: { fontSize: 36, marginBottom: spacing.md },
    notFoundTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    notFoundDesc: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },

    manualBtn: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
    },
    manualBtnText: { fontSize: fontSize.sm },

    tipsOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    tipsSheet: {
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.xl,
      paddingBottom: spacing.xl * 2,
      alignItems: 'center',
    },
    tipsHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      marginBottom: spacing.lg,
    },
    tipsEmoji: { fontSize: 40, marginBottom: spacing.md },
    tipsTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.xl, textAlign: 'center' },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.md,
      alignSelf: 'stretch',
    },
    tipCheck: { fontSize: fontSize.md, fontWeight: fontWeight.bold, width: 20 },
    tipText: { flex: 1, fontSize: fontSize.md, lineHeight: 22 },
  });
