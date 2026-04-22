import { useColors, useTheme, Card, EmptyState, StatCard, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../../src/data';
import type { Garden } from '../../src/models/garden';
import { PLANT_STATUS_CONFIG, type Plant } from '../../src/models/plant';
import type { GardenReminder } from '../../src/models/reminder';
import { CLIMATE_ZONE_CONFIG } from '../../src/data/zones';

export default function DashboardScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();

  const gardens = useCollection<Garden>('gardens');
  const plants = useCollection<Plant>('plants');
  const reminders = useCollection<GardenReminder>('reminders');

  useFocusEffect(
    useCallback(() => {
      plants.refresh();
      reminders.refresh();
    }, [])
  );

  const garden = gardens.items[0];
  const zoneConfig = garden ? CLIMATE_ZONE_CONFIG[garden.climateZone] : null;
  const harvestingCount = plants.items.filter((p) => p.status === 'harvesting').length;
  const activeReminders = reminders.items.filter((r) => r.enabled).length;

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function renderPlantCard({ item }: { item: Plant }) {
    const crop = CROPS_BY_ID[item.cropId];
    const statusConfig = PLANT_STATUS_CONFIG[item.status];
    return (
      <Pressable
        onPress={() => router.push(`/plant/${item.id}`)}
        style={({ pressed }) => [s.plantCard, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Card padded={false} style={s.plantCardInner}>
          <View style={[s.plantImageBox, { backgroundColor: colors.surfaceAlt }]}>
            {item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={s.plantPhoto} />
            ) : (
              <Text style={s.plantEmoji}>{crop?.emoji ?? '🌱'}</Text>
            )}
          </View>
          <View style={s.plantInfo}>
            <Text style={[s.plantName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.variety ? (
              <Text style={[s.plantVariety, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.variety}
              </Text>
            ) : null}
            <View style={[s.statusBadge, { backgroundColor: statusConfig.color + '22' }]}>
              <Text style={[s.statusText, { color: statusConfig.color }]}>
                {statusConfig.emoji} {statusConfig.label}
              </Text>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {garden?.name ?? 'Mi Huerto'}
          </Text>
          {zoneConfig && (
            <View style={s.zoneBadge}>
              <Text style={[s.zoneBadgeText, { color: colors.primary }]}>
                {zoneConfig.emoji} {zoneConfig.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={plants.items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={s.columnWrapper}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Stats row */}
            <View style={s.statsRow}>
              <StatCard
                emoji="🌱"
                value={plants.count}
                label="Plantas"
                onPress={() => {}}
              />
              <StatCard
                emoji="🧺"
                value={harvestingCount}
                label="En cosecha"
                onPress={() => {}}
              />
              <StatCard
                emoji="🔔"
                value={activeReminders}
                label="Recordatorios"
                onPress={() => {}}
              />
            </View>

            {/* Stats link */}
            <Pressable
              onPress={() => router.push('/stats')}
              style={({ pressed }) => [
                s.statsLink,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
              <Text style={[s.statsLinkText, { color: colors.primary }]}>Ver estadísticas</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>

            {/* Section title */}
            {plants.count > 0 && (
              <Text style={[s.sectionTitle, { color: colors.text }]}>Mis plantas</Text>
            )}
          </>
        }
        ListEmptyComponent={
          !plants.loading ? (
            <EmptyState
              emoji="🌱"
              title="Aún no hay plantas"
              description="Añade tu primera planta para empezar a registrar tu huerto."
              ctaLabel="Añadir planta"
              onCta={() => router.push('/plant/new')}
            />
          ) : null
        }
        renderItem={renderPlantCard}
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/plant/new')}
        style={({ pressed }) => [
          s.fab,
          { ...shadows.lg, backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>
) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerTitle: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    zoneBadge: {
      marginTop: 2,
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    zoneBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
    },
    listContent: { paddingBottom: 100 },
    columnWrapper: {
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    plantCard: { flex: 1 },
    plantCardInner: { flex: 1, overflow: 'hidden' },
    plantImageBox: {
      width: '100%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plantPhoto: { width: '100%', height: '100%' },
    plantEmoji: { fontSize: 48 },
    plantInfo: { padding: spacing.md },
    plantName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    plantVariety: { fontSize: fontSize.xs, marginTop: 1 },
    statusBadge: {
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    statusText: { fontSize: 10, fontWeight: fontWeight.semibold },
    statsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    statsLinkText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
