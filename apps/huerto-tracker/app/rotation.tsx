import { useColors, useTheme, Card, ScreenHeader } from '@portfolio/ui';
import { createStore } from '@portfolio/storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { CROPS_BY_ID } from '../src/data/crops';
import type { Plant } from '../src/models/plant';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { useCustomCrops } from '../src/hooks/useCustomCrops';
import { goBackOr } from '../src/utils/navigation';

// Crop family groupings for rotation recommendations
const CROP_FAMILIES: Record<string, { emoji: string; color: string; crops: string[] }> = {
  solanaceas: {
    emoji: '🍅',
    color: '#FF7043',
    crops: ['tomate', 'pimiento', 'berenjena', 'guindilla'],
  },
  cruciferas: {
    emoji: '🥦',
    color: '#4CAF50',
    crops: ['col', 'brocoli', 'coliflor', 'kale', 'rabano', 'nabo'],
  },
  leguminosas: {
    emoji: '🫘',
    color: '#8BC34A',
    crops: ['judia-verde', 'guisante', 'haba'],
  },
  cucurbitaceas: {
    emoji: '🥒',
    color: '#26C6DA',
    crops: ['calabacin', 'pepino', 'calabaza', 'melon', 'sandia'],
  },
  aliaceas: {
    emoji: '🧅',
    color: '#AB47BC',
    crops: ['ajo', 'cebolla', 'puerro'],
  },
  raices: {
    emoji: '🥕',
    color: '#FFA726',
    crops: ['zanahoria', 'remolacha', 'patata'],
  },
  hojas: {
    emoji: '🥗',
    color: '#66BB6A',
    crops: ['lechuga', 'espinaca', 'acelga', 'rucula', 'canonigos'],
  },
  aromaticas: {
    emoji: '🌿',
    color: '#9E9E9E',
    crops: ['albahaca', 'perejil', 'cilantro', 'romero', 'tomillo', 'menta', 'salvia', 'oregano', 'eneldo', 'hinojo', 'manzanilla', 'lavanda'],
  },
  frutas: {
    emoji: '🍓',
    color: '#EF5350',
    crops: ['fresa'],
  },
};

function getCropFamily(cropId: string) {
  for (const [familyId, fam] of Object.entries(CROP_FAMILIES)) {
    if (fam.crops.includes(cropId)) return { familyId, ...fam };
  }
  return null;
}

// Good successor families (rotation rules)
const GOOD_AFTER: Record<string, string[]> = {
  solanaceas: ['leguminosas', 'aromaticas', 'hojas'],
  cruciferas: ['leguminosas', 'raices', 'aromaticas'],
  leguminosas: ['solanaceas', 'cruciferas', 'cucurbitaceas'],
  cucurbitaceas: ['leguminosas', 'raices', 'hojas'],
  aliaceas: ['cruciferas', 'raices', 'hojas'],
  raices: ['leguminosas', 'hojas', 'aliaceas'],
  hojas: ['raices', 'solanaceas', 'cucurbitaceas'],
  aromaticas: [],
  frutas: [],
};

