import { Ionicons } from '@expo/vector-icons';
import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@portfolio/supabase';
import { CROPS, CROPS_BY_ID } from '../../src/data/crops';
import type { PestDiagnosis } from '../../src/utils/pestIdentify';
import { identifyPest } from '../../src/utils/pestIdentify';
import type { PlantScanResult } from '../../src/utils/plantScan';
import { scanPlant } from '../../src/utils/plantScan';
import { goBackOr } from '../../src/utils/navigation';

type ScanMode = 'identify' | 'diagnosis';

/** Real plant identification and visual diagnosis through the authenticated ai-vision edge function. */
export default function IdentifyPlantScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { photo, mode: modeParam } = useLocalSearchParams<{ photo?: string; mode?: string }>();
  const { isAuthenticated, loading: sessionLoading } = useSession();
  const photoUri = typeof photo === 'string' ? photo : undefined;
  const mode = (typeof modeParam === 'string' && modeParam === 'diagnosis' ? 'diagnosis' : 'identify') as ScanMode;
  const isDiagnosis = mode === 'diagnosis';
  const [analyzing, setAnalyzing] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [plantResult, setPlantResult] = useState<PlantScanResult | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<PestDiagnosis | null>(null);
  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);
  const cropNames = useMemo(() => Object.fromEntries(CROPS.map((crop) => [crop.id, crop.name])), []);
  const matchedCrop = plantResult?.cropId ? CROPS_BY_ID[plantResult.cropId] : undefined;

  async function analyzePhoto() {
    if (!photoUri || analyzing || !isAuthenticated) return;
    setAnalyzing(true);
    setErrorCode(null);
    setPlantResult(null);
    setDiagnosisResult(null);
    try {
      if (isDiagnosis) {
        setDiagnosisResult(await identifyPest(photoUri, '', i18n.language));
      } else {
        setPlantResult(await scanPlant(photoUri, i18n.language, cropNames));
      }
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      setErrorCode(typeof code === 'string' ? code : 'API_ERROR');
    } finally {
      setAnalyzing(false);
    }
  }

  function errorMessage() {
    if (errorCode === 'AUTH') return t('plantScan.errors.auth');
    if (errorCode === 'RATE_LIMIT') return t('plantScan.errors.rateLimit');
    if (errorCode === 'DAILY_BUDGET') return t('plantScan.errors.dailyBudget');
    if (errorCode === 'NO_KEY' || errorCode === 'RATE_LIMIT_UNAVAILABLE' || errorCode === 'QUOTA_UNAVAILABLE') return t('plantScan.noKeyDesc');
    if (errorCode === 'BAD_REQUEST') return t('plantScan.errors.invalidImage');
    return t('plantScan.errorDesc');
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => goBackOr(router, '/plant/scan' as any)} style={s.headerBack}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[s.headerBackText, { color: colors.text }]}>{t('plantScan.retake')}</Text>
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{isDiagnosis ? t('plantScan.diagnosisTitle') : t('plantScan.title')}</Text>
        <View style={s.headerAction}>
          <Ionicons name={isDiagnosis ? 'medical-outline' : 'scan-outline'} size={21} color={colors.primary} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {photoUri ? (
          <View style={[s.resultImageFrame, { backgroundColor: colors.surfaceAlt }]}>
            <Image source={{ uri: photoUri }} resizeMode="cover" style={s.resultImage} />
            <View style={[s.modeBadge, { backgroundColor: colors.surface }]}>
              <Ionicons name={isDiagnosis ? 'medical-outline' : 'leaf-outline'} size={15} color={colors.primary} />
              <Text style={[s.modeText, { color: colors.primary }]}>{isDiagnosis ? t('plantScan.diagnosisTitle') : t('plantScan.title')}</Text>
            </View>
          </View>
        ) : (
          <View style={[s.emptyPhoto, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="image-outline" size={34} color={colors.primary} />
            <Text style={[s.cardTitle, { color: colors.text }]}>{t('plantScan.noPhoto')}</Text>
            <Text style={[s.body, { color: colors.textSecondary }]}>{t('plantScan.subtitle')}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/plant/scan' as any)} style={[s.primaryButton, { backgroundColor: colors.primary }]}>
              <Text style={[s.primaryButtonText, { color: colors.background }]}>{t('plantScan.takePhoto')}</Text>
            </Pressable>
          </View>
        )}

        {photoUri && sessionLoading ? (
          <View style={s.loadingState}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : null}

        {photoUri && !sessionLoading && !isAuthenticated ? (
          <View style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={23} color={colors.primary} />
            <Text style={[s.cardTitle, { color: colors.text }]}>{t('plantScan.signInTitle')}</Text>
            <Text style={[s.body, { color: colors.textSecondary }]}>{t('plantScan.signInDesc')}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/auth' as any)} style={[s.primaryButton, { backgroundColor: colors.primary }]}>
              <Text style={[s.primaryButtonText, { color: colors.background }]}>{t('plantScan.signIn')}</Text>
            </Pressable>
          </View>
        ) : null}

        {photoUri && !sessionLoading && isAuthenticated ? (
          <>
            <View style={[s.privacyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.sectionHeading}>
                <Ionicons name="shield-checkmark-outline" size={21} color={colors.primary} />
                <Text style={[s.cardTitle, { color: colors.text }]}>{t('plantScan.privacyTitle')}</Text>
              </View>
              <Text style={[s.body, { color: colors.textSecondary }]}>{t('plantScan.privacyBody')}</Text>
              <Text style={[s.body, { color: colors.textSecondary }]}>{t('plantScan.betaLimit')}</Text>
            </View>

            {!plantResult && !diagnosisResult && !analyzing && !errorCode ? (
              <Pressable accessibilityRole="button" onPress={() => void analyzePhoto()} style={[s.primaryButton, s.analyzeButton, { backgroundColor: colors.primary }]}>
                <Ionicons name="sparkles-outline" size={19} color={colors.background} />
                <Text style={[s.primaryButtonText, { color: colors.background }]}>{isDiagnosis ? t('plantScan.analyzeDiagnosis') : t('plantScan.analyze')}</Text>
              </Pressable>
            ) : null}

            {analyzing ? (
              <View style={[s.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[s.body, { color: colors.text }]}>{isDiagnosis ? t('plantScan.analyzingDiagnosis') : t('plantScan.analyzing')}</Text>
              </View>
            ) : null}

            {errorCode ? (
              <View style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="warning-outline" size={23} color={colors.warning} />
                <Text style={[s.cardTitle, { color: colors.text }]}>{t('plantScan.error')}</Text>
                <Text style={[s.body, { color: colors.textSecondary }]}>{errorMessage()}</Text>
                <Pressable accessibilityRole="button" onPress={() => void analyzePhoto()} style={[s.primaryButton, { backgroundColor: colors.primary }]}>
                  <Text style={[s.primaryButtonText, { color: colors.background }]}>{t('plantScan.retry')}</Text>
                </Pressable>
              </View>
            ) : null}

            {plantResult ? (
              <View style={[s.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={s.sectionHeading}>
                  <Ionicons name={plantResult.identified ? 'checkmark-circle-outline' : 'help-circle-outline'} size={22} color={colors.primary} />
                  <Text style={[s.cardTitle, { color: colors.text }]}>{plantResult.identified ? t('plantScan.identified') : t('plantScan.notIdentified')}</Text>
                </View>
                <Text style={[s.plantName, { color: colors.text }]}>{plantResult.cropName || t('plantScan.notIdentified')}</Text>
                <Text style={[s.confidence, { color: colors.primary }]}>{t(`plantScan.confidence.${plantResult.confidence}`)}</Text>
                {plantResult.identified ? <Text style={[s.stageLabel, { color: colors.textSecondary }]}>{t('plantScan.stage')}: {t(`plantScan.growthStage.${plantResult.growthStage}`)}</Text> : null}
                {plantResult.notes ? <Text style={[s.body, { color: colors.textSecondary }]}>{plantResult.notes}</Text> : null}
                {plantResult.identified && !matchedCrop ? <Text style={[s.body, { color: colors.textSecondary }]}>{t('plantScan.noCatalogMatch')}</Text> : null}
                <Pressable accessibilityRole="button" onPress={() => router.push(matchedCrop ? { pathname: '/plant/new', params: { cropId: matchedCrop.id, scan: '1' } } : '/plant/new' as any)} style={[s.primaryButton, { backgroundColor: colors.primary }]}>
                  <Text style={[s.primaryButtonText, { color: colors.background }]}>{matchedCrop ? t('plantScan.useThis') : t('plantScan.tryManual')}</Text>
                </Pressable>
              </View>
            ) : null}

            {diagnosisResult ? <DiagnosisResultCard result={diagnosisResult} t={t} colors={colors} styles={s} /> : null}

            {(plantResult || diagnosisResult) ? (
              <Pressable accessibilityRole="button" onPress={() => void analyzePhoto()} disabled={analyzing} style={[s.secondaryButton, { borderColor: colors.border }]}>
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                <Text style={[s.secondaryButtonText, { color: colors.primary }]}>{t('plantScan.retry')}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DiagnosisResultCard({ result, t, colors, styles: s }: {
  result: PestDiagnosis;
  t: (key: string) => string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[s.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.sectionHeading}>
        <Ionicons name={result.detected ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={22} color={result.detected ? colors.warning : colors.success} />
        <Text style={[s.cardTitle, { color: colors.text }]}>{result.detected ? result.name : t('plantScan.diagnosisHealthy')}</Text>
      </View>
      <Text style={[s.confidence, { color: colors.primary }]}>{t(`plantScan.confidence.${result.confidence}`)} · {t(`plantScan.diagnosisTypes.${result.type}`)}</Text>
      {result.description ? <Text style={[s.body, { color: colors.textSecondary }]}>{result.description}</Text> : null}
      {result.symptoms ? <View style={s.detailBlock}><Text style={[s.detailTitle, { color: colors.text }]}>{t('plantScan.symptoms')}</Text><Text style={[s.body, { color: colors.textSecondary }]}>{result.symptoms}</Text></View> : null}
      {result.treatments.length ? (
        <View style={s.detailBlock}>
          <Text style={[s.detailTitle, { color: colors.text }]}>{t('plantScan.treatments')}</Text>
          {result.treatments.map((treatment, index) => (
            <View key={`${index}-${treatment.type}`} style={[s.treatment, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[s.treatmentName, { color: colors.text }]}>{treatment.name} · {t(`plantScan.treatmentTypes.${treatment.type}`)}</Text>
              <Text style={[s.body, { color: colors.textSecondary }]}>{treatment.instructions}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={[s.caveat, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
        <Text style={[s.caveatText, { color: colors.textSecondary }]}>{t('plantScan.diagnosisCaveat')}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, spacing: Record<string, number>, fontSize: Record<string, number>, fontWeight: Theme['fontWeight'], radii: Record<string, number>) => StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBack: { minHeight: 44, minWidth: 76, flexDirection: 'row', alignItems: 'center', gap: 3 },
  headerBackText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  headerTitle: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, textAlign: 'center' },
  headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  resultImageFrame: { height: 220, borderRadius: radii.xl, overflow: 'hidden', position: 'relative' },
  resultImage: { width: '100%', height: '100%' },
  modeBadge: { position: 'absolute', left: spacing.md, bottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full },
  modeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  emptyPhoto: { minHeight: 220, borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  infoCard: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, alignItems: 'flex-start', gap: spacing.sm },
  privacyCard: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg },
  resultCard: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, flexShrink: 1 },
  body: { fontSize: fontSize.sm, lineHeight: 21 },
  plantName: { fontSize: 24, lineHeight: 30, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  confidence: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  stageLabel: { fontSize: fontSize.sm, marginTop: spacing.xs },
  detailBlock: { gap: spacing.xs, marginTop: spacing.md },
  detailTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  treatment: { borderRadius: radii.md, padding: spacing.md, gap: spacing.xs, marginTop: spacing.xs },
  treatmentName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  caveat: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.sm },
  caveatText: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
  primaryButton: { width: '100%', minHeight: 50, borderRadius: radii.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  analyzeButton: { marginTop: spacing.xs },
  primaryButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, textAlign: 'center' },
  secondaryButton: { minHeight: 48, borderWidth: 1, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  secondaryButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  loadingState: { minHeight: 110, alignItems: 'center', justifyContent: 'center' },
  loadingCard: { minHeight: 64, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
