import { useColors, useTheme, Card, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DISEASES, type DiseaseInfo, type DiseaseType } from '../src/data/diseases';

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

export default function DiseaseGuideScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DiseaseType | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return DISEASES.filter((d) => {
      if (typeFilter && d.type !== typeFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.symptoms.toLowerCase().includes(q) ||
        d.affectedCrops.some((c) => c.includes(q))
      );
    });
  }, [search, typeFilter]);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  const FILTERS: { key: DiseaseType | null; label: string }[] = [
    { key: null, label: t('diseaseGuide.filterAll') },
    { key: 'plaga', label: t('diseaseGuide.filterPest') },
    { key: 'enfermedad', label: t('diseaseGuide.filterDisease') },
    { key: 'deficiencia', label: t('diseaseGuide.filterDeficiency') },
  ];

  const getDiseaseContent = (disease: DiseaseInfo) => {
    const rawSigns = t(`diseases.${disease.id}.visualSigns`, { returnObjects: true, defaultValue: disease.visualSigns });
    const rawTreatments = t(`diseases.${disease.id}.treatments`, { returnObjects: true, defaultValue: disease.treatments });
    const treatments: DiseaseInfo['treatments'] = Array.isArray(rawTreatments)
      ? rawTreatments.map((tr: { name?: string; instructions?: string }, i: number) => ({
          type: disease.treatments[i]?.type,
          name: tr.name ?? disease.treatments[i]?.name ?? '',
          instructions: tr.instructions ?? disease.treatments[i]?.instructions ?? '',
        }))
      : disease.treatments;
    return {
      name: t(`diseases.${disease.id}.name`, { defaultValue: disease.name }),
      symptoms: t(`diseases.${disease.id}.symptoms`, { defaultValue: disease.symptoms }),
      description: t(`diseases.${disease.id}.description`, { defaultValue: disease.description }),
      visualSigns: (Array.isArray(rawSigns) ? rawSigns : disease.visualSigns) as string[],
      treatments,
    };
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('diseaseGuide.title')}</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>{t('diseaseGuide.subtitle')}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border, margin: spacing.lg, marginBottom: spacing.sm }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('diseaseGuide.search')}
          placeholderTextColor={colors.textDisabled}
          style={[s.searchInput, { color: colors.text }]}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Type filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
        {FILTERS.map((f) => {
          const active = typeFilter === f.key;
          const color = f.key ? TYPE_COLOR[f.key] : colors.primary;
          return (
            <Pressable
              key={f.key ?? 'all'}
              onPress={() => setTypeFilter(f.key)}
              style={[
                s.filterChip,
                {
                  backgroundColor: active ? color + '22' : colors.surfaceAlt,
                  borderColor: active ? color : colors.border,
                },
              ]}
            >
              <Text style={[s.filterChipText, { color: active ? color : colors.textSecondary }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 60 }}>
        {filtered.length === 0 && (
          <Text style={[s.emptyText, { color: colors.textDisabled }]}>{t('diseaseGuide.empty')}</Text>
        )}
        {filtered.map((disease) => {
          const isOpen = expanded === disease.id;
          const color = TYPE_COLOR[disease.type];
          const content = getDiseaseContent(disease);
          return (
            <Pressable
              key={disease.id}
              onPress={() => setExpanded(isOpen ? null : disease.id)}
              style={{ marginBottom: spacing.md }}
            >
              <Card padded style={StyleSheet.flatten([s.card, { borderColor: isOpen ? color : colors.border, borderWidth: isOpen ? 1.5 : 1 }]) as ViewStyle}>
                {/* Row */}
                <View style={s.cardHeader}>
                  <Text style={{ fontSize: 28 }}>{disease.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.diseaseName, { color: colors.text }]}>{content.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <View style={[s.typeBadge, { backgroundColor: color + '22' }]}>
                        <Text style={[s.typeBadgeText, { color }]}>{t('diseaseGuide.type.' + disease.type)}</Text>
                      </View>
                      <View style={s.severityRow}>
                        {[1, 2, 3].map((dot) => (
                          <View
                            key={dot}
                            style={[
                              s.severityDot,
                              { backgroundColor: dot <= disease.severity ? color : colors.border },
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>

                {isOpen && (
                  <>
                    <View style={[s.divider, { backgroundColor: colors.border }]} />

                    {/* Disease image */}
                    {disease.imageUrl && !imageError[disease.id] && (
                      <View style={[s.imageWrapper, { backgroundColor: colors.surfaceAlt }]}>
                        <Image
                          source={{ uri: disease.imageUrl, headers: { 'User-Agent': 'HuertoTracker/1.0 (https://github.com/MrZamudioRamos/portfolio-apps)' } }}
                          style={s.diseaseImage}
                          resizeMode="cover"
                          onError={() => setImageError((prev) => ({ ...prev, [disease.id]: true }))}
                        />
                      </View>
                    )}

                    {/* Affected crops */}
                    <Text style={[s.label, { color: colors.textSecondary }]}>{t('diseaseGuide.affectedCrops')}</Text>
                    <Text style={[s.body, { color: colors.text }]}>
                      {disease.affectedCrops.map((c) => t('crops.' + c + '.name')).join(', ')}
                    </Text>

                    {/* Visual signs */}
                    {content.visualSigns.length > 0 && (
                      <>
                        <Text style={[s.label, { color: colors.textSecondary }]}>{t('diseaseGuide.visualSigns')}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {content.visualSigns.map((sign, i) => (
                            <View key={i} style={[s.visualSignChip, { backgroundColor: color + '15', borderColor: color + '44' }]}>
                              <Text style={[s.visualSignText, { color }]}>{sign}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {/* Symptoms */}
                    <Text style={[s.label, { color: colors.textSecondary }]}>{t('diseaseGuide.symptoms')}</Text>
                    <Text style={[s.body, { color: colors.text }]}>{content.symptoms}</Text>

                    {/* Description */}
                    <Text style={[s.body, { color: colors.textSecondary, fontStyle: 'italic' }]}>{content.description}</Text>

                    {/* Treatments */}
                    <Text style={[s.label, { color: colors.textSecondary }]}>{t('diseaseGuide.treatments')}</Text>
                    {content.treatments.map((tr, i) => (
                      <View key={i} style={[s.treatmentRow, { borderTopColor: colors.border }]}>
                        <View style={[s.treatmentTypeBadge, { backgroundColor: TREATMENT_COLOR[tr.type] + '22' }]}>
                          <Text style={[s.treatmentTypeText, { color: TREATMENT_COLOR[tr.type] }]}>
                            {t('diseaseGuide.treatment.' + tr.type)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.treatmentName, { color: colors.text }]}>{tr.name}</Text>
                          <Text style={[s.treatmentInstructions, { color: colors.textSecondary }]}>{tr.instructions}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </Card>
            </Pressable>
          );
        })}
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
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    headerSub: { fontSize: fontSize.xs, marginTop: 1 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1.5,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    searchInput: { flex: 1, fontSize: fontSize.md },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    filterChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    emptyText: { textAlign: 'center', marginTop: spacing['2xl'], fontSize: fontSize.md },
    card: { gap: spacing.sm },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    diseaseName: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    typeBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      marginTop: 3,
    },
    typeBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
    label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm },
    body: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 2 },
    treatmentRow: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      alignItems: 'flex-start',
    },
    treatmentTypeBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radii.sm,
      alignSelf: 'flex-start',
      marginTop: 2,
      minWidth: 68,
      alignItems: 'center',
    },
    treatmentTypeText: { fontSize: 9, fontWeight: fontWeight.bold, textTransform: 'uppercase' },
    treatmentName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    treatmentInstructions: { fontSize: fontSize.xs, lineHeight: 16, marginTop: 2 },
    severityRow: { flexDirection: 'row', gap: 3, alignItems: 'center' },
    severityDot: { width: 7, height: 7, borderRadius: 4 },
    visualSignChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    visualSignText: { fontSize: 11, fontWeight: fontWeight.medium },
    imageWrapper: {
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: spacing.xs,
    },
    diseaseImage: {
      width: '100%',
      height: 180,
    },
  });
