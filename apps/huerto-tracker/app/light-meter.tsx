import { useColors, useTheme, Card, Button, ScreenHeader, type Theme } from '@portfolio/ui';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS } from '../src/data/crops';
import type { CropInfo } from '../src/data/crops';

type SunLevel = 'full' | 'partial' | 'shade' | null;

interface Question {
  id: string;
  key: string;
  options: Array<{ value: string; emoji: string; labelKey: string; score: number }>;
}

const QUESTIONS: Question[] = [
  {
    id: 'hours',
    key: 'lightMeter.q1',
    options: [
      { value: 'h0', emoji: '🌑', labelKey: 'lightMeter.q1a', score: 0 },
      { value: 'h1', emoji: '⛅', labelKey: 'lightMeter.q1b', score: 1 },
      { value: 'h2', emoji: '🌤️', labelKey: 'lightMeter.q1c', score: 2 },
      { value: 'h3', emoji: '☀️', labelKey: 'lightMeter.q1d', score: 3 },
    ],
  },
  {
    id: 'obstruct',
    key: 'lightMeter.q2',
    options: [
      { value: 'o0', emoji: '🏢', labelKey: 'lightMeter.q2a', score: -1 },
      { value: 'o1', emoji: '🌳', labelKey: 'lightMeter.q2b', score: -1 },
      { value: 'o2', emoji: '✅', labelKey: 'lightMeter.q2c', score: 0 },
    ],
  },
  {
    id: 'surface',
    key: 'lightMeter.q3',
    options: [
      { value: 's0', emoji: '🪟', labelKey: 'lightMeter.q3a', score: 0 },
      { value: 's1', emoji: '🏡', labelKey: 'lightMeter.q3b', score: 1 },
      { value: 's2', emoji: '🌿', labelKey: 'lightMeter.q3c', score: -1 },
    ],
  },
];

function scoreToSunLevel(score: number): SunLevel {
  if (score >= 4) return 'full';
  if (score >= 2) return 'partial';
  return 'shade';
}

const SUN_CONFIG: Record<NonNullable<SunLevel>, { emoji: string; color: string; labelKey: string; descKey: string }> = {
  full:    { emoji: '☀️', color: '#FF7043', labelKey: 'lightMeter.full',    descKey: 'lightMeter.fullDesc' },
  partial: { emoji: '⛅', color: '#FFA726', labelKey: 'lightMeter.partial', descKey: 'lightMeter.partialDesc' },
  shade:   { emoji: '🌑', color: '#78909C', labelKey: 'lightMeter.shade',   descKey: 'lightMeter.shadeDesc' },
};

export default function LightMeterScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SunLevel>(null);

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  const allAnswered = QUESTIONS.every((q) => answers[q.id] !== undefined);

  function handleAnswer(questionId: string, optValue: string) {
    const next = { ...answers, [questionId]: optValue };
    setAnswers(next);
    if (QUESTIONS.every((q) => next[q.id] !== undefined)) {
      const total = QUESTIONS.reduce((sum, q) => {
        const opt = q.options.find((o) => o.value === next[q.id]);
        return sum + (opt?.score ?? 0);
      }, 0);
      setResult(scoreToSunLevel(total));
    }
  }

  function reset() {
    setAnswers({} as Record<string, string>);
    setResult(null);
  }

  const recommendedCrops = useMemo(() => {
    if (!result) return [];
    return CROPS.filter((c) => {
      if (result === 'full') return c.sunNeeds === 'full';
      if (result === 'partial') return c.sunNeeds === 'full' || c.sunNeeds === 'partial';
      return true;
    }).slice(0, 12);
  }, [result]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title={t('lightMeter.title')} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Description */}
        <View style={[s.descCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={{ fontSize: 28 }}>💡</Text>
          <Text style={[s.descText, { color: colors.text }]}>{t('lightMeter.desc')}</Text>
        </View>

        {/* Questions */}
        {QUESTIONS.map((question, qIdx) => (
          <View key={question.id} style={{ marginBottom: spacing.xl }}>
            <Text style={[s.questionText, { color: colors.text }]}>
              {qIdx + 1}. {t(question.key)}
            </Text>
            <View style={s.optionsRow}>
              {question.options.map((opt) => {
                const selected = answers[question.id] === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleAnswer(question.id, opt.value)}
                    style={[
                      s.optionBtn,
                      {
                        backgroundColor: selected ? colors.primary + '22' : colors.surfaceAlt,
                        borderColor: selected ? colors.primary : colors.border,
                        flex: 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>{opt.emoji}</Text>
                    <Text style={[s.optionText, { color: selected ? colors.primary : colors.textSecondary }]} numberOfLines={2}>
                      {t(opt.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* Result */}
        {result && (() => {
          const cfg = SUN_CONFIG[result];
          return (
            <>
              <View style={[s.resultCard, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '55' }]}>
                <Text style={{ fontSize: 36 }}>{cfg.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.resultTitle, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
                  <Text style={[s.resultDesc, { color: colors.text }]}>{t(cfg.descKey)}</Text>
                </View>
              </View>

              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{t('lightMeter.recommended')}</Text>
              <View style={s.cropsGrid}>
                {recommendedCrops.map((crop: CropInfo) => (
                  <Pressable
                    key={crop.id}
                    onPress={() => router.push(`/plant/new?cropId=${crop.id}` as any)}
                    style={[s.cropTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={{ fontSize: 28 }}>{crop.emoji}</Text>
                    <Text style={[s.cropName, { color: colors.text }]} numberOfLines={2}>
                      {t('crops.' + crop.id + '.name', { defaultValue: crop.name })}
                    </Text>
                    <Text style={[s.cropSun, { color: cfg.color }]}>{cfg.emoji}</Text>
                  </Pressable>
                ))}
              </View>

              <Button
                title={t('lightMeter.retake')}
                variant="outline"
                size="md"
                onPress={reset}
                style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}
              />
            </>
          );
        })()}

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>,
) =>
  StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: spacing.xl, paddingBottom: 60 },
    descCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginBottom: spacing.xl,
    },
    descText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
    questionText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
    optionsRow: { flexDirection: 'row', gap: spacing.sm },
    optionBtn: {
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 4,
      minHeight: 70,
      justifyContent: 'center',
    },
    optionText: { fontSize: 10, fontWeight: fontWeight.semibold, textAlign: 'center' },
    resultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 2,
      marginBottom: spacing.xl,
    },
    resultTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    resultDesc: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4 },
    sectionTitle: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: spacing.md,
    },
    cropsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    cropTile: {
      width: '30%',
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: 4,
    },
    cropName: { fontSize: 10, fontWeight: fontWeight.medium, textAlign: 'center' },
    cropSun: { fontSize: 12 },
  });
