import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors, useTheme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useReminders } from '@portfolio/notifications';
import { getNearestProvince } from '../src/utils/weather';
import { PROVINCE_ZONES, CLIMATE_ZONE_CONFIG } from '../src/data/zones';
import type { ClimateZone, Garden, GardenType } from '../src/models/garden';
import { GARDEN_TYPE_CONFIG } from '../src/models/garden';
import { DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS } from '../src/hooks/useGardenLayout';
import { layoutTsKey } from '../src/hooks/useGardenLayout';
import { freeLayoutKey, freeLayoutTsKey } from '../src/hooks/useGardenFreeLayout';
import { gardenMapPlanKey, gardenMapPlanTsKey } from '../src/hooks/useGardenMapPlan';
import { usePro } from '../src/hooks/usePro';
import type { Plant } from '../src/models/plant';
import type { DiaryEntry } from '../src/models/diary-entry';
import type { GardenReminder } from '../src/models/reminder';
import { StitchBottomNav } from '../src/components/StitchBottomNav';
import { goBackOr } from '../src/utils/navigation';

const ACTIVE_KEY = '@portfolio/active_garden_id';
const LAYOUT_KEY = (id: string) => `@portfolio/huerto/garden_layout/${id}`;
const ALL_PROVINCES = Object.keys(PROVINCE_ZONES).sort();

