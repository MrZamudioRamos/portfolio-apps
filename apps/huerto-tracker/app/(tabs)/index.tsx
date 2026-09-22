import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import type { Plant } from '../../src/models/plant';
import { PLANT_STATUS_CONFIG } from '../../src/models/plant';
import type { DiaryEntry } from '../../src/models/diary-entry';
import { CROP_IMAGES } from '../../src/data/cropImages';
import { CROPS_BY_ID } from '../../src/data/crops';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { useWeather } from '../../src/hooks/useWeather';
import { getWeatherLabel } from '../../src/utils/weather';
import { buildCarePlan } from '../../src/utils/carePlan';
import { dateToStr } from '../../src/utils/dateStr';
import { Mascot } from '../../src/components/Mascot';

/** Stitch's canonical Hoy frame with real local navigation behind every action. */
export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const [soilChecked, setSoilChecked] = useState<'wet' | 'dry' | null>(null);
  const { weather, loading: weatherLoading, refresh: refreshWeather } = useWeather(activeGarden?.province);

  const activePlants = useMemo(
    () => plants.items.filter((plant) => !plant.deletedAt && (!activeGarden?.id || plant.gardenId === activeGarden.id)),
    [activeGarden?.id, plants.items],
  );
  const carePlan = useMemo(
    () => buildCarePlan(activePlants, CROPS_BY_ID, entries.items, new Date()),
    [activePlants, entries.items],
  );
  const priorityTask = carePlan[0];
  const today = dateToStr(new Date());
  const registeredDays = useMemo(() => {
    const dates = new Set(entries.items.filter((entry) => !entry.deletedAt && (!activeGarden?.id || entry.gardenId === activeGarden.id)).map((entry) => entry.date));
    let count = 0;
    const cursor = new Date(`${today}T12:00:00`);
    while (dates.has(dateToStr(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [activeGarden?.id, entries.items, today]);
  const firstPlant = activePlants[0];
  const plantCrop = firstPlant ? CROPS_BY_ID[firstPlant.cropId] : undefined;
  const needsAttention = activePlants.filter((plant) => plant.pestStatus === 'active' || carePlan.some((task) => task.plantId === plant.id && task.priority === 'today')).length;
  const weatherText = weather
    ? `${weather.today.tempMax}°C · lluvia ${weather.today.rainProbability}%${weather.source === 'cache' ? ' · guardado' : ''}`
    : weatherLoading
      ? 'Consultando el tiempo…'
      : activeGarden?.province ? 'Clima no disponible' : 'Añade una ubicación';

  useFocusEffect(useCallback(() => {
    void plants.refresh().catch(() => {});
  }, []));

  const firstPlantId = useMemo(() => plants.items.find((plant) => !plant.deletedAt)?.id, [plants.items]);
  const goToPlant = () => {
    if (firstPlantId) router.push(`/plant/${firstPlantId}` as any);
    else router.push('/first-crop' as any);
  };
  const checkSoil = () => {
    setSoilChecked(null);
    router.push({ pathname: '/modal/check-soil-sheet', params: firstPlantId ? { plantId: firstPlantId } : {} } as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={plants.loading || entries.loading || weatherLoading} onRefresh={() => void Promise.all([plants.refresh(), entries.refresh(), refreshWeather()])} tintColor={colors.primary} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.profileBlock} accessibilityLabel="Perfil de Semilla">
            <View style={[styles.avatar, { backgroundColor: colors.accent + '44', borderColor: colors.accent }]}>
              <Ionicons name="person" size={20} color={colors.primaryDark} />
            </View>
            <View>
              <View style={styles.brandLine}>
                <Text style={[styles.brand, { color: colors.text }]}>Semilla</Text>
                <Ionicons name="leaf" size={14} color={colors.primary} />
              </View>
              <Pressable onPress={() => router.push('/gardens' as any)} hitSlop={8} style={styles.location}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>{activeGarden ? `${activeGarden.name} · ${activeGarden.province}` : 'Configura tu huerto'}</Text>
                <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Text style={[styles.weather, { color: colors.textSecondary }]}>☀ {weatherText}</Text>
            <Pressable onPress={() => router.push('/settings/notifications' as any)} accessibilityRole="button" accessibilityLabel="Notificaciones" style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.metrics} accessibilityLabel="Métricas de cuidado">
          <Metric icon="leaf" value={String(activePlants.length)} label="Plantas" colors={colors} />
          <Metric icon="warning" value={String(needsAttention)} label="Por revisar" colors={colors} warning />
          <Metric icon="flame" value={registeredDays > 0 ? `${registeredDays} d` : '—'} label="Racha registrada" colors={colors} />
        </View>

        {firstPlant ? <View style={[styles.priorityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.priorityTop}>
            <View style={styles.priorityLabel}>
              <Ionicons name="warning" size={15} color="#D88900" />
              <Text style={[styles.priorityEyebrow, { color: colors.text }]}>CUIDADO PRIORITARIO DE HOY</Text>
            </View>
            <Text style={[styles.reviewTime, { color: colors.textSecondary }]}>{firstPlant.bedName ?? 'Ubicación no configurada'}</Text>
          </View>
          <View style={styles.plantHero}>
            <Image source={{ uri: firstPlant.photoUri ?? CROP_IMAGES[firstPlant.cropId] }} style={styles.plantImage} resizeMode="cover" />
            <View style={styles.plantCopy}>
              <Text style={[styles.plantName, { color: colors.text }]}>{firstPlant.name}</Text>
              <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>{firstPlant.variety ?? plantCrop?.name ?? 'Cultivo registrado'} · {PLANT_STATUS_CONFIG[firstPlant.status].label}</Text>
              <View style={styles.plantStatus}>
                <Ionicons name="water-outline" size={14} color={colors.primary} />
                <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>{priorityTask?.plantId === firstPlant.id ? `Siguiente: ${priorityTask.kind === 'water' ? 'comprobar sustrato' : 'revisar planta'}` : 'Sin cuidados pendientes calculados'}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.diagnosis, { backgroundColor: colors.background }]}>
            <View style={styles.diagnosisTitle}>
              <Ionicons name="finger-print-outline" size={16} color={colors.primary} />
              <Text style={[styles.diagnosisHeading, { color: colors.text }]}>Paso 1: Diagnóstico preventivo</Text>
            </View>
            <Text style={[styles.body, { color: colors.textSecondary }]}>Toca el sustrato a <Text style={{ fontWeight: '800', color: colors.text }}>2 cm de profundidad</Text> con la yema del dedo. Si notas humedad fresca, <Text style={{ fontWeight: '800', color: colors.text }}>no riegues hoy</Text> para proteger sus raíces del encharcamiento.</Text>
          </View>
          <Pressable onPress={checkSoil} accessibilityRole="button" accessibilityLabel="1. Comprobar sustrato a 2 cm" style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 }]}>
            <Ionicons name="finger-print" size={21} color="#FFFFFF" />
            <Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>1. Comprobar sustrato (2 cm)</Text>
          </Pressable>
          {soilChecked && (
            <View style={[styles.soilResult, { backgroundColor: soilChecked === 'wet' ? colors.primary + '18' : '#FFF3E0' }]}>
              <Ionicons name={soilChecked === 'wet' ? 'checkmark-circle' : 'water'} size={17} color={soilChecked === 'wet' ? colors.primary : '#B86A00'} />
              <Text style={[styles.body, { color: colors.text }]}>{soilChecked === 'wet' ? 'Suelo húmedo · No regar hoy' : 'Suelo seco · Regar 400ml'}</Text>
            </View>
          )}
        </View> : <View style={[styles.priorityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.priorityLabel}><Ionicons name="leaf-outline" size={17} color={colors.primary} /><Text style={[styles.priorityEyebrow, { color: colors.text }]}>TU HUERTO AÚN ESTÁ VACÍO</Text></View>
          <Text style={[styles.plantName, { color: colors.text }]}>Añade tu primera planta</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>No mostramos cultivos de ejemplo. Cuando registres una planta aparecerán aquí sus cuidados reales.</Text>
          <Pressable onPress={() => router.push('/first-crop' as any)} accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Ionicons name="add" size={21} color="#FFFFFF" /><Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>Añadir primera planta</Text></Pressable>
        </View>}

        <View style={[styles.tipCard, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '55' }]}>
          <View style={[styles.tipIcon, { backgroundColor: colors.surface }]}><Mascot pose="point" size={34} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: colors.text }]}>Consejo de Semillita</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{weather ? `Hoy en ${activeGarden?.province ?? 'tu ubicación'}: ${getWeatherLabel(weather.today.weatherCode).emoji} ${weather.today.tempMax}°C de máxima y ${weather.today.rainProbability}% de probabilidad de lluvia.` : 'Configura la ubicación de tu huerto para recibir consejos basados en el tiempo real.'}</Text>
          </View>
        </View>

        <View style={styles.tasksHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Próxima tarea programada</Text>
          <Pressable onPress={() => router.push('/(tabs)/plants' as any)} hitSlop={8}><Text style={[styles.link, { color: colors.primary }]}>Ver huerto completo  ›</Text></Pressable>
        </View>
        {priorityTask ? <TaskRow title={`${priorityTask.kind === 'water' ? 'Comprobar sustrato' : 'Revisar'} · ${priorityTask.plantName}`} detail={priorityTask.dueDate === today ? 'Hoy · Basado en tus registros' : `${priorityTask.dueDate} · Basado en tus registros`} icon={priorityTask.kind === 'water' ? 'finger-print-outline' : 'leaf-outline'} onPress={() => router.push(`/plant/${priorityTask.plantId}` as any)} colors={colors} /> : <Pressable onPress={() => router.push('/reminder/new' as any)} accessibilityRole="button" style={[styles.taskRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.taskIcon, { backgroundColor: colors.primary + '16' }]}><Ionicons name="calendar-outline" size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, { color: colors.text }]}>Sin tareas programadas</Text><Text style={[styles.body, { color: colors.textSecondary }]}>Añade un recordatorio cuando quieras organizar un cuidado.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /></Pressable>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ icon, value, label, colors, warning = false }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; colors: ReturnType<typeof useColors>; warning?: boolean }) {
  return <View style={styles.metric}><Ionicons name={icon} size={18} color={warning ? '#D88900' : colors.primary} /><Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text></View>;
}

