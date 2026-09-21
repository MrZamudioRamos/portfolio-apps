import { useColors } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Plant } from '../../src/models/plant';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';

type PlantFilter = 'all' | 'attention' | 'healthy';

export default function PlantsTabScreen() {
  const colors = useColors();
  const router = useRouter();
  const [filter, setFilter] = useState<PlantFilter>('all');
  const [query, setQuery] = useState('');
  const plantsCollection = useCollection<Plant>('plants');
  const { activeGarden } = useActiveGarden();
  const gardenPlants = useMemo(
    () => plantsCollection.items.filter((plant) => !plant.deletedAt && (!activeGarden?.id || plant.gardenId === activeGarden.id)),
    [activeGarden?.id, plantsCollection.items]
  );
  const plants = [
    { name: 'Albahaca Limón', match: 'albahaca', meta: 'Maceta 18 cm · Balcón Sur', state: 'Por revisar', detail: 'Prueba táctil hace 2 días', icon: 'leaf-outline' as const, tone: colors.warning, group: 'attention' },
    { name: 'Tomate Cherry Sweet', match: 'tomate cherry', meta: 'Maceta 30 L · Sol pleno', state: 'Floración activa', detail: 'Riego condicionado al clima', icon: 'nutrition-outline' as const, tone: colors.primary, group: 'healthy' },
    { name: 'Menta Piperita', match: 'menta', meta: 'Jardinera 20 L · Semisombra', state: 'Saludable', detail: 'Girar maceta mañana', icon: 'sparkles-outline' as const, tone: colors.info, group: 'healthy' },
    { name: 'Romero Silvestre', match: 'romero', meta: 'Jardinera 15 L · Barandilla', state: 'Saludable', detail: 'Última comprobación ayer', icon: 'flower-outline' as const, tone: colors.primaryDark, group: 'healthy' },
  ];
  const visible = useMemo(() => plants.filter((plant) => (filter === 'all' || plant.group === filter) && plant.name.toLowerCase().includes(query.toLowerCase())), [filter, query]);

  function openPlant(matchLabel: string, fallbackIndex: number) {
    const normalized = matchLabel.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const actual = gardenPlants.find((plant) => {
      const haystack = `${plant.name} ${plant.cropId} ${plant.variety ?? ''}`.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized.split(' ').some((token) => token.length > 3 && haystack.includes(token));
    }) ?? gardenPlants[fallbackIndex];
    router.push(actual ? `/plant/${actual.id}` as any : '/first-crop' as any);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}><View><Text style={[styles.kicker, { color: colors.primary }]}>SEMILLA · MI HUERTO</Text><Text style={[styles.title, { color: colors.text }]}>Mis Plantas</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/plant/new' as any)} style={[styles.addButton, { backgroundColor: colors.primaryDark }]}><Ionicons name="add" size={18} color="#fff" /><Text style={styles.addText}>Añadir</Text></Pressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><View style={[styles.heroIcon, { backgroundColor: colors.primary + '20' }]}><Ionicons name="leaf-outline" size={25} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.heroTitle, { color: colors.text }]}>Tu huerto en un vistazo</Text><Text style={[styles.heroText, { color: colors.textSecondary }]}>4 plantas activas · 1 necesita tu atención hoy.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /></View>
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="search-outline" size={19} color={colors.textSecondary} /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar planta" placeholderTextColor={colors.textDisabled} style={[styles.searchInput, { color: colors.text }]} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}><Filter label="Todas (4)" active={filter === 'all'} onPress={() => setFilter('all')} colors={colors} /><Filter label="Necesitan atención" active={filter === 'attention'} onPress={() => setFilter('attention')} colors={colors} /><Filter label="Saludables" active={filter === 'healthy'} onPress={() => setFilter('healthy')} colors={colors} /></ScrollView>
        <View style={styles.sectionRow}><Text style={[styles.section, { color: colors.text }]}>Tus cultivos</Text><Text style={[styles.count, { color: colors.textSecondary }]}>{visible.length} visibles</Text></View>
        {visible.map((plant, index) => <Pressable key={plant.name} accessibilityRole="button" accessibilityLabel={`Abrir ficha de ${plant.name}`} onPress={() => openPlant(plant.match, index)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.plantIcon, { backgroundColor: plant.tone + '20' }]}><Ionicons name={plant.icon} size={25} color={plant.tone} /></View><View style={{ flex: 1 }}><Text style={[styles.plantName, { color: colors.text }]}>{plant.name}</Text><Text style={[styles.meta, { color: colors.textSecondary }]}>{plant.meta}</Text><View style={styles.stateRow}><View style={[styles.stateDot, { backgroundColor: plant.tone }]} /><Text style={[styles.state, { color: plant.tone }]}>{plant.state}</Text><Text style={[styles.detail, { color: colors.textSecondary }]}> · {plant.detail}</Text></View></View><Ionicons name="chevron-forward" size={19} color={colors.textSecondary} /></Pressable>)}
        <Pressable accessibilityRole="button" onPress={() => router.push('/first-crop' as any)} style={[styles.catalog, { borderColor: colors.primary, backgroundColor: colors.surface }]}><Ionicons name="grid-outline" size={20} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.catalogTitle, { color: colors.text }]}>Explorar catálogo de cultivos</Text><Text style={[styles.meta, { color: colors.textSecondary }]}>Encuentra una planta que encaje contigo y con tu espacio.</Text></View><Ionicons name="arrow-forward" size={19} color={colors.primary} /></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Filter({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <Pressable onPress={onPress} style={[styles.filter, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}><Text style={[styles.filterText, { color: active ? '#fff' : colors.textSecondary }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { minHeight: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 }, kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }, title: { fontSize: 25, fontWeight: '900', marginTop: 2 }, addButton: { minHeight: 42, paddingHorizontal: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }, addText: { color: '#fff', fontSize: 13, fontWeight: '800' }, content: { padding: 16, gap: 13, paddingBottom: 100 }, hero: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, heroIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, heroTitle: { fontSize: 15, fontWeight: '800' }, heroText: { fontSize: 12, lineHeight: 17, marginTop: 3 }, search: { minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 8 }, searchInput: { flex: 1, fontSize: 14 }, filters: { gap: 8, paddingRight: 16 }, filter: { minHeight: 38, paddingHorizontal: 13, borderRadius: 19, borderWidth: 1, justifyContent: 'center' }, filterText: { fontSize: 12, fontWeight: '800' }, sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 3 }, section: { fontSize: 18, fontWeight: '900' }, count: { fontSize: 12 }, card: { minHeight: 90, borderRadius: 18, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, plantIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, plantName: { fontSize: 15, fontWeight: '800' }, meta: { fontSize: 12, lineHeight: 17 }, stateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 }, stateDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 }, state: { fontSize: 11, fontWeight: '800' }, detail: { fontSize: 10, flexShrink: 1 }, catalog: { minHeight: 66, borderWidth: 1.5, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, catalogTitle: { fontSize: 14, fontWeight: '800' },
});
