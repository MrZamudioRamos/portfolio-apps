import { useColors, useTheme, Card, EmptyState, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../../src/data';
import { CROP_IMAGES } from '../../src/data/cropImages';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { useCustomCrops } from '../../src/hooks/useCustomCrops';
import { PLANT_STATUS_CONFIG, type Plant } from '../../src/models/plant';

const FALLBACK_PROGRESS: Record<Plant['status'], number> = {
  seedling: 12,
  transplanted: 28,
  growing: 52,
  flowering: 68,
  fruiting: 82,
  harvesting: 94,
  finished: 100,
};

function getSeasonProgress(plant: Plant, daysToHarvest?: [number, number]) {
  if (!plant.sowingDate || !daysToHarvest) return FALLBACK_PROGRESS[plant.status];

  const elapsedDays = Math.max(
    0,
    Math.round((Date.now() - new Date(plant.sowingDate).getTime()) / 86_400_000)
  );
  const targetDays = Math.max(daysToHarvest[1], 1);
  return Math.min(100, Math.max(5, Math.round((elapsedDays / targetDays) * 100)));
}

export default function PlantsTabScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { activeGarden: garden, refreshActiveId } = useActiveGarden();
  const allPlants = useCollection<Plant>('plants');
  const { customCropsById } = useCustomCrops();
  const [refreshing, setRefreshing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const plants = useMemo(
    () => allPlants.items
      .filter((plant) => plant.gardenId === garden?.id && !plant.deletedAt)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allPlants.items, garden?.id]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([allPlants.refresh(), refreshActiveId()]);
    } finally {
      setRefreshing(false);
    }
  };

  const openAddPlant = () => router.push('/plant/new' as any);

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii, shadows),
    [colors, spacing, fontSize, fontWeight, radii, shadows]
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={s.header}>
        <View style={s.brandLockup}>
          <View style={[s.brandMark, { backgroundColor: colors.accent }]}>
            <Ionicons name="leaf" size={17} color={colors.primaryDark} />
          </View>
          <Text style={[s.brandName, { color: colors.text }]}>semilla</Text>
        </View>
        <Pressable
          onPress={openAddPlant}
          accessibilityRole="button"
          accessibilityLabel={t('plantsTab.add')}
          style={({ pressed }) => [s.addButton, { backgroundColor: colors.accent, opacity: pressed ? 0.78 : 1 }]}
        >
          <Ionicons name="add" size={18} color={colors.primaryDark} />
          <Text style={[s.addButtonText, { color: colors.primaryDark }]}>{t('plantsTab.add')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={plants}
        keyExtractor={(plant) => plant.id}
        renderItem={({ item: plant }) => {
          const crop = CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId];
          const status = PLANT_STATUS_CONFIG[plant.status];
          const imageUri = plant.photoUri ?? CROP_IMAGES[plant.cropId] ?? crop?.imageUrl;
          const progress = getSeasonProgress(plant, crop?.daysToHarvest);

          return (
            <Card
              padded={false}
              onPress={() => router.push({ pathname: '/plant/[id]', params: { id: plant.id } })}
              style={s.plantRow}
            >
              <View style={s.rowTop}>
                <View style={[s.plantThumb, { backgroundColor: colors.surfaceAlt }]}>
                  {imageUri && !imageErrors[plant.id] ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={s.plantImage}
                      onError={() => setImageErrors((current) => ({ ...current, [plant.id]: true }))}
                    />
                  ) : (
                    <Text style={s.plantEmoji}>{crop?.emoji ?? status.emoji}</Text>
                  )}
                </View>

                <View style={s.rowInfo}>
                  <Text style={[s.plantName, { color: colors.text }]} numberOfLines={1}>
                    {plant.name}
                  </Text>
                  <Text style={[s.plantMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {[crop?.name, plant.variety].filter(Boolean).join(' · ') || plant.cropId}
                  </Text>
                  <View style={s.rowTags}>
                    <View style={[s.statusTag, { backgroundColor: status.color + '20' }]}>
                      <Text style={[s.statusTagText, { color: status.color }]}>
                        {status.emoji} {t(`plantStatus.${plant.status}`)}
                      </Text>
                    </View>
                    {plant.bedName ? (
                      <Text style={[s.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {plant.bedName}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
              </View>

              <View style={s.progressHeader}>
                <Text style={[s.progressLabel, { color: colors.textSecondary }]}>{t('plantsTab.progress')}</Text>
                <Text style={[s.progressValue, { color: colors.primary }]}>{progress}%</Text>
              </View>
              <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
              </View>
            </Card>
          );
        }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            <Card
              padded={false}
              style={{ ...s.overview, backgroundColor: colors.primary, borderColor: colors.primary }}
            >
              <View style={s.overviewCopy}>
                <Text style={s.overviewEyebrow}>{t('plantsTab.eyebrow')}</Text>
                <Text style={s.overviewTitle}>{t('plantsTab.title')}</Text>
                <Text style={s.overviewSub} numberOfLines={2}>
                  {garden?.name ?? t('home.defaultGardenName')}
                </Text>
              </View>
              <View style={[s.overviewCount, { backgroundColor: colors.accent }]}>
                <Text style={[s.overviewCountValue, { color: colors.primaryDark }]}>{plants.length}</Text>
                <Text style={[s.overviewCountLabel, { color: colors.primaryDark }]}>{t('plantsTab.countLabel')}</Text>
              </View>
            </Card>

            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantsTab.listTitle')}</Text>
              {allPlants.loading && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
          </>
        }
        ListEmptyComponent={
          !allPlants.loading ? (
            <EmptyState
              emoji="🌱"
              title={t('plantsTab.emptyTitle')}
              description={t('plantsTab.emptyDesc')}
              ctaLabel={t('plantsTab.add')}
              onCta={openAddPlant}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (
  colors: ReturnType<typeof useColors>,
  spacing: Record<string, number>,
  fontSize: Record<string, number>,
  fontWeight: Theme['fontWeight'],
  radii: Record<string, number>,
  shadows: Theme['shadows']
) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    brandLockup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    brandMark: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, letterSpacing: -0.4 },
    addButton: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
    },
    addButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: 118, gap: spacing.sm },
    overview: {
      minHeight: 116,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderRadius: radii.lg,
      ...shadows.sm,
    },
    overviewCopy: { flex: 1, paddingRight: spacing.md },
    overviewEyebrow: { color: 'rgba(255,255,255,0.78)', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginBottom: 2 },
    overviewTitle: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    overviewSub: { color: 'rgba(255,255,255,0.78)', fontSize: fontSize.sm, marginTop: 2 },
    overviewCount: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    overviewCountValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, lineHeight: 28 },
    overviewCountLabel: { fontSize: 10, fontWeight: fontWeight.semibold },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.xs },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    plantRow: { padding: spacing.md, gap: spacing.sm },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    plantThumb: { width: 58, height: 58, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    plantImage: { width: '100%', height: '100%' },
    plantEmoji: { fontSize: 31 },
    rowInfo: { flex: 1, minWidth: 0 },
    plantName: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    plantMeta: { fontSize: fontSize.xs, marginTop: 2 },
    rowTags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, minWidth: 0 },
    statusTag: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.sm },
    statusTagText: { fontSize: 10, fontWeight: fontWeight.semibold },
    locationText: { flex: 1, fontSize: 10 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressLabel: { fontSize: 10, fontWeight: fontWeight.medium },
    progressValue: { fontSize: 10, fontWeight: fontWeight.bold },
    progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
  });
