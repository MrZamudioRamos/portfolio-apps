import { useColors, useTheme, Card, ScreenHeader, type Theme } from '@portfolio/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
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
import { CROPS_BY_ID } from '../src/data/crops';
import { goBackOr } from '../src/utils/navigation';

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

  return <StitchDiseaseScreen colors={colors} onBack={() => goBackOr(router)} onScan={() => router.push('/plant/scan' as any)} />;

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
      <ScreenHeader
        title={t('diseaseGuide.title')}
        subtitle={t('diseaseGuide.subtitle')}
        onBack={() => goBackOr(router)}
        variant="left"
      />

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

      {/* Chips + disease list share one outer scroll — eliminates flex-sibling gap */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 60 }}>
        <View style={[s.guideHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.guideHeroIcon, { backgroundColor: colors.error + '14' }]}>
            <Ionicons name="medkit-outline" size={25} color={colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.guideHeroTitle, { color: colors.text }]}>{t('diseaseGuide.stitchHeading', { defaultValue: 'Botiquín y plagas' })}</Text>
            <Text style={[s.guideHeroDesc, { color: colors.textSecondary }]}>{t('diseaseGuide.stitchDesc', { defaultValue: 'Reconoce síntomas y actúa con tratamientos adecuados para tu huerto urbano.' })}</Text>
          </View>
        </View>

        <View style={[s.goldRule, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '55' }]}>
          <Ionicons name="finger-print-outline" size={20} color={colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={[s.goldRuleTitle, { color: colors.text }]}>{t('diseaseGuide.stitchRuleTitle', { defaultValue: 'Diagnóstico táctil preventivo' })}</Text>
            <Text style={[s.goldRuleText, { color: colors.textSecondary }]}>{t('diseaseGuide.stitchRule', { defaultValue: 'Comprueba siempre los 2 cm de sustrato antes de añadir agua. Si la tierra está fresca y compacta, no riegues.' })}</Text>
          </View>
        </View>

        {/* Type filters — negative margin negates content padding so chips span full width */}
        <View style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {FILTERS.map((f) => {
                const active = typeFilter === f.key;
                const color = f.key ? TYPE_COLOR[f.key] : colors.accent;
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
                    <Text style={[s.filterChipText, { color: active ? (f.key ? color : colors.primaryDark) : colors.textSecondary }]}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

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

                    {/* Affected crops */}
                    <Text style={[s.label, { color: colors.textSecondary }]}>{t('diseaseGuide.affectedCrops')}</Text>
                    <Text style={[s.body, { color: colors.text }]}>
                      {disease.affectedCrops
                        .map((c) => t('crops.' + c + '.name', { defaultValue: CROPS_BY_ID[c]?.name ?? c }))
                        .join(', ')}
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
    guideHero: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, marginBottom: spacing.md },
    guideHeroIcon: { width: 48, height: 48, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
    guideHeroTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    guideHeroDesc: { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs },
    goldRule: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.md },
    goldRuleTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    goldRuleText: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 2 },
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
  });

