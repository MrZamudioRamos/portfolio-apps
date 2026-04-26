import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { usePurchases } from '@portfolio/billing';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PROVINCE_ZONES, CLIMATE_ZONE_CONFIG } from '../../src/data/zones';
import type { ClimateZone, Garden, GardenType } from '../../src/models/garden';
import { GARDEN_TYPE_CONFIG } from '../../src/models/garden';
import { GRID_PRESETS, DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS } from '../../src/hooks/useGardenLayout';

const ALL_PROVINCES = Object.keys(PROVINCE_ZONES).sort();

export default function GardenEditScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const gardens = useCollection<Garden>('gardens');
  const garden = gardens.items[0];
  const { isPro } = usePurchases();

  const [name, setName] = useState(garden?.name ?? '');
  const [province, setProvince] = useState(garden?.province ?? '');
  const [gardenType, setGardenType] = useState<GardenType>(garden?.gardenType ?? 'huerto');
  const [gridRows, setGridRows] = useState(garden?.gridRows ?? DEFAULT_GRID_ROWS);
  const [gridCols, setGridCols] = useState(garden?.gridCols ?? DEFAULT_GRID_COLS);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

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

  async function handleSave() {
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
      });
      router.back();
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
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>{t('gardenEdit.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

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
                  {cfg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {gardenType !== 'huerto' && (
          <View style={[s.typeTip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[s.typeTipText, { color: colors.textSecondary }]}>
              {GARDEN_TYPE_CONFIG[gardenType].emoji} {GARDEN_TYPE_CONFIG[gardenType].description}. {t('gardenEdit.containerTip')}
            </Text>
          </View>
        )}

        {/* Province */}
        <Text style={[s.label, { color: colors.textSecondary }]}>{t('gardenEdit.provinceLabel')}</Text>
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
              {zoneConfig.emoji} {zoneConfig.label} — {zoneConfig.description}
            </Text>
          </View>
        )}

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
                  onPress={() => { setProvince(p); setShowProvinceModal(false); }}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
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
  });
