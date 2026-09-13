import { useColors, useTheme, Button, ScreenHeader, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { usePro as usePurchases } from '../../src/hooks/usePro';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { useCustomCrops } from '../../src/hooks/useCustomCrops';
import { useGardenLayout } from '../../src/hooks/useGardenLayout';
import { CROPS_BY_ID } from '../../src/data/crops';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { PROVINCE_ZONES, CLIMATE_ZONE_CONFIG } from '../../src/data/zones';
import type { ClimateZone, Garden, GardenType, Hemisphere } from '../../src/models/garden';
import type { Plant } from '../../src/models/plant';
import { GARDEN_TYPE_CONFIG } from '../../src/models/garden';
import { GRID_PRESETS, DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS } from '../../src/hooks/useGardenLayout';
import { getNearestProvince } from '../../src/utils/weather';

const ALL_PROVINCES = Object.keys(PROVINCE_ZONES).sort();

const GARDEN_COLORS = [
  '#7A8C6E', // verde salvia
  '#8B5A2B', // tierra marrón
  '#5B7E6E', // verde bosque
  '#6B8CA6', // azul pizarra
  '#9B7651', // terracota
  '#7A6B8A', // lavanda
  '#8A7A5A', // arena
  '#4E7A4E', // verde oscuro
];

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

export default function GardenEditScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const gardens = useCollection<Garden>('gardens');
  const { activeGarden } = useActiveGarden();
  const { isPro } = usePurchases();
  const { customCropsById } = useCustomCrops();

  const [selectedGardenId, setSelectedGardenId] = useState<string | null>(null);
  const [showGardenPicker, setShowGardenPicker] = useState(false);

  const garden = gardens.items.find((g) => g.id === (selectedGardenId ?? activeGarden?.id)) ?? activeGarden;

  const [name, setName] = useState(garden?.name ?? '');
  const [province, setProvince] = useState(garden?.province ?? '');
  const [gardenType, setGardenType] = useState<GardenType>(garden?.gardenType ?? 'huerto');
  const [gridRows, setGridRows] = useState(garden?.gridRows ?? DEFAULT_GRID_ROWS);
  const [gridCols, setGridCols] = useState(garden?.gridCols ?? DEFAULT_GRID_COLS);
  const [hemisphere, setHemisphere] = useState<Hemisphere>(garden?.hemisphere ?? 'norte');
  const [color, setColor] = useState<string | undefined>(garden?.color);
  const [notes, setNotes] = useState(garden?.notes ?? '');
  const [provinceSearch, setProvinceSearch] = useState('');
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const { t } = useTranslation();
  const plants = useCollection<Plant>('plants');
  const { layout: planLayout } = useGardenLayout(garden?.id, gridRows, gridCols);
  const activeGardenSelected = garden?.id === activeGarden?.id;
  const placedPlanCount = planLayout.filter(Boolean).length;

  // Reset form fields whenever the selected garden changes
  useEffect(() => {
    if (!garden) return;
    setName(garden.name ?? '');
    setProvince(garden.province ?? '');
    setGardenType(garden.gardenType ?? 'huerto');
    setGridRows(garden.gridRows ?? DEFAULT_GRID_ROWS);
    setGridCols(garden.gridCols ?? DEFAULT_GRID_COLS);
    setHemisphere(garden.hemisphere ?? 'norte');
    setColor(garden.color);
    setNotes(garden.notes ?? '');
  }, [garden?.id]);

  async function detectLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      // The calendar needs this for southern-hemisphere seasons, but it
      // should never be a setup decision for the user.
      setHemisphere(pos.coords.latitude >= 0 ? 'norte' : 'sur');
      const nearest = getNearestProvince(pos.coords.latitude, pos.coords.longitude);
      if (nearest) {
        setProvince(nearest);
      }
    } catch {
      // silent — user can pick manually
    } finally {
      setLocating(false);
    }
  }

  const climateZone: ClimateZone | null = province ? (PROVINCE_ZONES[province] ?? null) : null;
  const zoneConfig = climateZone ? CLIMATE_ZONE_CONFIG[climateZone] : null;

  const filteredProvinces = useMemo(
    () =>
      ALL_PROVINCES.filter((p) =>
        p.toLowerCase().includes(provinceSearch.toLowerCase())
      ),
    [provinceSearch]
  );

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  async function handleSave(openMap = false) {
    if (!name.trim()) {
      Alert.alert(t('gardenEdit.nameRequired'), t('gardenEdit.nameRequiredDesc'));
      return;
    }
    if (!province) {
      Alert.alert(t('gardenEdit.provinceRequired'), t('gardenEdit.provinceRequiredDesc'));
      return;
    }
    if (!garden) return;

    setSaving(true);
    try {
      await gardens.update(garden.id, {
        name: name.trim(),
        province,
        climateZone: PROVINCE_ZONES[province],
        gardenType,
        gridRows,
        gridCols,
        hemisphere,
        color,
        notes: notes.trim(),
      });
      if (openMap) router.push('/garden/map' as any);
      else router.back();
    } finally {
      setSaving(false);
    }
  }

  if (!garden) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.textSecondary, textAlign: 'center', marginTop: 80 }]}>
          {t('gardenEdit.noGarden')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <ScreenHeader title={t('gardenEdit.title')} onBack={() => router.back()} />

      {/* Garden selector — only show when multiple gardens exist */}
      {gardens.items.length > 1 && (
        <Pressable
          onPress={() => setShowGardenPicker(true)}
          style={[s.gardenSelector, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
        >
          <Text style={{ fontSize: 20 }}>{GARDEN_TYPE_CONFIG[garden?.gardenType ?? 'huerto'].emoji}</Text>
          <Text style={[s.gardenSelectorName, { color: colors.text }]} numberOfLines={1}>
            {garden?.name ?? t('gardenEdit.noGarden')}
          </Text>
          <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} />
        </Pressable>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.body}
      >
        {/* Name */}
        <Text style={[s.label, { color: colors.textSecondary }]}>{t('gardenEdit.nameLabel')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[
            s.input,
            { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, fontSize: fontSize.md },
          ]}
          placeholder={t('gardenEdit.namePlaceholder')}
          placeholderTextColor={colors.textDisabled}
          returnKeyType="done"
          maxLength={40}
        />

        {/* Garden type */}
        <Text style={[s.label, { color: colors.textSecondary }]}>{t('gardenEdit.typeLabel')}</Text>
        <View style={s.typeRow}>
          {(Object.entries(GARDEN_TYPE_CONFIG) as [GardenType, typeof GARDEN_TYPE_CONFIG[GardenType]][]).map(([key, cfg]) => {
            const active = gardenType === key;
            return (
              <Pressable
                key={key}
                onPress={() => setGardenType(key)}
                style={[
                  s.typeBtn,
                  {
                    backgroundColor: active ? colors.primary + '22' : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    flex: 1,
                  },
                ]}
              >
                <Text style={s.typeEmoji}>{cfg.emoji}</Text>
                <Text style={[s.typeLabel, { color: active ? colors.primary : colors.textSecondary }]}>
                  {t('gardenType.' + key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {gardenType !== 'huerto' && (
          <View style={[s.typeTip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[s.typeTipText, { color: colors.textSecondary }]}>
              {GARDEN_TYPE_CONFIG[gardenType].emoji} {t('gardenType.' + gardenType + 'Desc')}
            </Text>
          </View>
        )}

        {/* Province */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm }}>
          <Text style={[s.label, { marginTop: 0, marginBottom: 0, color: colors.textSecondary }]}>{t('gardenEdit.provinceLabel')}</Text>
          <Pressable
            onPress={detectLocation}
            disabled={locating}
            style={[s.detectBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44', opacity: locating ? 0.6 : 1 }]}
          >
            <Ionicons name="location-outline" size={13} color={colors.primary} />
            <Text style={[s.detectBtnText, { color: colors.primary }]}>
              {locating ? t('onboarding.detecting') : t('onboarding.detectLocation')}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => { setProvinceSearch(''); setShowProvinceModal(true); }}
          style={[s.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[{ flex: 1, fontSize: fontSize.md }, province ? { color: colors.text } : { color: colors.textDisabled }]}>
            {province || t('gardenEdit.provincePlaceholder')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Pressable>

        {/* Climate zone derived */}
        {zoneConfig && (
          <View style={[s.zoneBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[s.zoneText, { color: colors.textSecondary }]}>
              {zoneConfig.emoji} {zoneConfig.label} — {t('zoneDescription.' + climateZone)}
            </Text>
          </View>
        )}
        <View style={[s.calendarAutoNote, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
          <Text style={[s.calendarAutoNoteText, { color: colors.textSecondary }]}>
            {t('gardenEdit.calendarAuto')}
          </Text>
        </View>

        {/* Grid size — Pro feature */}
        <View style={s.gridSizeHeader}>
          <Text style={[s.label, { color: colors.textSecondary, marginTop: 0, marginBottom: 0 }]}>
            {t('gardenEdit.gridSizeLabel')}
          </Text>
          {!isPro && (
            <View style={[s.proBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}>
              <Text style={[s.proBadgeText, { color: colors.primary }]}>Pro</Text>
            </View>
          )}
        </View>

        <View style={s.presetRow}>
          {GRID_PRESETS.map((preset) => {
            const active = gridRows === preset.rows && gridCols === preset.cols;
            const locked = !isPro && !(preset.rows === DEFAULT_GRID_ROWS && preset.cols === DEFAULT_GRID_COLS);
            return (
              <Pressable
                key={`${preset.rows}x${preset.cols}`}
                onPress={() => {
                  if (locked) {
                    Alert.alert(t('gardenEdit.gridProTitle'), t('gardenEdit.gridProDesc'));
                    return;
                  }
                  setGridRows(preset.rows);
                  setGridCols(preset.cols);
                }}
                style={[
                  s.presetBtn,
                  {
                    backgroundColor: active ? colors.primary + '22' : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: locked ? 0.5 : 1,
                  },
                ]}
              >
                {locked && (
                  <Ionicons name="lock-closed" size={10} color={colors.textSecondary} style={{ marginBottom: 1 }} />
                )}
                <Text style={[s.presetLabel, { color: active ? colors.primary : colors.text }]}>
                  {preset.cols}×{preset.rows}
                </Text>
                <Text style={[s.presetSub, { color: colors.textSecondary }]}>
                  {preset.rows * preset.cols} {t('gardenEdit.cells')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Live plan preview — the full editor remains in the map screen. */}
        <View style={[s.planCard, { backgroundColor: glassAvailable ? 'transparent' : colors.surfaceAlt, borderColor: colors.border }]}>
          {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
          <View style={s.planHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.planTitle, { color: colors.text }]}>{t('gardenEdit.planTitle')}</Text>
              <Text style={[s.planMeta, { color: colors.textSecondary }]}>
                {placedPlanCount}/{gridRows * gridCols} {t('gardenEdit.planOccupied')}
              </Text>
            </View>
            <Pressable
              onPress={() => void handleSave(true)}
              disabled={!activeGardenSelected || saving}
              style={[s.planAction, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '55', opacity: !activeGardenSelected || saving ? 0.45 : 1 }]}
            >
              <Text style={[s.planActionText, { color: colors.primary }]}>{t('gardenEdit.editPlan')}</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.primary} />
            </Pressable>
          </View>
          <View style={[s.miniGrid, { borderColor: colors.border, backgroundColor: colors.background }]}>
            {Array.from({ length: gridRows }, (_, row) => (
              <View key={row} style={s.miniGridRow}>
                {Array.from({ length: gridCols }, (_, col) => {
                  const idx = row * gridCols + col;
                  const plantId = planLayout[idx];
                  const plant = plantId ? plants.items.find((item) => item.id === plantId) : undefined;
                  const crop = plant ? (CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId]) : undefined;
                  return (
                    <View key={idx} style={[s.miniCell, { borderColor: colors.border, backgroundColor: plant ? colors.primary + '18' : 'transparent' }]}>
                      <Text style={s.miniCellEmoji}>{crop?.emoji ?? ''}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          <Text style={[s.planHint, { color: colors.textSecondary }]}>
            {activeGardenSelected ? t('gardenEdit.planHint') : t('gardenEdit.planActiveGardenHint')}
          </Text>
        </View>

        {/* Map color */}
        <Text style={[s.label, { color: colors.textSecondary }]}>{t('gardenEdit.colorLabel')}</Text>
        <View style={s.colorRow}>
          {GARDEN_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(color === c ? undefined : c)}
              style={[
                s.colorSwatch,
                { backgroundColor: c },
                color === c && s.colorSwatchActive,
              ]}
            >
              {color === c && <Ionicons name="checkmark" size={16} color="#fff" />}
            </Pressable>
          ))}
          <Pressable
            onPress={() => setColor(undefined)}
            style={[
              s.colorSwatch,
              { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: color === undefined ? colors.primary : colors.border },
            ]}
          >
            {color === undefined && <Ionicons name="checkmark" size={16} color={colors.primary} />}
          </Pressable>
        </View>

        {/* Notes */}
        <Text style={[s.label, { color: colors.textSecondary }]}>{t('gardenEdit.notesLabel')}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={[s.notesInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          placeholder={t('gardenEdit.notesPlaceholder')}
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={500}
        />

        <Button
          title={saving ? t('common.saving') : t('gardenEdit.save')}
          variant="primary"
          size="lg"
          onPress={handleSave}
          disabled={saving}
          style={{ marginTop: spacing['2xl'] }}
        />
        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>

      {/* Garden picker modal */}
      <Modal
        visible={showGardenPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGardenPicker(false)}
      >
        <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{t('gardenEdit.selectGarden')}</Text>
            <Pressable onPress={() => setShowGardenPicker(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={gardens.items}
            keyExtractor={(g) => g.id}
            renderItem={({ item: g }) => {
              const isSelected = g.id === garden?.id;
              const cfg = GARDEN_TYPE_CONFIG[g.gardenType ?? 'huerto'];
              return (
                <Pressable
                  onPress={() => { setSelectedGardenId(g.id); setShowGardenPicker(false); }}
                  style={[
                    s.provinceRow,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.primary + '12' },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{cfg.emoji}</Text>
                  <Text style={[s.provinceName, { color: isSelected ? colors.primary : colors.text }]} numberOfLines={1}>
                    {g.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Province modal */}
      <Modal
        visible={showProvinceModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProvinceModal(false)}
      >
        <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{t('gardenEdit.selectProvince')}</Text>
            <Pressable onPress={() => setShowProvinceModal(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              value={provinceSearch}
              onChangeText={setProvinceSearch}
              placeholder={t('gardenEdit.searchProvince')}
              placeholderTextColor={colors.textDisabled}
              style={[{ flex: 1, color: colors.text, fontSize: fontSize.md, marginLeft: spacing.sm }]}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredProvinces}
            keyExtractor={(p) => p}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: p }) => {
              const selected = province === p;
              return (
                <Pressable
                  onPress={() => { setProvince(p); setHemisphere('norte'); setShowProvinceModal(false); }}
                  style={[
                    s.provinceRow,
                    { borderBottomColor: colors.border },
                    selected && { backgroundColor: colors.primary + '12' },
                  ]}
                >
                  <Text style={[s.provinceName, { color: selected ? colors.primary : colors.text }]}>
                    {p}
                  </Text>
                  <Text style={[{ fontSize: fontSize.xs, color: colors.textSecondary }]}>
                    {CLIMATE_ZONE_CONFIG[PROVINCE_ZONES[p]].emoji} {CLIMATE_ZONE_CONFIG[PROVINCE_ZONES[p]].label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
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
    gardenSelector: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      marginHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: 0,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radii.lg, borderWidth: 1,
    },
    gardenSelectorName: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    body: { padding: spacing.xl },
    label: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    input: {
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    picker: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    detectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    detectBtnText: { fontSize: 11, fontWeight: fontWeight.medium },
    zoneBadge: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    zoneText: { fontSize: fontSize.sm, lineHeight: 20 },
    typeRow: { flexDirection: 'row', gap: spacing.sm },
    typeBtn: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      gap: 3,
    },
    typeEmoji: { fontSize: 22 },
    typeLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },
    typeTip: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    typeTipText: { fontSize: fontSize.xs, lineHeight: 18 },
    calendarAutoNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radii.md },
    calendarAutoNoteText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17 },
    modal: { flex: 1 },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    provinceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    provinceName: { flex: 1, fontSize: fontSize.md },
    gridSizeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    proBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    proBadgeText: { fontSize: 10, fontWeight: fontWeight.bold },
    presetRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    presetBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      minWidth: 58,
      gap: 2,
    },
    presetLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    presetSub: { fontSize: 10 },
    planCard: { marginTop: spacing.xl, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    planTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    planMeta: { fontSize: fontSize.xs, marginTop: 3 },
    planAction: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.full, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 6 },
    planActionText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    miniGrid: { borderWidth: 1, borderRadius: radii.md, padding: 3, gap: 3, overflow: 'hidden' },
    miniGridRow: { flexDirection: 'row', gap: 3 },
    miniCell: { flex: 1, aspectRatio: 2.4, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
    miniCellEmoji: { fontSize: 11 },
    planHint: { fontSize: fontSize.xs, lineHeight: 17, marginTop: spacing.sm },
    colorRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    colorSwatch: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorSwatchActive: {
      borderWidth: 3,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    notesInput: {
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      fontSize: fontSize.sm,
      minHeight: 80,
      textAlignVertical: 'top',
    },
  });