function StitchDiseaseScreen({ colors, onBack, onScan }: { colors: ReturnType<typeof useColors>; onBack: () => void; onScan: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Frecuentes en balcón');
  const [open, setOpen] = useState('oidio');
  const [saved, setSaved] = useState(false);
  const filters = ['Frecuentes en balcón', 'Plagas de verano', 'Hongos por humedad', 'Soluciones orgánicas'];
  const visible = query.trim() ? ['Oídio / Cenicilla', 'Pulgón negro de la albahaca', 'Araña roja (>30°C)', 'Mosca blanca'].filter((name) => name.toLowerCase().includes(query.toLowerCase())) : ['Oídio / Cenicilla', 'Pulgón negro de la albahaca', 'Araña roja (>30°C)', 'Mosca blanca'];
  return <SafeAreaView style={[diseaseStitch.container, { backgroundColor: colors.background }]} edges={['top']}>
    <View style={[diseaseStitch.header, { borderBottomColor: colors.border }]}><Pressable onPress={onBack} style={diseaseStitch.back} hitSlop={10}><Ionicons name="chevron-back" size={21} color={colors.text} /><Text style={{ color: colors.text, fontWeight: '700' }}>Volver</Text></Pressable><Text style={[diseaseStitch.headerTitle, { color: colors.text }]}>Botiquín y Plagas</Text><Pressable accessibilityRole="button" accessibilityLabel="Enfocar buscador" onPress={() => Alert.alert('Buscar en botiquín', 'Escribe el síntoma, plaga o cultivo en el campo de búsqueda.')} hitSlop={10}><Ionicons name="search" size={21} color={colors.text} /></Pressable></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={diseaseStitch.content}>
      <View style={[diseaseStitch.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="search" size={17} color={colors.textSecondary} /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar síntoma, plaga o cultivo" placeholderTextColor={colors.textDisabled} style={{ flex: 1, color: colors.text, marginLeft: 8 }} /><Ionicons name="mic-outline" size={17} color={colors.textSecondary} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}><>{filters.map((filter) => { const active = selectedFilter === filter; return <Pressable key={filter} onPress={() => setSelectedFilter(filter)} style={[diseaseStitch.filter, { backgroundColor: active ? colors.primary + '18' : colors.surface, borderColor: active ? colors.primary : colors.border }]}><Text style={{ color: active ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '800' }}>{filter}</Text></Pressable>; })}</></ScrollView>
      {visible[0] === 'Oídio / Cenicilla' && <View style={[diseaseStitch.feature, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={diseaseStitch.featureTop}><View style={[diseaseStitch.diseaseIcon, { backgroundColor: '#AB47BC18' }]}><Ionicons name="sparkles-outline" size={22} color="#AB47BC" /></View><View style={{ flex: 1 }}><Text style={[diseaseStitch.featureMeta, { color: '#AB47BC' }]}>Hongo · Severidad media</Text><Text style={[diseaseStitch.featureName, { color: colors.text }]}>Oídio / Cenicilla</Text><Text style={[diseaseStitch.body, { color: colors.textSecondary }]}>Común en albahaca, tomateras y calabacines en terrazas mediterráneas.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Guardar oídio" onPress={() => setSaved((value) => !value)} hitSlop={10}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? colors.primary : colors.textSecondary} /></Pressable></View><View style={[diseaseStitch.photo, { backgroundColor: '#E7EFD9' }]}><Ionicons name="leaf-outline" size={44} color="#7EAA5C" /><View style={diseaseStitch.photoBadge}><Ionicons name="eye-outline" size={13} color={colors.text} /><Text style={{ color: colors.text, fontSize: 10, fontWeight: '800' }}>Polvillo blanco algodonoso · Etapa 2</Text></View></View><View style={[diseaseStitch.touchRule, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '55' }]}><Ionicons name="finger-print-outline" size={18} color={colors.primaryDark} /><View style={{ flex: 1 }}><Text style={[diseaseStitch.cardTitle, { color: colors.text }]}>Diagnóstico táctil preventivo</Text><Text style={[diseaseStitch.body, { color: colors.textSecondary }]}>La causa número 1 en macetas de terraza es regar con sustrato aún húmedo o mojar las hojas al atardecer en balcones con poco aire.</Text><Text style={[diseaseStitch.body, { color: colors.text, marginTop: 5 }]}><Text style={{ fontWeight: '800' }}>Regla de oro de Semillita: </Text>«Comprueba siempre 2 cm con el dedo. Si la tierra está fría y compacta, <Text style={{ fontWeight: '800' }}>NO agregues agua</Text>».</Text></View></View><Text style={[diseaseStitch.sectionTitle, { color: colors.text }]}>Tratamiento ecológico (España)</Text><Treatment number="1" title="Poda higiénica" text="Retira con tijeras desinfectadas las hojas inferiores que toquen la tierra o tengan más de un 50% de polvillo." colors={colors} /><Treatment number="2" title="Pulverización biológica" text="Decocción de ajo al 5% o infusión de cola de caballo a primera hora de la mañana sobre haz y envés." colors={colors} /><Treatment number="3" title="Ventilación" text="Separa las macetas al menos 15 cm para que circule la brisa en tu balcón." colors={colors} /></View>}
      <View style={diseaseStitch.otherHeader}><Text style={[diseaseStitch.sectionTitle, { color: colors.text }]}>Otras plagas comunes</Text><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>Ver catálogo  ›</Text></View>
      {visible.slice(1).map((name) => <Pressable key={name} onPress={() => setOpen(open === name ? '' : name)} style={[diseaseStitch.otherRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[diseaseStitch.smallBug, { backgroundColor: name.startsWith('Araña') ? '#EF535018' : '#8BC34A22' }]}><Ionicons name={name.startsWith('Araña') ? 'bug-outline' : 'leaf-outline'} size={17} color={name.startsWith('Araña') ? '#EF5350' : colors.primary} /></View><View style={{ flex: 1 }}><Text style={[diseaseStitch.cardTitle, { color: colors.text }]}>{name}</Text><Text style={[diseaseStitch.body, { color: colors.textSecondary }]}>{name.startsWith('Pulgón') ? 'Brotes tiernos arrugados y melaza pegajosa.' : name.startsWith('Araña') ? 'Microtelarañas en envés en olas de calor seco.' : 'Vuelan al agitar la maceta; jabón potásico.'}</Text></View><Text style={{ color: name.startsWith('Araña') ? '#EF5350' : colors.primary, fontSize: 10, fontWeight: '800' }}>{name.startsWith('Araña') ? 'Urgente' : 'Leve'}</Text><Ionicons name={open === name ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textSecondary} /></Pressable>)}
      <Pressable onPress={onScan} style={[diseaseStitch.scan, { backgroundColor: colors.primary }]}><Ionicons name="camera-outline" size={19} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Escanear síntoma con la cámara</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}

function Treatment({ number, title, text, colors }: { number: string; title: string; text: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[diseaseStitch.treatment, { borderTopColor: colors.border }]}><View style={diseaseStitch.number}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{number}</Text></View><View style={{ flex: 1 }}><Text style={[diseaseStitch.cardTitle, { color: colors.text }]}>{title}</Text><Text style={[diseaseStitch.body, { color: colors.textSecondary }]}>{text}</Text></View></View>;
}

const diseaseStitch = StyleSheet.create({
  container: { flex: 1 }, header: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', minWidth: 72 }, headerTitle: { fontSize: 17, fontWeight: '800' }, content: { padding: 16, gap: 12, paddingBottom: 32 }, search: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }, filter: { minHeight: 38, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }, feature: { borderWidth: 1, borderRadius: 20, padding: 14 }, featureTop: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' }, diseaseIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, featureMeta: { fontSize: 10, fontWeight: '800' }, featureName: { fontSize: 18, fontWeight: '800', marginTop: 2 }, body: { fontSize: 12, lineHeight: 18 }, photo: { minHeight: 118, borderRadius: 15, marginTop: 12, alignItems: 'center', justifyContent: 'center', position: 'relative' }, photoBadge: { position: 'absolute', left: 9, bottom: 9, backgroundColor: '#FFFFFFCC', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 }, touchRule: { borderWidth: 1, borderRadius: 14, padding: 11, flexDirection: 'row', gap: 8, marginTop: 12 }, sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 12, marginBottom: 2 }, treatment: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 2, flexDirection: 'row', gap: 8 }, number: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: 13, fontWeight: '800' }, otherHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, otherRow: { minHeight: 65, borderWidth: 1, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, smallBug: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, scan: { minHeight: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
});
