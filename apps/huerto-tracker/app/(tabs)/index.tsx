import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import type { Plant } from '../../src/models/plant';
import { CROP_IMAGES } from '../../src/data/cropImages';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { useWeather } from '../../src/hooks/useWeather';
import { Mascot } from '../../src/components/Mascot';

/** Stitch's canonical Hoy frame with real local navigation behind every action. */
export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const [soilChecked, setSoilChecked] = useState<'wet' | 'dry' | null>(null);
  const { weather } = useWeather(activeGarden?.province);

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
        refreshControl={<RefreshControl refreshing={plants.loading} onRefresh={() => void plants.refresh()} tintColor={colors.primary} />}
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
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>Madrid · Balcón soleado</Text>
                <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Text style={[styles.weather, { color: colors.textSecondary }]}>☀ {weather ? `${weather.today.tempMax}°C` : '23°C'} · 42%</Text>
            <Pressable onPress={() => router.push('/settings/notifications' as any)} accessibilityRole="button" accessibilityLabel="Notificaciones" style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.metrics} accessibilityLabel="Métricas de cuidado">
          <Metric icon="leaf" value="4" label="Plantas" colors={colors} />
          <Metric icon="warning" value="1" label="Por revisar" colors={colors} warning />
          <Metric icon="flame" value="5 d" label="Racha verde" colors={colors} />
        </View>

        <View style={[styles.priorityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.priorityTop}>
            <View style={styles.priorityLabel}>
              <Ionicons name="warning" size={15} color="#D88900" />
              <Text style={[styles.priorityEyebrow, { color: colors.text }]}>CUIDADO PRIORITARIO DE HOY</Text>
            </View>
            <Text style={[styles.reviewTime, { color: colors.textSecondary }]}>Maceta barro 18 cm</Text>
          </View>
          <View style={styles.plantHero}>
            <Image source={{ uri: CROP_IMAGES.albahaca }} style={styles.plantImage} resizeMode="cover" />
            <View style={styles.plantCopy}>
              <Text style={[styles.plantName, { color: colors.text }]}>Albahaca Limón</Text>
              <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>Ocimum basilicum citriodorum · Balcón Sur · Saludable</Text>
              <View style={styles.plantStatus}>
                <Ionicons name="water-outline" size={14} color={colors.primary} />
                <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>Riego hace 2 días · 6h sol directo</Text>
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
        </View>

        <View style={[styles.tipCard, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '55' }]}>
          <View style={[styles.tipIcon, { backgroundColor: colors.surface }]}><Mascot pose="point" size={34} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: colors.text }]}>Consejo de Semillita</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>🌱 “El sol hoy pega con fuerza a las 14:00 en Madrid. Acerca la <Text style={{ fontWeight: '800', color: colors.text }}>menta a la sombra</Text> para cuidar sus puntas tiernas.”</Text>
          </View>
        </View>

        <View style={styles.tasksHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Próxima tarea programada</Text>
          <Pressable onPress={() => router.push('/(tabs)/plants' as any)} hitSlop={8}><Text style={[styles.link, { color: colors.primary }]}>Ver huerto completo  ›</Text></Pressable>
        </View>
        <TaskRow title="Girar maceta de Romero" detail="Mañana · Para un follaje simétrico" icon="sync-outline" onPress={goToPlant} colors={colors} />
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