export default function RotationScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { activeGarden } = useActiveGarden();
  const { customCropsById } = useCustomCrops();

  const plantStore = useMemo(() => createStore<Plant>('plants'), []);
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    plantStore.getAll().then((items) => {
      if (active) setAllPlants(items.filter((item) => !item.deletedAt));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [plantStore]));

  async function onRefresh() {
    setRefreshing(true);
    try {
      const items = await plantStore.getAll();
      setAllPlants(items.filter((item) => !item.deletedAt));
    } finally {
      setRefreshing(false);
    }
  }

  const gardenPlants = useMemo(
    () => allPlants.filter((p) => p.gardenId === activeGarden?.id),
    [allPlants, activeGarden?.id]
  );

  const currentYear = new Date().getFullYear();

  // Group plants by bedName, then by year
  const bedData = useMemo(() => {
    const beds = new Map<string, Plant[]>();

    gardenPlants.forEach((p) => {
      const bed = p.bedName?.trim() || t('rotation.noBed');
      if (!beds.has(bed)) beds.set(bed, []);
      beds.get(bed)!.push(p);
    });

    return [...beds.entries()].map(([bedName, bedPlants]) => {
      // Group by year sowed
      const byYear = new Map<number, { crop: (typeof CROPS_BY_ID)[string]; plant: Plant; family: ReturnType<typeof getCropFamily> }[]>();
      bedPlants.forEach((p) => {
        const year = p.sowingDate ? new Date(p.sowingDate + 'T12:00:00').getFullYear() : currentYear;
        if (!byYear.has(year)) byYear.set(year, []);
        const crop = CROPS_BY_ID[p.cropId] ?? customCropsById[p.cropId];
        if (crop) byYear.get(year)!.push({ crop, plant: p, family: getCropFamily(p.cropId) });
      });

      const sortedYears = [...byYear.keys()].sort((a, b) => b - a);
      const currentYearEntries = byYear.get(currentYear) ?? [];
      const lastYearEntries = byYear.get(currentYear - 1) ?? [];

      // Check rotation conflict
      const currentFamilies = new Set(currentYearEntries.map((e) => e.family?.familyId).filter(Boolean) as string[]);
      const lastFamilies = new Set(lastYearEntries.map((e) => e.family?.familyId).filter(Boolean) as string[]);
      const conflicts = [...currentFamilies].filter((f) => lastFamilies.has(f));

      // Suggest next crops: good after all current families
      const suggestions: string[] = [];
      currentFamilies.forEach((f) => {
        (GOOD_AFTER[f] ?? []).forEach((s) => {
          if (!currentFamilies.has(s) && !suggestions.includes(s)) suggestions.push(s);
        });
      });

      return { bedName, byYear, sortedYears, conflicts, suggestions, currentFamilies };
    });
  }, [gardenPlants, currentYear, t, customCropsById]);

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScreenHeader title={t('rotation.title')} onBack={() => goBackOr(router)} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[s.stitchHero, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary + '33' }]}>
          <View style={[s.stitchHeroIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="sync-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.stitchHeroTitle, { color: colors.text }]}>Cuida el suelo de una temporada a otra</Text>
            <Text style={[s.stitchHeroText, { color: colors.textSecondary }]}>Consulta las familias cultivadas y elige el siguiente paso con más criterio.</Text>
          </View>
        </View>
        <View style={[s.ruleCard, { backgroundColor: colors.accent + '55', borderColor: colors.secondary + '66' }]}>
          <Ionicons name="bulb-outline" size={18} color={colors.secondary} />
          <Text style={[s.ruleText, { color: colors.text }]}>La rotación ayuda a prevenir agotamiento y problemas repetidos en el mismo bancal.</Text>
        </View>

        {loading && (
          <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.loading')}</Text>
          </View>
        )}

        {!loading && (activeGarden?.gardenType === 'balcon' || activeGarden?.gardenType === 'maceta') ? (
          <View style={s.emptyState}>
            <Ionicons name="flower-outline" size={48} color={colors.primary} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>{t('rotation.notApplicable')}</Text>
            <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>{t('rotation.notApplicableDesc')}</Text>
          </View>
        ) : !loading && bedData.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="leaf-outline" size={48} color={colors.primary} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>{t('rotation.empty')}</Text>
            <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>{t('rotation.emptyDesc')}</Text>
          </View>
        ) : (
          bedData.map(({ bedName, byYear, sortedYears, conflicts, suggestions, currentFamilies }) => (
            <View key={bedName} style={{ marginBottom: spacing.xl }}>
              <View style={s.bedHeader}>
                <Ionicons name="leaf-outline" size={18} color={colors.primary} />
                <Text style={[s.bedName, { color: colors.text }]}>{bedName}</Text>
                {conflicts.length > 0 && (
                  <View style={[s.warningBadge, { backgroundColor: '#EF535018', borderColor: '#EF5350' }]}>
                    <Ionicons name="warning-outline" size={12} color="#EF5350" />
                    <Text style={[s.warningText, { color: '#EF5350' }]}>{t('rotation.conflict')}</Text>
                  </View>
                )}
              </View>

              {/* Year timeline */}
              {sortedYears.slice(0, 4).map((year) => {
                const entries = byYear.get(year)!;
                return (
                  <View key={year} style={s.yearRow}>
                    <Text style={[s.yearLabel, { color: year === currentYear ? colors.primaryDark : colors.textSecondary }]}>
                      {year}
                    </Text>
                    <View style={s.cropsRow}>
                      {entries.map(({ crop, plant, family }) => (
                        <Pressable
                          key={plant.id}
                          onPress={() => !plant.deletedAt && router.push(`/plant/${plant.id}`)}
                          style={[s.cropTag, {
                            backgroundColor: (family?.color ?? '#9E9E9E') + (plant.deletedAt ? '11' : '22'),
                            borderColor: (family?.color ?? '#9E9E9E') + (plant.deletedAt ? '44' : '88'),
                            opacity: plant.deletedAt ? 0.55 : 1,
                          }]}
                        >
                          <Text style={{ fontSize: 14 }}>{crop.emoji}</Text>
                          <Text style={[s.cropTagName, { color: colors.text }]} numberOfLines={1}>
                            {t('crops.' + crop.id + '.name', { defaultValue: crop.name })}
                          </Text>
                          {family && (
                            <Text style={[s.cropTagFamily, { color: family.color }]}>
                              {family.emoji}
                            </Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}

              {/* Conflict warning */}
              {conflicts.length > 0 && (
                <View style={[s.conflictBox, { backgroundColor: '#EF535008', borderColor: '#EF535044' }]}>
                  <Text style={[s.conflictText, { color: '#EF5350' }]}>
                    ⚠️ {t('rotation.conflictDetail', { families: conflicts.map((c) => t('cropFamily.' + c)).join(', ') })}
                  </Text>
                </View>
              )}

              {/* Rotation suggestions */}
              {suggestions.length > 0 && (
                <View style={[s.suggestBox, { backgroundColor: '#4CAF5008', borderColor: '#4CAF5044' }]}>
                  <Text style={[s.suggestLabel, { color: '#4CAF50' }]}>
                    ✅ {t('rotation.suggest')}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 }}>
                    {suggestions.slice(0, 4).map((familyId) => {
                      const fam = CROP_FAMILIES[familyId];
                      if (!fam) return null;
                      return (
                        <View key={familyId} style={[s.suggestTag, { backgroundColor: fam.color + '18', borderColor: fam.color + '66' }]}>
                          <Text style={{ fontSize: 12 }}>{fam.emoji}</Text>
                          <Text style={[s.suggestTagText, { color: fam.color }]}>{t('cropFamily.' + familyId)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          ))
        )}

        {/* Family legend */}
        <Text style={[s.legendTitle, { color: colors.textSecondary }]}>{t('rotation.familyGuide')}</Text>
        <Card padded style={{ marginBottom: spacing.xl }}>
          {Object.entries(CROP_FAMILIES).map(([familyId, fam]) => (
            <View key={familyId} style={s.legendRow}>
              <Text style={{ fontSize: 16 }}>{fam.emoji}</Text>
              <Text style={[s.legendFamily, { color: colors.text }]}>{t('cropFamily.' + familyId)}</Text>
              <Text style={[s.legendCrops, { color: colors.textSecondary }]} numberOfLines={1}>
                {fam.crops.slice(0, 4).join(', ')}{fam.crops.length > 4 ? '…' : ''}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: any,
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: spacing.xl, paddingBottom: 60 },
    stitchHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, marginBottom: spacing.md },
    stitchHeroIcon: { width: 44, height: 44, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
    stitchHeroTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    stitchHeroText: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 3 },
    ruleCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.xl },
    ruleText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
    bedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    bedName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, flex: 1 },
    warningBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    warningText: { fontSize: 10, fontWeight: fontWeight.semibold },
    yearRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    yearLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, width: 36, paddingTop: 4 },
    cropsRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    cropTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: 4,
      maxWidth: 150,
    },
    cropTagName: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, flexShrink: 1 },
    cropTagFamily: { fontSize: 12 },
    conflictBox: {
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    conflictText: { fontSize: fontSize.xs, lineHeight: 18 },
    suggestBox: {
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      marginBottom: spacing.sm,
    },
    suggestLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    suggestTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    suggestTagText: { fontSize: 10, fontWeight: fontWeight.semibold },
    legendTitle: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
    },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
    legendFamily: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, width: 100 },
    legendCrops: { flex: 1, fontSize: fontSize.xs },
    emptyState: { alignItems: 'center', paddingTop: 80, gap: spacing.md },
    emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center' },
    emptyDesc: { fontSize: fontSize.sm, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  });

function StitchRotationScreen({ colors, onBack }: { colors: ReturnType<typeof useColors>; onBack: () => void }) {
  const router = useRouter();
  return (
    <SafeAreaView style={[rotationStitch.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[rotationStitch.header, { borderBottomColor: colors.border }]}><Pressable onPress={onBack} style={rotationStitch.back} hitSlop={10}><Ionicons name="chevron-back" size={21} color={colors.text} /><Text style={{ color: colors.text, fontWeight: '700' }}>Mi Huerto</Text></Pressable><Text style={[rotationStitch.headerTitle, { color: colors.text }]}>Rotación de Cultivos</Text><Pressable accessibilityRole="button" accessibilityLabel="Ayuda sobre rotación" onPress={() => Alert.alert('Rotación de cultivos', 'Alterna familias de cultivos para que el sustrato de tus macetas se recupere y reducir la presión de plagas.')} hitSlop={10}><Ionicons name="information-circle-outline" size={22} color={colors.primary} /></Pressable></View>
      <ScrollView contentContainerStyle={rotationStitch.content} showsVerticalScrollIndicator={false}>
        <View style={[rotationStitch.tip, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '55' }]}><Ionicons name="bulb-outline" size={20} color="#D88900" /><Text style={[rotationStitch.body, { color: colors.text }]}><Text style={{ fontWeight: '800' }}>CONSEJO DE SEMILLITA </Text>La rotación en macetas renueva los nutrientes del sustrato y evita plagas del suelo año tras año.</Text></View>
        <View style={[rotationStitch.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={rotationStitch.sectionHeading}><Ionicons name="grid-outline" size={19} color={colors.primary} /><View><Text style={[rotationStitch.title, { color: colors.text }]}>Macetas y ciclos actuales</Text><Text style={[rotationStitch.body, { color: colors.textSecondary }]}>2 activas</Text></View></View><CycleCard title="Maceta A (30L)" subtitle="Balcón Sur · Ciclo Primavera/Verano" current="Tomate Cherry" currentNote="Solanácea · Gran consumidora" next="Rabanitos o Espinacas" colors={colors} /><CycleCard title="Jardinera B (20L)" subtitle="Junto al ventanal · Todo el año" current="Menta piperita" currentNote="Aromática invasiva por estolones" next="Mantener aislada o renovar tierra en otoño" colors={colors} invasive /></View>
        <Text style={[rotationStitch.title, { color: colors.text }]}>Guía de familias botánicas</Text>
        <View style={[rotationStitch.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[rotationStitch.body, { color: colors.textSecondary, marginBottom: 8 }]}>Rotación recomendada</Text><Family title="Solanáceas" icon="nutrition" description="Tomates, Pimientos, Berenjenas" note="Consumo alto · Dejar descansar la tierra 2 temporadas completas." colors={colors} /><Family title="Leguminosas" icon="leaf" description="Guisantes, Habas, Judías verdes" note="Regeneradoras · Fijan nitrógeno natural enriqueciendo el sustrato." colors={colors} /><Family title="Compuestas / Crucíferas" icon="leaf" description="Lechugas, Rúcula, Canónigos, Rábanos" note="Consumo ligero · Ideales como cultivo puente entre temporadas." colors={colors} /></View>
        <View style={[rotationStitch.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={rotationStitch.sectionHeading}><Ionicons name="layers-outline" size={19} color={colors.primary} /><View><Text style={[rotationStitch.title, { color: colors.text }]}>Renovación de sustrato</Text><Text style={[rotationStitch.body, { color: colors.textSecondary }]}>Receta Balcón · Paso esencial</Text></View></View><Text style={[rotationStitch.body, { color: colors.text, marginTop: 12 }]}>Añadir 30% de humus de lombriz tras finalizar el ciclo de Tomate Cherry</Text><Text style={[rotationStitch.body, { color: colors.textSecondary, marginTop: 5 }]}>Realiza esta mezcla antes de trasplantar hojas verdes. Aportará flora microbiana viva y evitará compactación de la turba.</Text><View style={rotationStitch.pills}><Text style={rotationStitch.pill}>+30% Humus</Text><Text style={rotationStitch.pill}>Reposo 3–5 días</Text><Text style={rotationStitch.pill}>pH 6.2–6.8</Text></View></View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/reminder/new' as any)} style={[rotationStitch.action, { backgroundColor: colors.primary }]}><Ionicons name="calendar-outline" size={18} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Planificar siguiente temporada (Otoño 2025)</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function CycleCard({ title, subtitle, current, currentNote, next, colors, invasive = false }: { title: string; subtitle: string; current: string; currentNote: string; next: string; colors: ReturnType<typeof useColors>; invasive?: boolean }) {
  return <View style={[rotationStitch.cycle, { borderTopColor: colors.border }]}><Text style={[rotationStitch.title, { color: colors.text }]}>{title}</Text><Text style={[rotationStitch.body, { color: colors.textSecondary }]}>{subtitle}</Text><View style={rotationStitch.cycleRow}><Ionicons name={invasive ? 'warning-outline' : 'flame-outline'} size={16} color={invasive ? '#D88900' : '#E66A3C'} /><View style={{ flex: 1 }}><Text style={[rotationStitch.label, { color: colors.textSecondary }]}>CULTIVO ACTUAL</Text><Text style={[rotationStitch.titleSmall, { color: colors.text }]}>{current}</Text><Text style={[rotationStitch.body, { color: colors.textSecondary }]}>({currentNote})</Text></View></View><View style={[rotationStitch.next, { backgroundColor: colors.primary + '12' }]}><Ionicons name="sync" size={17} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[rotationStitch.label, { color: colors.primary }]}>SIGUIENTE RECOMENDADO</Text><Text style={[rotationStitch.titleSmall, { color: colors.text }]}>{next}</Text></View></View></View>;
}

function Family({ title, icon, description, note, colors }: { title: string; icon: keyof typeof Ionicons.glyphMap; description: string; note: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[rotationStitch.family, { borderTopColor: colors.border }]}><Ionicons name={icon} size={19} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[rotationStitch.titleSmall, { color: colors.text }]}>{title}</Text><Text style={[rotationStitch.body, { color: colors.text }]}>{description}</Text><Text style={[rotationStitch.body, { color: colors.textSecondary }]}>{note}</Text></View></View>;
}

const rotationStitch = StyleSheet.create({
  container: { flex: 1 }, header: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', minWidth: 90 }, headerTitle: { fontSize: 17, fontWeight: '800' }, content: { padding: 16, gap: 14, paddingBottom: 32 }, tip: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', gap: 8 }, section: { borderRadius: 18, borderWidth: 1, padding: 14 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { fontSize: 16, fontWeight: '800' }, titleSmall: { fontSize: 14, fontWeight: '800', marginTop: 2 }, body: { fontSize: 12, lineHeight: 18 }, cycle: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 13, paddingTop: 13 }, cycleRow: { flexDirection: 'row', gap: 8, marginTop: 12 }, label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }, next: { marginTop: 10, borderRadius: 12, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }, family: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 11, flexDirection: 'row', gap: 9 }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }, pill: { backgroundColor: '#8BC34A22', color: '#3D713E', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, fontSize: 10, fontWeight: '800' }, action: { minHeight: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