/** The Stitch “Mis Espacios” frame. Storage only supplies real switching and creation. */
export default function GardensScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { isPro } = usePro();
  const gardens = useCollection<Garden>('gardens');
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const reminders = useReminders<GardenReminder>('reminders');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [gardenType, setGardenType] = useState<GardenType>('huerto');
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  React.useEffect(() => { void AsyncStorage.getItem(ACTIVE_KEY).then(setActiveId).catch(() => {}); }, []);
  const effectiveActiveId = activeId ?? gardens.items[0]?.id ?? null;
  const activeGarden = gardens.items.find((garden) => garden.id === effectiveActiveId) ?? gardens.items[0];
  const filteredProvinces = useMemo(() => ALL_PROVINCES.filter((p) => p.toLowerCase().includes(provinceSearch.toLowerCase())), [provinceSearch]);
  const climateZone: ClimateZone | null = province ? (PROVINCE_ZONES[province] ?? null) : null;

  async function refresh() {
    setRefreshing(true);
    try { await Promise.all([gardens.refresh(), plants.refresh(), entries.refresh()]); } finally { setRefreshing(false); }
  }
  async function switchGarden(garden: Garden | undefined) {
    if (!garden) return;
    await AsyncStorage.setItem(ACTIVE_KEY, garden.id);
    setActiveId(garden.id);
  }
  function deleteGarden(garden: Garden | undefined) {
    if (!garden) return;
    if (gardens.items.length <= 1) { Alert.alert(t('gardens.cantDeleteLast')); return; }
    Alert.alert(t('gardens.deleteTitle', { name: garden.name }), t('gardens.deleteDesc'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        await Promise.all([
          gardens.softRemove(garden.id),
          plants.softRemoveMany(plants.items.filter((item) => item.gardenId === garden.id).map((item) => item.id)),
          entries.softRemoveMany(entries.items.filter((item) => item.gardenId === garden.id).map((item) => item.id)),
          reminders.softRemoveMany(reminders.items.filter((item) => item.gardenId === garden.id).map((item) => item.id)),
          AsyncStorage.multiRemove([
            LAYOUT_KEY(garden.id), layoutTsKey(garden.id),
            freeLayoutKey(garden.id), freeLayoutTsKey(garden.id),
            gardenMapPlanKey(garden.id), gardenMapPlanTsKey(garden.id),
          ]),
        ]);
        const next = gardens.items.find((item) => item.id !== garden.id);
        if (next) { await AsyncStorage.setItem(ACTIVE_KEY, next.id); setActiveId(next.id); }
      } },
    ]);
  }
  async function detectLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const nearest = getNearestProvince(position.coords.latitude, position.coords.longitude);
        if (nearest) setProvince(nearest);
      }
    } catch { /* manual selection remains available */ } finally { setLocating(false); }
  }
  async function createGarden() {
    if (!name.trim() || !province || !climateZone) return;
    setSaving(true);
    try {
      const created = await gardens.create({ name: name.trim(), province, climateZone, gardenType, gridRows: DEFAULT_GRID_ROWS, gridCols: DEFAULT_GRID_COLS, hemisphere: 'norte' });
      if (created?.id) { await AsyncStorage.setItem(ACTIVE_KEY, created.id); setActiveId(created.id); }
      setShowCreate(false); setName(''); setProvince('');
    } finally { setSaving(false); }
  }
  const canCreateMore = isPro || gardens.items.length < 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => goBackOr(router)} hitSlop={10} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={[styles.headerBackText, { color: colors.text }]}>Mi Huerto</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mis Espacios</Text>
        <Pressable onPress={() => canCreateMore ? setShowCreate(true) : router.push('/paywall?source=garden_limit' as any)} hitSlop={10} style={styles.newHeaderButton}>
          {!canCreateMore && <Text style={[styles.proBadge, { color: colors.primary }]}>PRO</Text>}
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={[styles.newHeaderText, { color: colors.primary }]}>Nuevo</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + 76 }]}>
        <View style={[styles.tip, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary + '40' }]}>
          <Ionicons name="leaf" size={19} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.text }]}><Text style={{ fontWeight: fontWeight.bold }}>Consejo de Semillita </Text>Separar tus espacios te ayuda a calibrar las horas de luz reales de cada maceta sin confusiones.</Text>
        </View>

        <View style={styles.sectionHeader}>
          <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Espacios Activos</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Gestiona la orientación, superficie y horas de sol</Text></View>
          <Text style={[styles.savedCount, { color: colors.textSecondary }]}>{gardens.items.length} guardados</Text>
        </View>

        {gardens.items.length === 0 ? <View style={[styles.createPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="leaf-outline" size={28} color={colors.primary} /><Text style={[styles.createTitle, { color: colors.text }]}>Aún no tienes huertos</Text><Text style={[styles.createDesc, { color: colors.textSecondary }]}>Crea tu primer espacio para guardar plantas, clima y recordatorios reales.</Text></View> : gardens.items.map((garden) => { const gardenPlantCount = plants.items.filter((plant) => !plant.deletedAt && plant.gardenId === garden.id).length; const active = garden.id === effectiveActiveId; return <SpaceCard key={garden.id} colors={colors} active={active} title={garden.name} badge={active ? 'En uso · Activo' : 'Disponible'} area="Superficie no configurada" detail={`${gardenPlantCount} plantas registradas`} sun="Orientación no configurada" location={garden.province} footer={active ? 'Seleccionado para riego y alertas' : 'Pulsa para cambiar de huerto'} onPress={() => switchGarden(garden)} onMap={() => { void switchGarden(garden); router.push('/garden/map' as any); }} onOptions={() => deleteGarden(garden)} />; })}

        <View style={[styles.createPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="home" size={24} color={colors.primary} />
          <Text style={[styles.createTitle, { color: colors.text }]}>¿Tienes un patio, terraza o parcela?</Text>
          <Text style={[styles.createDesc, { color: colors.textSecondary }]}>Separa tus macetas y calendarios de sol para recibir recordatorios independientes según la luz.</Text>
          <Text style={[styles.createExample, { color: colors.textSecondary }]}>Terraza comunitaria · Casa de campo</Text>
          <Pressable onPress={() => canCreateMore ? setShowCreate(true) : router.push('/paywall?source=garden_limit' as any)} style={({ pressed }) => [styles.createButton, { borderColor: colors.primary, opacity: pressed ? 0.76 : 1 }]}>
            <Ionicons name="add-circle" size={19} color={colors.primary} /><Text style={[styles.createButtonText, { color: colors.primary }]}>+ Crear nuevo huerto o terraza</Text>
          </Pressable>
        </View>
      </ScrollView>
      <StitchBottomNav />

      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}><Pressable onPress={() => setShowCreate(false)} hitSlop={10}><Ionicons name="close" size={24} color={colors.textSecondary} /></Pressable><Text style={[styles.modalTitle, { color: colors.text }]}>{t('gardens.createTitle')}</Text><Pressable onPress={createGarden} disabled={!name.trim() || !climateZone || saving}><Text style={[styles.modalSave, { color: !name.trim() || !climateZone || saving ? colors.textDisabled : colors.primary }]}>Guardar</Text></Pressable></View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Nombre del espacio</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Balcón principal" placeholderTextColor={colors.textDisabled} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} />
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Tipo de espacio</Text>
            <View style={styles.typeRow}>{(Object.keys(GARDEN_TYPE_CONFIG) as GardenType[]).map((type) => { const selected = gardenType === type; return <Pressable key={type} onPress={() => setGardenType(type)} style={[styles.typeChip, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.border }]}><Text style={{ fontSize: 19 }}>{GARDEN_TYPE_CONFIG[type].emoji}</Text><Text style={{ color: selected ? colors.primaryDark : colors.textSecondary, fontSize: 12, fontWeight: fontWeight.bold }}>{t('gardenType.' + type)}</Text></Pressable>; })}</View>
            <View style={styles.provinceLabelRow}><Text style={[styles.formLabel, { color: colors.textSecondary }]}>Provincia y clima</Text><Pressable onPress={detectLocation} disabled={locating}><Text style={{ color: colors.primary, fontSize: 12 }}>{locating ? 'Detectando…' : 'Usar ubicación'}</Text></Pressable></View>
            <Pressable onPress={() => setShowProvinceModal(true)} style={[styles.input, styles.provinceInput, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ color: province ? colors.text : colors.textDisabled, fontSize: 15 }}>{province || 'Selecciona una provincia'}</Text><Ionicons name="chevron-down" size={17} color={colors.textSecondary} /></Pressable>
          </ScrollView>
        </SafeAreaView>
        <Modal visible={showProvinceModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowProvinceModal(false)}>
          <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}><View style={[styles.modalHeader, { borderBottomColor: colors.border }]}><Text style={[styles.modalTitle, { color: colors.text }]}>Selecciona provincia</Text><Pressable onPress={() => setShowProvinceModal(false)} hitSlop={10}><Ionicons name="close" size={24} color={colors.textSecondary} /></Pressable></View><View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="search" size={17} color={colors.textSecondary} /><TextInput value={provinceSearch} onChangeText={setProvinceSearch} placeholder="Buscar" placeholderTextColor={colors.textDisabled} style={{ flex: 1, color: colors.text, marginLeft: 8 }} autoFocus /></View><ScrollView>{filteredProvinces.map((item) => <Pressable key={item} onPress={() => { setProvince(item); setShowProvinceModal(false); }} style={[styles.provinceRow, { borderBottomColor: colors.border }]}><Text style={[styles.provinceName, { color: colors.text }]}>{item}</Text><Text style={[styles.provinceZone, { color: colors.textSecondary }]}>{CLIMATE_ZONE_CONFIG[PROVINCE_ZONES[item]]?.label ?? ''}</Text></Pressable>)}</ScrollView></SafeAreaView>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

function SpaceCard({ colors, active = false, title, badge, area, detail, sun, location, footer, onPress, onMap, onOptions }: { colors: ReturnType<typeof useColors>; active?: boolean; title: string; badge: string; area: string; detail: string; sun: string; location: string; footer: string; onPress: () => void; onMap?: () => void; onOptions: () => void }) {
  return <View style={[styles.spaceCard, { backgroundColor: colors.surface, borderColor: active ? colors.primary : colors.border }]}><Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}><View style={styles.cardTop}><View style={[styles.badge, { backgroundColor: active ? colors.primary + '18' : colors.surfaceAlt }]}><Text style={{ color: active ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '800' }}>{badge}</Text></View><Pressable onPress={onOptions} hitSlop={10}><Ionicons name="ellipsis-horizontal" size={19} color={colors.textSecondary} /></Pressable></View><View style={styles.cardTitleRow}><Text style={[styles.spaceTitle, { color: colors.text }]}>{title}</Text>{active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}</View><Text style={[styles.area, { color: colors.text }]}>{area}</Text><View style={styles.infoLine}><Ionicons name="leaf-outline" size={15} color={colors.primary} /><Text style={[styles.infoText, { color: colors.textSecondary }]}>{detail}</Text></View><View style={styles.infoLine}><Ionicons name="sunny-outline" size={15} color="#D88900" /><Text style={[styles.infoText, { color: colors.textSecondary }]}>{sun}</Text></View><View style={styles.infoLine}><Ionicons name="location-outline" size={15} color={colors.textSecondary} /><Text style={[styles.infoText, { color: colors.textSecondary }]}>{location}</Text></View><Text style={[styles.footer, { color: colors.textSecondary }]}>{footer}</Text></Pressable>{onMap ? <Pressable onPress={onMap} style={[styles.mapButton, { borderTopColor: colors.border }]}><Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>Ver mapa de sol</Text><Ionicons name="arrow-forward" size={16} color={colors.primary} /></Pressable> : <Pressable onPress={onPress} style={[styles.switchButton, { borderTopColor: colors.border }]}><Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>Cambiar a este huerto</Text></Pressable>}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  headerBack: { minHeight: 44, flexDirection: 'row', alignItems: 'center', minWidth: 96 },
  headerBackText: { fontSize: 14, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  newHeaderButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 78, justifyContent: 'flex-end' },
  newHeaderText: { fontSize: 13, fontWeight: '800' },
  proBadge: { fontSize: 9, fontWeight: '800', marginRight: 2 },
  content: { padding: 16, gap: 14 },
  tip: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  sectionSubtitle: { fontSize: 12, marginTop: 3 },
  savedCount: { fontSize: 12, fontWeight: '700' },
  spaceCard: { borderRadius: 20, borderWidth: 1.5, padding: 14, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  spaceTitle: { fontSize: 18, fontWeight: '800', flex: 1 },
  area: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  infoText: { fontSize: 12, flex: 1 },
  footer: { fontSize: 11, marginTop: 10, fontStyle: 'italic' },
  mapButton: { minHeight: 46, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 13, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchButton: { minHeight: 46, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 13, paddingTop: 10, justifyContent: 'center' },
  createPanel: { borderRadius: 20, borderWidth: 1, padding: 16, alignItems: 'center' },
  createTitle: { fontSize: 16, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  createDesc: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  createExample: { fontSize: 12, marginTop: 9, fontWeight: '700' },
  createButton: { minHeight: 48, borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  createButtonText: { fontSize: 13, fontWeight: '800' },
  modalHeader: { minHeight: 60, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSave: { fontSize: 14, fontWeight: '800' },
  modalContent: { padding: 18, gap: 10 },
  formLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, minHeight: 72, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4 },
  provinceLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  provinceInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  search: { margin: 16, minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  provinceRow: { minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  provinceName: { fontSize: 15 },
  provinceZone: { fontSize: 11 },
});