function TaskRow({ title, detail, icon, onPress, colors }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.taskRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.76 : 1 }]}><View style={[styles.taskIcon, { backgroundColor: colors.primary + '16' }]}><Ionicons name={icon} size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.taskTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{detail}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /></Pressable>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  profileBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  brand: { fontSize: 18, fontWeight: '800' },
  location: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locationText: { fontSize: 12 },
  headerActions: { alignItems: 'flex-end', gap: 6 },
  weather: { fontSize: 11, fontWeight: '700' },
  iconButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, minHeight: 82, borderRadius: 16, padding: 10, justifyContent: 'center', backgroundColor: '#FFFFFF', gap: 2 },
  metricValue: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  metricLabel: { fontSize: 10, lineHeight: 14 },
  priorityCard: { borderWidth: 1, borderRadius: 22, padding: 14, gap: 12 },
  priorityTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priorityEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  reviewTime: { fontSize: 10 },
  plantHero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  plantImage: { width: 76, height: 76, borderRadius: 16, backgroundColor: '#DDEED0' },
  plantCopy: { flex: 1, gap: 4 },
  plantName: { fontSize: 20, fontWeight: '800' },
  plantMeta: { fontSize: 12, lineHeight: 17 },
  plantStatus: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  diagnosis: { borderRadius: 14, padding: 12, gap: 6 },
  diagnosisTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  diagnosisHeading: { fontSize: 13, fontWeight: '800' },
  body: { fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { fontSize: 14, fontWeight: '800' },
  soilResult: { minHeight: 44, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  tipCard: { borderRadius: 18, borderWidth: 1, padding: 13, flexDirection: 'row', gap: 10 },
  tipIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  tasksHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', flex: 1 },
  link: { fontSize: 11, fontWeight: '800' },
  taskRow: { minHeight: 68, borderRadius: 16, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
});
