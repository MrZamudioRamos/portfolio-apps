import { useColors, useTheme, type Theme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { usePro } from '../../src/hooks/usePro';
import { track, EVENTS } from '../../src/analytics';
import { useCustomCrops } from '../../src/hooks/useCustomCrops';
import { GlassView, isLiquidGlassAvailable } from '../../src/utils/glassEffect';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ViewShot, isViewShotAvailable } from '../../src/utils/viewShot';
// Gesture/Reanimated stubs — Expo Go can't run Reanimated 4 native module.
// Real implementation works in dev builds / production.
const _noop = () => _chain;
const _chain: any = {
  activateAfterLongPress: _noop,
  onStart: _noop,
  onUpdate: _noop,
  onEnd: _noop,
  onFinalize: _noop,
};
const GestureDetector = ({ children }: any) => children;
const Gesture = { Pan: () => _chain };
const useSharedValue = (v: any) => ({ value: v });
const useAnimatedStyle = (_fn: any) => ({});
const withSpring = (v: any) => v;
const runOnJS = (fn: any) => fn;
const Animated = { View } as any;
import { CROPS_BY_ID } from '../../src/data/crops';
import { getCompatibilityStatus } from '../../src/data/companions';
import type { Plant } from '../../src/models/plant';
import { PLANT_STATUS_CONFIG } from '../../src/models/plant';
import type { Garden } from '../../src/models/garden';
import { GARDEN_TYPE_CONFIG } from '../../src/models/garden';
import {
  DEFAULT_GRID_ROWS,
  DEFAULT_GRID_COLS,
  cellIndex,
  useGardenLayout,
} from '../../src/hooks/useGardenLayout';
import { useGardenFreeLayout, type FreeMapPosition } from '../../src/hooks/useGardenFreeLayout';
import type { CropInfo } from '../../src/data/crops';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();
const PANEL_COLLAPSED_H = 48;
const PANEL_EXPANDED_H = 152;
type MapFilter = 'all' | 'attention' | 'light';
const MAP_FILTERS: Array<{ key: MapFilter; translationKey: string }> = [
  { key: 'all', translationKey: 'gardenMap.filterAll' },
  { key: 'attention', translationKey: 'gardenMap.filterAttention' },
  { key: 'light', translationKey: 'gardenMap.filterLight' },
];

