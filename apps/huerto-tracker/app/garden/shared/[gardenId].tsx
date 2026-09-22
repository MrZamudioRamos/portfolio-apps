import { Ionicons } from '@expo/vector-icons';
import { fetchSharedGarden, useSession, type SharedGardenSnapshot } from '@portfolio/supabase';
import { useColors, useTheme } from '@portfolio/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../../../src/data/crops';
import { CLIMATE_ZONE_CONFIG } from '../../../src/data/zones';
import { normalizeGardenMapPlan } from '../../../src/models/garden-map-plan';
import { PLANT_STATUS_CONFIG } from '../../../src/models/plant';

export default function SharedGardenScreen() {
  const colors = useColors();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { gardenId: rawId } = useLocalSearchParams<{ gardenId?: string }>();
  const gardenId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { user } = useSession();
  const [snapshot, setSnapshot] = useState<SharedGardenSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    if (!gardenId || !user) { setSnapshot(null); setLoading(false); return; }
    setLoading(true);
    setError(false);
    try { setSnapshot(await fetchSharedGarden(gardenId)); }
    catch { setSnapshot(null); setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [gardenId, user?.id]);

  const mapState = useMemo(() => {
    if (!snapshot) return null;
    const stored = snapshot.layout && typeof snapshot.layout === 'object' ? snapshot.layout as Record<string, unknown> : {};
    const plan = normalizeGardenMapPlan(stored.mapPlan);
    const grid = Array.isArray(stored.grid) ? stored.grid.filter((id): id is string | null => id === null || typeof id === 'string') : [];
    return { plan, grid };
  }, [snapshot]);

  const plantById = useMemo(() => new Map((snapshot?.plants ?? []).map((plant) => [plant.id, plant])), [snapshot?.plants]);
  const gridRows = Math.max(1, Math.min(12, Math.floor(snapshot?.garden.grid_rows ?? 3)));
  const gridCols = Math.max(1, Math.min(12, Math.floor(snapshot?.garden.grid_cols ?? 3)));
  const cellCount = Math.min(144, gridRows * gridCols);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.replace('/(tabs)' as any)} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.primary} /></Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Huerto compartido</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {!user ? <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>Inicia sesión para consultar</Text><Text style={[styles.body, { color: colors.textSecondary }]}>Vuelve a abrir el enlace de invitación después de iniciar sesión.</Text><Pressable accessibilityRole="button" onPress={() => router.push('/auth' as any)} style={[styles.button, { backgroundColor: colors.primaryDark }]}><Text style={styles.buttonText}>Iniciar sesión</Text></Pressable></View> : loading ? <Text style={[styles.body, { color: colors.textSecondary }]}>Cargando huerto…</Text> : error || !snapshot || !mapState ? <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>No se puede abrir este huerto</Text><Text style={[styles.body, { color: colors.textSecondary }]}>La invitación pudo retirarse o falta aplicar la configuración de compartir de Supabase. Pide a la persona propietaria que compruebe el acceso.</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={[styles.button, { backgroundColor: colors.primaryDark }]}><Text style={styles.buttonText}>Reintentar</Text></Pressable></View> : <>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.readOnly}><Ionicons name="eye-outline" size={17} color={colors.primary} /><Text style={[styles.readOnlyText, { color: colors.primary }]}>Solo lectura</Text></View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{snapshot.garden.name}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{[snapshot.garden.province, CLIMATE_ZONE_CONFIG[snapshot.garden.climate_zone as keyof typeof CLIMATE_ZONE_CONFIG]?.label ?? snapshot.garden.climate_zone].filter(Boolean).join(' · ')}</Text>
            {mapState.plan.dimensions && <Text style={[styles.body, { color: colors.textSecondary }]}>{mapState.plan.dimensions.widthCm} × {mapState.plan.dimensions.lengthCm} cm</Text>}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Distribución</Text>
            {mapState.grid.length > 0 ? <View style={[styles.grid, { gap: 5 }]}>{Array.from({ length: cellCount }, (_, index) => {
              const plantId = mapState.grid[index];
              const plant = plantId ? plantById.get(plantId) : undefined;
              return <View key={index} style={[styles.cell, { width: `${100 / gridCols - 2}%`, backgroundColor: plant ? colors.primary + '18' : colors.surfaceAlt, borderColor: colors.border }]}><Text numberOfLines={2} style={[styles.cellText, { color: colors.text }]}>{plant?.name ?? '·'}</Text></View>;
            })}</View> : <Text style={[styles.body, { color: colors.textSecondary }]}>Todavía no hay celdas de mapa compartidas.</Text>}
            {mapState.plan.structures.length > 0 && <View style={styles.list}>{mapState.plan.structures.map((item) => <View key={item.id} style={styles.row}><Ionicons name="grid-outline" size={17} color={colors.primary} /><Text style={[styles.body, { color: colors.text, flex: 1 }]}>{item.name} · {item.widthCm} × {item.lengthCm} cm</Text></View>)}</View>}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Plantas · {snapshot.plants.length}</Text>
            {snapshot.plants.length === 0 ? <Text style={[styles.body, { color: colors.textSecondary }]}>No hay plantas activas en este huerto.</Text> : <View style={styles.list}>{snapshot.plants.map((plant) => <View key={plant.id} style={[styles.row, { borderColor: colors.border }]}><Ionicons name="leaf-outline" size={17} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.bodyBold, { color: colors.text }]}>{plant.name}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{[plant.variety, plant.bed_name, PLANT_STATUS_CONFIG[plant.status as keyof typeof PLANT_STATUS_CONFIG]?.label ?? plant.status].filter(Boolean).join(' · ')}</Text></View></View>)}</View>}
          </View>

          {mapState.plan.plannedPlantings.length > 0 && <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>Próximas siembras</Text><View style={styles.list}>{mapState.plan.plannedPlantings.map((item) => <View key={item.id} style={[styles.row, { borderColor: colors.border }]}><Ionicons name="calendar-outline" size={17} color={colors.primary} /><Text style={[styles.body, { color: colors.text, flex: 1 }]}>{CROPS_BY_ID[item.cropId]?.name ?? item.cropId} · {item.count} · {formatDate(item.plannedDate)}</Text></View>)}</View></View>}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  const { spacing, fontSize, fontWeight, radii } = theme;
  return StyleSheet.create({
    container: { flex: 1 }, header: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center' }, back: { width: 44, minHeight: 44, justifyContent: 'center' }, title: { flex: 1, textAlign: 'center', fontSize: fontSize.md, fontWeight: fontWeight.bold }, content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }, section: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm }, sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, body: { fontSize: fontSize.sm, lineHeight: 20 }, bodyBold: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.md }, buttonText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold }, readOnly: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, readOnlyText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { minHeight: 54, borderWidth: 1, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', padding: 3 }, cellText: { fontSize: 10, textAlign: 'center' }, list: { gap: spacing.xs }, row: { minHeight: 43, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  });
}
