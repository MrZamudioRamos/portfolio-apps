import { useColors, useTheme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Plant } from '../../src/models/plant';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';

type MapMode = 'map' | 'list';

export default function MapTabScreen() {
  const colors = useColors();
  useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<MapMode>('map');
  const plants = useCollection<Plant>('plants');
  const { activeGarden } = useActiveGarden();
  const gardenPlants = useMemo(
    () => plants.items.filter((plant) => !plant.deletedAt && (!activeGarden?.id || plant.gardenId === activeGarden.id)),
    [activeGarden?.id, plants.items]
  );

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
      <View style={[styles.header, { borderBottomColor: colors.border }]}><Pressable accessibilityRole="button" onPress={() => router.push('/gardens' as any)} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={[styles.backText, { color: colors.text }]}>Mi Huerto</Text></Pressable><View><Text style={[styles.title, { color: colors.text }]}>Mapa visual</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Balcón Principal Sur · Madrid</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Editar mapa del huerto" onPress={() => router.push('/garden/map' as any)} style={styles.headerButton}><Ionicons name="options-outline" size={22} color={colors.text} /></Pressable></View>
      <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}><Pressable onPress={() => setMode('map')} style={[styles.segment, mode === 'map' && { backgroundColor: colors.surface }]}><Ionicons name="map-outline" size={17} color={mode === 'map' ? colors.primary : colors.textSecondary} /><Text style={[styles.segmentText, { color: mode === 'map' ? colors.primaryDark : colors.textSecondary }]}>Mapa visual</Text></Pressable><Pressable onPress={() => setMode('list')} style={[styles.segment, mode === 'list' && { backgroundColor: colors.surface }]}><Ionicons name="list-outline" size={17} color={mode === 'list' ? colors.primary : colors.textSecondary} /><Text style={[styles.segmentText, { color: mode === 'list' ? colors.primaryDark : colors.textSecondary }]}>Vista lista (4)</Text></Pressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.tip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Ionicons name="sunny-outline" size={20} color={colors.warning} /><View style={{ flex: 1 }}><Text style={[styles.tipTitle, { color: colors.text }]}>Orientación sureste · 6,5h de sol</Text><Text style={[styles.tipText, { color: colors.textSecondary }]}>Las franjas te ayudan a colocar cada maceta donde reciba la luz que necesita.</Text></View></View>
        {mode === 'map' ? <>
          <View style={styles.zoneHeader}><View style={[styles.zoneDot, { backgroundColor: colors.warning }]} /><Text style={[styles.zoneTitle, { color: colors.text }]}>Zona Sol Directo +6h</Text><Text style={[styles.zoneCount, { color: colors.textSecondary }]}>2 macetas</Text></View>
          <PlantCard name="Tomate Cherry" pot="Maceta 30L" zone="Solano · Sweet Million" icon="leaf-outline" tint={colors.primary} detail="Sustrato seco arriba · 500-800 ml condicionado al clima" action="Comprobar sustrato" index={0} />
          <PlantCard name="Romero Silvestre" pot="Jardinera 15L" zone="Barandilla frontal" icon="flower-outline" tint={colors.primaryDark} detail="Sustrato fresco · Última comprobación hace 1 día" action="Ver ficha" index={1} />
          <View style={[styles.zoneHeader, { marginTop: 8 }]}><View style={[styles.zoneDot, { backgroundColor: colors.info }]} /><Text style={[styles.zoneTitle, { color: colors.text }]}>Zona Semisombra</Text><Text style={[styles.zoneCount, { color: colors.textSecondary }]}>2 macetas</Text></View>
          <PlantCard name="Albahaca Limón" pot="Maceta barro 18cm" zone="Rincón lateral" icon="leaf-outline" tint={colors.warning} detail="4h de sol suave · Diagnóstico táctil cada 2 días" action="Comprobar sustrato" index={2} />
          <PlantCard name="Menta Piperita" pot="Jardinera 20L" zone="Junto al ventanal" icon="sparkles-outline" tint={colors.info} detail="Humedad óptima · Girar maceta mañana" action="Ver ficha" index={3} />
        </> : <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>{[['Tomate Cherry · Maceta 30L · Sol directo +6h', 'Tomate Cherry', 0], ['Romero Silvestre · Jardinera 15L · Sol directo +6h', 'Romero Silvestre', 1], ['Albahaca Limón · Maceta 18cm · Semisombra', 'Albahaca Limón', 2], ['Menta Piperita · Jardinera 20L · Semisombra', 'Menta Piperita', 3]].map(([item, label, index]) => <Pressable key={String(item)} accessibilityRole="button" onPress={() => openPlant(String(label), Number(index))} style={[styles.listRow, { borderBottomColor: colors.border }]}><Ionicons name="flower-outline" size={21} color={colors.primary} /><Text style={[styles.listText, { color: colors.text }]}>{String(item)}</Text><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /></Pressable>)}</View>}
        <View style={[styles.legend, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.legendTitle, { color: colors.text }]}>Ordenar por luz real</Text><Text style={[styles.legendText, { color: colors.textSecondary }]}>Mantén las plantas en su zona y comprueba el sustrato antes de moverlas o regarlas.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { minHeight: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, gap: 8 }, back: { minWidth: 92, minHeight: 44, flexDirection: 'row', alignItems: 'center' }, backText: { fontSize: 14, fontWeight: '700' }, title: { fontSize: 18, fontWeight: '800', textAlign: 'center' }, subtitle: { fontSize: 11, textAlign: 'center', marginTop: 2 }, headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, segmented: { flexDirection: 'row', margin: 16, padding: 4, borderRadius: 14 }, segment: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, segmentText: { fontSize: 13, fontWeight: '800' }, content: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 }, tip: { borderRadius: 16, borderWidth: 1, padding: 13, flexDirection: 'row', gap: 10 }, tipTitle: { fontSize: 14, fontWeight: '800' }, tipText: { fontSize: 12, lineHeight: 17, marginTop: 3 }, zoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }, zoneDot: { width: 10, height: 10, borderRadius: 5 }, zoneTitle: { fontSize: 15, fontWeight: '800', flex: 1 }, zoneCount: { fontSize: 12 }, plantCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 }, plantTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, plantIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, plantName: { fontSize: 15, fontWeight: '800' }, plantMeta: { fontSize: 12, marginTop: 3 }, plantDetail: { borderRadius: 10, padding: 9, flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, plantDetailText: { flex: 1, fontSize: 12, lineHeight: 17 }, checkButton: { minHeight: 42, borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, checkButtonText: { fontSize: 13, fontWeight: '800' }, listCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 14 }, listRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1 }, listText: { flex: 1, fontSize: 13, fontWeight: '700' }, legend: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 4 }, legendTitle: { fontSize: 14, fontWeight: '800' }, legendText: { fontSize: 12, lineHeight: 17, marginTop: 4 },
});
