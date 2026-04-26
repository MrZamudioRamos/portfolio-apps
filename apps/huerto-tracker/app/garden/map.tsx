import { useColors, useTheme, Button, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import { CROPS_BY_ID } from '../../src/data/crops';
import type { Garden } from '../../src/models/garden';
import type { Plant } from '../../src/models/plant';
import { PLANT_STATUS_CONFIG } from '../../src/models/plant';
import {
  DEFAULT_GRID_ROWS,
  DEFAULT_GRID_COLS,
  cellIndex,
  useGardenLayout,
} from '../../src/hooks/useGardenLayout';

export default function GardenMapScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();

  const gardens = useCollection<Garden>('gardens');
  const garden = gardens.items[0];
  const gridRows = garden?.gridRows ?? DEFAULT_GRID_ROWS;
  const gridCols = garden?.gridCols ?? DEFAULT_GRID_COLS;

  const plants = useCollection<Plant>('plants');
  const { layout, loading, setCell } = useGardenLayout(gridRows, gridCols);

  // Modal state for picking a plant to place
  const [pickingCell, setPickingCell] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Modal state for an occupied cell
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  useFocusEffect(useCallback(() => { plants.refresh(); }, []));

  const placedPlantIds = useMemo(() => new Set(layout.filter(Boolean) as string[]), [layout]);

  const availablePlants = useMemo(
    () =>
      plants.items
        .filter((p) => !placedPlantIds.has(p.id))
        .filter((p) =>
          search.trim() === '' ||
          p.name.toLowerCase().includes(search.toLowerCase())
        ),
    [plants.items, placedPlantIds, search]
  );

  const { t } = useTranslation();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  function handleCellPress(index: number) {
    const plantId = layout[index];
    if (plantId) {
      setSelectedCell(index);
    } else {
      setSearch('');
      setPickingCell(index);
    }
  }

  async function handleAssign(plant: Plant) {
    if (pickingCell === null) return;
    await setCell(pickingCell, plant.id);
    setPickingCell(null);
  }

  async function handleRemoveFromCell() {
    if (selectedCell === null) return;
    await setCell(selectedCell, null);
    setSelectedCell(null);
  }

  const selectedPlant =
    selectedCell !== null ? plants.items.find((p) => p.id === layout[selectedCell]) ?? null : null;
  const selectedCrop = selectedPlant ? CROPS_BY_ID[selectedPlant.cropId] : null;

  // Build grid rows
  const rows = Array.from({ length: gridRows }, (_, r) =>
    Array.from({ length: gridCols }, (_, c) => {
      const idx = cellIndex(r, c, gridCols);
      const plantId = layout[idx];
      const plant = plantId ? plants.items.find((p) => p.id === plantId) ?? null : null;
      const crop = plant ? CROPS_BY_ID[plant.cropId] : null;
      const statusColor = plant ? PLANT_STATUS_CONFIG[plant.status].color : null;
      return { idx, plant, crop, statusColor };
    })
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t('gardenMap.title')}</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>
            {t('gardenMap.summary', { placed: placedPlantIds.size, total: plants.count, cols: gridCols, rows: gridRows })}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Compass / orientation hint */}
        <View style={s.compassRow}>
          <View style={[s.compassBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[{ fontSize: fontSize.xs, color: colors.textSecondary }]}>☀️ {t('gardenMap.south')}</Text>
          </View>
        </View>

        {/* Grid */}
        <View style={[s.grid, { borderColor: colors.border }]}>
          {rows.map((row, r) => (
            <View key={r} style={s.gridRow}>
              {row.map(({ idx, plant, crop, statusColor }) => (
                <Pressable
                  key={idx}
                  onPress={() => handleCellPress(idx)}
                  style={({ pressed }) => [
                    s.cell,
                    {
                      backgroundColor: plant ? colors.surfaceAlt : colors.surface,
                      borderColor: plant ? (statusColor + '55') : colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  {plant && crop ? (
                    <>
                      <Text style={s.cellEmoji}>{crop.emoji}</Text>
                      <Text
                        style={[s.cellLabel, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {plant.name}
                      </Text>
                      <View style={[s.cellDot, { backgroundColor: statusColor ?? colors.primary }]} />
                    </>
                  ) : (
                    <Ionicons name="add" size={18} color={colors.border} />
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[s.legendText, { color: colors.textSecondary }]}>{t('gardenMap.legendOccupied')}</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.border }]} />
            <Text style={[s.legendText, { color: colors.textSecondary }]}>{t('gardenMap.legendEmpty')}</Text>
          </View>
        </View>

        {plants.count === 0 && (
          <Text style={[s.emptyNote, { color: colors.textDisabled }]}>
            {t('gardenMap.emptyNote')}
          </Text>
        )}

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>

      {/* ── Plant picker modal ── */}
      <Modal
        visible={pickingCell !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickingCell(null)}
      >
        <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{t('gardenMap.assignPlant')}</Text>
            <Pressable onPress={() => setPickingCell(null)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border, margin: spacing.lg }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('gardenMap.searchPlant')}
              placeholderTextColor={colors.textDisabled}
              style={[{ flex: 1, color: colors.text, fontSize: fontSize.md, marginLeft: spacing.sm }]}
              autoFocus
            />
          </View>

          {availablePlants.length === 0 ? (
            <View style={s.emptyPicker}>
              <Text style={[{ color: colors.textSecondary, textAlign: 'center', fontSize: fontSize.md }]}>
                {plants.count === 0
                  ? t('gardenMap.noPlants')
                  : t('gardenMap.allPlaced')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={availablePlants}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const crop = CROPS_BY_ID[item.cropId];
                const statusCfg = PLANT_STATUS_CONFIG[item.status];
                return (
                  <Pressable
                    onPress={() => handleAssign(item)}
                    style={({ pressed }) => [
                      s.pickRow,
                      { borderBottomColor: colors.border, backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
                    ]}
                  >
                    <Text style={{ fontSize: 28 }}>{crop?.emoji ?? '🌱'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.pickName, { color: colors.text }]}>{item.name}</Text>
                      {item.variety && (
                        <Text style={[{ fontSize: fontSize.xs, color: colors.textSecondary }]}>
                          {item.variety}
                        </Text>
                      )}
                    </View>
                    <View style={[s.statusPill, { backgroundColor: statusCfg.color + '22' }]}>
                      <Text style={[s.statusPillText, { color: statusCfg.color }]}>
                        {statusCfg.emoji} {statusCfg.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Occupied cell options modal ── */}
      <Modal
        visible={selectedCell !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedCell(null)}
      >
        <Pressable style={s.overlay} onPress={() => setSelectedCell(null)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface, ...shadows.lg }]}>
            {selectedPlant && selectedCrop && (
              <>
                <View style={s.sheetHeader}>
                  <Text style={{ fontSize: 40 }}>{selectedCrop.emoji}</Text>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[s.sheetTitle, { color: colors.text }]}>{selectedPlant.name}</Text>
                    {selectedPlant.variety && (
                      <Text style={[{ fontSize: fontSize.sm, color: colors.textSecondary }]}>
                        {selectedPlant.variety}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={s.sheetActions}>
                  <Button
                    title={t('gardenMap.viewPlant')}
                    variant="primary"
                    size="md"
                    onPress={() => {
                      setSelectedCell(null);
                      router.push(`/plant/${selectedPlant.id}`);
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={t('gardenMap.removeFromMap')}
                    variant="outline"
                    size="md"
                    onPress={() => {
                      Alert.alert(
                        t('gardenMap.removeTitle'),
                        t('gardenMap.removeDesc', { name: selectedPlant.name }),
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          { text: t('gardenMap.remove'), style: 'destructive', onPress: handleRemoveFromCell },
                        ]
                      );
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
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
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    headerSub: { fontSize: fontSize.xs, marginTop: 1 },
    scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    compassRow: { alignItems: 'center', marginBottom: spacing.sm },
    compassBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 3,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    grid: {
      borderWidth: 1,
      borderRadius: radii.lg,
      overflow: 'hidden',
      gap: 2,
      padding: 2,
      backgroundColor: colors.border,
    },
    gridRow: { flexDirection: 'row', gap: 2 },
    cell: {
      flex: 1,
      aspectRatio: 0.85,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      padding: 2,
    },
    cellEmoji: { fontSize: 22 },
    cellLabel: { fontSize: 8, fontWeight: fontWeight.medium, textAlign: 'center' },
    cellDot: { width: 5, height: 5, borderRadius: 3 },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xl,
      marginTop: spacing.md,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: fontSize.xs },
    emptyNote: { textAlign: 'center', fontSize: fontSize.sm, marginTop: spacing.xl },
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
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    emptyPicker: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing['2xl'],
    },
    pickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickName: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.full },
    statusPillText: { fontSize: 11, fontWeight: fontWeight.semibold },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.xl,
      paddingBottom: spacing['2xl'],
    },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
    sheetTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    sheetActions: { flexDirection: 'row', gap: spacing.md },
  });
