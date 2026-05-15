import { useColors, useTheme, Card, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { useReminders } from '@portfolio/notifications';
import { formatDate, formatRelative } from '@portfolio/shared';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CROPS_BY_ID } from '../../src/data/crops';
import { VARIETIES_BY_ID } from '../../src/data/varieties';
import { getCompanions, getIncompatible } from '../../src/data/companions';
import { PLANT_STATUS_CONFIG, type Plant, type PlantStatus } from '../../src/models/plant';
import { ENTRY_TYPE_CONFIG, type DiaryEntry } from '../../src/models/diary-entry';
import { REMINDER_TYPE_CONFIG, type GardenReminder } from '../../src/models/reminder';
import { getPestsForCrop, PEST_STATUS_CONFIG } from '../../src/data/pests';
import { usePro as usePurchases } from '../../src/hooks/usePro';

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
  const { isPro } = usePurchases();

  const plantEntryCount = useMemo(
    () => entries.items.filter((e) => e.plantId === id).length,
    [entries.items, id]
  );

  const plantEntries = useMemo(
    () =>
      [...entries.items]
        .filter((e) => e.plantId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [entries.items, id]
  );

  const photoEntries = useMemo(
    () =>
      [...entries.items]
        .filter((e) => e.plantId === id && e.photoUri)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [entries.items, id]
  );

  const harvestSummary = useMemo(() => {
    const harvests = entries.items.filter((e) => e.plantId === id && e.type === 'harvest');
    if (harvests.length === 0) return null;
    const kgEntries = harvests.filter((e) => (e.data as any)?.unit !== 'units' && (e.data as any)?.weight);
    const unitEntries = harvests.filter((e) => (e.data as any)?.unit === 'units' && (e.data as any)?.weight);
    const totalKg = kgEntries.reduce((s, e) => s + (parseFloat((e.data as any).weight) || 0), 0);
    const totalUnits = unitEntries.reduce((s, e) => s + (parseFloat((e.data as any).weight) || 0), 0);
    return { count: harvests.length, totalKg: totalKg > 0 ? totalKg : null, totalUnits: totalUnits > 0 ? totalUnits : null };
  }, [entries.items, id]);

  const plantReminders = useMemo(
    () => reminders.items.filter((r) => r.plantId === id),
    [reminders.items, id]
  );

  const treatmentCarencia = useMemo(() => {
    const treatments = entries.items
      .filter((e) => e.plantId === id && e.type === 'treatment' && (e.data as any)?.waitDays)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!treatments[0]) return null;
    const last = treatments[0];
    const waitDays = Number((last.data as any).waitDays);
    const treatDate = new Date(last.date + 'T12:00:00');
    const safeDate = new Date(treatDate.getTime() + waitDays * 86_400_000);
    const daysLeft = Math.ceil((safeDate.getTime() - Date.now()) / 86_400_000);
    return { product: (last.data as any)?.product as string | undefined, daysLeft };
  }, [entries.items, id]);

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

  const [showTransplantModal, setShowTransplantModal] = useState(false);
  const [transplantDateInput, setTransplantDateInput] = useState(
    () => new Date().toISOString().split('T')[0]
  );

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

  async function handleDuplicate() {
    const newPlant = await plants.create({
      gardenId: plant!.gardenId,
      cropId: plant!.cropId,
      name: plant!.name + ' 2',
      variety: plant!.variety,
      varietyId: plant!.varietyId,
      photoUri: plant!.photoUri,
      status: 'seedling',
    });
    router.replace(`/plant/${newPlant.id}` as any);
  }

  async function handleSuccessionSow() {
    const today = new Date().toISOString().split('T')[0];
    const batchNum = entries.items.filter((e) => e.plantId !== id && e.type === 'sowing').length + 2;
    const newPlant = await plants.create({
      gardenId: plant!.gardenId,
      cropId: plant!.cropId,
      name: `${plant!.name} (tanda ${batchNum})`,
      variety: plant!.variety,
      varietyId: plant!.varietyId,
      sowingDate: today,
      status: 'seedling',
      soilPh: plant!.soilPh,
      soilTexture: plant!.soilTexture,
      soilNotes: plant!.soilNotes,
      bedName: plant!.bedName,
      harvestGoalKg: plant!.harvestGoalKg,
    });
    await entries.create({
      gardenId: plant!.gardenId,
      plantId: newPlant.id,
      type: 'sowing',
      date: today,
      notes: t('plantDetail.successionNote', { original: plant!.name }),
    });
    router.push(`/plant/${newPlant.id}` as any);
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
              {(plant.varietyId || plant.variety) && (
                <Text style={[s.variety, { color: colors.textSecondary }]}>
                  {plant.varietyId
                    ? t('varieties.' + plant.varietyId, { defaultValue: VARIETIES_BY_ID[plant.varietyId]?.name ?? plant.variety })
                    : plant.variety}
                </Text>
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

          {/* Notes */}
          {plant.notes && (
            <View style={[s.notesCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={s.notesEmoji}>📝</Text>
              <Text style={[s.notesText, { color: colors.text }]}>{plant.notes}</Text>
            </View>
          )}

          {/* Dates */}
          {plant.sowingDate && (
            <View style={{ marginBottom: spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
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
              {(() => {
                const dth = plant.varietyId
                  ? VARIETIES_BY_ID[plant.varietyId]?.daysToHarvest
                  : crop.daysToHarvest;
                if (!dth) return null;
                const sow = new Date(plant.sowingDate);
                const midDays = Math.round((dth[0] + dth[1]) / 2);
                const harvestDate = new Date(sow.getTime() + midDays * 86_400_000);
                const today = new Date();
                if (harvestDate < today) return null;
                const dateStr = harvestDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                return (
                  <View style={[s.harvestChip, { backgroundColor: '#FF7043' + '18' }]}>
                    <Text style={[s.daysChipText, { color: '#FF7043' }]}>
                      {t('plantDetail.estimatedHarvest', { date: dateStr })}
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* Stage journey timeline */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.statusSection')}</Text>
          {(() => {
            const currentIdx = ALL_STATUSES.indexOf(plant.status);
            function fmtMilestone(dateStr: string): string {
              const d = new Date(dateStr + 'T12:00:00');
              return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
            }
            const MILESTONE_DATE: Partial<Record<PlantStatus, string | undefined>> = {
              seedling: plant.sowingDate,
              transplanted: plant.transplantDate,
              harvesting: plant.firstHarvestDate,
            };
            return (
              <View style={{ marginBottom: spacing.xl }}>
                <View style={s.journeyDotsRow}>
                  {ALL_STATUSES.map((status, idx) => {
                    const cfg = PLANT_STATUS_CONFIG[status];
                    const isActive = idx === currentIdx;
                    const isPast = idx < currentIdx;
                    return (
                      <React.Fragment key={status}>
                        <Pressable
                          onPress={() => handleStatusChange(status)}
                          style={s.journeyDotWrap}
                          hitSlop={8}
                        >
                          <View
                            style={[
                              s.journeyDot,
                              {
                                backgroundColor: isActive
                                  ? cfg.color
                                  : isPast
                                  ? cfg.color + '66'
                                  : colors.surfaceAlt,
                                borderColor: isActive
                                  ? cfg.color
                                  : isPast
                                  ? cfg.color
                                  : colors.border,
                                transform: [{ scale: isActive ? 1.25 : 1 }],
                              },
                            ]}
                          >
                            <Text style={{ fontSize: 11 }}>{cfg.emoji}</Text>
                          </View>
                        </Pressable>
                        {idx < ALL_STATUSES.length - 1 && (
                          <View
                            style={[
                              s.journeyLine,
                              {
                                backgroundColor: isPast
                                  ? colors.primary + '55'
                                  : colors.border,
                              },
                            ]}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
                <View style={s.journeyLabelsRow}>
                  {ALL_STATUSES.map((status, idx) => {
                    const cfg = PLANT_STATUS_CONFIG[status];
                    const isActive = idx === currentIdx;
                    const raw = MILESTONE_DATE[status as keyof typeof MILESTONE_DATE];
                    const label = raw
                      ? fmtMilestone(raw)
                      : isActive
                      ? t('plantStatus.' + status)
                      : null;
                    return (
                      <React.Fragment key={status}>
                        <View style={s.journeyLabelCell}>
                          {label ? (
                            <Text
                              style={[
                                s.journeyLabelText,
                                { color: raw ? colors.textSecondary : cfg.color },
                              ]}
                              numberOfLines={1}
                            >
                              {label}
                            </Text>
                          ) : null}
                        </View>
                        {idx < ALL_STATUSES.length - 1 && <View style={{ flex: 1 }} />}
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          {/* Transplant CTA — show when still in seedling phase */}
          {plant.status === 'seedling' && plant.sowingDate && (() => {
            const daysSinceSowing = Math.floor(
              (Date.now() - new Date(plant.sowingDate + 'T12:00:00').getTime()) / 86_400_000
            );
            if (daysSinceSowing < 7) return null;
            return (
              <Pressable
                onPress={() => setShowTransplantModal(true)}
                style={[s.transplantCta, { backgroundColor: '#4CAF5015', borderColor: '#4CAF50' }]}
              >
                <Text style={{ fontSize: 24 }}>🪴</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.transplantCtaTitle, { color: '#2E7D32' }]}>
                    {t('plantDetail.transplantCta')}
                  </Text>
                  <Text style={[s.transplantCtaDesc, { color: colors.textSecondary }]}>
                    {t('plantDetail.transplantCtaDesc', { days: daysSinceSowing })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
              </Pressable>
            );
          })()}

          {/* Soil info */}
          {(plant.soilPh || plant.soilTexture || plant.soilNotes || plant.bedName) && (
            <Card padded style={[s.infoCard, { marginBottom: spacing.lg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <Text style={{ fontSize: 16 }}>🌍</Text>
                <Text style={[s.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>{t('plantDetail.soilSection')}</Text>
              </View>
              <View style={s.infoGrid}>
                {plant.soilPh ? <InfoItem label={t('plantDetail.soilPh')} value={`pH ${plant.soilPh}`} /> : null}
                {plant.soilTexture ? <InfoItem label={t('plantDetail.soilTexture')} value={t('soilTexture.' + plant.soilTexture)} /> : null}
                {plant.bedName ? <InfoItem label={t('plantDetail.bedName')} value={plant.bedName} /> : null}
              </View>
              {plant.soilNotes ? (
                <View style={[s.tipBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[s.tipText, { color: colors.textSecondary }]}>📝 {plant.soilNotes}</Text>
                </View>
              ) : null}
              {plant.bedName && (
                <Pressable onPress={() => router.push('/rotation' as any)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}>
                  <Ionicons name="refresh-circle-outline" size={14} color={colors.primary} />
                  <Text style={{ fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium }}>
                    {t('rotation.title')}
                  </Text>
                </Pressable>
              )}
            </Card>
          )}

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

          {/* Treatment carencia banner */}
          {treatmentCarencia && (
            <View style={[s.harvestSummaryCard, {
              backgroundColor: treatmentCarencia.daysLeft > 0 ? '#EF535018' : '#4CAF5018',
              borderColor: treatmentCarencia.daysLeft > 0 ? '#EF5350' : '#4CAF50',
            }]}>
              <Text style={{ fontSize: 22 }}>🧴</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.harvestSummaryTitle, { color: treatmentCarencia.daysLeft > 0 ? '#EF5350' : '#4CAF50' }]}>
                  {treatmentCarencia.daysLeft > 0
                    ? t('plantDetail.treatmentActive')
                    : t('plantDetail.treatmentSafeToday')}
                </Text>
                <Text style={[s.harvestSummaryValue, { color: colors.textSecondary }]}>
                  {treatmentCarencia.product ? `${treatmentCarencia.product} · ` : ''}
                  {treatmentCarencia.daysLeft > 0
                    ? t('plantDetail.treatmentSafeIn', { days: treatmentCarencia.daysLeft })
                    : '✓'}
                </Text>
              </View>
            </View>
          )}

          {/* Harvest summary + goal progress */}
          {harvestSummary && (
            <View style={[s.harvestSummaryCard, { backgroundColor: '#FF704318', borderColor: '#FF7043' }]}>
              <Text style={{ fontSize: 22 }}>🧺</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.harvestSummaryTitle, { color: '#FF7043' }]}>
                  {t('plantDetail.harvestSummary', { count: harvestSummary.count })}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: 2 }}>
                  {harvestSummary.totalKg !== null && (
                    <Text style={[s.harvestSummaryValue, { color: colors.text }]}>
                      ⚖️ {harvestSummary.totalKg.toFixed(2)} kg
                    </Text>
                  )}
                  {harvestSummary.totalUnits !== null && (
                    <Text style={[s.harvestSummaryValue, { color: colors.text }]}>
                      🔢 {Math.round(harvestSummary.totalUnits)} {t('plantDetail.units')}
                    </Text>
                  )}
                </View>
                {plant?.harvestGoalKg && harvestSummary.totalKg !== null && (
                  <View style={{ marginTop: spacing.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={[s.harvestSummaryValue, { color: colors.textSecondary }]}>
                        {t('plantDetail.goalProgress')}
                      </Text>
                      <Text style={[s.harvestSummaryValue, { color: harvestSummary.totalKg >= plant.harvestGoalKg ? '#4CAF50' : '#FF7043' }]}>
                        {harvestSummary.totalKg.toFixed(1)} / {plant.harvestGoalKg} kg
                        {harvestSummary.totalKg >= plant.harvestGoalKg ? ' 🎉' : ''}
                      </Text>
                    </View>
                    <View style={[s.goalBarTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          s.goalBarFill,
                          {
                            width: `${Math.min((harvestSummary.totalKg / plant.harvestGoalKg) * 100, 100)}%` as any,
                            backgroundColor: harvestSummary.totalKg >= plant.harvestGoalKg ? '#4CAF50' : '#FF7043',
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Photo progress timeline */}
          {photoEntries.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text }]}>{t('plantDetail.photoTimeline')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {photoEntries.map((entry) => (
                    <View key={entry.id} style={s.photoTimelineItem}>
                      <Image source={{ uri: entry.photoUri! }} style={s.photoTimelineImg} />
                      <Text style={[s.photoTimelineDate, { color: colors.textSecondary }]}>
                        {new Date(entry.date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Diary entries */}
          <View style={s.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[s.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>
                {t('plantDetail.diary')}{plantEntryCount > 0 ? ` (${plantEntryCount})` : ''}
              </Text>
              {plantEntries[0] && (() => {
                const days = Math.floor((Date.now() - new Date(plantEntries[0].date + 'T12:00:00').getTime()) / 86_400_000);
                if (days < 1) return null;
                return (
                  <View style={[s.daysChip, { backgroundColor: days > 14 ? '#EF535018' : colors.primary + '12' }]}>
                    <Text style={[s.daysChipText, { color: days > 14 ? '#EF5350' : colors.primary }]}>
                      {days}d
                    </Text>
                  </View>
                );
              })()}
            </View>
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
          <View style={[s.sectionHeaderRow, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>{t('plantDetail.pestSection')}</Text>
            <Pressable
              onPress={() => router.push('/disease-guide' as any)}
              hitSlop={8}
            >
              <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                {t('plantDetail.diseaseGuideBtn')}
              </Text>
            </Pressable>
          </View>

          {/* AI identify button */}
          <Pressable
            onPress={() =>
              isPro
                ? router.push(`/plant/identify?plantId=${id}&cropId=${crop.id}` as any)
                : router.push('/paywall')
            }
            style={[s.identifyBtn, { backgroundColor: '#FF703415', borderColor: '#FF7034' }]}
          >
            <Text style={{ fontSize: 22 }}>📸</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.identifyBtnTitle, { color: '#E55A1B' }]}>{t('identify.title')}</Text>
              <Text style={[s.identifyBtnSub, { color: colors.textSecondary }]}>
                {isPro ? t('identify.subtitle') : t('identify.proOnly')}
              </Text>
            </View>
            {!isPro && (
              <View style={[s.proBadge, { backgroundColor: colors.primary }]}>
                <Text style={s.proBadgeText}>PRO</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </Pressable>

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
                      {t('pestStatus.' + status)}
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

          {/* Succession sowing */}
          <Pressable onPress={handleSuccessionSow} style={[s.duplicateBtn, { backgroundColor: '#4CAF5012', borderColor: '#4CAF5044', borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
            <Text style={{ fontSize: 16 }}>🌱</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.duplicateText, { color: '#4CAF50' }]}>{t('plantDetail.successionSow')}</Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{t('plantDetail.successionSowDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
          </Pressable>

          {/* Duplicate */}
          <Pressable onPress={handleDuplicate} style={s.duplicateBtn}>
            <Ionicons name="copy-outline" size={16} color={colors.primary} />
            <Text style={[s.duplicateText, { color: colors.primary }]}>{t('plantDetail.duplicate')}</Text>
          </Pressable>

          {/* Delete */}
          <Pressable onPress={handleDelete} style={s.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[s.deleteText, { color: colors.error }]}>{t('plantDetail.deletePlant')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Transplant modal */}
      <Modal visible={showTransplantModal} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setShowTransplantModal(false)}>
          <Pressable style={[s.transplantModal, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[s.transplantModalTitle, { color: colors.text }]}>
              {t('plantDetail.transplantModalTitle')}
            </Text>
            <Text style={[s.sectionTitle, { color: colors.textSecondary, fontSize: fontSize.xs, letterSpacing: 0.8 }]}>
              {t('plantDetail.transplantDateLabel')}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
              {([0, 1] as const).map((days) => {
                const d = new Date();
                d.setDate(d.getDate() - days);
                const dateStr = d.toISOString().split('T')[0];
                const active = transplantDateInput === dateStr;
                const label = days === 0 ? t('entryNew.today') : t('entryNew.yesterday');
                return (
                  <Pressable
                    key={days}
                    onPress={() => setTransplantDateInput(dateStr)}
                    style={[
                      s.modalDateBtn,
                      {
                        backgroundColor: active ? '#4CAF5022' : colors.surfaceAlt,
                        borderColor: active ? '#4CAF50' : colors.border,
                      },
                    ]}
                  >
                    <Text style={[s.modalDateBtnText, { color: active ? '#2E7D32' : colors.textSecondary }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={transplantDateInput}
              onChangeText={setTransplantDateInput}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.textDisabled}
              style={[s.transplantInput, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
              <Pressable
                onPress={() => setShowTransplantModal(false)}
                style={[s.modalCancelBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[{ color: colors.textSecondary, fontWeight: fontWeight.medium }]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await plants.update(id, { status: 'transplanted', transplantDate: transplantDateInput });
                  await entries.create({
                    gardenId: plant!.gardenId,
                    plantId: id,
                    type: 'transplant',
                    date: transplantDateInput,
                  });
                  setShowTransplantModal(false);
                }}
                style={[s.modalConfirmBtn, { backgroundColor: '#4CAF50' }]}
              >
                <Text style={[{ color: '#fff', fontWeight: fontWeight.semibold }]}>
                  {t('plantDetail.transplantConfirm')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    harvestChip: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      marginTop: spacing.xs,
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
    journeyDotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    journeyDotWrap: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    journeyDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    journeyLine: {
      flex: 1,
      height: 2,
    },
    journeyLabelsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 5,
    },
    journeyLabelCell: {
      width: 28,
      alignItems: 'center',
      overflow: 'visible',
    },
    journeyLabelText: {
      fontSize: 8,
      textAlign: 'center',
      fontWeight: '600',
    },
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
    identifyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      marginBottom: spacing.md,
    },
    identifyBtnTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    identifyBtnSub: { fontSize: fontSize.xs, marginTop: 2 },
    proBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    proBadgeText: { fontSize: 10, fontWeight: fontWeight.bold, color: '#fff' },
    photoTimelineItem: { alignItems: 'center', gap: 4 },
    photoTimelineImg: { width: 80, height: 80, borderRadius: radii.md },
    photoTimelineDate: { fontSize: 10, fontWeight: fontWeight.medium },
    harvestSummaryCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      marginBottom: spacing.sm,
    },
    harvestSummaryTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    harvestSummaryValue: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    goalBarTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    goalBarFill: {
      height: 6,
      borderRadius: 3,
    },
    transplantCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      marginBottom: spacing.md,
    },
    transplantCtaTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    transplantCtaDesc: { fontSize: fontSize.xs, marginTop: 2 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    transplantModal: {
      borderTopLeftRadius: radii.xl ?? 20,
      borderTopRightRadius: radii.xl ?? 20,
      padding: spacing.xl,
      paddingBottom: spacing['2xl'],
      gap: spacing.md,
    },
    transplantModalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
    transplantInput: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      padding: spacing.md,
      fontSize: fontSize.md,
    },
    modalDateBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
    },
    modalDateBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    modalCancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
    },
    modalConfirmBtn: {
      flex: 2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
    },
    notesCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    notesEmoji: { fontSize: 16, marginTop: 1 },
    notesText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
    duplicateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.sm,
      padding: spacing.md,
    },
    duplicateText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  });
