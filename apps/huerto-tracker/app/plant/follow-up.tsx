import { Button, Card, useColors, useTheme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { usePro as usePurchases } from '../../src/hooks/usePro';
import { usePickPhoto } from '../../src/hooks/usePickPhoto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
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
import { track, EVENTS } from '../../src/analytics';
import type { DiagnosisData, DiagnosisFollowUpData, DiaryEntry } from '../../src/models/diary-entry';
import { compareDiagnosis, type DiagnosisComparison } from '../../src/utils/pestIdentify';
import { todayStr } from '../../src/utils/dateStr';

export default function DiagnosisFollowUpScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const { isPro } = usePurchases();
  const entries = useCollection<DiaryEntry>('diary_entries');
  const source = entryId ? entries.getById(entryId) : undefined;
  const [photo, setPhoto] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<DiagnosisComparison | null>(null);
  const [comparisonError, setComparisonError] = useState(false);
  const { pickFromGallery, pickFromCamera, picking } = usePickPhoto({
    aspect: [4, 3],
    quality: 0.7,
    i18nNamespace: 'identify',
  });

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (!isPro) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <Header title={t('identify.followUpTitle')} onBack={() => router.back()} styles={s} colors={colors} />
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>🔒</Text>
          <Text style={[s.emptyTitle, { color: colors.text }]}>{t('identify.proTitle')}</Text>
          <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>{t('identify.proDesc')}</Text>
          <Button title={t('identify.upgradePro')} onPress={() => router.push('/paywall?source=ai_identify' as any)} size="lg" style={{ marginTop: spacing.xl, alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  if (entries.loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <Header title={t('identify.followUpTitle')} onBack={() => router.back()} styles={s} colors={colors} />
        <View style={s.loadingState}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!source) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <Header title={t('identify.followUpTitle')} onBack={() => router.back()} styles={s} colors={colors} />
        <View style={s.emptyState}>
          <Text style={s.emptyEmoji}>🌱</Text>
          <Text style={[s.emptyTitle, { color: colors.text }]}>{t('identify.followUpNoSource')}</Text>
          <Button title={t('common.back')} onPress={() => router.back()} variant="secondary" size="lg" style={{ marginTop: spacing.xl, alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  const sourceEntry = source;
  const diagnosis = sourceEntry.data as DiagnosisData | undefined;
  const name = diagnosis?.name ?? sourceEntry.notes?.split('\n')[0] ?? t('identify.title');

  async function pickPhoto(fromCamera: boolean) {
    const result = fromCamera ? await pickFromCamera() : await pickFromGallery();
    if (result.kind === 'success') {
      setPhoto(result.uri);
      setSaved(false);
      setComparison(null);
      setComparisonError(false);
    }
  }

  async function runComparison() {
    if (!photo || !sourceEntry.photoUri || comparing) return;
    setComparing(true);
    setComparisonError(false);
    try {
      const result = await compareDiagnosis(sourceEntry.photoUri, photo, name, i18n.language);
      setComparison(result);
    } catch {
      setComparisonError(true);
    } finally {
      setComparing(false);
    }
  }

  async function saveFollowUp() {
    if (!photo || saving) return;
    setSaving(true);
    try {
      const data: DiagnosisFollowUpData = {
        kind: 'diagnosis_follow_up',
        parentEntryId: sourceEntry.id,
        diagnosisName: name,
        ...(comparison ? {
          comparisonStatus: comparison.status,
          comparisonConfidence: comparison.confidence,
          comparisonSummary: comparison.summary,
          comparisonNextStep: comparison.nextStep,
        } : {}),
      };
      const notes = comparison
        ? `${t('identify.followUpComparisonTitle')}: ${t('identify.followUpStatus.' + comparison.status)}\n${comparison.summary}\n${t('identify.followUpNextStep')}: ${comparison.nextStep}`
        : t('identify.followUpSavedDesc', { name });
      await entries.create({
        gardenId: sourceEntry.gardenId,
        plantId: sourceEntry.plantId,
        type: 'note',
        date: todayStr(),
        notes,
        photoUri: photo,
        data,
      });
      setSaved(true);
      track(EVENTS.diagnosisFollowupSaved, { plant_id: sourceEntry.plantId ?? null, source_entry_id: sourceEntry.id, comparison_status: comparison?.status ?? null });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Header title={t('identify.followUpTitle')} onBack={() => router.back()} styles={s} colors={colors} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.xs }}>
          <Text style={s.heroEmoji}>🔁</Text>
          <Text style={[s.heading, { color: colors.text }]}>{t('identify.followUpReviewTitle', { name })}</Text>
          <Text style={[s.description, { color: colors.textSecondary }]}>{t('identify.followUpReviewDescription')}</Text>
        </View>

        <View style={s.compareRow}>
          <View style={s.compareColumn}>
            <Text style={[s.compareLabel, { color: colors.textSecondary }]}>{t('identify.followUpOriginal')}</Text>
            {sourceEntry.photoUri ? (
              <Image source={{ uri: sourceEntry.photoUri }} style={s.compareImage} />
            ) : (
              <View style={[s.imagePlaceholder, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Text style={s.placeholderEmoji}>🌿</Text></View>
            )}
          </View>
          <View style={s.compareColumn}>
            <Text style={[s.compareLabel, { color: colors.textSecondary }]}>{t('identify.followUpNew')}</Text>
            {photo ? (
              <Image source={{ uri: photo }} style={s.compareImage} />
            ) : (
              <View style={[s.imagePlaceholder, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Text style={s.placeholderEmoji}>📸</Text></View>
            )}
          </View>
        </View>

        <Card padded style={s.contextCard}>
          <Text style={[s.contextTitle, { color: colors.text }]}>{name}</Text>
          <Text style={[s.contextBody, { color: colors.textSecondary }]}>{sourceEntry.notes ?? t('identify.followUpReviewDescription')}</Text>
        </Card>

        {sourceEntry.photoUri && (
          <View style={s.comparisonSection}>
            <Button
              title={comparing ? t('identify.followUpComparing') : t('identify.followUpCompareCta')}
              onPress={runComparison}
              loading={comparing}
              disabled={!photo || comparing}
              variant="outline"
              size="lg"
            />
            {comparisonError && <Text style={[s.compareError, { color: colors.error }]}>{t('identify.followUpCompareError')}</Text>}
          </View>
        )}

        {comparison && (
          <Card padded style={StyleSheet.flatten([s.comparisonCard, { borderColor: colors.primary + '55', backgroundColor: colors.primary + '0d' }])}>
            <Text style={[s.comparisonTitle, { color: colors.text }]}>{t('identify.followUpComparisonTitle')}</Text>
            <View style={[s.statusPill, { backgroundColor: statusColor(comparison.status, colors) + '20' }]}>
              <Text style={[s.statusPillText, { color: statusColor(comparison.status, colors) }]}>{t('identify.followUpStatus.' + comparison.status)}</Text>
              <Text style={[s.confidenceText, { color: colors.textSecondary }]}>{t('identify.followUpConfidence', { confidence: t('identify.confidence.' + comparison.confidence) })}</Text>
            </View>
            <Text style={[s.comparisonBody, { color: colors.textSecondary }]}>{comparison.summary}</Text>
            <Text style={[s.nextStepLabel, { color: colors.text }]}>{t('identify.followUpNextStep')}</Text>
            <Text style={[s.comparisonBody, { color: colors.textSecondary }]}>{comparison.nextStep}</Text>
          </Card>
        )}

        {!photo && <Text style={[s.selectHint, { color: colors.textSecondary }]}>{t('identify.followUpPhotoRequired')}</Text>}
        <View style={s.pickRow}>
          <Pressable onPress={() => pickPhoto(true)} disabled={picking} style={[s.pickButton, { borderColor: colors.primary, backgroundColor: colors.primary + '12', opacity: picking ? 0.5 : 1 }]}>
            <Ionicons name="camera-outline" size={20} color={colors.primary} />
            <Text style={[s.pickButtonText, { color: colors.primary }]}>{t('identify.followUpCamera')}</Text>
          </Pressable>
          <Pressable onPress={() => pickPhoto(false)} disabled={picking} style={[s.pickButton, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, opacity: picking ? 0.5 : 1 }]}>
            <Ionicons name="images-outline" size={20} color={colors.textSecondary} />
            <Text style={[s.pickButtonText, { color: colors.textSecondary }]}>{t('identify.followUpGallery')}</Text>
          </Pressable>
        </View>

        {saved ? (
          <View style={[s.successCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Text style={s.successEmoji}>✅</Text>
            <Text style={[s.successTitle, { color: colors.primary }]}>{t('identify.followUpSaved')}</Text>
            <Text style={[s.successBody, { color: colors.textSecondary }]}>{t('identify.followUpSavedDesc', { name })}</Text>
          </View>
        ) : (
          <Button title={t('identify.followUpSave')} onPress={saveFollowUp} loading={saving} disabled={!photo} size="lg" style={{ marginTop: spacing.lg }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusColor(status: DiagnosisComparison['status'], colors: ReturnType<typeof useColors>) {
  if (status === 'mejora') return colors.primary;
  if (status === 'empeora') return colors.error;
  if (status === 'estable') return colors.info;
  return colors.warning;
}

function Header({ title, onBack, styles, colors }: { title: string; onBack: () => void; styles: ReturnType<typeof makeStyles>; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: ReturnType<typeof useTheme>['fontWeight'],
  radii: Record<string, number>
) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1 },
  backButton: { minWidth: 40, minHeight: 40, justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing['3xl'] ?? spacing.xl },
  heroEmoji: { fontSize: 34 },
  heading: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  description: { fontSize: fontSize.md, lineHeight: 23 },
  compareRow: { flexDirection: 'row', gap: spacing.md },
  compareColumn: { flex: 1, gap: spacing.xs },
  compareLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  compareImage: { width: '100%', aspectRatio: 1, borderRadius: radii.lg },
  imagePlaceholder: { width: '100%', aspectRatio: 1, borderRadius: radii.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 32 },
  contextCard: { borderColor: colors.border },
  contextTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  contextBody: { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs },
  comparisonSection: { gap: spacing.xs },
  compareError: { fontSize: fontSize.sm, textAlign: 'center' },
  comparisonCard: { gap: spacing.sm, borderWidth: 1 },
  comparisonTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  statusPill: { alignSelf: 'flex-start', borderRadius: radii.full ?? radii.lg, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: spacing.xs },
  statusPillText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  confidenceText: { fontSize: fontSize.xs },
  comparisonBody: { fontSize: fontSize.md, lineHeight: 22 },
  nextStepLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  selectHint: { fontSize: fontSize.sm, textAlign: 'center' },
  pickRow: { flexDirection: 'row', gap: spacing.sm },
  pickButton: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  pickButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  successCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  successEmoji: { fontSize: 28 },
  successTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
  successBody: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center', marginTop: spacing.md },
  emptyDesc: { fontSize: fontSize.md, lineHeight: 22, textAlign: 'center', marginTop: spacing.sm },
});

