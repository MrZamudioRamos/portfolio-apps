import { useColors, useTheme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Plant } from '../../src/models/plant';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { StitchBottomNav } from '../../src/components/StitchBottomNav';

type LayoutMode = 'sketch' | 'light';
type SolarSlot = '10:00' | '14:00' | '17:00';

const SOLAR_SLOTS: Array<{ id: SolarSlot; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: '10:00', label: '10:00 (Sol)', icon: 'sunny-outline' },
  { id: '14:00', label: '14:00 (Sol pleno)', icon: 'sunny' },
  { id: '17:00', label: '17:00 (Sombra proyectada muro)', icon: 'cloudy-outline' },
];

const SOURCE_PLANTS = [
  { name: 'Tomate Cherry', variety: 'Sweet F1 · Fruto cuajando', zone: 'barandilla', pot: '30L', status: 'Regar en 4h', icon: 'nutrition-outline' as const, action: 'none' as const },
  { name: 'Romero', variety: 'Silvestre · Óptimo', zone: 'barandilla', pot: '15L', status: 'Tierra seca (ok)', icon: 'flower-outline' as const, action: 'none' as const },
  { name: 'Albahaca Limón', variety: 'Maceta barro 18 cm · Tacto tierno', zone: 'muro', pot: '18 cm', status: 'Comprobar antes de regar', icon: 'leaf-outline' as const, action: 'soil' as const },
  { name: 'Menta Piperita', variety: 'Jardinera 22 cm · Enraizada vigorosa', zone: 'muro', pot: '22 cm', status: 'Semisombra fresca', icon: 'sparkles-outline' as const, action: 'plant' as const },
] as const;

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function GardenMapScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const [mode, setMode] = useState<LayoutMode>('light');
  const [slot, setSlot] = useState<SolarSlot>('14:00');
  const [reordering, setReordering] = useState(false);

  const gardenPlants = useMemo(
    () => plants.items.filter((plant) => !plant.deletedAt && (!activeGarden?.id || plant.gardenId === activeGarden.id)),
    [activeGarden?.id, plants.items],
  );

  const findPlant = (label: string, index: number) => {
    const wanted = normalize(label);
    return gardenPlants.find((plant) => normalize(`${plant.name} ${plant.cropId} ${plant.variety ?? ''}`).includes(wanted.split(' ')[0])) ?? gardenPlants[index];
  };

  const openPlant = (label: string, index: number) => {
    const plant = findPlant(label, index);
    router.push(plant ? `/plant/${plant.id}` as any : '/first-crop' as any);
  };

  const openSoil = (label: string, index: number) => {
    const plant = findPlant(label, index);
    router.push(plant ? { pathname: '/modal/check-soil-sheet', params: { plantId: plant.id } } as any : '/first-crop' as any);
  };

  const s = makeStyles(colors, spacing, fontSize, fontWeight, radii);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver a Huertos" onPress={() => router.push('/gardens' as any)} hitSlop={10} style={s.back}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[s.backText, { color: colors.text }]}>Huertos</Text>
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={[s.title, { color: colors.text }]}>Balcón Principal Sur</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>Orientación 135° SE</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Ajustes de capas" onPress={() => router.push('/garden/edit' as any)} hitSlop={10} style={s.headerAction}>
            <Ionicons name="options-outline" size={21} color={colors.text} />
          </Pressable>
        </View>

        <View style={[s.segmented, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'sketch' }} onPress={() => setMode('sketch')} style={[s.segment, mode === 'sketch' && { backgroundColor: colors.surface }]}>
            <Ionicons name="grid-outline" size={17} color={mode === 'sketch' ? colors.primary : colors.textSecondary} />
            <Text style={[s.segmentText, { color: mode === 'sketch' ? colors.primaryDark : colors.textSecondary }]}>Croquis espacial</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'light' }} onPress={() => setMode('light')} style={[s.segment, mode === 'light' && { backgroundColor: colors.surface }]}>
            <Ionicons name="sunny-outline" size={17} color={mode === 'light' ? colors.primary : colors.textSecondary} />
            <Text style={[s.segmentText, { color: mode === 'light' ? colors.primaryDark : colors.textSecondary }]}>Por franjas de luz</Text>
          </Pressable>
        </View>

        <View style={[s.orientationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.orientationIcon, { backgroundColor: colors.accent + '2a' }]}><Ionicons name="navigate-outline" size={20} color={colors.warning} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[s.orientationTitle, { color: colors.text }]}>135° SE · Máx. insolación</Text>
            <Text style={[s.orientationText, { color: colors.textSecondary }]}><Ionicons name="sunny-outline" size={13} color={colors.warning} /> 6,5h sol directo</Text>
          </View>
        </View>

        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Simulación solar interactiva:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.slotRow}>
          {SOLAR_SLOTS.map((item) => {
            const active = slot === item.id;
            return (
              <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSlot(item.id)} style={[s.slot, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}>
                <Ionicons name={item.icon} size={16} color={active ? '#fff' : colors.warning} />
                <Text style={{ color: active ? '#fff' : colors.text, fontSize: 12, fontWeight: fontWeight.bold }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[s.zoneHeader, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[s.zoneIcon, { backgroundColor: colors.warning + '22' }]}><Ionicons name={slot === '17:00' ? 'cloudy-outline' : 'sunny-outline'} size={18} color={colors.warning} /></View>
          <View style={{ flex: 1 }}><Text style={[s.zoneTitle, { color: colors.text }]}>Zona Barandilla</Text><Text style={[s.zoneSubtitle, { color: colors.textSecondary }]}>Pleno Sol</Text></View>
          <Text style={[s.zoneMeta, { color: colors.primaryDark }]}>+6h</Text>
        </View>
        <MapPlantCard plant={SOURCE_PLANTS[0]} index={0} colors={colors} styles={s} onPlant={openPlant} onSoil={openSoil} />
        <MapPlantCard plant={SOURCE_PLANTS[1]} index={1} colors={colors} styles={s} onPlant={openPlant} onSoil={openSoil} />

        <View style={[s.zoneHeader, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[s.zoneIcon, { backgroundColor: colors.info + '22' }]}><Ionicons name="cloudy-outline" size={18} color={colors.info} /></View>
          <View style={{ flex: 1 }}><Text style={[s.zoneTitle, { color: colors.text }]}>Zona Muro Lateral</Text><Text style={[s.zoneSubtitle, { color: colors.textSecondary }]}>Semisombra fresca</Text></View>
          <Text style={[s.zoneMeta, { color: colors.info }]}>3–4h</Text>
        </View>
        <MapPlantCard plant={SOURCE_PLANTS[2]} index={2} colors={colors} styles={s} onPlant={openPlant} onSoil={openSoil} />
        <MapPlantCard plant={SOURCE_PLANTS[3]} index={3} colors={colors} styles={s} onPlant={openPlant} onSoil={openSoil} />

        <View style={[s.ruleCard, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '66' }]}>
          <Ionicons name="bulb-outline" size={21} color={colors.warning} />
          <View style={{ flex: 1 }}><Text style={[s.ruleTitle, { color: colors.text }]}>REGLA DE ORO · Clima Mediterráneo</Text><Text style={[s.ruleText, { color: colors.textSecondary }]}>Antes de regar las macetas en la zona soleada, introduce el dedo 2 cm para comprobar si la tierra sigue húmeda bajo la corteza. ¡Evita pudrir raíces!</Text></View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/plant/new' as any)} style={[s.primaryAction, { backgroundColor: colors.primaryDark }]}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={s.primaryActionText}>Añadir maceta al mapa</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setReordering((value) => !value)} style={[s.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name={reordering ? 'checkmark-outline' : 'swap-vertical-outline'} size={18} color={colors.primary} /><Text style={[s.secondaryActionText, { color: colors.primary }]}>{reordering ? 'Listo para guardar el orden' : 'Reorganizar macetas'}</Text>
        </Pressable>
      </ScrollView>
      <StitchBottomNav active="map" />
    </SafeAreaView>
  );
}

function MapPlantCard({ plant, index, colors, styles: s, onPlant, onSoil }: { plant: (typeof SOURCE_PLANTS)[number]; index: number; colors: ReturnType<typeof useColors>; styles: ReturnType<typeof makeStyles>; onPlant: (label: string, index: number) => void; onSoil: (label: string, index: number) => void }) {
  return (
    <View style={[s.plantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.plantRow}>
        <View style={[s.plantIcon, { backgroundColor: plant.zone === 'barandilla' ? colors.primary + '1c' : colors.info + '1c' }]}><Ionicons name={plant.icon} size={23} color={plant.zone === 'barandilla' ? colors.primary : colors.info} /></View>
        <View style={{ flex: 1 }}><Text style={[s.plantName, { color: colors.text }]}>{plant.name}</Text><Text style={[s.plantVariety, { color: colors.textSecondary }]}>{plant.variety}</Text></View>
        <View style={[s.volumeBadge, { backgroundColor: colors.surfaceAlt }]}><Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800' }}>{plant.pot}</Text></View>
      </View>
      <View style={[s.statusLine, { backgroundColor: colors.surfaceAlt }]}><Ionicons name={plant.status === 'Regar en 4h' ? 'water-outline' : plant.action === 'soil' ? 'finger-print-outline' : 'checkmark-circle-outline'} size={16} color={plant.status === 'Regar en 4h' ? colors.info : colors.primary} /><Text style={[s.statusText, { color: colors.textSecondary }]}>{plant.status}</Text></View>
      {plant.action === 'soil' ? <Pressable accessibilityRole="button" onPress={() => onSoil(plant.name, index)} style={[s.cardAction, { borderColor: colors.primary }]}><Ionicons name="finger-print-outline" size={17} color={colors.primary} /><Text style={[s.cardActionText, { color: colors.primary }]}>Comprobar sustrato (2 cm) - ¡No regar si hay humedad!</Text></Pressable> : <Pressable accessibilityRole="button" onPress={() => onPlant(plant.name, index)} style={[s.cardAction, { borderColor: colors.border }]}><Ionicons name="arrow-forward-outline" size={17} color={colors.primary} /><Text style={[s.cardActionText, { color: colors.primary }]}>{plant.action === 'plant' ? 'Ver ficha menta' : 'Ver ficha de ' + plant.name}</Text></Pressable>}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, spacing: ReturnType<typeof useTheme>['spacing'], fontSize: ReturnType<typeof useTheme>['fontSize'], fontWeight: ReturnType<typeof useTheme>['fontWeight'], radii: ReturnType<typeof useTheme>['radii']) {
  return StyleSheet.create({
    container: { flex: 1 }, content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { minWidth: 82, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 1 }, backText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, headerCenter: { flex: 1, alignItems: 'center' }, title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold }, subtitle: { fontSize: fontSize.xs, marginTop: 2 }, headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: radii.lg, padding: 4, marginBottom: spacing.sm }, segment: { flex: 1, minHeight: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, segmentText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold }, orientationCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, orientationIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, orientationTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, orientationText: { fontSize: fontSize.xs, marginTop: 3 }, sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: spacing.sm }, slotRow: { gap: spacing.xs, paddingRight: spacing.md }, slot: { minHeight: 42, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 5 },
    zoneHeader: { minHeight: 54, borderRadius: radii.lg, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }, zoneIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, zoneTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, zoneSubtitle: { fontSize: fontSize.xs, marginTop: 1 }, zoneMeta: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, plantCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm }, plantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, plantIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, plantName: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, plantVariety: { fontSize: fontSize.xs, marginTop: 3 }, volumeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.full }, statusLine: { borderRadius: radii.sm, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 }, statusText: { fontSize: fontSize.xs, flex: 1 }, cardAction: { minHeight: 44, borderWidth: 1.5, borderRadius: radii.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, cardActionText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, flexShrink: 1 },
    ruleCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }, ruleTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold }, ruleText: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 4 }, primaryAction: { minHeight: 50, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm }, primaryActionText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold }, secondaryAction: { minHeight: 46, borderWidth: 1, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, secondaryActionText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  });
}