export function GardenMapContent({ embedded = false }: { embedded?: boolean } = {}) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { isPro } = usePro();
  const { activeGarden: garden, gardens: allGardens, refreshActiveId } = useActiveGarden();
  const gardens = useCollection<Garden>('gardens');
  const { customCropsById } = useCustomCrops();
  const gridRows = garden?.gridRows ?? DEFAULT_GRID_ROWS;
  const gridCols = garden?.gridCols ?? DEFAULT_GRID_COLS;
  const gridColor = garden?.color ?? colors.border;
  const gardenType = garden?.gardenType ?? 'huerto';
  const isPotMode = gardenType === 'balcon' || gardenType === 'maceta';
  const isFreeLayout = isPotMode;
  const gardenTypeCfg = GARDEN_TYPE_CONFIG[gardenType];

  const plants = useCollection<Plant>('plants');
  const { layout, loading, setCell, swapCells } = useGardenLayout(garden?.id, gridRows, gridCols);
  const { positions: freePositions, setPosition: setFreePosition } = useGardenFreeLayout(garden?.id);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [pickingCell, setPickingCell] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [moveSourceCell, setMoveSourceCell] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTargetIdx, setDragTargetIdx] = useState<number | null>(null);
  const [ghostEmoji, setGhostEmoji] = useState('🌱');
  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState(garden?.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelDragPlantId, setPanelDragPlantId] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const [selectedFreePlantId, setSelectedFreePlantId] = useState<string | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const viewShotRef = useRef<any>(null);
  const gridRef = useRef<View>(null);
  const gridMetrics = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const isDraggingRef = useRef(false);
  const dragSrcIdxRef = useRef(-1);
  const panelDragPlantIdRef = useRef<string | null>(null);
  const layoutRef = useRef(layout);
  const setCellRef = useRef(setCell);
  const swapCellsRef = useRef(swapCells);
  const gridColsRef = useRef(gridCols);
  const gridRowsRef = useRef(gridRows);

  useEffect(() => { layoutRef.current = layout; }, [layout]);
  useEffect(() => { setCellRef.current = setCell; }, [setCell]);
  useEffect(() => { swapCellsRef.current = swapCells; }, [swapCells]);
  useEffect(() => { gridColsRef.current = gridCols; gridRowsRef.current = gridRows; }, [gridCols, gridRows]);
  useEffect(() => { setNotesText(garden?.notes ?? ''); }, [garden?.id, garden?.notes]);

  // ── Reanimated shared values ──────────────────────────────────────────────
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostScale = useSharedValue(0);

  const ghostAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ghostX.value },
      { translateY: ghostY.value },
      { scale: ghostScale.value },
    ],
  }));

  useFocusEffect(useCallback(() => { refreshActiveId(); plants.refresh(); }, []));

  // ── Derived data ──────────────────────────────────────────────────────────
  const gardenPlants = useMemo(
    () => plants.items.filter((p) => p.gardenId === garden?.id),
    [plants.items, garden?.id]
  );

  const placedPlantIds = useMemo(() => new Set(layout.filter(Boolean) as string[]), [layout]);

  const availablePlants = useMemo(
    () => gardenPlants.filter((p) => !placedPlantIds.has(p.id)),
    [gardenPlants, placedPlantIds]
  );

  const availablePlantsFiltered = useMemo(
    () => availablePlants.filter((p) =>
      search.trim() === '' || p.name.toLowerCase().includes(search.toLowerCase())
    ),
    [availablePlants, search]
  );

  const cropCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const plantId of layout) {
      if (!plantId) continue;
      const plant = plants.items.find((p) => p.id === plantId);
      if (!plant) continue;
      counts[plant.cropId] = (counts[plant.cropId] ?? 0) + 1;
    }
    return counts;
  }, [layout, plants.items]);

  const { t } = useTranslation();

  const s = useMemo(
    () => makeStyles(colors, spacing, fontSize, fontWeight, radii),
    [colors, spacing, fontSize, fontWeight, radii]
  );

  // ── Coordinate helpers ────────────────────────────────────────────────────
  function findTargetIdx(absX: number, absY: number): number | null {
    const { x, y, w, h } = gridMetrics.current;
    if (w === 0 || h === 0) return null;
    const relX = absX - x;
    const relY = absY - y;
    if (relX < 0 || relY < 0 || relX > w || relY > h) return null;
    const cols = gridColsRef.current;
    const rows = gridRowsRef.current;
    const col = Math.min(Math.floor(relX / (w / cols)), cols - 1);
    const row = Math.min(Math.floor(relY / (h / rows)), rows - 1);
    return cellIndex(row, col, cols);
  }

  // ── Drag handlers — all stable (read from refs, no deps) ──────────────────
  const handleDragStart = useCallback((sourceIdx: number, emoji: string) => {
    panelDragPlantIdRef.current = null;
    isDraggingRef.current = true;
    dragSrcIdxRef.current = sourceIdx;
    setGhostEmoji(emoji);
    setIsDragging(true);
    setDragTargetIdx(null);
    setSelectedCell(null);
    setMoveSourceCell(null);
  }, []);

  const handlePanelDragStart = useCallback((plantId: string, emoji: string) => {
    panelDragPlantIdRef.current = plantId;
    isDraggingRef.current = true;
    dragSrcIdxRef.current = -1;
    setGhostEmoji(emoji);
    setIsDragging(true);
    setPanelDragPlantId(plantId);
    setDragTargetIdx(null);
    setSelectedCell(null);
    setMoveSourceCell(null);
  }, []);

  const handleDragMove = useCallback((absX: number, absY: number) => {
    if (!isDraggingRef.current) return;
    setDragTargetIdx(findTargetIdx(absX, absY));
  }, []); // stable — reads from refs

  const handleDrop = useCallback((absX: number, absY: number) => {
    if (!isDraggingRef.current) return;
    const tgt = findTargetIdx(absX, absY);

    if (panelDragPlantIdRef.current) {
      // Panel → grid
      if (tgt !== null && !layoutRef.current[tgt]) {
        setCellRef.current(tgt, panelDragPlantIdRef.current);
      }
      panelDragPlantIdRef.current = null;
    } else {
      // Grid → grid
      const src = dragSrcIdxRef.current;
      if (tgt !== null && tgt !== src) {
        if (layoutRef.current[tgt]) {
          swapCellsRef.current(src, tgt);
        } else {
          const srcPlantId = layoutRef.current[src];
          if (srcPlantId) {
            setCellRef.current(src, null);
            setCellRef.current(tgt, srcPlantId);
          }
        }
      }
    }

    isDraggingRef.current = false;
    dragSrcIdxRef.current = -1;
    setIsDragging(false);
    setPanelDragPlantId(null);
    setDragTargetIdx(null);
  }, []); // stable

  const handleDragFinalize = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    dragSrcIdxRef.current = -1;
    panelDragPlantIdRef.current = null;
    setIsDragging(false);
    setPanelDragPlantId(null);
    setDragTargetIdx(null);
  }, []);

  // ── Panel gestures — memoized per available plant ─────────────────────────
  const panelItems = useMemo(() =>
    availablePlants.map((plant) => {
      const crop = CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId] ?? null;
      const emoji = crop?.emoji ?? '🌱';
      const gesture = Gesture.Pan()
        .activateAfterLongPress(180)
        .onStart((e: any) => {
          ghostX.value = e.absoluteX - 30;
          ghostY.value = e.absoluteY - 60;
          ghostScale.value = withSpring(1.2);
          runOnJS(handlePanelDragStart)(plant.id, emoji);
        })
        .onUpdate((e: any) => {
          ghostX.value = e.absoluteX - 30;
          ghostY.value = e.absoluteY - 60;
          runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
        })
        .onEnd((e: any) => {
          runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
          ghostScale.value = withSpring(0);
        })
        .onFinalize(() => {
          runOnJS(handleDragFinalize)();
        });
      return { plant, crop, emoji, gesture };
    }),
  [availablePlants, customCropsById, handlePanelDragStart, handleDragMove, handleDrop, handleDragFinalize]
  );

  // ── Other handlers ────────────────────────────────────────────────────────
  function handleCellPress(index: number) {
    if (isDraggingRef.current) return;
    if (moveSourceCell !== null) {
      if (index === moveSourceCell) { setMoveSourceCell(null); return; }
      const targetPlant = layout[index];
      if (targetPlant) {
        swapCells(moveSourceCell, index);
      } else {
        const srcPlantId = layout[moveSourceCell];
        if (srcPlantId) { setCell(moveSourceCell, null); setCell(index, srcPlantId); }
      }
      setMoveSourceCell(null);
      return;
    }
    if (layout[index]) {
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

  function handleStartMove() {
    setMoveSourceCell(selectedCell);
    setSelectedCell(null);
  }

  async function handleSaveNotes() {
    if (!garden) return;
    setSavingNotes(true);
    try {
      await gardens.update(garden.id, { notes: notesText.trim() });
      setShowNotes(false);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleShare() {
    if (!viewShotRef.current) return;
    if (!isViewShotAvailable()) {
      Alert.alert(t('gardenMap.shareNotAvailable'));
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) { Alert.alert(t('gardenMap.shareNotAvailable')); return; }
    setSharing(true);
    try {
      const uri = await (viewShotRef.current as any).capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('gardenMap.shareTitle') });
    } catch {
      Alert.alert(t('common.error'), t('gardenMap.shareError'));
    } finally {
      setSharing(false);
    }
  }

  const selectedPlant = selectedCell !== null
    ? plants.items.find((p) => p.id === layout[selectedCell]) ?? null
    : null;
  const selectedCrop = selectedPlant
    ? (CROPS_BY_ID[selectedPlant.cropId] ?? customCropsById[selectedPlant.cropId] ?? null)
    : null;
  const selectedFreePlant = selectedFreePlantId
    ? gardenPlants.find((plant) => plant.id === selectedFreePlantId) ?? null
    : null;
  const selectedFreeCrop = selectedFreePlant
    ? (CROPS_BY_ID[selectedFreePlant.cropId] ?? customCropsById[selectedFreePlant.cropId] ?? null)
    : null;

  const rows = Array.from({ length: gridRows }, (_, r) =>
    Array.from({ length: gridCols }, (_, c) => {
      const idx = cellIndex(r, c, gridCols);
      const plantId = layout[idx];
      const plant = plantId ? plants.items.find((p) => p.id === plantId) ?? null : null;
      const crop = plant ? (CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId] ?? null) : null;
      const statusColor = plant ? PLANT_STATUS_CONFIG[plant.status].color : null;
      const isSource = isDragging ? dragSrcIdxRef.current === idx : moveSourceCell === idx;
      const inMoveMode = !isDragging && moveSourceCell !== null;
      const isTarget = isDragging && dragTargetIdx === idx && dragSrcIdxRef.current !== idx;
      const count = plant ? (cropCounts[plant.cropId] ?? 1) : 0;
      const isDimmed = Boolean(plant) && (
        mapFilter === 'attention' ? plant?.pestStatus !== 'active' :
        mapFilter === 'light' ? crop?.sunNeeds !== 'full' :
        false
      );

      // Companion markers vs right and bottom neighbors
      let rightMarker: 'companion' | 'incompatible' | null = null;
      let bottomMarker: 'companion' | 'incompatible' | null = null;
      if (plant && crop) {
        if (c + 1 < gridCols) {
          const rId = layout[cellIndex(r, c + 1, gridCols)];
          const rPlant = rId ? plants.items.find((p) => p.id === rId) : null;
          if (rPlant) {
            const st = getCompatibilityStatus(plant.cropId, rPlant.cropId);
            if (st !== 'neutral') rightMarker = st;
          }
        }
        if (r + 1 < gridRows) {
          const bId = layout[cellIndex(r + 1, c, gridCols)];
          const bPlant = bId ? plants.items.find((p) => p.id === bId) : null;
          if (bPlant) {
            const st = getCompatibilityStatus(plant.cropId, bPlant.cropId);
            if (st !== 'neutral') bottomMarker = st;
          }
        }
      }

      return { idx, plant, crop, statusColor, isSource, inMoveMode, isTarget, isDimmed, count, rightMarker, bottomMarker };
    })
  );

  const panelH = panelCollapsed ? PANEL_COLLAPSED_H : PANEL_EXPANDED_H;

  if (!isPro) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          {!embedded && (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </Pressable>
          )}
          <Text style={[s.headerTitle, { flex: 1, marginLeft: spacing.md, color: colors.text }]}>
            {t('gardenMap.title')}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <Text style={{ fontSize: 64, marginBottom: spacing.lg }}>🗺️</Text>
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center', marginBottom: spacing.md }}>
            {t('gardenMap.proTitle')}
          </Text>
          <Text style={{ fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl }}>
            {t('gardenMap.proDesc')}
          </Text>
          <Pressable
            onPress={() => router.push('/paywall?source=map' as any)}
            style={{ backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderRadius: radii.md }}
          >
            <Text style={{ color: colors.primaryDark, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
              {t('gardenMap.proBtn')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state: render a fallback rather than null so a slow/rejected
  // AsyncStorage read in useGardenLayout doesn't blank the Pro user's screen
  // indefinitely. (useGardenLayout also degrades to an empty layout on error.)
  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>

        {/* ── Header ── */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          {!embedded && (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </Pressable>
          )}
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={[s.headerTitle, { color: colors.text }]}>{t('gardenMap.title')}</Text>
              <View style={[s.typeBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={{ fontSize: 12 }}>{gardenTypeCfg.emoji}</Text>
              </View>
            </View>
            <Text style={[s.headerSub, { color: colors.textSecondary }]}>
              {t(isFreeLayout ? 'gardenMap.freeSummary' : 'gardenMap.summary', {
                placed: placedPlantIds.size,
                total: gardenPlants.length,
                cols: gridCols,
                rows: gridRows,
              })}
            </Text>
          </View>
          {allGardens.length > 1 && (
            <Pressable
              onPress={() => router.push('/gardens' as any)}
              hitSlop={12}
              style={{ marginRight: spacing.sm }}
            >
              <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push('/garden/edit')}
            hitSlop={12}
            style={{ marginRight: spacing.sm }}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => setShowNotes(true)}
            hitSlop={12}
            style={{ marginRight: spacing.sm, opacity: garden?.notes?.trim() ? 1 : 0.5 }}
          >
            <Ionicons
              name={garden?.notes?.trim() ? 'document-text' : 'document-text-outline'}
              size={20}
              color={colors.primary}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push('/plant/new' as any)}
            accessibilityRole="button"
            accessibilityLabel={t('gardenMap.addPlant')}
            hitSlop={12}
            style={{ marginRight: spacing.sm }}
          >
            <Ionicons name="add-circle-outline" size={21} color={colors.primary} />
          </Pressable>
          <Pressable onPress={handleShare} disabled={sharing} hitSlop={12} style={{ opacity: sharing ? 0.4 : 1 }}>
            <Ionicons name="share-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {MAP_FILTERS.map(({ key, translationKey }) => {
            const active = mapFilter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setMapFilter(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  s.filterChip,
                  {
                    backgroundColor: active ? colors.accent : colors.surface,
                    borderColor: active ? colors.accent : colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[s.filterChipText, { color: active ? colors.primaryDark : colors.textSecondary }]}>
                  {t(translationKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Pot mode banner ── */}
        {isPotMode && moveSourceCell === null && (
          <View style={[s.potBanner, { backgroundColor: '#8B572A18', borderBottomColor: '#8B572A30' }]}>
            <Text style={{ fontSize: 14 }}>{gardenTypeCfg.emoji}</Text>
            <Text style={[s.potBannerText, { color: '#8B572A' }]}>
              {t('gardenType.' + gardenType)} · {t('gardenMap.freeCanvasHint')}
            </Text>
          </View>
        )}

        {/* ── Move mode banner ── */}
        {moveSourceCell !== null && (
          <Pressable
            onPress={() => setMoveSourceCell(null)}
            style={[s.moveBanner, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="move-outline" size={16} color={colors.primaryDark} />
            <Text style={[s.moveBannerText, { color: colors.primaryDark }]}>{t('gardenMap.moveModeHint')}</Text>
            <Ionicons name="close" size={18} color={colors.primaryDark} />
          </Pressable>
        )}

        {/* ── Grid ScrollView ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: panelH + spacing.xl + (embedded ? 86 : 0) }]}
          scrollEnabled={!isDragging}
        >
          <View style={s.compassRow}>
            <View style={[s.compassBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>☀️ {t('gardenMap.south')}</Text>
            </View>
          </View>

          {isFreeLayout ? (
            <>
              <ViewShot
                ref={viewShotRef as any}
                options={{ format: 'png', quality: 1 }}
                style={{ borderRadius: radii.lg, overflow: 'hidden' }}
              >
                <FreeGardenCanvas
                  plants={gardenPlants}
                  positions={freePositions}
                  mapFilter={mapFilter}
                  selectedPlantId={selectedFreePlantId}
                  cropById={{ ...CROPS_BY_ID, ...customCropsById }}
                  colors={colors}
                  spacing={spacing}
                  fontSize={fontSize}
                  fontWeight={fontWeight}
                   radii={radii}
                   shadows={shadows}
                   styles={s}
                   onSelect={setSelectedFreePlantId}
                   onPositionChange={setFreePosition}
                   t={t}
                />
              </ViewShot>

              <View style={[s.freeInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={s.freeLegend}>
                  <View style={s.freeLegendItem}>
                    <View style={[s.freeLegendDot, { backgroundColor: colors.primary }]} />
                    <Text style={[s.freeLegendText, { color: colors.textSecondary }]}>{t('gardenMap.freeAllGood')}</Text>
                  </View>
                  <View style={s.freeLegendItem}>
                    <View style={[s.freeLegendDot, { backgroundColor: colors.secondary }]} />
                    <Text style={[s.freeLegendText, { color: colors.textSecondary }]}>{t('gardenMap.freeReview')}</Text>
                  </View>
                  <View style={s.freeLegendItem}>
                    <View style={[s.freeLegendDot, { backgroundColor: colors.water }]} />
                    <Text style={[s.freeLegendText, { color: colors.textSecondary }]}>{t('gardenMap.freeNoData')}</Text>
                  </View>
                </View>
                {selectedFreePlant && selectedFreeCrop ? (
                  <Pressable
                    onPress={() => router.push(`/plant/${selectedFreePlant.id}`)}
                    style={({ pressed }) => [s.freeSelectedRow, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[s.freeSelectedText, { color: colors.textSecondary }]}>
                      {t('gardenMap.freeSelected', { name: selectedFreePlant.name, crop: selectedFreeCrop.name })}
                    </Text>
                    <Ionicons name="arrow-forward" size={17} color={colors.primary} />
                  </Pressable>
                ) : (
                  <Text style={[s.freeHint, { color: colors.textSecondary }]}>
                    {t(gardenPlants.length > 0 ? 'gardenMap.freeMoveHint' : 'gardenMap.freeAddHint')}
                  </Text>
                )}
              </View>
            </>
          ) : (
          <ViewShot
            ref={viewShotRef as any}
            options={{ format: 'png', quality: 1 }}
            style={{ borderRadius: radii.lg, overflow: 'hidden' }}
          >
            <View style={[s.shareHeader, { backgroundColor: garden?.color ?? colors.primary }]}>
              <Text style={s.shareHeaderName}>{garden?.name ?? t('gardenMap.title')}</Text>
              <Text style={s.shareHeaderMeta}>
                {gridCols}×{gridRows} · {placedPlantIds.size} {t('gardenMap.plantsBadge')}
              </Text>
            </View>

            <View
              ref={gridRef}
              style={[s.grid, { borderColor: gridColor, backgroundColor: gridColor }]}
              onLayout={() => {
                gridRef.current?.measureInWindow((x, y, w, h) => {
                  gridMetrics.current = { x, y, w, h };
                });
              }}
            >
              {rows.map((row, r) => (
                <View key={r} style={s.gridRow}>
                  {row.map(({ idx, plant, crop, statusColor, isSource, inMoveMode, isTarget, isDimmed, count, rightMarker, bottomMarker }) => {
                    const cellContent = (
                      <Pressable
                        onPress={() => handleCellPress(idx)}
                        style={({ pressed }) => [
                          s.cell,
                          {
                            backgroundColor: isTarget
                              ? colors.primary + '25'
                              : isSource
                              ? colors.primary + '28'
                              : plant
                              ? colors.surfaceAlt
                              : inMoveMode
                              ? colors.primary + '08'
                              : isPotMode
                              ? '#8B572A18'
                              : colors.surface,
                            borderColor: isTarget
                              ? colors.primary
                              : isSource
                              ? colors.primary
                              : plant
                              ? (statusColor + '55')
                              : inMoveMode
                              ? colors.primary + '40'
                              : isPotMode
                              ? '#8B572A55'
                              : colors.border,
                            borderWidth: (isSource || isTarget) ? 2.5 : 1.5,
                            borderStyle: isTarget ? 'dashed' : 'solid',
                            opacity: isDimmed ? 0.24 : isDragging && isSource ? 0.35 : pressed ? 0.75 : 1,
                            ...(isPotMode ? { borderRadius: 999, aspectRatio: 1 } : {}),
                          },
                        ]}
                      >
                        {plant && crop ? (
                          <>
                            <Text style={s.cellEmoji}>{crop.emoji}</Text>
                            <Text style={[s.cellLabel, { color: colors.text }]} numberOfLines={1}>
                              {plant.name}
                            </Text>
                            <View style={[s.cellDot, { backgroundColor: statusColor ?? colors.primary }]} />
                            {count > 1 && (
                              <View style={s.badge}>
                                <Text style={s.badgeText}>{count}x</Text>
                              </View>
                            )}
                            {rightMarker && (
                              <View
                                style={[
                                  s.companionMarkerRight,
                                  { backgroundColor: rightMarker === 'companion' ? '#4CAF50' : '#EF5350' },
                                ]}
                              >
                                <Text style={s.companionMarkerText}>
                                  {rightMarker === 'companion' ? '✓' : '✗'}
                                </Text>
                              </View>
                            )}
                            {bottomMarker && (
                              <View
                                style={[
                                  s.companionMarkerBottom,
                                  { backgroundColor: bottomMarker === 'companion' ? '#4CAF50' : '#EF5350' },
                                ]}
                              >
                                <Text style={s.companionMarkerText}>
                                  {bottomMarker === 'companion' ? '✓' : '✗'}
                                </Text>
                              </View>
                            )}
                          </>
                        ) : isTarget ? (
                          <Ionicons name="add-circle" size={20} color={colors.primary} />
                        ) : inMoveMode ? (
                          <Ionicons name="add-circle-outline" size={18} color={colors.primary + '60'} />
                        ) : (
                          <Ionicons name="add" size={18} color={colors.border} />
                        )}
                      </Pressable>
                    );

                    if (!plant || !crop) {
                      return <React.Fragment key={idx}>{cellContent}</React.Fragment>;
                    }

                    const emoji = crop.emoji;
                    const gridPanGesture = Gesture.Pan()
                      .activateAfterLongPress(280)
                      .onStart((e: any) => {
                        ghostX.value = e.absoluteX - 30;
                        ghostY.value = e.absoluteY - 60;
                        ghostScale.value = withSpring(1.15);
                        runOnJS(handleDragStart)(idx, emoji);
                      })
                      .onUpdate((e: any) => {
                        ghostX.value = e.absoluteX - 30;
                        ghostY.value = e.absoluteY - 60;
                        runOnJS(handleDragMove)(e.absoluteX, e.absoluteY);
                      })
                      .onEnd((e: any) => {
                        runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
                        ghostScale.value = withSpring(0);
                      })
                      .onFinalize(() => {
                        runOnJS(handleDragFinalize)();
                      });

                    return (
                      <GestureDetector key={idx} gesture={gridPanGesture}>
                        {cellContent}
                      </GestureDetector>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={[s.shareFooter, { backgroundColor: colors.background }]}>
              <Text style={[s.shareFooterText, { color: colors.textSecondary }]}>🌱 Huerto Tracker</Text>
            </View>
          </ViewShot>
          )}

          {!isFreeLayout && <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[s.legendText, { color: colors.textSecondary }]}>{t('gardenMap.legendOccupied')}</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: colors.border }]} />
              <Text style={[s.legendText, { color: colors.textSecondary }]}>{t('gardenMap.legendEmpty')}</Text>
            </View>
          </View>}

          {gardenPlants.length === 0 && (
            <Text style={[s.emptyNote, { color: colors.textDisabled }]}>
              {t('gardenMap.emptyNote')}
            </Text>
          )}
        </ScrollView>

        {/* ── Plant panel ── */}
        {!isFreeLayout && <View
          style={[
            s.panel,
            {
              height: panelH,
              bottom: embedded ? 86 : 0,
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom,
              ...shadows.md,
            },
          ]}
        >
          {/* Panel handle / header */}
          <Pressable
            onPress={() => setPanelCollapsed((v) => !v)}
            style={s.panelHandle}
            hitSlop={8}
          >
            <View style={s.panelTitleRow}>
              <View style={[s.panelBadge, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[s.panelBadgeText, { color: colors.primary }]}>
                  {availablePlants.length}
                </Text>
              </View>
              <Text style={[s.panelTitle, { color: colors.text }]}>
                {t('gardenMap.unplaced')}
              </Text>
              {!panelCollapsed && (
                <Text style={[s.panelHint, { color: colors.textSecondary }]}>
                  {t('gardenMap.dragHint')}
                </Text>
              )}
            </View>
            <Ionicons
              name={panelCollapsed ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          {/* Plant cards */}
          {!panelCollapsed && (
            availablePlants.length === 0 ? (
              <View style={s.panelEmpty}>
                <Text style={[s.panelEmptyText, { color: colors.textSecondary }]}>
                  🎉 {t('gardenMap.allPlaced')}
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.panelScroll}
                scrollEnabled={!isDragging}
              >
                {panelItems.map(({ plant, crop, emoji, gesture }) => {
                  const statusCfg = PLANT_STATUS_CONFIG[plant.status];
                  const isBeingDragged = panelDragPlantId === plant.id;
                  return (
                    <GestureDetector key={plant.id} gesture={gesture}>
                      <View
                        style={[
                          s.panelCard,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            opacity: isBeingDragged ? 0.3 : 1,
                          },
                        ]}
                      >
                        <Text style={s.panelCardEmoji}>{emoji}</Text>
                        <Text style={[s.panelCardName, { color: colors.text }]} numberOfLines={1}>
                          {plant.name}
                        </Text>
                        {plant.variety ? (
                          <Text style={[s.panelCardVariety, { color: colors.textSecondary }]} numberOfLines={1}>
                            {plant.variety}
                          </Text>
                        ) : null}
                        <View style={[s.panelCardStatus, { backgroundColor: statusCfg.color + '22' }]}>
                          <Text style={[s.panelCardStatusText, { color: statusCfg.color }]}>
                            {statusCfg.emoji}
                          </Text>
                        </View>
                        {/* Drag indicator */}
                        <View style={s.dragDots}>
                          <View style={[s.dragDot, { backgroundColor: colors.textSecondary }]} />
                          <View style={[s.dragDot, { backgroundColor: colors.textSecondary }]} />
                          <View style={[s.dragDot, { backgroundColor: colors.textSecondary }]} />
                        </View>
                      </View>
                    </GestureDetector>
                  );
                })}
              </ScrollView>
            )
          )}
        </View>}

        {/* ── Plant picker modal (tap-on-cell flow) ── */}
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
                style={{ flex: 1, color: colors.text, fontSize: fontSize.md, marginLeft: spacing.sm }}
                autoFocus
              />
            </View>
            {availablePlantsFiltered.length === 0 ? (
              <View style={s.emptyPicker}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: fontSize.md }}>
                  {gardenPlants.length === 0 ? t('gardenMap.noPlants') : t('gardenMap.allPlaced')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={availablePlantsFiltered}
                keyExtractor={(p) => p.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const crop = CROPS_BY_ID[item.cropId] ?? customCropsById[item.cropId];
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
                          <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{item.variety}</Text>
                        )}
                      </View>
                      <View style={[s.statusPill, { backgroundColor: statusCfg.color + '22' }]}>
                        <Text style={[s.statusPillText, { color: statusCfg.color }]}>
                          {statusCfg.emoji} {t('plantStatus.' + item.status)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </SafeAreaView>
        </Modal>

        {/* ── Context menu ── */}
        <Modal
          visible={selectedCell !== null}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedCell(null)}
        >
          <Pressable style={s.overlay} onPress={() => setSelectedCell(null)}>
            <Pressable style={[s.contextCard, { backgroundColor: glassAvailable ? 'transparent' : colors.surface, overflow: 'hidden', ...shadows.lg }]}>
              {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
              {selectedPlant && selectedCrop && (
                <>
                  <View style={s.contextHeader}>
                    <Text style={{ fontSize: 32 }}>{selectedCrop.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={[s.contextName, { color: colors.text }]} numberOfLines={1}>{selectedPlant.name}</Text>
                      {selectedPlant.variety
                        ? <Text style={[s.contextVariety, { color: colors.textSecondary }]} numberOfLines={1}>{selectedPlant.variety}</Text>
                        : null}
                    </View>
                    <View style={[s.statusDot, { backgroundColor: PLANT_STATUS_CONFIG[selectedPlant.status].color }]} />
                  </View>
                  <View style={[s.divider, { backgroundColor: colors.border }]} />
                  <View style={s.contextActions}>
                    <Pressable
                      onPress={() => { setSelectedCell(null); router.push(`/plant/${selectedPlant.id}`); }}
                      style={[s.contextBtn, { backgroundColor: colors.accent }]}
                    >
                      <Ionicons name="eye-outline" size={20} color={colors.primaryDark} />
                      <Text style={[s.contextBtnText, { color: colors.primaryDark }]}>{t('gardenMap.viewPlant')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleStartMove}
                      style={[s.contextBtn, { backgroundColor: '#FFA72615' }]}
                    >
                      <Ionicons name="move-outline" size={20} color="#E69500" />
                      <Text style={[s.contextBtnText, { color: '#E69500' }]}>{t('gardenMap.movePlant')}</Text>
                    </Pressable>
                    <Pressable
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
                      style={[s.contextBtn, { backgroundColor: '#EF535015' }]}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF5350" />
                      <Text style={[s.contextBtnText, { color: '#EF5350' }]}>{t('gardenMap.remove')}</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Notes bottom sheet ── */}
        <Modal
          visible={showNotes}
          animationType="slide"
          transparent
          onRequestClose={() => setShowNotes(false)}
        >
          <Pressable style={s.overlay} onPress={() => {}}>
            <Pressable style={[s.notesCard, { backgroundColor: colors.surface, ...shadows.lg }]} onPress={() => {}}>
              <View style={s.notesHeaderRow}>
                <Text style={[s.notesTitle, { color: colors.text }]}>{t('gardenMap.notesTitle')}</Text>
                <Pressable onPress={() => setShowNotes(false)} hitSlop={12}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                value={notesText}
                onChangeText={setNotesText}
                style={[s.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder={t('gardenMap.notesPlaceholder')}
                placeholderTextColor={colors.textDisabled}
                multiline
                maxLength={500}
                autoFocus
              />
              <Pressable
                onPress={handleSaveNotes}
                disabled={savingNotes}
                style={[s.notesSaveBtn, { backgroundColor: colors.accent, opacity: savingNotes ? 0.6 : 1 }]}
              >
                <Text style={[s.notesSaveBtnText, { color: colors.primaryDark }]}>{t('gardenMap.notesSave')}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

      </SafeAreaView>

      {/* ── Floating ghost ── */}
      {isDragging && (
        <Animated.View pointerEvents="none" style={[s.ghost, ghostAnimStyle]}>
          <Text style={{ fontSize: 40 }}>{ghostEmoji}</Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function GardenMapScreen() {
  return <GardenMapContent />;
}

type FreeGardenCanvasProps = {
  plants: Plant[];
  positions: Record<string, FreeMapPosition>;
  mapFilter: MapFilter;
  selectedPlantId: string | null;
  cropById: Record<string, CropInfo | undefined>;
  colors: ReturnType<typeof useColors>;
  spacing: Record<string, number>;
  fontSize: Record<string, number>;
  fontWeight: Theme['fontWeight'];
  radii: Record<string, number>;
  shadows: Theme['shadows'];
  styles: any;
  onSelect: (plantId: string) => void;
  onPositionChange: (plantId: string, position: FreeMapPosition) => void;
  t: any;
};

function FreeGardenCanvas({
  plants,
  positions,
  mapFilter,
  selectedPlantId,
  cropById,
  colors,
  styles,
  shadows,
  onSelect,
  onPositionChange,
  t,
}: FreeGardenCanvasProps) {
  const CARD_WIDTH = 118;
  const CARD_HEIGHT = 62;
  const SIDE_PADDING = 14;
  const TOP_PADDING = 24;
  const canvasHeight = Math.max(332, 52 + Math.ceil(Math.max(plants.length, 1) / 2) * 76);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [draftPositions, setDraftPositions] = useState<Record<string, FreeMapPosition>>(positions);
  const draftPositionsRef = useRef(draftPositions);
  const dragStartsRef = useRef<Record<string, FreeMapPosition>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    setDraftPositions(positions);
    draftPositionsRef.current = positions;
  }, [positions]);

  const clampPosition = useCallback((x: number, y: number): FreeMapPosition => {
    const usableWidth = canvasWidth || 320;
    const maxX = Math.max(SIDE_PADDING, usableWidth - CARD_WIDTH - SIDE_PADDING);
    const maxY = Math.max(TOP_PADDING, canvasHeight - CARD_HEIGHT - 16);
    return {
      x: Math.min(Math.max(SIDE_PADDING, x), maxX),
      y: Math.min(Math.max(TOP_PADDING, y), maxY),
    };
  }, [canvasWidth, canvasHeight]);

  const defaultPosition = useCallback((index: number) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    return clampPosition(
      SIDE_PADDING + column * (CARD_WIDTH + 12),
      TOP_PADDING + row * 76,
    );
  }, [clampPosition]);

  const getPosition = useCallback((plantId: string, index: number) => (
    clampPosition(
      draftPositions[plantId]?.x ?? defaultPosition(index).x,
      draftPositions[plantId]?.y ?? defaultPosition(index).y,
    )
  ), [clampPosition, defaultPosition, draftPositions]);

  return (
    <View
      onLayout={(event) => setCanvasWidth(event.nativeEvent.layout.width)}
      style={[styles.freeCanvas, { height: canvasHeight, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
    >
      <View
        pointerEvents="none"
        style={[styles.freeCanvasInner, { borderColor: colors.border }]}
      />
      <View
        pointerEvents="none"
        style={[styles.freeCanvasGuide, { backgroundColor: colors.border }]}
      />

      {plants.map((plant, index) => {
        const crop = cropById[plant.cropId];
        const position = getPosition(plant.id, index);
        const isSelected = selectedPlantId === plant.id;
        const isDimmed = mapFilter === 'attention'
          ? plant.pestStatus !== 'active'
          : mapFilter === 'light'
          ? crop?.sunNeeds !== 'full'
          : false;
        const statusLabel = plant.pestStatus === 'active'
          ? t('gardenMap.freeReview')
          : !plant.sowingDate
          ? t('gardenMap.freeNoData')
          : t('gardenMap.freeAllGood');

        const commitPosition = () => {
          setDraggingId(null);
          const finalPosition = draftPositionsRef.current[plant.id] ?? position;
          onPositionChange(plant.id, finalPosition);
          delete dragStartsRef.current[plant.id];
        };

        const panResponder = PanResponder.create({
          onStartShouldSetPanResponder: () => false,
          onMoveShouldSetPanResponder: (_, gestureState) =>
            Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
          onPanResponderGrant: () => {
            dragStartsRef.current[plant.id] = position;
            setDraggingId(plant.id);
          },
          onPanResponderMove: (_, gestureState) => {
            const start = dragStartsRef.current[plant.id] ?? position;
            const nextPosition = clampPosition(start.x + gestureState.dx, start.y + gestureState.dy);
            const nextPositions = { ...draftPositionsRef.current, [plant.id]: nextPosition };
            draftPositionsRef.current = nextPositions;
            setDraftPositions(nextPositions);
          },
          onPanResponderRelease: commitPosition,
          onPanResponderTerminate: commitPosition,
        });

        return (
          <View
            key={plant.id}
            {...panResponder.panHandlers}
            style={[
              styles.freePlantWrap,
              {
                left: position.x,
                top: position.y,
                zIndex: isSelected || draggingId === plant.id ? 10 : 1,
                opacity: isDimmed ? 0.28 : 1,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${plant.name}. ${crop?.name ?? plant.cropId}. ${statusLabel}`}
              onPress={() => onSelect(plant.id)}
              style={({ pressed }) => [
                styles.freePlantCard,
                shadows.sm,
                {
                  backgroundColor: isSelected ? colors.accent + '35' : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 1.5 : 1,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Text style={[styles.freePlantName, { color: colors.text }]} numberOfLines={1}>
                {plant.bedName ?? t('gardenMap.potLabel', { number: index + 1 })}
              </Text>
              <Text style={[styles.freePlantMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {crop?.name ?? plant.cropId} · {statusLabel}
              </Text>
            </Pressable>
          </View>
        );
      })}
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
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    headerSub: { fontSize: fontSize.xs, marginTop: 1 },
    typeBadge: { borderRadius: radii.full, paddingHorizontal: 6, paddingVertical: 2 },
    filterRow: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, gap: spacing.sm },
    filterChip: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radii.sm,
      borderWidth: 1,
    },
    filterChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    potBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: spacing.sm, paddingVertical: 6, paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    potBannerText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
    moveBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    },
    moveBannerText: { flex: 1, color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },
    scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    shareHeader: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center' },
    shareHeaderName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#fff' },
    shareHeaderMeta: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    shareFooter: { paddingVertical: spacing.sm, alignItems: 'center' },
    shareFooterText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    compassRow: { alignItems: 'center', marginBottom: spacing.sm },
    compassBadge: { paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radii.full, borderWidth: 1 },
    grid: { borderWidth: 1, overflow: 'hidden', gap: 2, padding: 2 },
    gridRow: { flexDirection: 'row', gap: 2 },
    cell: {
      flex: 1, aspectRatio: 0.85, borderRadius: radii.sm, borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center', gap: 1, padding: 2,
    },
    cellEmoji: { fontSize: 22 },
    cellLabel: { fontSize: 8, fontWeight: fontWeight.medium, textAlign: 'center' },
    cellDot: { width: 5, height: 5, borderRadius: 3 },
    badge: {
      position: 'absolute', bottom: 2, right: 2,
      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8,
      paddingHorizontal: 4, paddingVertical: 1,
    },
    badgeText: { fontSize: 8, color: '#fff', fontWeight: '700' },
    companionMarkerRight: {
      position: 'absolute',
      right: -7,
      top: '50%',
      marginTop: -7,
      width: 14,
      height: 14,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#fff',
      zIndex: 5,
    },
    companionMarkerBottom: {
      position: 'absolute',
      bottom: -7,
      left: '50%',
      marginLeft: -7,
      width: 14,
      height: 14,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#fff',
      zIndex: 5,
    },
    companionMarkerText: { fontSize: 8, fontWeight: '900', color: '#fff' },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: fontSize.xs },
    freeCanvas: {
      position: 'relative',
      minHeight: 332,
      borderWidth: 1,
      borderRadius: radii.lg,
      overflow: 'hidden',
    },
    freeCanvasInner: {
      position: 'absolute',
      left: 20,
      right: 20,
      top: 22,
      bottom: 22,
      borderWidth: 1,
      borderRadius: radii.md,
    },
    freeCanvasGuide: {
      position: 'absolute',
      left: '50%',
      top: 18,
      bottom: 18,
      width: 1,
      opacity: 0.55,
      transform: [{ rotate: '18deg' }],
    },
    freePlantWrap: {
      position: 'absolute',
      width: 118,
      minHeight: 62,
    },
    freePlantCard: {
      minHeight: 62,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      justifyContent: 'center',
    },
    freePlantName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    freePlantMeta: { fontSize: fontSize.xs, marginTop: 3 },
    freeInfoCard: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderWidth: 1,
      borderRadius: radii.lg,
      gap: spacing.sm,
    },
    freeLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    freeLegendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    freeLegendDot: { width: 9, height: 9, borderRadius: 5 },
    freeLegendText: { fontSize: fontSize.xs },
    freeSelectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    freeSelectedText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    freeHint: { fontSize: fontSize.xs, lineHeight: 18 },
    emptyNote: { textAlign: 'center', fontSize: fontSize.sm, marginTop: spacing.xl },
    // ── Plant panel ──
    panel: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
    },
    panelHandle: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, height: PANEL_COLLAPSED_H,
    },
    panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
    panelBadge: { borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 2, minWidth: 26, alignItems: 'center' },
    panelBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    panelTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    panelHint: { fontSize: 10, marginLeft: spacing.xs },
    panelEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.md },
    panelEmptyText: { fontSize: fontSize.sm },
    panelScroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm, flexDirection: 'row' },
    panelCard: {
      width: 76, borderRadius: radii.md, borderWidth: 1,
      alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: 4,
      gap: 2, position: 'relative',
    },
    panelCardEmoji: { fontSize: 28 },
    panelCardName: { fontSize: 9, fontWeight: fontWeight.medium, textAlign: 'center' },
    panelCardVariety: { fontSize: 8, textAlign: 'center' },
    panelCardStatus: { borderRadius: radii.full, paddingHorizontal: 4, paddingVertical: 1 },
    panelCardStatusText: { fontSize: 10 },
    dragDots: { flexDirection: 'row', gap: 2, marginTop: 1 },
    dragDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.4 },
    // ── Modals ──
    modal: { flex: 1 },
    modalHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1,
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', borderWidth: 1,
      borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    emptyPicker: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'] },
    pickRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
      gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickName: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
    statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.full },
    statusPillText: { fontSize: 11, fontWeight: fontWeight.semibold },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    contextCard: {
      borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
      paddingTop: spacing.xl, paddingBottom: spacing['2xl'], paddingHorizontal: spacing.xl,
    },
    contextHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
    contextName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    contextVariety: { fontSize: fontSize.sm, marginTop: 2 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    divider: { height: StyleSheet.hairlineWidth, marginBottom: spacing.lg },
    contextActions: { flexDirection: 'row', gap: spacing.sm },
    contextBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radii.md },
    contextBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    notesCard: {
      borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
      paddingTop: spacing.xl, paddingBottom: spacing['2xl'], paddingHorizontal: spacing.xl, gap: spacing.md,
    },
    notesHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    notesTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    notesInput: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontSize: fontSize.sm, minHeight: 100, textAlignVertical: 'top' },
    notesSaveBtn: { borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center' },
    notesSaveBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
    ghost: { position: 'absolute', top: 0, left: 0, width: 60, height: 60, alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  });
