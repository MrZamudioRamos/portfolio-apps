import { useColors, useTheme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Plant } from '../../src/models/plant';
import { PLANT_STATUS_CONFIG } from '../../src/models/plant';
import { CROPS_BY_ID } from '../../src/data/crops';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS, useGardenLayout } from '../../src/hooks/useGardenLayout';
import { useGardenFreeLayout } from '../../src/hooks/useGardenFreeLayout';

type MapMode = 'map' | 'list';

export default function MapTabScreen() {
  const colors = useColors();
  useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<MapMode>('map');
  const plants = useCollection<Plant>('plants');
  const { activeGarden } = useActiveGarden();
  const gridRows = activeGarden?.gridRows ?? DEFAULT_GRID_ROWS;
  const gridCols = activeGarden?.gridCols ?? DEFAULT_GRID_COLS;
  const { layout } = useGardenLayout(activeGarden?.id, gridRows, gridCols);
  const { positions: freePositions } = useGardenFreeLayout(activeGarden?.id);
  const gardenPlants = useMemo(
    () => plants.items.filter((plant) => !plant.deletedAt && (!activeGarden?.id || plant.gardenId === activeGarden.id)),
    [activeGarden?.id, plants.items]
  );
  const plantById = useMemo(() => new Map(gardenPlants.map((plant) => [plant.id, plant])), [gardenPlants]);
  const placedCount = layout.filter((cell) => cell && plantById.has(cell)).length;
  const isFreeSpace = activeGarden?.gardenType === 'balcon' || activeGarden?.gardenType === 'maceta';
  const freePlacedCount = Object.keys(freePositions).filter((plantId) => plantById.has(plantId)).length;

  function openPlant(label: string, fallbackIndex: number) {
    const normalized = label.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const match = gardenPlants.find((plant) => {
      const haystack = `${plant.name} ${plant.cropId} ${plant.variety ?? ''}`.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized.split(' ').some((token) => token.length > 3 && haystack.includes(token));
    }) ?? gardenPlants[fallbackIndex];

    if (match) {
      router.push(`/plant/${match.id}` as any);
      return;
    }

    // Keep the Stitch flow usable for a new garden with no plants yet.
    router.push('/first-crop' as any);
  }

  const PlantCard = ({ name, pot, zone, icon, tint, detail, action, index }: { name: string; pot: string; zone: string; icon: keyof typeof Ionicons.glyphMap; tint: string; detail: string; action: string; index: number }) => (
    <View style={[styles.plantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.plantTop}><View style={[styles.plantIcon, { backgroundColor: tint + '20' }]}><Ionicons name={icon} size={24} color={tint} /></View><View style={{ flex: 1 }}><Text style={[styles.plantName, { color: colors.text }]}>{name}</Text><Text style={[styles.plantMeta, { color: colors.textSecondary }]}>{pot} · {zone}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Abrir ficha de ${name}`} hitSlop={8} onPress={() => openPlant(name, index)}><Ionicons name="ellipsis-horizontal" size={19} color={colors.textSecondary} /></Pressable></View>
      <View style={[styles.plantDetail, { backgroundColor: colors.surfaceAlt }]}><Ionicons name="water-outline" size={17} color={colors.info} /><Text style={[styles.plantDetailText, { color: colors.textSecondary }]}>{detail}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${action} de ${name}`} onPress={() => openPlant(name, index)} style={[styles.checkButton, { borderColor: colors.primary }]}><Ionicons name={action === 'Comprobar sustrato' ? 'finger-print-outline' : 'eye-outline'} size={17} color={colors.primary} /><Text style={[styles.checkButtonText, { color: colors.primary }]}>{action}</Text></Pressable>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}><Pressable accessibilityRole="button" onPress={() => router.push('/gardens' as any)} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={[styles.backText, { color: colors.text }]}>Mi Huerto</Text></Pressable><View><Text style={[styles.title, { color: colors.text }]}>Mapa visual</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>{activeGarden ? `${activeGarden.name} · ${activeGarden.province}` : 'Sin huerto seleccionado'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Editar mapa del huerto" onPress={() => router.push('/garden/map' as any)} style={styles.headerButton}><Ionicons name="options-outline" size={22} color={colors.text} /></Pressable></View>
      <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}><Pressable onPress={() => setMode('map')} style={[styles.segment, mode === 'map' && { backgroundColor: colors.surface }]}><Ionicons name="map-outline" size={17} color={mode === 'map' ? colors.primary : colors.textSecondary} /><Text style={[styles.segmentText, { color: mode === 'map' ? colors.primaryDark : colors.textSecondary }]}>Mapa visual</Text></Pressable><Pressable onPress={() => setMode('list')} style={[styles.segment, mode === 'list' && { backgroundColor: colors.surface }]}><Ionicons name="list-outline" size={17} color={mode === 'list' ? colors.primary : colors.textSecondary} /><Text style={[styles.segmentText, { color: mode === 'list' ? colors.primaryDark : colors.textSecondary }]}>Vista lista ({gardenPlants.length})</Text></Pressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.tip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Ionicons name="sunny-outline" size={20} color={colors.warning} /><View style={{ flex: 1 }}><Text style={[styles.tipTitle, { color: colors.text }]}>Organiza solo lo que has registrado</Text><Text style={[styles.tipText, { color: colors.textSecondary }]}>Añade la ubicación de cada planta desde su ficha para que este mapa represente tu huerto real.</Text></View></View>
        {mode === 'map' && <View style={[styles.planPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.planPreviewHeader}><View><Text style={[styles.planPreviewTitle, { color: colors.text }]}>{isFreeSpace ? 'Plano libre del espacio' : 'Plano del huerto'}</Text><Text style={[styles.planPreviewMeta, { color: colors.textSecondary }]}>{isFreeSpace ? `${freePlacedCount}/${gardenPlants.length} plantas colocadas` : `${placedCount}/${gridRows * gridCols} parcelas colocadas`}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Editar plano del huerto" onPress={() => router.push('/garden/map' as any)} style={[styles.editPlanButton, { borderColor: colors.primary }]}><Ionicons name="create-outline" size={16} color={colors.primary} /><Text style={[styles.editPlanText, { color: colors.primary }]}>Editar</Text></Pressable></View>
          {isFreeSpace ? <View style={[styles.freePreview, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>{Object.entries(freePositions).map(([plantId, position], positionIndex) => { const plant = plantById.get(plantId); if (!plant) return null; const markerPosition = normalizeFreePosition(position, positionIndex); return <View key={plantId} style={[styles.freePreviewMarker, { left: `${markerPosition.x * 100}%`, top: `${markerPosition.y * 100}%`, backgroundColor: colors.surface, borderColor: colors.primary }]}><Ionicons name="leaf-outline" size={14} color={colors.primary} /><Text numberOfLines={1} style={[styles.freePreviewText, { color: colors.text }]}>{plant.name}</Text></View>; })}</View> : <View style={[styles.previewGrid, { aspectRatio: gridCols / gridRows, borderColor: colors.border }]}>{Array.from({ length: gridRows }, (_, row) => <View key={row} style={styles.previewGridRow}>{Array.from({ length: gridCols }, (_, col) => { const plantId = layout[row * gridCols + col]; const plant = plantId ? plantById.get(plantId) : undefined; return <View key={col} style={[styles.previewCell, { backgroundColor: plant ? colors.primary + '18' : colors.surfaceAlt, borderColor: colors.border }]}>{plant ? <Ionicons name="leaf-outline" size={13} color={colors.primary} /> : <Ionicons name="add" size={13} color={colors.textDisabled} />}</View>; })}</View>)}</View>}
          <Pressable accessibilityRole="button" onPress={() => router.push('/garden/map' as any)} style={[styles.openPlanButton, { backgroundColor: colors.primary + '12' }]}><Text style={[styles.openPlanText, { color: colors.primary }]}>Abrir el plano y colocar plantas</Text><Ionicons name="arrow-forward" size={16} color={colors.primary} /></Pressable>
        </View>}
        {gardenPlants.length === 0 ? <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border, padding: 18, alignItems: 'center' }]}><Ionicons name="map-outline" size={30} color={colors.primary} /><Text style={[styles.tipTitle, { color: colors.text, marginTop: 8 }]}>Tu mapa está vacío</Text><Text style={[styles.tipText, { color: colors.textSecondary, textAlign: 'center' }]}>Cuando registres plantas aparecerán aquí, sin ubicaciones inventadas.</Text><Pressable onPress={() => router.push('/first-crop' as any)} style={[styles.checkButton, { borderColor: colors.primary, paddingHorizontal: 16, marginTop: 10 }]}><Text style={[styles.checkButtonText, { color: colors.primary }]}>Añadir primera planta</Text></Pressable></View> : mode === 'map' ? <>
          <View style={styles.zoneHeader}><View style={[styles.zoneDot, { backgroundColor: colors.primary }]} /><Text style={[styles.zoneTitle, { color: colors.text }]}>Plantas registradas</Text><Text style={[styles.zoneCount, { color: colors.textSecondary }]}>{gardenPlants.length}</Text></View>
          {gardenPlants.map((plant, index) => { const crop = CROPS_BY_ID[plant.cropId]; const needsSoil = plant.status !== 'finished'; return <PlantCard key={plant.id} name={plant.name} pot={plant.bedName ?? 'Ubicación no configurada'} zone={plant.variety ?? crop?.name ?? 'Cultivo registrado'} icon="leaf-outline" tint={plant.pestStatus === 'active' ? colors.warning : colors.primary} detail={`${PLANT_STATUS_CONFIG[plant.status].label}${plant.pestStatus === 'active' ? ' · Plaga registrada' : ''}`} action={needsSoil ? 'Comprobar sustrato' : 'Ver ficha'} index={index} />; })}
        </> : <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>{gardenPlants.map((plant, index) => <Pressable key={plant.id} accessibilityRole="button" onPress={() => openPlant(plant.name, index)} style={[styles.listRow, { borderBottomColor: colors.border }]}><Ionicons name="flower-outline" size={21} color={colors.primary} /><Text style={[styles.listText, { color: colors.text }]}>{plant.name} · {plant.bedName ?? 'Ubicación no configurada'}</Text><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /></Pressable>)}</View>}
        <View style={[styles.legend, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.legendTitle, { color: colors.text }]}>Ordenar por luz real</Text><Text style={[styles.legendText, { color: colors.textSecondary }]}>Mantén las plantas en su zona y comprueba el sustrato antes de moverlas o regarlas.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizeFreePosition(position: { x: number; y: number }, index: number): { x: number; y: number } {
  const fallbackX = 0.18 + (index % 3) * 0.32;
  const fallbackY = 0.2 + Math.floor(index / 3) * 0.25;
  const normalize = (value: number, fallback: number, max: number) => {
    const numeric = Number(value);
    const normalized = Number.isFinite(numeric) ? (numeric > 1 ? numeric / 100 : numeric) : fallback;
    return Math.min(max, Math.max(0.16, normalized));
  };
  return { x: normalize(position.x, fallbackX, 0.84), y: normalize(position.y, fallbackY, 0.84) };
}

const styles = StyleSheet.create({
  freePreview: { width: '100%', minHeight: 190, borderWidth: 1, borderRadius: 11, overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  freePreviewMarker: { position: 'absolute', width: 86, minHeight: 44, marginLeft: -43, marginTop: -22, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 2, padding: 4 },
  freePreviewText: { fontSize: 9, fontWeight: '800', maxWidth: 74, textAlign: 'center' },
  container: { flex: 1 }, header: { minHeight: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, gap: 8 }, back: { minWidth: 92, minHeight: 44, flexDirection: 'row', alignItems: 'center' }, backText: { fontSize: 14, fontWeight: '700' }, title: { fontSize: 18, fontWeight: '800', textAlign: 'center' }, subtitle: { fontSize: 11, textAlign: 'center', marginTop: 2 }, headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, segmented: { flexDirection: 'row', margin: 16, padding: 4, borderRadius: 14 }, segment: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, segmentText: { fontSize: 13, fontWeight: '800' }, content: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 }, tip: { borderRadius: 16, borderWidth: 1, padding: 13, flexDirection: 'row', gap: 10 }, tipTitle: { fontSize: 14, fontWeight: '800' }, tipText: { fontSize: 12, lineHeight: 17, marginTop: 3 }, planPreview: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 }, planPreviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, planPreviewTitle: { fontSize: 15, fontWeight: '800' }, planPreviewMeta: { fontSize: 11, marginTop: 3 }, editPlanButton: { minHeight: 40, borderRadius: 11, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 }, editPlanText: { fontSize: 12, fontWeight: '800' }, previewGrid: { width: '100%', borderWidth: 1, borderRadius: 11, padding: 2, gap: 2, overflow: 'hidden' }, previewGridRow: { flex: 1, flexDirection: 'row', gap: 2 }, previewCell: { flex: 1, minHeight: 24, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }, openPlanButton: { minHeight: 42, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, openPlanText: { fontSize: 12, fontWeight: '800' }, zoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }, zoneDot: { width: 10, height: 10, borderRadius: 5 }, zoneTitle: { fontSize: 15, fontWeight: '800', flex: 1 }, zoneCount: { fontSize: 12 }, plantCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 }, plantTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, plantIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, plantName: { fontSize: 15, fontWeight: '800' }, plantMeta: { fontSize: 12, marginTop: 3 }, plantDetail: { borderRadius: 10, padding: 9, flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, plantDetailText: { flex: 1, fontSize: 12, lineHeight: 17 }, checkButton: { minHeight: 42, borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, checkButtonText: { fontSize: 13, fontWeight: '800' }, listCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 14 }, listRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1 }, listText: { flex: 1, fontSize: 13, fontWeight: '700' }, legend: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 4 }, legendTitle: { fontSize: 14, fontWeight: '800' }, legendText: { fontSize: 12, lineHeight: 17, marginTop: 4 },
});
