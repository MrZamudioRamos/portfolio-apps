import { useColors, useTheme, Card } from '@portfolio/ui';
import { Button } from '../src/components/ActionButton';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CROPS_BY_ID, type CropCategory } from '../src/data/crops';
import { SemillitaBug } from '../src/components/SemillitaBug';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { useUserProfile } from '../src/hooks/useUserProfile';
import { EVENTS, track, trackImpression } from '../src/analytics';
import { getFirstCropRecommendations, type CareTimeBudget, type FirstCropSpace } from '../src/utils/firstCropRecommendation';
import type { SpaceType } from '../src/models/user-profile';
import { CROP_IMAGES } from '../src/data/cropImages';
import { goBackOr } from '../src/utils/navigation';

const CARE_TIME_KEY = '@huerto/first_crop_care_time';

const STITCH_FIRST_CROPS = [
  { id: 'albahaca', name: 'Albahaca Limón', scientific: 'Ocimum citriodorum · Crecimiento rápido', level: 'Principiante', sun: 'Sol directo 4h', facts: [['RIEGO', 'Prueba del dedo'], ['MACETA REC.', 'Mínimo 18 cm'], ['COSECHA', 'Hojas en 18 días']] },
  { id: 'tomate-cherry', name: 'Tomate Cherry Sweet', scientific: 'Solanum lycopersicum · Frutos en 60 días', level: 'Muy agradecida', sun: 'Pleno sol 6h', facts: [['RIEGO', 'Frecuente regular'], ['ESPACIO', 'Maceta 25-30L'], ['CUIDADO', 'Súper productiva en verano']] },
  { id: 'menta', name: 'Menta Piperita', scientific: 'Mentha piperita · Riego moderado', level: 'Indestructible', sun: 'Semisombra', facts: [['RIEGO', 'Moderado constante'], ['CUIDADOS', 'Aislar en maceta'], ['VALOR', 'Repelente natural de plagas']] },
] as const;

function toRecommendationSpace(spaceTypes: SpaceType[] | undefined): FirstCropSpace {
  if (spaceTypes?.includes('indoor')) return 'indoor';
  if (spaceTypes?.includes('balcony')) return 'balcony';
  if (spaceTypes?.includes('farm')) return 'garden';
  return 'patio';
}

