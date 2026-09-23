import { useColors, useTheme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DISEASES, type DiseaseInfo, type DiseaseType } from '../src/data/diseases';
import { CROPS_BY_ID } from '../src/data/crops';
import { goBackOr } from '../src/utils/navigation';
import { filterDiseaseCatalog } from '../src/utils/diseaseGuide';

const TYPE_COLOR: Record<DiseaseType, string> = {
  plaga: '#EF5350',
  enfermedad: '#AB47BC',
  deficiencia: '#FFA726',
};

const TREATMENT_COLOR: Record<string, string> = {
  organico: '#4CAF50',
  preventivo: '#29B6F6',
  quimico: '#FF7043',
};

type ThemeTokens = Pick<ReturnType<typeof useTheme>, 'spacing' | 'fontSize' | 'fontWeight' | 'radii'>;
type DiseaseText = Omit<DiseaseInfo, 'visualSigns' | 'treatments'> & {
  visualSigns: string[];
  treatments: DiseaseInfo['treatments'];
};

export default function DiseaseGuideScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <StitchDiseaseScreen
      colors={colors}
      onBack={() => goBackOr(router)}
      onScan={() => router.push('/plant/scan' as any)}
    />
  );
}

function StitchDiseaseScreen({
  colors,
  onBack,
  onScan,
}: {
  colors: ReturnType<typeof useColors>;
  onBack: () => void;
  onScan: () => void;
}) {
  const theme = useTheme();
  const { spacing, fontSize, fontWeight, radii } = theme;
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<DiseaseType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchRef = useRef<TextInput>(null);
  const styles = useMemo(() => makeStyles(theme), [spacing, fontSize, fontWeight, radii]);

  const localizedDiseases = useMemo(() => DISEASES.map((disease): DiseaseText => {
    const rawSigns = t(`diseases.${disease.id}.visualSigns`, {
      returnObjects: true,
      defaultValue: disease.visualSigns,
    });
    const rawTreatments = t(`diseases.${disease.id}.treatments`, {
      returnObjects: true,
      defaultValue: disease.treatments,
    });
    const treatments = Array.isArray(rawTreatments)
      ? rawTreatments.map((treatment: { name?: string; instructions?: string }, index) => ({
          type: disease.treatments[index]?.type ?? 'preventivo',
          name: treatment.name ?? disease.treatments[index]?.name ?? '',
          instructions: treatment.instructions ?? disease.treatments[index]?.instructions ?? '',
        }))
      : disease.treatments;

    return {
      ...disease,
      name: t(`diseases.${disease.id}.name`, { defaultValue: disease.name }),
      symptoms: t(`diseases.${disease.id}.symptoms`, { defaultValue: disease.symptoms }),
      description: t(`diseases.${disease.id}.description`, { defaultValue: disease.description }),
      visualSigns: Array.isArray(rawSigns) ? rawSigns.map(String) : disease.visualSigns,
      treatments,
    };
  }), [i18n.language, t]);

  const filteredDiseases = useMemo(
    () => filterDiseaseCatalog(localizedDiseases, query, selectedFilter, (disease) => {
      const cropNames = disease.affectedCrops.map((id) => {
        const crop = CROPS_BY_ID[id];
        return crop ? t(`crops.${id}.name`, { defaultValue: crop.name }) : id;
      });
      return [
        disease.name,
        disease.symptoms,
        disease.description,
        ...cropNames,
        ...disease.visualSigns,
        ...disease.treatments.flatMap(({ name, instructions }) => [name, instructions]),
      ].join(' ');
    }),
    [localizedDiseases, query, selectedFilter, t],
  );

  const featured = filteredDiseases.find((disease) => disease.id === selectedId) ?? filteredDiseases[0] ?? null;
  const otherDiseases = featured
    ? filteredDiseases.filter((disease) => disease.id !== featured.id)
    : [];
  const filters: Array<{ key: DiseaseType | null; label: string }> = [
    { key: null, label: t('diseaseGuide.filterAll') },
    { key: 'plaga', label: t('diseaseGuide.filterPest') },
    { key: 'enfermedad', label: t('diseaseGuide.filterDisease') },
    { key: 'deficiencia', label: t('diseaseGuide.filterDeficiency') },
  ];

  const severityLabel = (severity: DiseaseInfo['severity']) =>
    t(`diseaseGuide.severity${severity === 3 ? 'High' : severity === 2 ? 'Med' : 'Low'}`);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={21} color={colors.text} />
          <Text style={[styles.headerActionText, { color: colors.text }]}>{t('common.back')}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: colors.text }]}>{t('diseaseGuide.title')}</Text>
        <Pressable onPress={() => searchRef.current?.focus()} style={styles.headerSearch} accessibilityRole="button" accessibilityLabel={t('diseaseGuide.search')}>
          <Ionicons name="search" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder={t('diseaseGuide.search')}
            placeholderTextColor={colors.textDisabled}
            accessibilityLabel={t('diseaseGuide.search')}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('diseaseGuide.clearSearch')}>
              <Ionicons name="close-circle" size={19} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <View style={[styles.guideHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.guideHeroIcon, { backgroundColor: colors.error + '14' }]}>
            <Ionicons name="medkit-outline" size={25} color={colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.guideHeroTitle, { color: colors.text }]}>{t('diseaseGuide.stitchHeading', { defaultValue: t('diseaseGuide.title') })}</Text>
            <Text style={[styles.guideHeroDesc, { color: colors.textSecondary }]}>{t('diseaseGuide.stitchDesc', { defaultValue: t('diseaseGuide.subtitle') })}</Text>
          </View>
        </View>

        <View style={[styles.disclaimer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.disclaimerText, { color: colors.text }]}>{t('diseaseGuide.referenceNote')}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((filter) => {
            const active = selectedFilter === filter.key;
            const color = filter.key ? TYPE_COLOR[filter.key] : colors.primary;
            return (
              <Pressable
                key={filter.key ?? 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => { setSelectedFilter(filter.key); setSelectedId(null); }}
                style={[styles.filter, { backgroundColor: active ? color + '18' : colors.surface, borderColor: active ? color : colors.border }]}
              >
                <Text style={[styles.filterText, { color: active ? color : colors.textSecondary }]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!featured ? (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={28} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('diseaseGuide.empty')}</Text>
            <Pressable onPress={() => { setQuery(''); setSelectedFilter(null); }} style={styles.clearFilters} accessibilityRole="button">
              <Text style={[styles.clearFiltersText, { color: colors.primary }]}>{t('diseaseGuide.clearFilters')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.feature, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.featureTop}>
                <View style={[styles.diseaseIcon, { backgroundColor: TYPE_COLOR[featured.type] + '18' }]}>
                  <Text style={{ fontSize: 22 }}>{featured.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureMeta, { color: TYPE_COLOR[featured.type] }]}>
                    {t('diseaseGuide.referenceCard')} · {t(`diseaseGuide.type.${featured.type}`)} · {severityLabel(featured.severity)}
                  </Text>
                  <Text accessibilityRole="header" style={[styles.featureName, { color: colors.text }]}>{featured.name}</Text>
                </View>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>{featured.description}</Text>
              <View style={[styles.infoBlock, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('diseaseGuide.symptoms')}</Text>
                <Text style={[styles.body, { color: colors.textSecondary }]}>{featured.symptoms}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('diseaseGuide.visualSigns')}</Text>
              <View style={styles.signs}>
                {featured.visualSigns.map((sign) => (
                  <View key={sign} style={[styles.signChip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[styles.signText, { color: colors.textSecondary }]}>{sign}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('diseaseGuide.affectedCrops')}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                {featured.affectedCrops.map((id) => {
                  const crop = CROPS_BY_ID[id];
                  return crop ? t(`crops.${id}.name`, { defaultValue: crop.name }) : id;
                }).join(' · ')}
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('diseaseGuide.treatments')}</Text>
              {featured.treatments.map((treatment, index) => (
                <View key={`${featured.id}-${index}`} style={[styles.treatment, { borderTopColor: colors.border }]}>
                  <View style={[styles.treatmentMarker, { backgroundColor: TREATMENT_COLOR[treatment.type] ?? colors.primary }]}>
                    <Text style={styles.treatmentNumber}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.treatmentType, { color: TREATMENT_COLOR[treatment.type] ?? colors.primary }]}>{t(`diseaseGuide.treatment.${treatment.type}`)}</Text>
                    <Text style={[styles.treatmentName, { color: colors.text }]}>{treatment.name}</Text>
                    <Text style={[styles.body, { color: colors.textSecondary }]}>{treatment.instructions}</Text>
                  </View>
                </View>
              ))}
            </View>

            {otherDiseases.length > 0 && (
              <>
                <View style={styles.otherHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('diseaseGuide.otherMatches')}</Text>
                  <Text style={[styles.resultCount, { color: colors.textSecondary }]}>{filteredDiseases.length}</Text>
                </View>
                {otherDiseases.map((disease) => (
                  <Pressable
                    key={disease.id}
                    onPress={() => setSelectedId(disease.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${disease.name}. ${t('diseaseGuide.type.' + disease.type)}`}
                    style={({ pressed }) => [styles.otherRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <View style={[styles.smallBug, { backgroundColor: TYPE_COLOR[disease.type] + '18' }]}>
                      <Text style={{ fontSize: 18 }}>{disease.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{disease.name}</Text>
                      <Text numberOfLines={2} style={[styles.body, { color: colors.textSecondary }]}>{disease.symptoms}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
                  </Pressable>
                ))}
              </>
            )}
          </>
        )}

        <Pressable onPress={onScan} style={[styles.scan, { backgroundColor: colors.primary }]} accessibilityRole="button">
          <Ionicons name="camera-outline" size={19} color="#FFFFFF" />
          <Text style={styles.scanText}>{t('diseaseGuide.scanSymptom')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles({ spacing, fontSize, fontWeight, radii }: ThemeTokens) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { minHeight: 58, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
    back: { minHeight: 44, minWidth: 72, flexDirection: 'row', alignItems: 'center', gap: 2 },
    headerActionText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    headerSearch: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
    search: { minHeight: 48, borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    searchInput: { flex: 1, fontSize: fontSize.sm, paddingVertical: 0 },
    guideHero: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    guideHeroIcon: { width: 48, height: 48, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
    guideHeroTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    guideHeroDesc: { fontSize: fontSize.xs, lineHeight: 17, marginTop: spacing.xs },
    disclaimer: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    disclaimerText: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },
    filterRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
    filter: { minHeight: 40, borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.md, justifyContent: 'center' },
    filterText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    feature: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.md, gap: spacing.sm },
    featureTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
    diseaseIcon: { width: 44, height: 44, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
    featureMeta: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    featureName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 2 },
    body: { fontSize: fontSize.xs, lineHeight: 18 },
    infoBlock: { borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
    sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: spacing.sm },
    signs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    signChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderRadius: radii.full },
    signText: { fontSize: fontSize.xs },
    treatment: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, marginTop: spacing.xs, flexDirection: 'row', gap: spacing.sm },
    treatmentMarker: { width: 24, height: 24, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
    treatmentNumber: { color: '#FFFFFF', fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    treatmentType: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase' },
    treatmentName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 2 },
    otherHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    resultCount: { fontSize: fontSize.xs },
    otherRow: { minHeight: 68, borderWidth: 1, borderRadius: radii.lg, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    smallBug: { width: 38, height: 38, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    empty: { minHeight: 170, borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    emptyText: { textAlign: 'center', fontSize: fontSize.sm },
    clearFilters: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
    clearFiltersText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    scan: { minHeight: 52, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
    scanText: { color: '#FFFFFF', fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  });
}
