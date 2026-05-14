import { useColors, useTheme, Card } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../src/data/crops';
import type { Plant } from '../src/models/plant';
import { useActiveGarden } from '../src/hooks/useActiveGarden';

// Crop family groupings for rotation recommendations
const CROP_FAMILIES: Record<string, { label: string; emoji: string; color: string; crops: string[] }> = {
  solanaceas: {
    label: 'Solanáceas',
    emoji: '🍅',
    color: '#FF7043',
    crops: ['tomate', 'pimiento', 'berenjena', 'guindilla'],
  },
  cruciferas: {
    label: 'Crucíferas',
    emoji: '🥦',
    color: '#4CAF50',
    crops: ['col', 'brocoli', 'coliflor', 'kale', 'rabano', 'nabo'],
  },
  leguminosas: {
    label: 'Leguminosas',
    emoji: '🫘',
    color: '#8BC34A',
    crops: ['judia-verde', 'guisante', 'haba'],
  },
  cucurbitaceas: {
    label: 'Cucurbitáceas',
    emoji: '🥒',
    color: '#26C6DA',
    crops: ['calabacin', 'pepino', 'calabaza', 'melon', 'sandia'],
  },
  aliaceas: {
    label: 'Aliáceas',
    emoji: '🧅',
    color: '#AB47BC',
    crops: ['ajo', 'cebolla', 'puerro'],
  },
  raices: {
    label: 'Raíces',
    emoji: '🥕',
    color: '#FFA726',
    crops: ['zanahoria', 'remolacha', 'patata'],
  },
  hojas: {
    label: 'Hojas',
    emoji: '🥗',
    color: '#66BB6A',
    crops: ['lechuga', 'espinaca', 'acelga', 'rucula', 'canonigos'],
  },
  aromaticas: {
    label: 'Aromáticas',
    emoji: '🌿',
    color: '#9E9E9E',
    crops: ['albahaca', 'perejil', 'cilantro', 'romero', 'tomillo', 'menta', 'salvia', 'oregano', 'eneldo', 'hinojo', 'manzanilla', 'lavanda'],
  },
  frutas: {
    label: 'Frutas',
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
  const plants = useCollection<Plant>('plants');

  const gardenPlants = useMemo(
    () => plants.items.filter((p) => p.gardenId === activeGarden?.id),
    [plants.items, activeGarden?.id]
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
        const crop = CROPS_BY_ID[p.cropId];
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
  }, [gardenPlants, currentYear, t]);

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('rotation.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {bedData.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48 }}>🌱</Text>
            <Text style={[s.emptyTitle, { color: colors.text }]}>{t('rotation.empty')}</Text>
            <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>{t('rotation.emptyDesc')}</Text>
          </View>
        ) : (
          bedData.map(({ bedName, byYear, sortedYears, conflicts, suggestions, currentFamilies }) => (
            <View key={bedName} style={{ marginBottom: spacing.xl }}>
              <View style={s.bedHeader}>
                <Text style={{ fontSize: 18 }}>🌱</Text>
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
                    <Text style={[s.yearLabel, { color: year === currentYear ? colors.primary : colors.textSecondary }]}>
                      {year}
                    </Text>
                    <View style={s.cropsRow}>
                      {entries.map(({ crop, plant, family }) => (
                        <Pressable
                          key={plant.id}
                          onPress={() => router.push(`/plant/${plant.id}`)}
                          style={[s.cropTag, {
                            backgroundColor: (family?.color ?? '#9E9E9E') + '22',
                            borderColor: (family?.color ?? '#9E9E9E') + '88',
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
                    ⚠️ {t('rotation.conflictDetail', { families: conflicts.map((c) => CROP_FAMILIES[c]?.label ?? c).join(', ') })}
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
                          <Text style={[s.suggestTagText, { color: fam.color }]}>{fam.label}</Text>
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
          {Object.values(CROP_FAMILIES).map((fam) => (
            <View key={fam.label} style={s.legendRow}>
              <Text style={{ fontSize: 16 }}>{fam.emoji}</Text>
              <Text style={[s.legendFamily, { color: colors.text }]}>{fam.label}</Text>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    scroll: { padding: spacing.xl, paddingBottom: 60 },
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