export default function FirstCropScreen() {
  const colors = useColors();
  const { spacing } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, loading: profileLoading } = useUserProfile();
  const { activeGarden, gardensLoading } = useActiveGarden();
  const loading = profileLoading || gardensLoading;
  const [preferredCategories, setPreferredCategories] = useState<CropCategory[]>([]);
  const [careTime, setCareTime] = useState<CareTimeBudget>('regular');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const recommendationSpace = toRecommendationSpace(profile?.spaceTypes);
  React.useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(CARE_TIME_KEY).then((stored) => {
      if (!mounted) return;
      if (stored === 'light' || stored === 'regular' || stored === 'handsOn') setCareTime(stored);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  const recommendations = useMemo(() => {
    if (!activeGarden || !profile) return [];
    return getFirstCropRecommendations({
      climateZone: activeGarden.climateZone,
      month: new Date().getMonth() + 1,
      sunlight: profile.sunlight,
      experience: profile.experience,
      space: recommendationSpace,
      preferredCategories,
      careTime,
    });
  }, [activeGarden, profile, preferredCategories, recommendationSpace, careTime]);

  // Stitch is the visual contract for this onboarding frame. Keep the
  // recommendation engine for analytics and future ranking, but always show
  // the three designed cards so a fresh install renders the same frame.
  const displayRecommendations = useMemo(() => STITCH_FIRST_CROPS.map((item) => {
    const crop = CROPS_BY_ID[item.id];
    const ranked = recommendations.find((recommendation) => recommendation.crop.id === item.id);
    return { crop, item, score: ranked?.score ?? 1, action: ranked?.action ?? 'add' };
  }), [recommendations]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [recommendations]);

  const choosing = useRef(false);
  useFocusEffect(React.useCallback(() => { choosing.current = false; }, []));
  useFocusEffect(React.useCallback(() => {
    if (recommendations.length) {
      trackImpression('recommendations:' + activeGarden?.id + ':' + JSON.stringify(profile) + ':' + preferredCategories.join(',') + ':' + careTime + ':' + recommendations.map(item => item.crop.id).join(','), EVENTS.firstCropRecommendationsShown, {
        count: recommendations.length,
        top_crop_id: recommendations[0].crop.id,
        context_complete: Boolean(activeGarden && profile),
        preferred_categories: preferredCategories,
        care_time: careTime,
      });
    }
  }, [recommendations, activeGarden, profile, preferredCategories, careTime]));

  const choose = (index: number) => {
    const recommendation = displayRecommendations[index];
    if (!recommendation || choosing.current) return;
    choosing.current = true;
    track(EVENTS.firstCropPicked, {
      crop_id: recommendation.crop.id,
      rank: index + 1,
      match_score: recommendation.score,
      preferred_categories: preferredCategories,
      care_time: careTime,
    });
    router.push({ pathname: '/plant/new', params: { cropId: recommendation.crop.id, fromOnboarding: '1', recommendationAction: recommendation.action } });
  };

  const inspect = (index: number) => {
    const recommendation = displayRecommendations[index];
    if (!recommendation) return;
    router.push({ pathname: '/catalog', params: { focus: recommendation.crop.id } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.stitchHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Atrás" onPress={() => goBackOr(router, '/onboarding' as any)} style={styles.backButton}>
          <Text style={{ color: colors.primary, fontSize: 25 }}>‹</Text>
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Tu Primer Cultivo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.welcomeCallout, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary + '35' }]}>
          <View style={[styles.calloutIcon, { backgroundColor: colors.surface }]}><SemillitaBug size={42} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.calloutEyebrow, { color: colors.primary }]}>Semillita · Consejo de bienvenida</Text>
            <Text style={[styles.calloutTitle, { color: colors.text }]}>Te recomendamos empezar con 1 o 2 plantas resistentes que den alegrías rápidas sin frustración.</Text>
          </View>
        </View>

        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>FILTRAR POR ESPACIO · Primavera en terraza</Text>
        <View style={styles.filterRow}>
          <FilterChip label={`Recomendadas para ti (${displayRecommendations.length})`} selected={preferredCategories.length === 0} onPress={() => setPreferredCategories([])} colors={colors} />
          <FilterChip label="Aromáticas" selected={preferredCategories.includes('aromaticas')} onPress={() => setPreferredCategories(preferredCategories.includes('aromaticas') ? [] : ['aromaticas'])} colors={colors} />
          <FilterChip label="Hortalizas fáciles" selected={preferredCategories.includes('hojas')} onPress={() => setPreferredCategories(preferredCategories.includes('hojas') ? [] : ['hojas'])} colors={colors} />
          <FilterChip label="En maceta pequeña" selected={preferredCategories.includes('raices')} onPress={() => setPreferredCategories(preferredCategories.includes('raices') ? [] : ['raices'])} colors={colors} />
        </View>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />}
        {!loading && displayRecommendations.map((recommendation, index) => {
          const { crop, item } = recommendation;
          const selected = index === selectedIndex;
          const cropName = item.name;
          const imageUri = CROP_IMAGES[crop.id];
          const sunLabel = item.sun;
          return (
            <View key={crop.id} style={[styles.cropCard, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1 }]}>
              <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setSelectedIndex(index)} style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}>
                <View style={styles.cropImageFrame}>
                  {imageUri ? <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.cropImage} /> : <View style={[styles.cropFallback, { backgroundColor: colors.surfaceAlt }]}><Text style={styles.cropEmoji}>{crop.emoji}</Text></View>}
                  {selected && <View style={[styles.selectedBadge, { backgroundColor: colors.surface }]}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>✓ SELECCIONADA</Text></View>}
                </View>
                <View style={styles.cropBody}>
                  <View style={styles.cropMetaTop}>
                    <Text style={[styles.cropMetaText, { color: colors.textSecondary }]}>Nivel: {item.level}</Text>
                    <Text style={[styles.cropMetaText, { color: colors.textSecondary }]}>☀ {sunLabel}</Text>
                  </View>
                  <Text style={[styles.cropName, { color: colors.text }]}>{cropName}</Text>
                  <Text style={[styles.cropScientific, { color: colors.textSecondary }]}>{item.scientific}</Text>
                  <View style={styles.cropFacts}>
                    {item.facts.map(([label, value]) => <Fact key={label} label={label} value={value} colors={colors} />)}
                  </View>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ver ficha completa de ${cropName}`} onPress={() => inspect(index)} style={[styles.detailButton, { borderTopColor: colors.border }]}>
                <Text style={[styles.detailButtonText, { color: colors.primary }]}>Ver ficha completa</Text>
                <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
              </Pressable>
            </View>
          );
        })}
        {!loading && !displayRecommendations.length && <Card padded><Text style={{ color: colors.text, lineHeight: 22 }}>{t('firstCrop.empty')}</Text><Button title={t('firstCrop.adjust')} variant="secondary" size="lg" onPress={() => router.replace('/onboarding')} style={{ marginTop: spacing.md }} /></Card>}
        <Pressable accessibilityRole="button" style={styles.laterButton} onPress={() => router.replace('/(tabs)')}><Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('firstCrop.later')}</Text></Pressable>
      </ScrollView>

      {displayRecommendations.length > 0 && !loading && (
        <View style={[styles.selectionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectionLabel, { color: colors.text }]}>{selectedIndex + 1} cultivo seleccionado</Text>
            <Text style={[styles.selectionSubtext, { color: colors.textSecondary }]}>{displayRecommendations[selectedIndex]?.item.name} · Paso 1 de 3</Text>
          </View>
          <Button title="Configurar maceta y cuidados" onPress={() => choose(selectedIndex)} size="sm" style={{ paddingHorizontal: spacing.md }} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stitchHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D6EBC2' },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  headerSpacer: { width: 44 },
  screenTitle: { fontSize: 19, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 110, gap: 12 },
  welcomeCallout: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1 },
  calloutIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  calloutEyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  calloutTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20, marginTop: 3 },
  filterLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cropCard: { overflow: 'hidden', borderRadius: 18, marginTop: 4 },
  cropImageFrame: { height: 150, position: 'relative', backgroundColor: '#EEF7DF' },
  cropImage: { width: '100%', height: '100%' },
  cropFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cropEmoji: { fontSize: 54 },
  selectedBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  cropBody: { padding: 14, gap: 5 },
  cropMetaTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cropMetaText: { fontSize: 11, fontWeight: '700' },
  cropName: { fontSize: 20, fontWeight: '800' },
  cropScientific: { fontSize: 12 },
  cropFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  detailButton: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailButtonText: { fontSize: 13, fontWeight: '800' },
  selectionBar: { minHeight: 76, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectionLabel: { fontSize: 13, fontWeight: '800' },
  selectionSubtext: { fontSize: 11, marginTop: 2 },
  laterButton: { minHeight: 48, justifyContent: 'center' },
});

function FilterChip({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 999, borderWidth: selected ? 1.5 : 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.surface }}><Text style={{ color: selected ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{label}</Text></Pressable>;
}

function Fact({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return <View style={{ flexGrow: 1, minWidth: 74 }}><Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '800' }}>{label}</Text><Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 2 }}>{value}</Text></View>;
}
