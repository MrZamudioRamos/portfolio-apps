import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors, useTheme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useTranslation } from 'react-i18next';
import { CROPS_BY_ID } from '../src/data/crops';
import { CROP_IMAGES } from '../src/data/cropImages';
import { useActiveGarden } from '../src/hooks/useActiveGarden';
import { useCustomCrops } from '../src/hooks/useCustomCrops';
import { usePro } from '../src/hooks/usePro';
import type { Plant } from '../src/models/plant';
import type { DiaryEntry } from '../src/models/diary-entry';
import { recordCare } from '../src/utils/careWrites';
import { buildCarePlan, type CareTask } from '../src/utils/carePlan';
import { Mascot } from '../src/components/Mascot';

type ReviewCard = {
  plant?: Plant;
  name: string;
  meta: string;
  rule: string;
  extra: string;
  support?: string;
  action: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SAMPLE_REVIEWS: ReviewCard[] = [
  { name: 'Albahaca Limón', meta: 'Maceta 18cm  ·  ☀️ 4h sol', rule: 'REGLA DE ORO PREVENTIVA', extra: 'Diagnóstico táctil (2 cm) cada 2 días. NUNCA regar con tierra húmeda.', support: 'Próxima revisión · Jueves mañana   ·   Poda floración · Despuntar cada 14d   ·   Sustrato testeado hace 24h', action: 'Revisar hoy', icon: 'checkmark' },
  { name: 'Tomate Cherry Sweet', meta: 'Maceta 30L  ·  ☀️ +6h sol pleno', rule: 'RIEGO CONDICIONADO AL CLIMA', extra: 'Chequeo matinal en días soleados (>25°C). Dosis 500–800 ml solo si la tierra cede.', support: 'NUTRICIÓN Y FLORACIÓN · Dosis de potasio orgánico cada 15 días durante la etapa de floración activa · Abono: en 4 días', action: 'Registrar riego', icon: 'water' },
  { name: 'Menta Piperita', meta: 'Jardinera 20L  ·  ☁️ Semisombra', rule: 'PAUTA DE HUMEDAD RADICULAR', extra: 'Riego moderado constante. Mantener sustrato fresco sin agua estancada.', support: 'Estado: Óptimo', action: 'Ver ficha', icon: 'document-text-outline' },
];

export default function CarePlanScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { isPro } = usePro();
  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const { customCropsById } = useCustomCrops();
  const [soilTask, setSoilTask] = useState<CareTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [careError, setCareError] = useState<string | null>(null);

  const gardenPlants = useMemo(
    () => plants.items.filter((plant) => plant.gardenId === activeGarden?.id && plant.status !== 'finished'),
    [plants.items, activeGarden?.id]
  );
  const tasks = useMemo(
    () => buildCarePlan(gardenPlants, { ...CROPS_BY_ID, ...customCropsById }, entries.items),
    [gardenPlants, customCropsById, entries.items]
  );
  const reviews = useMemo<ReviewCard[]>(() => {
    if (!gardenPlants.length) return SAMPLE_REVIEWS;
    return gardenPlants.slice(0, 3).map((plant, index) => {
      const crop = CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId];
      const task = tasks.find((item) => item.plantId === plant.id);
      return {
        plant,
        name: plant.name,
        meta: `${crop?.name ?? 'Cultivo'}  ·  ${index === 1 ? '☀️ +6h sol pleno' : index === 2 ? '☁️ Semisombra' : '☀️ 4h sol'}`,
        rule: index === 1 ? 'RIEGO CONDICIONADO AL CLIMA' : index === 2 ? 'PAUTA DE HUMEDAD RADICULAR' : 'REGLA DE ORO PREVENTIVA',
        extra: task?.howKey ? t(task.howKey) : 'Diagnóstico táctil (2 cm) antes de aplicar agua. NUNCA regar con tierra húmeda.',
        support: index === 1 ? 'NUTRICIÓN Y FLORACIÓN · Dosis de potasio orgánico cada 15 días durante la etapa de floración activa · Abono: en 4 días' : index === 2 ? 'Estado: Óptimo' : 'Próxima revisión · Jueves mañana   ·   Poda floración · Despuntar cada 14d   ·   Sustrato testeado hace 24h',
        action: index === 2 ? 'Ver ficha' : index === 1 ? 'Registrar riego' : 'Revisar hoy',
        icon: index === 2 ? 'document-text-outline' : index === 1 ? 'water' : 'checkmark',
      };
    });
  }, [gardenPlants, customCropsById, tasks, t]);

  async function completeSoil(kind: 'watering' | 'moist') {
    if (!soilTask || saving) return;
    setSaving(true);
    setCareError(null);
    try {
      const written = await recordCare(soilTask.plantId, kind, kind === 'moist' ? 'Sigue húmeda; no riego hoy.' : 'Suelo seco; riego registrado.', kind === 'watering' ? { liters: '0.4', method: 'hand' } : undefined);
      if (!written) {
        setCareError('Esta comprobación ya está registrada para hoy.');
        return;
      }
      setSoilTask(null);
    } catch (error) {
      setCareError(error instanceof Error && error.message === 'Confirm sowing first'
        ? 'Confirma primero la siembra de esta planta para empezar el cuidado diario.'
        : 'No se pudo guardar la comprobación. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  function openReview(card: ReviewCard) {
    if (card.action === 'Ver ficha' && card.plant) {
      router.push(`/plant/${card.plant.id}` as any);
      return;
    }
    const task = card.plant ? tasks.find((item) => item.plantId === card.plant?.id && item.kind === 'water') : tasks.find((item) => item.kind === 'water');
    if (task) setSoilTask(task);
    else router.push('/modal/check-soil-sheet' as any);
  }

  const s = useMemo(() => makeStyles(colors, spacing, fontSize, fontWeight, radii), [colors, spacing, fontSize, fontWeight, radii]);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver a Mi Huerto" onPress={() => router.back()} hitSlop={12} style={s.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
          <Text style={s.headerBack}>Mi Huerto</Text>
        </Pressable>
        <Text style={s.headerTitle}>Plan de Cuidados</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Opciones del plan" onPress={() => router.push(isPro ? '/absence' : '/paywall?source=care_plan' as any)} hitSlop={12} style={s.headerButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.contextCard}>
          <View style={s.contextTop}>
            <View style={s.contextMascot}><Mascot pose="idle" size={42} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.contextName}>Semillita  ·  <Text style={s.contextLocation}>📍 Madrid · Primavera</Text></Text>
              <Text style={s.contextDescription}>Tu huerto en primavera en Madrid. Plan ajustado para evitar sobre-riego y optimizar horas de sol.</Text>
            </View>
          </View>
          <View style={s.contextMeta}>
            <Text style={s.metaText}>☀️ 23°C · Brisa seca</Text>
            <Text style={s.metaText}>✓ Riesgo hídrico: Bajo</Text>
          </View>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Plantas en Revisión</Text>
          <Text style={s.sectionCount}>{reviews.length} Activas</Text>
        </View>

        {plants.loading && !gardenPlants.length && (
          <View style={s.loading}><ActivityIndicator color={colors.primary} /><Text style={s.muted}>Cargando cuidados…</Text></View>
        )}

        {reviews.map((card, index) => {
          const crop = card.plant ? (CROPS_BY_ID[card.plant.cropId] ?? customCropsById[card.plant.cropId]) : undefined;
          const image = crop?.imageUrl ?? (card.plant ? CROP_IMAGES[card.plant.cropId] : undefined);
          return (
            <View key={`${card.name}-${index}`} style={s.reviewCard}>
              <View style={s.reviewHeader}>
                <View style={s.reviewImage}>{image ? <Image source={{ uri: image }} style={s.reviewImageAsset} /> : <Text style={{ fontSize: 24 }}>{index === 0 ? '🌿' : index === 1 ? '🍅' : '🌱'}</Text>}</View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewName}>{card.name}</Text>
                  <Text style={s.reviewMeta}>{card.meta}</Text>
                </View>
              </View>
              <View style={s.ruleBlock}>
                <Text style={s.ruleLabel}>{card.rule}</Text>
                <Text style={s.ruleText}>{card.extra}</Text>
                {card.support && <Text style={s.support}>{card.support}</Text>}
              </View>
              <Pressable accessibilityRole="button" onPress={() => openReview(card)} style={({ pressed }) => [s.reviewAction, pressed && s.pressed]}>
                <Ionicons name={card.icon} size={17} color={colors.primary} />
                <Text style={s.reviewActionText}>{card.action}</Text>
              </Pressable>
            </View>
          );
        })}

        <View style={s.planActions}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/absence' as any)} style={s.secondaryAction}>
            <Ionicons name="cloud-outline" size={18} color={colors.primary} />
            <Text style={s.secondaryActionText}>Ajustar frecuencia según clima</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/plant/new' as any)} style={s.secondaryAction}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={s.secondaryActionText}>Añadir planta al plan</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={s.tabBar}>
        {[
          ['leaf-outline', 'Hoy', '/(tabs)'],
          ['map-outline', 'Mapa', '/map'],
          ['flower-outline', 'Plantas', '/plants'],
          ['calendar-outline', 'Calendario', '/calendar'],
        ].map(([icon, label, route]) => (
          <Pressable key={label} accessibilityRole="button" onPress={() => router.push(route as any)} style={s.tabItem}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={21} color={colors.primary} />
            <Text style={s.tabText}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={Boolean(soilTask)} transparent animationType="slide" onRequestClose={() => setSoilTask(null)}>
        <View style={s.modalBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setSoilTask(null)} style={StyleSheet.absoluteFill} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetEyebrow}>CUIDADO PREVENTIVO</Text>
            <Text style={s.sheetTitle}>Comprobar sustrato</Text>
            <Text style={s.sheetText}>Introduce el dedo índice hasta 2 cm. Si notas humedad fresca, no riegues hoy.</Text>
            <Pressable accessibilityRole="button" onPress={() => void completeSoil('moist')} style={s.sheetOption}>
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
              <Text style={s.sheetOptionText}>Sigue húmeda · no regar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void completeSoil('watering')} style={[s.sheetOption, s.sheetOptionPrimary]}>
              <Ionicons name="water-outline" size={24} color="#fff" />
              <Text style={[s.sheetOptionText, { color: '#fff' }]}>Está seca · registrar riego</Text>
            </Pressable>
            {saving && <ActivityIndicator color={colors.primary} />}
            {careError && <Text accessibilityRole="alert" style={[s.sheetError, { color: colors.error }]}>{careError}</Text>}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, spacing: Record<string, number>, fontSize: Record<string, number>, fontWeight: any, radii: Record<string, number>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerButton: { minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerBack: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  headerTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  scroll: { padding: spacing.lg, paddingBottom: 110, gap: spacing.lg, maxWidth: 640, width: '100%', alignSelf: 'center' },
  contextCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md },
  contextTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  contextMascot: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  mascot: { fontSize: 27 },
  contextName: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  contextLocation: { color: colors.textSecondary, fontWeight: fontWeight.medium },
  contextDescription: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: 4 },
  contextMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  metaText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  sectionCount: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  loading: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  muted: { color: colors.textSecondary, fontSize: fontSize.sm },
  reviewCard: { overflow: 'hidden', borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  reviewImage: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  reviewImageAsset: { width: '100%', height: '100%' },
  reviewName: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  reviewMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 4 },
  ruleBlock: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: 5 },
  ruleLabel: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.4 },
  ruleText: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  support: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18, marginTop: 3 },
  reviewAction: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  reviewActionText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  planActions: { gap: spacing.sm },
  secondaryAction: { minHeight: 48, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  secondaryActionText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 76, paddingBottom: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { minWidth: 64, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22,36,15,0.35)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: spacing.xl, paddingBottom: spacing.xl + 10, gap: spacing.md },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: colors.border },
  sheetEyebrow: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.6 },
  sheetTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  sheetText: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 22 },
  sheetOption: { minHeight: 52, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  sheetOptionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  sheetOptionText: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  sheetError: { textAlign: 'center', fontSize: fontSize.sm, lineHeight: 19 },
});
