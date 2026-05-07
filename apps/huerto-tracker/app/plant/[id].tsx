import { useColors, useTheme, Card, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useReminders } from '@portfolio/notifications';
import { formatDate, formatRelative } from '@portfolio/shared';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID, CATEGORY_CONFIG } from '../../src/data/crops';
import { getCompanions, getIncompatible } from '../../src/data/companions';
import { PLANT_STATUS_CONFIG, type Plant, type PlantStatus } from '../../src/models/plant';
import { ENTRY_TYPE_CONFIG, type DiaryEntry } from '../../src/models/diary-entry';
import { REMINDER_TYPE_CONFIG, type GardenReminder } from '../../src/models/reminder';
import { getPestsForCrop, PEST_STATUS_CONFIG } from '../../src/data/pests';

const ALL_STATUSES: PlantStatus[] = [
  'seedling', 'transplanted', 'growing', 'flowering', 'fruiting', 'harvesting', 'finished',
];

// Sun/water labels are now derived from t() inside the component

export default function PlantDetailScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const plants = useCollection<Plant>('plants');
  const entries = useCollection<DiaryEntry>('diary_entries');
  const reminders = useReminders<GardenReminder>('reminders');

  const plant = plants.getById(id);
  const crop = plant ? CROPS_BY_ID[plant.cropId] : null;
  const statusConfig = plant ? PLANT_STATUS_CONFIG[plant.status] : null;
  const companions = crop ? getCompanions(crop.id) : [];
  const incompatibles = crop ? getIncompatible(crop.id) : [];
  const pestInfo = crop ? getPestsForCrop(crop.id) : [];
  const currentPestStatus = plant?.pestStatus ?? 'none';

  const plantEntries = useMemo(
    () =>
      [...entries.items]
        .filter((e) => e.plantId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [entries.items, id]
  );

  const plantReminders = useMemo(
    () => reminders.items.filter((r) => r.plantId === id),
    [reminders.items, id]
  );

  const { t } = useTranslation();

  const SUN_LABEL: Record<string, string> = {
    full: `☀️ ${t('plantDetail.sunFull')}`,
    partial: `⛅ ${t('plantDetail.sunPartial')}`,
    shade: `🌑 ${t('plantDetail.sunShade')}`,
  };
  const WATER_LABEL: Record<string, string> = {
    high: `💧💧💧 ${t('plantDetail.waterHigh')}`,
    medium: `💧💧 ${t('plantDetail.waterMedium')}`,
    low: `💧 ${t('plantDetail.waterLow')}`,
  };

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  if (!plant || !crop) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.notFound, { color: colors.textSecondary }]}>{t('plantDetail.notFound')}</Text>
      </SafeAreaView>
    );
  }

  async function handleStatusChange(status: PlantStatus) {
    await plants.update(id, { status });
  }

  function handleDelete() {
    Alert.alert(
      t('plantDetail.deleteTitle', { name: plant!.name }),
      t('plantDetail.deleteDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await plants.remove(id);
            // Remove related entries and reminders
            const relatedEntries = entries.items.filter((e) => e.plantId === id);
            const relatedReminders = reminders.items.filter((r) => r.plantId === id);
            await Promise.all([
              ...relatedEntries.map((e) => entries.remove(e.id)),
              ...relatedReminders.map((r) => reminders.remove(r.id)),
            ]);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: colors.surfaceAlt }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          {plant.photoUri ? (
            <Image source={{ uri: plant.photoUri }} style={s.heroPhoto} />
          ) : (
            <Text style={s.heroEmoji}>{crop.emoji}</Text>
          )}
          <Pressable
            onPress={() => router.push(`/plant/edit?id=${id}`)}
            style={s.editBtn}
          >
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={s.body}>
          {/* Title + badge */}
          <View style={s.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.plantName, { color: colors.text }]}>{plant.name}</Text>
              {plant.variety && (
                <Text style={[s.variety, { color: colors.textSecondary }]}>{plant.variety}</Text>
              )}
            </View>
            {statusConfig && (
              <View style={[s.statusBadge, { backgroundColor: statusConfig.color + '22' }]}>
                <Text style={[s.statusText, { color: statusConfig.color }]}>
                  {statusConfig.emoji} {t('plantStatus.' + plant.status)}
                </Text>
              </View>
            )}
          </View>

          {/* Dates */}
          {plant.sowingDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
              <Text style={[s.dateText, { color: colors.textSecondary, marginBottom: 0 }]}>
                {t('plantDetail.sownOn', { date: formatDate(plant.sowingDate) })}
              </Text>
              {(() => {
                const days = Math.floor((Date.now() - new Date(plant.sowingDate).getTime()) / 86_400_000);
                if (days < 1) return null;
                return (
                  <View style={[s.daysChip, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[s.daysChipText, { color: colors.primary }]}>
                      {t('plantDetail.daysGrowing', { count: days })}
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* Status selector */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.statusSection')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
            <View style={s.statusRow}>
              {ALL_STATUSES.map((status) => {
                const cfg = PLANT_STATUS_CONFIG[status];
                const active = plant.status === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => handleStatusChange(status)}
                    style={[
                      s.statusChip,
                      {
                        backgroundColor: active ? cfg.color : colors.surface,
                        borderColor: active ? cfg.color : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                    <Text style={[s.statusChipLabel, { color: active ? '#fff' : colors.textSecondary }]}>
                      {t('plantStatus.' + status)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Crop info */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.cropInfo')}</Text>
          <Card padded style={s.infoCard}>
            <View style={s.infoGrid}>
              <InfoItem label={t('plantDetail.harvest')} value={t('plantDetail.harvestDays', { min: crop.daysToHarvest[0], max: crop.daysToHarvest[1] })} />
              <InfoItem label={t('plantDetail.light')} value={SUN_LABEL[crop.sunNeeds]} />
              <InfoItem label={t('plantDetail.water')} value={WATER_LABEL[crop.waterNeeds]} />
              <InfoItem label={t('plantDetail.spacing')} value={`${crop.spacing} cm`} />
            </View>
            <View style={[s.tipBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[s.tipText, { color: colors.textSecondary }]}>💡 {t('crops.' + crop.id + '.tips')}</Text>
            </View>
          </Card>

          {/* Companions */}
          {companions.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.goodNeighbors')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {companions.map((c) => (
                    <View key={c.id} style={[s.companionChip, { backgroundColor: '#4CAF5022', borderColor: '#4CAF50' }]}>
                      <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
                      <Text style={[s.companionName, { color: colors.text }]}>{c.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {incompatibles.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>{t('plantDetail.badNeighbors')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {incompatibles.map((c) => (
                    <View key={c.id} style={[s.companionChip, { backgroundColor: '#EF535022', borderColor: '#EF5350' }]}>
                      <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
                      <Text style={[s.companionName, { color: colors.text }]}>{c.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Reminders */}
          {plantReminders.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.reminders')}</Text>
              {plantReminders.map((r) => {
                const rc = REMINDER_TYPE_CONFIG[r.type];
                const hour = String(r.time.hour).padStart(2, '0');
                const min = String(r.time.minute).padStart(2, '0');
                return (
                  <Card key={r.id} padded style={{ marginBottom: spacing.sm }}>
                    <View style={s.reminderRow}>
                      <Text style={{ fontSize: 22 }}>{rc.emoji}</Text>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                          {r.title}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                          {t('reminderType.' + r.type)} · {t('reminderFrequency.' + r.frequency)} · {hour}:{min}
                        </Text>
                      </View>
                      <View style={[s.enabledBadge, { backgroundColor: r.enabled ? '#4CAF5022' : colors.surfaceAlt }]}>
                        <Text style={{ fontSize: 12, color: r.enabled ? '#4CAF50' : colors.textDisabled }}>
                          {r.enabled ? t('plantDetail.active') : t('plantDetail.paused')}
                        </Text>
                      </View>
                      <Switch
                        value={r.enabled}
                        onValueChange={(val) => reminders.update(r.id, { enabled: val })}
                        trackColor={{ true: colors.primary }}
                        style={{ marginLeft: 4 }}
                      />
                      <Pressable
                        onPress={() => router.push(`/reminder/edit?id=${r.id}`)}
                        hitSlop={8}
                        style={{ padding: 4, marginLeft: 4 }}
                      >
                        <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </>
          )}

          {/* Diary entries */}
          <View style={s.sectionHeaderRow}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.diary')}</Text>
            {plantEntries.length > 0 && (
              <Pressable onPress={() => router.push(`/(tabs)/diary?plantId=${id}` as any)}>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm }}>{t('common.viewAll')}</Text>
              </Pressable>
            )}
          </View>

          {plantEntries.length > 0 ? (
            plantEntries.map((entry) => {
              const cfg = ENTRY_TYPE_CONFIG[entry.type];
              return (
                <Card key={entry.id} padded style={{ marginBottom: spacing.sm }}>
                  <View style={s.entryRow}>
                    <View style={[s.entryIcon, { backgroundColor: cfg.color + '22' }]}>
                      <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                        {t('diary.filters.' + entry.type)}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                        {formatRelative(entry.date)}
                      </Text>
                      {entry.notes ? (
                        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }} numberOfLines={2}>
                          {entry.notes}
                        </Text>
                      ) : null}
                    </View>
                    {entry.photoUri ? (
                      <Image source={{ uri: entry.photoUri }} style={s.entryThumb} />
                    ) : null}
                  </View>
                </Card>
              );
            })
          ) : (
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              {t('plantDetail.noEntries')}
            </Text>
          )}

          {/* Pest tracker section */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.pestSection')}</Text>
          <Card padded style={{ gap: spacing.md }}>
            {/* Status selector */}
            <View style={s.pestStatusRow}>
              {(['none', 'active', 'treated'] as const).map((status) => {
                const cfg = PEST_STATUS_CONFIG[status];
                const isActive = currentPestStatus === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => plants.update(id, { pestStatus: status })}
                    style={[
                      s.pestStatusChip,
                      {
                        backgroundColor: isActive ? cfg.color + '22' : colors.surfaceAlt,
                        borderColor: isActive ? cfg.color : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>{cfg.emoji}</Text>
                    <Text style={[s.pestStatusLabel, { color: isActive ? cfg.color : colors.textSecondary }]}>
                      {cfg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Pest reference for this crop */}
            {currentPestStatus !== 'none' && pestInfo.length > 0 && (
              <>
                <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }]} />
                <Text style={[{ fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semibold }]}>
                  {t('plantDetail.commonPests', { crop: t('crops.' + crop?.id + '.name').toUpperCase() })}
                </Text>
                {pestInfo.slice(0, 3).map((pest) => (
                  <View key={pest.id} style={[s.pestCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <View style={s.pestCardHeader}>
                      <Text style={s.pestEmoji}>{pest.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.pestName, { color: colors.text }]}>{pest.name}</Text>
                        <Text style={[s.pestSymptoms, { color: colors.textSecondary }]} numberOfLines={2}>
                          {pest.symptoms}
                        </Text>
                      </View>
                    </View>
                    <View style={s.treatmentList}>
                      {pest.treatments.slice(0, 2).map((t, i) => (
                        <View key={i} style={[s.treatmentRow, { borderTopColor: colors.border }]}>
                          <View style={[s.treatmentTypeBadge, {
                            backgroundColor:
                              t.type === 'organico' ? '#4CAF5022' :
                              t.type === 'preventivo' ? '#2196F322' : '#FF572222',
                          }]}>
                            <Text style={[s.treatmentType, {
                              color: t.type === 'organico' ? '#2E7D32' :
                                     t.type === 'preventivo' ? '#1565C0' : '#C62828',
                            }]}>
                              {t.type}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.treatmentName, { color: colors.text }]}>{t.name}</Text>
                            <Text style={[s.treatmentInstructions, { color: colors.textSecondary }]} numberOfLines={2}>
                              {t.instructions}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </>
            )}
          </Card>

          {/* Action buttons */}
          <View style={s.actions}>
            <Button
              title={t('plantDetail.newEntry')}
              variant="secondary"
              size="md"
              onPress={() => router.push(`/entry/new?plantId=${id}`)}
              style={{ flex: 1 }}
            />
            <Button
              title={t('plantDetail.reminder')}
              variant="outline"
              size="md"
              onPress={() => router.push(`/reminder/new?plantId=${id}`)}
              style={{ flex: 1 }}
            />
          </View>

          {/* Delete */}
          <Pressable onPress={handleDelete} style={s.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[s.deleteText, { color: colors.error }]}>{t('plantDetail.deletePlant')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  const { fontSize, fontWeight } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: '45%', marginBottom: 10 }}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: 2 }}>
        {value}
      </Text>
    </View>
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
    hero: {
      height: 220,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroPhoto: { width: '100%', height: 220, resizeMode: 'cover' },
    heroEmoji: { fontSize: 80 },
    backBtn: {
      position: 'absolute',
      top: spacing.lg,
      left: spacing.lg,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editBtn: {
      position: 'absolute',
      top: spacing.lg,
      right: spacing.lg,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { padding: spacing.xl },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
    plantName: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
    variety: { fontSize: fontSize.sm, marginTop: 2 },
    statusBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radii.full,
      alignSelf: 'flex-start',
    },
    statusText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    dateText: { fontSize: fontSize.sm },
    daysChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    daysChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    statusRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
      gap: 5,
    },
    statusChipLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    infoCard: {},
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    tipBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    tipText: { fontSize: fontSize.sm, lineHeight: 20 },
    companionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1,
      gap: 6,
    },
    companionName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    reminderRow: { flexDirection: 'row', alignItems: 'center' },
    enabledBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
    entryRow: { flexDirection: 'row', alignItems: 'flex-start' },
    entryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    entryThumb: { width: 44, height: 44, borderRadius: radii.sm },
    emptyText: { fontSize: fontSize.sm, textAlign: 'center', marginVertical: spacing.md },
    actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.xl,
      padding: spacing.md,
    },
    deleteText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    notFound: { textAlign: 'center', marginTop: 80, fontSize: fontSize.lg },
    pestStatusRow: { flexDirection: 'row', gap: spacing.sm },
    pestStatusChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 2,
    },
    pestStatusLabel: { fontSize: 10, fontWeight: fontWeight.semibold, textAlign: 'center' },
    pestCard: {
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.md,
      gap: spacing.sm,
    },
    pestCardHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    pestEmoji: { fontSize: 24, marginTop: 2 },
    pestName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    pestSymptoms: { fontSize: fontSize.xs, lineHeight: 16, marginTop: 2 },
    treatmentList: { gap: spacing.sm },
    treatmentRow: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      alignItems: 'flex-start',
    },
    treatmentTypeBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radii.sm,
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    treatmentType: { fontSize: 9, fontWeight: fontWeight.bold, textTransform: 'uppercase' },
    treatmentName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    treatmentInstructions: { fontSize: fontSize.xs, lineHeight: 16, marginTop: 2 },
  });
