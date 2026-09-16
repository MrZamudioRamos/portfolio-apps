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
  ImageBackground,
  Image,
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
import { Button } from '../../src/components/ActionButton';
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
import { CROP_IMAGES } from '../../src/data/cropImages';
import { getCompatibilityStatus } from '../../src/data/companions';
import type { Plant } from '../../src/models/plant';
import { PLANT_STATUS_CONFIG } from '../../src/models/plant';
import type { DiaryEntry } from '../../src/models/diary-entry';
import { useWeather } from '../../src/hooks/useWeather';
import { getWeatherLabel } from '../../src/utils/weather';
import { isSeedPlan } from '../../src/utils/dailyCare';
import { buildCarePlan } from '../../src/utils/carePlan';
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
import type { WeatherData } from '../../src/utils/weather';
import { recordCare } from '../../src/utils/careWrites';
import { hasSoilCheckToday } from '../../src/utils/dailyCare';
import { CROP_CONTAINER_MIN } from '../../src/data/crops';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();
const PANEL_COLLAPSED_H = 48;
const PANEL_EXPANDED_H = 152;
type MapFilter = 'all' | 'attention' | 'light';
type MapViewMode = 'visual' | 'list';
const MAP_FILTERS: Array<{ key: MapFilter; translationKey: string }> = [
  { key: 'all', translationKey: 'gardenMap.filterAll' },
  { key: 'attention', translationKey: 'gardenMap.filterAttention' },
  { key: 'light', translationKey: 'gardenMap.filterLight' },
];
type MapLayer = 'plants' | 'water' | 'light' | 'pests';
const MAP_LAYERS: Array<{ key: MapLayer; translationKey: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'plants', translationKey: 'gardenMap.layerPlants', icon: 'leaf-outline' },
  { key: 'water', translationKey: 'gardenMap.layerWater', icon: 'water-outline' },
  { key: 'light', translationKey: 'gardenMap.layerLight', icon: 'sunny-outline' },
  { key: 'pests', translationKey: 'gardenMap.layerPests', icon: 'bug-outline' },
];

export function GardenMapContent({ embedded = false }: { embedded?: boolean } = {}) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { isPro } = usePro();
  const { activeGarden: garden, gardens: allGardens, refreshActiveId } = useActiveGarden();
  const { weather } = useWeather(garden?.province);
  const gardens = useCollection<Garden>('gardens');
  const { customCropsById } = useCustomCrops();
  const gridRows = garden?.gridRows ?? DEFAULT_GRID_ROWS;
  const gridCols = garden?.gridCols ?? DEFAULT_GRID_COLS;
  const gardenType = garden?.gardenType ?? 'huerto';
  const isPotMode = gardenType === 'balcon' || gardenType === 'maceta';
  const isFreeLayout = isPotMode;
  const gardenTypeCfg = GARDEN_TYPE_CONFIG[gardenType];

  const plants = useCollection<Plant>('plants');
  const diaryEntries = useCollection<DiaryEntry>('diary_entries');
  const { layout, loading, error: layoutError, retry: retryLayout, setCell, swapCells } = useGardenLayout(garden?.id, gridRows, gridCols);
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
  const [editingLayout, setEditingLayout] = useState(false);
  const [panelDragPlantId, setPanelDragPlantId] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const [mapLayer, setMapLayer] = useState<MapLayer>('plants');
  const [viewMode, setViewMode] = useState<MapViewMode>('visual');
  const [editingLocations, setEditingLocations] = useState(false);
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

  useFocusEffect(useCallback(() => {
    void refreshActiveId().catch(() => {});
    void plants.refresh().catch(() => {});
  }, []));

  // ── Derived data ──────────────────────────────────────────────────────────
  const gardenPlants = useMemo(
    () => plants.items.filter((p) => p.gardenId === garden?.id),
    [plants.items, garden?.id]
  );
  const gardenEntries = useMemo(
    () => diaryEntries.items.filter((entry) => entry.gardenId === garden?.id),
    [diaryEntries.items, garden?.id]
  );
  const cropCatalog = useMemo(() => ({ ...CROPS_BY_ID, ...customCropsById }), [customCropsById]);
  const carePlan = useMemo(
    () => buildCarePlan(gardenPlants, cropCatalog, gardenEntries),
    [gardenPlants, cropCatalog, gardenEntries]
  );

  useEffect(() => {
    if (selectedFreePlantId || gardenPlants.length === 0) return;
    setSelectedFreePlantId(gardenPlants.find((plant) => plant.pestStatus === 'active')?.id ?? gardenPlants[0].id);
  }, [gardenPlants, selectedFreePlantId]);

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

  function openMapPro(source: 'map' | 'map_notes' | 'map_share' = 'map') {
    router.push(`/paywall?source=${source}` as any);
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
  const selectedFreeIndex = selectedFreePlant ? gardenPlants.findIndex((plant) => plant.id === selectedFreePlant.id) : -1;
  const selectedFreeLocation = selectedFreePlant?.bedName ?? (
    selectedFreeIndex >= 0 ? t('gardenMap.potLabel', { number: selectedFreeIndex + 1 }) : t('gardenMap.potLabel', { number: 1 })
  );

  const filterMatchCount = useMemo(
    () => gardenPlants.filter((plant) => {
      if (mapFilter === 'attention') return plant.pestStatus === 'active';
      if (mapFilter === 'light') {
        const crop = CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId];
        return crop?.sunNeeds === 'full';
      }
      return true;
    }).length,
    [gardenPlants, mapFilter, customCropsById]
  );
  const activeFilterLabel = t(MAP_FILTERS.find((filter) => filter.key === mapFilter)?.translationKey ?? 'gardenMap.filterAll');
  const listPlants = useMemo(
    () => gardenPlants.filter((plant) => {
      if (mapFilter === 'attention') return plant.pestStatus === 'active';
      if (mapFilter === 'light') {
        const crop = CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId];
        return crop?.sunNeeds === 'full';
      }
      return true;
    }),
    [gardenPlants, mapFilter, customCropsById]
  );
  const getLayerColor = useCallback((plant: Plant, crop: CropInfo | null | undefined) => {
    if (mapLayer === 'pests') {
      return plant.pestStatus === 'active'
        ? colors.error
        : plant.pestStatus === 'treated'
        ? colors.warning
        : colors.success;
    }
    if (mapLayer === 'water') {
      return crop?.waterNeeds === 'high'
        ? colors.warning
        : crop?.waterNeeds === 'medium'
        ? colors.secondary
        : colors.primary;
    }
    if (mapLayer === 'light') {
      return crop?.sunNeeds === 'full'
        ? colors.warning
        : crop?.sunNeeds === 'partial'
        ? colors.secondary
        : colors.primary;
    }
    return plant.pestStatus === 'active' ? colors.warning : colors.primary;
  }, [colors, mapLayer]);
  const layerLegend = mapLayer === 'water'
    ? [
        { color: colors.warning, label: t('gardenMap.waterNeeds.high') },
        { color: colors.secondary, label: t('gardenMap.waterNeeds.medium') },
        { color: colors.primary, label: t('gardenMap.waterNeeds.low') },
      ]
    : mapLayer === 'light'
    ? [
        { color: colors.warning, label: t('gardenMap.sunNeeds.full') },
        { color: colors.secondary, label: t('gardenMap.sunNeeds.partial') },
        { color: colors.primary, label: t('gardenMap.sunNeeds.shade') },
      ]
    : mapLayer === 'pests'
    ? [
        { color: colors.success, label: t('pestStatus.none') },
        { color: colors.warning, label: t('pestStatus.treated') },
        { color: colors.error, label: t('pestStatus.active') },
      ]
    : [
        { color: colors.primary, label: t('gardenMap.freeAllGood') },
        { color: colors.secondary, label: t('gardenMap.freeReview') },
        { color: colors.water, label: t('gardenMap.freeNoData') },
      ];

  // The visual field view keeps the map useful at a glance. It follows the
  // first occupied parcel until the user taps another one, so an empty map
  // still has a clear invitation to place a plant.
  const focusCell = useMemo(() => {
    if (selectedCell !== null && layout[selectedCell]) return selectedCell;
    const first = layout.findIndex(Boolean);
    return first >= 0 ? first : null;
  }, [layout, selectedCell]);
  const focusPlant = focusCell !== null
    ? plants.items.find((p) => p.id === layout[focusCell]) ?? null
    : null;
  const focusCrop = focusPlant
    ? (CROPS_BY_ID[focusPlant.cropId] ?? customCropsById[focusPlant.cropId] ?? null)
    : null;
  const focusAge = focusPlant?.sowingDate
    ? `${Math.max(0, Math.floor((Date.now() - new Date(focusPlant.sowingDate).getTime()) / 86_400_000))} d`
    : '—';
  const focusYield = focusPlant?.harvestGoalKg
    ? `${focusPlant.harvestGoalKg} kg`
    : focusCrop
    ? `${focusCrop.daysToHarvest[0]}–${focusCrop.daysToHarvest[1]} d`
    : '—';
  const healthPercent = gardenPlants.length
    ? Math.round((gardenPlants.filter((p) => p.status !== 'finished' && p.pestStatus !== 'active').length / gardenPlants.length) * 100)
    : 0;
  const activePests = gardenPlants.filter((p) => p.pestStatus === 'active').length;
  const latestEntryByPlant = useMemo(() => {
    const latest: Record<string, DiaryEntry | undefined> = {};
    for (const entry of gardenEntries) {
      if (!entry.plantId) continue;
      const current = latest[entry.plantId];
      if (!current || entry.date > current.date) latest[entry.plantId] = entry;
    }
    return latest;
  }, [gardenEntries]);
  const todayPlant = useMemo(() => {
    const pestPlant = gardenPlants.find((plant) => plant.pestStatus === 'active');
    if (pestPlant) return pestPlant;
    const harvestPlant = gardenPlants.find((plant) => plant.status === 'harvesting');
    if (harvestPlant) return harvestPlant;
    const stalePlant = gardenPlants.find((plant) => {
      const latest = latestEntryByPlant[plant.id];
      if (!latest) return true;
      const daysSinceEntry = Math.floor((Date.now() - new Date(`${latest.date}T12:00:00`).getTime()) / 86_400_000);
      return daysSinceEntry >= 3;
    });
    return stalePlant ?? gardenPlants[0] ?? null;
  }, [gardenPlants, latestEntryByPlant]);
  const todayTask = carePlan[0] ?? null;
  const actionPlant = todayTask
    ? gardenPlants.find((plant) => plant.id === todayTask.plantId) ?? todayPlant
    : todayPlant;
  const weatherPlant = gardenPlants.find((plant) => !isSeedPlan(plant)) ?? gardenPlants[0] ?? null;
  const weatherAlert = weather && weatherPlant
    ? weather.today.tempMin <= 2
      ? 'frost'
      : weather.today.tempMax >= 35
      ? 'heat'
      : weather.wateringAdvice !== 'normal'
      ? 'rain'
      : null
    : null;
  const todayAction = activePests > 0 || todayTask?.kind === 'pest'
    ? 'inspect'
    : todayTask?.kind === 'harvest' || actionPlant?.status === 'harvesting'
    ? 'harvest'
    : 'care';
  const waterLabel = focusCrop
    ? t(`gardenMap.waterNeeds.${focusCrop.waterNeeds}`)
    : t('gardenMap.noData');
  const soilLabel = focusPlant?.soilPh ? `pH ${focusPlant.soilPh}` : t('gardenMap.noData');
  const pestLabel = focusPlant?.pestStatus === 'active'
    ? t('gardenMap.pestActive')
    : focusPlant?.pestStatus === 'treated'
    ? t('gardenMap.pestTreated')
    : activePests > 0
    ? `${activePests} ${t('gardenMap.active')}`
    : t('gardenMap.pestClear');
  const isFocusCell = (idx: number) => focusCell === idx && !!layout[idx];

  const rows = Array.from({ length: gridRows }, (_, r) =>
    Array.from({ length: gridCols }, (_, c) => {
      const idx = cellIndex(r, c, gridCols);
      const plantId = layout[idx];
      const plant = plantId ? plants.items.find((p) => p.id === plantId) ?? null : null;
      const crop = plant ? (CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId] ?? null) : null;
      const statusColor = plant ? getLayerColor(plant, crop) : null;
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

  const panelH = embedded && !editingLayout
    ? PANEL_COLLAPSED_H
    : panelCollapsed
    ? PANEL_COLLAPSED_H
    : PANEL_EXPANDED_H;

  // The official Mapa tab is a dedicated Stitch surface. Keep the detailed
  // editor below for the pushed /garden/map route, but make the tab itself the
  // light-zone map described in the native product specification.
  if (embedded) {
    return (
      <StitchMapTab
        garden={garden}
        plants={gardenPlants}
        entries={gardenEntries}
        cropCatalog={cropCatalog}
        weather={weather}
        loading={loading || plants.loading}
      />
    );
  }

  // Loading state: render a fallback rather than null so a slow/rejected
  // AsyncStorage read in useGardenLayout doesn't blank the map indefinitely.
  // (useGardenLayout also degrades to an empty layout on error.)
  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={s.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingStateText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (layoutError) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[s.emptyMapCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.emptyMapIcon, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="refresh-circle-outline" size={26} color={colors.primary} />
          </View>
          <Text style={[s.emptyMapTitle, { color: colors.text }]}>{t('errorScreen.title')}</Text>
          <Text style={[s.emptyMapDesc, { color: colors.textSecondary }]}>{t('errorScreen.desc')}</Text>
          <Button title={t('common.retry')} onPress={retryLayout} size="sm" style={s.emptyMapButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>

        {/* ── Header ── */}
        {embedded && (
          <View style={s.appHeader}>
            <View style={s.brandRow}>
              <View style={[s.brandMark, { backgroundColor: colors.accent }]}>
                <Ionicons name="leaf" size={15} color={colors.primaryDark} />
              </View>
              <Text style={[s.brandName, { color: colors.text }]}>semilla</Text>
            </View>
            <View style={s.topActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('gardenMap.help')}
                onPress={() => router.push('/(tabs)/tools' as any)}
                style={({ pressed }) => [s.topAction, { borderColor: colors.border, opacity: pressed ? 0.68 : 1 }]}
              >
                <Ionicons name="help-circle-outline" size={19} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('notifications.title')}
                onPress={() => router.push('/settings/notifications' as any)}
                style={({ pressed }) => [s.topAction, { borderColor: colors.border, opacity: pressed ? 0.68 : 1 }]}
              >
                <Ionicons name="notifications-outline" size={19} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tabs.settings')}
                onPress={() => router.push('/(tabs)/settings' as any)}
                style={({ pressed }) => [s.topAction, { borderColor: colors.border, opacity: pressed ? 0.68 : 1 }]}
              >
                <Ionicons name="settings-outline" size={19} color={colors.text} />
              </Pressable>
            </View>
          </View>
        )}

        {embedded && (
          <View style={s.intro}>
            <Text style={[s.introTitle, { color: colors.text }]}>{t('tabs.map')}</Text>
            <Text style={[s.introLead, { color: colors.textSecondary }]}>{t('gardenMap.lead')}</Text>
          </View>
        )}

        {embedded && (
          <View
            accessibilityRole="tablist"
            style={[s.viewSwitcher, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          >
            {(['visual', 'list'] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <Pressable
                  key={mode}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(`gardenMap.view${mode === 'visual' ? 'Visual' : 'List'}`)}
                  onPress={() => setViewMode(mode)}
                  style={({ pressed }) => [
                    s.viewSwitcherTab,
                    active && { backgroundColor: colors.surface, borderColor: colors.border },
                    { opacity: pressed ? 0.72 : 1 },
                  ]}
                >
                  <Ionicons
                    name={mode === 'visual' ? 'map-outline' : 'list-outline'}
                    size={17}
                    color={active ? colors.primary : colors.textSecondary}
                  />
                  <Text style={{ color: active ? colors.primaryDark : colors.textSecondary, fontSize: fontSize.sm, fontWeight: active ? fontWeight.bold : fontWeight.medium }}>
                    {t(`gardenMap.view${mode === 'visual' ? 'Visual' : 'List'}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {embedded && actionPlant && (
          <View style={[s.todayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.todayHeader}>
              <View style={[s.todayIcon, { backgroundColor: todayAction === 'inspect' ? colors.secondary + '26' : colors.accent }]}>
                <Ionicons
                  name={todayAction === 'inspect' ? 'eye-outline' : todayAction === 'harvest' ? 'basket-outline' : 'water-outline'}
                  size={18}
                  color={todayAction === 'inspect' ? colors.secondary : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.todayLabel, { color: colors.textSecondary }]}>{t('gardenMap.todayTitle')}</Text>
                <Text style={[s.todayHeading, { color: colors.text }]} numberOfLines={1}>
                  {todayTask
                    ? t(todayTask.titleKey, { name: todayTask.plantName })
                    : t(`gardenMap.today.${todayAction}Title`, { plant: actionPlant.name })}
                </Text>
              </View>
            </View>
            <Text style={[s.todayDescription, { color: colors.textSecondary }]}>
              {todayTask ? t(todayTask.reasonKey) : t(`gardenMap.today.${todayAction}Desc`)}
            </Text>
            <Button
              title={todayAction === 'inspect' ? t('gardenMap.todayViewPlant') : t('gardenMap.todayLogCare')}
              size="sm"
              onPress={() => todayAction === 'inspect'
                ? router.push(`/plant/${actionPlant.id}`)
                : router.push(`/entry/new?plantId=${actionPlant.id}`)}
              style={s.todayButton}
            />
          </View>
        )}

        {embedded && weather && weatherAlert && (
          <View style={[s.weatherAlertStrip, { backgroundColor: colors.secondary + '14', borderColor: colors.secondary + '70' }]}>
            <Ionicons
              name={weatherAlert === 'heat' ? 'sunny-outline' : weatherAlert === 'rain' ? 'rainy-outline' : 'thermometer-outline'}
              size={19}
              color={colors.secondary}
            />
            <Text style={[s.weatherAlertText, { color: colors.text }]}>
              {weatherAlert === 'frost'
                ? t('gardenMap.weatherFrostDesc', { temp: weather.today.tempMin, province: weather.province })
                : weatherAlert === 'heat'
                ? t('gardenMap.weatherHeatDesc', { temp: weather.today.tempMax, province: weather.province })
                : t('gardenMap.weatherRainDesc', { rain: weather.today.rainProbability })}
            </Text>
          </View>
        )}

        {embedded && weather && !weatherAlert && (
          <View style={[s.weatherStrip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={s.weatherStripEmoji}>{getWeatherLabel(weather.today.weatherCode).emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.weatherStripPlace, { color: colors.textSecondary }]}>{weather.province}</Text>
              <Text style={[s.weatherStripLabel, { color: colors.text }]}>{t(getWeatherLabel(weather.today.weatherCode).key)}</Text>
            </View>
            <View style={s.weatherStripTemps}>
              <Text style={[s.weatherStripMax, { color: colors.text }]}>{weather.today.tempMax}°</Text>
              <Text style={[s.weatherStripMin, { color: colors.textSecondary }]}>{weather.today.tempMin}°</Text>
            </View>
          </View>
        )}

        {!embedded && <View style={[s.header, { borderBottomColor: colors.border }]}>
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
            onPress={() => isPro ? setShowNotes(true) : openMapPro('map_notes')}
            hitSlop={12}
            accessibilityLabel={t('gardenMap.notesTitle')}
            accessibilityHint={!isPro ? t('gardenMap.proDesc') : undefined}
            style={{ marginRight: spacing.sm, opacity: isPro ? (garden?.notes?.trim() ? 1 : 0.5) : 0.8 }}
          >
            <Ionicons
              name={!isPro ? 'lock-closed-outline' : garden?.notes?.trim() ? 'document-text' : 'document-text-outline'}
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
          <Pressable
            onPress={() => isPro ? void handleShare() : openMapPro('map_share')}
            disabled={sharing}
            hitSlop={12}
            accessibilityLabel={t('gardenMap.shareTitle')}
            accessibilityHint={!isPro ? t('gardenMap.proDesc') : undefined}
            style={{ opacity: sharing ? 0.4 : isPro ? 1 : 0.8 }}
          >
            <Ionicons name={isPro ? 'share-outline' : 'lock-closed-outline'} size={22} color={colors.primary} />
          </Pressable>
        </View>}

        {/* ── Pot mode banner ── */}
        {!embedded && isPotMode && moveSourceCell === null && (
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
            style={[s.moveBanner, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="move-outline" size={16} color={colors.background} />
            <Text style={[s.moveBannerText, { color: colors.background }]}>{t('gardenMap.moveModeHint')}</Text>
            <Ionicons name="close" size={18} color={colors.background} />
          </Pressable>
        )}

        {!embedded && !isPro && !isFreeLayout && (
          <Pressable
            onPress={() => openMapPro()}
            style={[s.freeMapCard, { backgroundColor: glassAvailable ? 'transparent' : colors.surfaceAlt, borderColor: colors.primary + '55' }]}
          >
            {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
            <View style={[s.freeMapIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="map-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.freeMapTitleRow}>
                <Text style={[s.freeMapTitle, { color: colors.text }]}>{t('gardenMap.freeTitle')}</Text>
                <View style={[s.proPill, { backgroundColor: colors.primary }]}>
                  <Text style={[s.proPillText, { color: colors.background }]}>{t('gardenMap.proBadge')}</Text>
                </View>
              </View>
              <Text style={[s.freeMapDesc, { color: colors.textSecondary }]}>{t('gardenMap.freeDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        )}

        {/* ── Grid ScrollView ── */}
        <ScrollView
          style={{ display: viewMode === 'visual' ? 'flex' : 'none' }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: panelH + spacing.xl + (embedded ? 86 : 0) }]}
          scrollEnabled={!isDragging}
        >
          <View style={s.compassRow}>
            <View style={[s.compassBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>☀️ {t('gardenMap.south')}</Text>
            </View>
          </View>

          {gardenPlants.length === 0 && (
            <View style={[s.emptyMapCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.emptyMapIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="map-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[s.emptyMapTitle, { color: colors.text }]}>{t('gardenMap.emptyTitle')}</Text>
              <Text style={[s.emptyMapDesc, { color: colors.textSecondary }]}>{t('gardenMap.emptyDesc')}</Text>
              <Button
                title={t('gardenMap.addPlant')}
                onPress={() => router.push('/plant/new' as any)}
                size="sm"
                style={s.emptyMapButton}
              />
            </View>
          )}

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
                  mapLayer={mapLayer}
                  editing={editingLocations}
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
                  {layerLegend.map((item) => (
                    <View key={item.label} style={s.freeLegendItem}>
                      <View style={[s.freeLegendDot, { backgroundColor: item.color }]} />
                      <Text style={[s.freeLegendText, { color: colors.textSecondary }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                {selectedFreePlant && selectedFreeCrop ? (
                  <View style={s.selectedPlantPanel}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.freeSelectedText, { color: colors.text }]}>
                        {t('gardenMap.freeSelected', { location: selectedFreeLocation, crop: selectedFreeCrop.name })}
                      </Text>
                      <Text style={[s.selectedPlantHint, { color: colors.textSecondary }]}>{t('gardenMap.selectedHint')}</Text>
                    </View>
                    <Button
                      title={t('gardenMap.viewPlant')}
                      size="sm"
                      onPress={() => router.push(`/plant/${selectedFreePlant.id}`)}
                      style={s.selectedCareButton}
                    />
                  </View>
                ) : (
                  <Text style={[s.freeHint, { color: colors.textSecondary }]}>
                    {t(gardenPlants.length > 0 ? 'gardenMap.freeMoveHint' : 'gardenMap.freeAddHint')}
                  </Text>
                )}
                {editingLocations && (
                  <Text style={[s.editingHint, { color: colors.textSecondary }]}>{t('gardenMap.editingHint')}</Text>
                )}
                {embedded && (
                  <Button
                    title={editingLocations ? t('gardenMap.doneEditing') : t('gardenMap.editLocations')}
                    variant={editingLocations ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => setEditingLocations((value) => !value)}
                    style={s.editLocationsButton}
                  />
                )}
              </View>
            </>
          ) : (
          <ViewShot
            ref={viewShotRef as any}
            options={{ format: 'png', quality: 1 }}
            style={{ borderRadius: radii.lg, overflow: 'hidden' }}
          >
            <View style={[s.fieldStage, { backgroundColor: garden?.color ?? '#6D9648' }] }>
              {garden?.photoUri ? (
                <ImageBackground source={{ uri: garden.photoUri }} style={s.fieldBackdrop} imageStyle={s.fieldBackdropImage}>
                  <View style={s.fieldBackdropTint} />
                </ImageBackground>
              ) : (
                <View style={s.fieldBackdrop}>
                  <View style={s.fieldBackdropTint} />
                  {Array.from({ length: 9 }, (_, index) => (
                    <View key={index} style={[s.fieldRow, { top: `${index * 12 - 8}%`, transform: [{ rotate: '-14deg' }] }]} />
                  ))}
                  <View style={[s.fieldContour, { top: '25%', left: '-8%', transform: [{ rotate: '16deg' }] }]} />
                  <View style={[s.fieldContour, { top: '63%', left: '35%', transform: [{ rotate: '-19deg' }] }]} />
                </View>
              )}

              <View style={s.fieldHeader}>
                <View style={s.fieldHeaderTitle}>
                  <Ionicons name="map-outline" size={17} color="rgba(255,255,255,0.86)" />
                  <View>
                    <Text style={s.fieldTitle}>{garden?.name ?? t('gardenMap.title')}</Text>
                    <Text style={s.fieldSubtitle}>{gridCols}×{gridRows} · {placedPlantIds.size} {t('gardenMap.plantsBadge')}</Text>
                  </View>
                </View>
                <View style={s.fieldSunPill}>
                  <Text style={s.fieldSunText}>☀️ {t('gardenMap.south')}</Text>
                </View>
              </View>

              <Pressable
                disabled={!focusPlant}
                onPress={() => focusPlant && router.push(`/plant/${focusPlant.id}`)}
                accessibilityRole={focusPlant ? 'button' : undefined}
                accessibilityLabel={focusPlant ? t('gardenMap.viewPlant') : undefined}
                style={({ pressed }) => [s.focusSummary, { opacity: pressed && focusPlant ? 0.82 : 1 }]}
              >
                {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
                <View style={[s.focusSummaryIcon, { backgroundColor: focusPlant ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }]}>
                  <Text style={s.focusSummaryEmoji}>{focusCrop?.emoji ?? '＋'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.focusSummaryName}>{focusPlant?.name ?? t('gardenMap.focusEmpty')}</Text>
                  <Text style={s.focusSummaryHint} numberOfLines={1}>
                    {focusPlant ? t('gardenMap.focusHint') : t('gardenMap.focusEmptyHint')}
                  </Text>
                </View>
                <View style={s.focusSummaryStats}>
                  <View>
                    <Text style={s.focusStatLabel}>{t('gardenMap.yield')}</Text>
                    <Text style={s.focusStatValue}>{focusYield}</Text>
                  </View>
                  <View>
                    <Text style={s.focusStatLabel}>{t('gardenMap.plantAge')}</Text>
                    <Text style={s.focusStatValue}>{focusAge}</Text>
                  </View>
                </View>
                {focusPlant && <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />}
              </Pressable>

            <View
              ref={gridRef}
              style={[s.grid, s.fieldGrid, { borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(28,66,23,0.16)' }]}
              onLayout={() => {
                gridRef.current?.measureInWindow((x, y, w, h) => {
                  gridMetrics.current = { x, y, w, h };
                });
              }}
            >
              {rows.map((row, r) => (
                <View key={r} style={s.gridRow}>
                  {row.map(({ idx, plant, crop, statusColor, isSource, inMoveMode, isTarget, isDimmed, count, rightMarker, bottomMarker }) => {
                    const focused = isFocusCell(idx);
                    const cellContent = (
                      <Pressable
                        onPress={() => handleCellPress(idx)}
                        accessibilityRole="button"
                        accessibilityLabel={plant && crop ? `${plant.name} · ${crop.name}` : t('gardenMap.legendEmpty')}
                        accessibilityHint={editingLayout ? t('gardenMap.editingHint') : t('gardenMap.tapToExplore')}
                        accessibilityState={{ selected: focused }}
                        style={({ pressed }) => [
                          s.cell,
                          {
                            backgroundColor: isTarget
                              ? colors.primary + '25'
                              : isSource
                              ? colors.primary + '28'
                              : plant
                              ? 'rgba(255,255,255,0.13)'
                              : inMoveMode
                              ? 'rgba(255,255,255,0.12)'
                              : 'rgba(255,255,255,0.035)',
                            borderColor: isTarget
                              ? colors.primary
                              : isSource
                              ? colors.primary
                              : plant
                              ? focused
                              ? 'rgba(255,255,255,0.96)'
                              : 'rgba(255,255,255,0.66)'
                              : inMoveMode
                              ? colors.primary + '40'
                              : isPotMode
                              ? '#8B572A55'
                              : colors.border,
                            opacity: isDimmed ? 0.24 : isDragging && isSource ? 0.35 : pressed ? 0.75 : 1,
                            borderWidth: focused || isSource || isTarget ? 2.5 : 1.2,
                            borderStyle: isTarget || !isPotMode ? 'dashed' : 'solid',
                            ...(isPotMode ? { borderRadius: radii.sm, aspectRatio: 1.15 } : {}),
                          },
                        ]}
                      >
                        {focused && <View style={[s.focusRing, { pointerEvents: 'none' }]} />}
                        {plant && crop ? (
                          <>
                            <Text style={s.cellEmoji}>{crop.emoji}</Text>
                            <Text style={s.cellLabel} numberOfLines={1}>
                              {plant.name}
                            </Text>
                            <View style={[s.cellDot, { backgroundColor: statusColor ?? colors.primary }]} />
                            {count > 1 && (
                              <View style={s.badge}>
                                <Text style={s.badgeText}>{count}x</Text>
                              </View>
                            )}
                            {isPro && rightMarker && (
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
                            {isPro && bottomMarker && (
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

                    if (!editingLayout) {
                      return <React.Fragment key={idx}>{cellContent}</React.Fragment>;
                    }

                    return (
                      <GestureDetector key={idx} gesture={gridPanGesture}>
                        {cellContent}
                      </GestureDetector>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={s.fieldMetrics}>
                {[
                { icon: 'water-outline' as const, label: t('gardenMap.water'), value: waterLabel, accent: '#A8E6CF' },
                { icon: 'pulse-outline' as const, label: t('gardenMap.health'), value: `${healthPercent}%`, accent: '#B8E986' },
                { icon: 'layers-outline' as const, label: t('gardenMap.soil'), value: soilLabel, accent: '#F3D9A4' },
                { icon: 'bug-outline' as const, label: t('gardenMap.pests'), value: pestLabel, accent: activePests ? '#FFD180' : '#B8E986' },
              ].map((metric) => (
                <Pressable
                  key={metric.label}
                  onPress={() => {
                    if (focusPlant) router.push(`/plant/${focusPlant.id}`);
                    else router.push('/care-plan' as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${metric.label}: ${metric.value}`}
                  style={({ pressed }) => [s.fieldMetricCard, { opacity: pressed ? 0.78 : 1 }]}
                >
                  {glassAvailable && <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />}
                  <View style={s.fieldMetricHeader}>
                    <View style={[s.fieldMetricIcon, { backgroundColor: `${metric.accent}30` }]}>
                      <Ionicons name={metric.icon} size={13} color={metric.accent} />
                    </View>
                    <Text style={s.fieldMetricLabel}>{metric.label}</Text>
                  </View>
                  <Text style={s.fieldMetricValue} numberOfLines={1}>{metric.value}</Text>
                </Pressable>
              ))}
            </View>

            <View style={s.fieldFooter}>
              <Text style={s.fieldFooterText}><Ionicons name="leaf-outline" size={12} color="rgba(255,255,255,0.72)" /> {t('gardenMap.tapToExplore')}</Text>
            </View>
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

          {!isFreeLayout && gardenPlants.some((plant) => Boolean(plant.bedName?.trim())) && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/rotation' as any)}
              style={({ pressed }) => [s.rotationLink, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}
            >
              <Ionicons name="refresh-circle-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.rotationLinkTitle, { color: colors.text }]}>{t('settings.rotation')}</Text>
                <Text style={[s.rotationLinkDesc, { color: colors.textSecondary }]}>{t('settings.rotationDesc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
            </Pressable>
          )}

          {!isPro && (
            <Pressable
              onPress={() => openMapPro()}
              style={[s.proMapHint, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
            >
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
              <Text style={[s.proMapHintText, { color: colors.textSecondary }]}>{t('gardenMap.proFeatures')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>
          )}

          <View style={[s.mapControls, { borderTopColor: colors.border }]}>
            <Text style={[s.mapControlsTitle, { color: colors.text }]}>{t('gardenMap.filtersTitle')}</Text>
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

            <View style={s.layerBar}>
              <Text style={[s.layerLabel, { color: colors.textSecondary }]}>{t('gardenMap.layerTitle')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.layerScroll}>
                {MAP_LAYERS.map(({ key, translationKey, icon }) => {
                  const active = mapLayer === key;
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => setMapLayer(key)}
                      style={({ pressed }) => [
                        s.layerChip,
                        {
                          backgroundColor: active ? colors.accent : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Ionicons name={icon} size={14} color={active ? colors.primary : colors.textSecondary} />
                      <Text style={[s.layerChipText, { color: active ? colors.primaryDark : colors.textSecondary }]}>
                        {t(translationKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {mapFilter !== 'all' && filterMatchCount === 0 && (
              <View style={[s.filterEmpty, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons name="filter-outline" size={17} color={colors.textSecondary} />
                <Text style={[s.filterEmptyText, { color: colors.textSecondary }]}>
                  {t('gardenMap.filterEmpty')} · {activeFilterLabel}
                </Text>
                <Pressable onPress={() => setMapFilter('all')} accessibilityRole="button">
                  <Text style={[s.filterEmptyAction, { color: colors.primary }]}>{t('gardenMap.filterAll')}</Text>
                </Pressable>
              </View>
            )}
          </View>

        </ScrollView>

        {embedded && viewMode === 'list' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.listView}
          >
            <Text style={[s.listViewTitle, { color: colors.text }]}>
              {listPlants.length} · {t('tabs.plants')}
            </Text>
            {listPlants.length === 0 ? (
              <View style={[s.listEmpty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="leaf-outline" size={28} color={colors.primary} />
                <Text style={[s.listEmptyTitle, { color: colors.text }]}>{t('gardenMap.emptyTitle')}</Text>
                <Text style={[s.listEmptyDesc, { color: colors.textSecondary }]}>{t('gardenMap.emptyDesc')}</Text>
                <Button title={t('gardenMap.addPlant')} onPress={() => router.push('/plant/new' as any)} size="sm" />
              </View>
            ) : (
              listPlants.map((plant) => {
                const crop = CROPS_BY_ID[plant.cropId] ?? customCropsById[plant.cropId];
                const status = PLANT_STATUS_CONFIG[plant.status];
                return (
                  <Pressable
                    key={plant.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${plant.name} · ${crop?.name ?? plant.cropId}`}
                    onPress={() => router.push(`/plant/${plant.id}`)}
                    style={({ pressed }) => [s.listItem, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}
                  >
                    <View style={[s.listItemIcon, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={{ fontSize: 22 }}>{crop?.emoji ?? status.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[s.listItemName, { color: colors.text }]} numberOfLines={1}>{plant.name}</Text>
                      <Text style={[s.listItemMeta, { color: colors.textSecondary }]} numberOfLines={1}>{crop?.name ?? plant.cropId}</Text>
                      <View style={s.listItemStatus}>
                        <View style={[s.listItemDot, { backgroundColor: status.color }]} />
                        <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{t(`plantStatus.${plant.status}`)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}

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
            embedded && viewMode === 'list' && { display: 'none' },
          ]}
        >
          {/* Panel handle / header */}
          <View style={s.panelHandle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={embedded && !editingLayout ? t('gardenMap.editLocations') : t('gardenMap.unplaced')}
              onPress={() => {
                if (embedded && !editingLayout) {
                  setEditingLayout(true);
                  setPanelCollapsed(false);
                  return;
                }
                setPanelCollapsed((value) => !value);
              }}
              style={({ pressed }) => [s.panelTitleButton, { opacity: pressed ? 0.72 : 1 }]}
              hitSlop={8}
            >
              <View style={s.panelTitleRow}>
                <View style={[s.panelBadge, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[s.panelBadgeText, { color: colors.primary }]}>
                    {availablePlants.length}
                  </Text>
                </View>
                <Text style={[s.panelTitle, { color: colors.text }]}>
                  {embedded && !editingLayout ? t('gardenMap.editLocations') : t('gardenMap.unplaced')}
                </Text>
                {editingLayout && !panelCollapsed && (
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
            {embedded && editingLayout && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('gardenMap.doneEditing')}
                onPress={() => {
                  setEditingLayout(false);
                  setPanelCollapsed(true);
                }}
                style={({ pressed }) => [s.panelDoneButton, { borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}
              >
                <Text style={[s.panelDoneText, { color: colors.primary }]}>{t('gardenMap.doneEditing')}</Text>
              </Pressable>
            )}
          </View>

          {/* Plant cards */}
          {(!embedded || editingLayout) && !panelCollapsed && (
            availablePlants.length === 0 ? (
              <View style={s.panelEmpty}>
                <Text style={[s.panelEmptyText, { color: colors.textSecondary }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} /> {t('gardenMap.allPlaced')}
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
                      style={[s.contextBtn, { backgroundColor: colors.primary + '15' }]}
                    >
                      <Ionicons name="eye-outline" size={20} color={colors.primary} />
                      <Text style={[s.contextBtnText, { color: colors.primary }]}>{t('gardenMap.viewPlant')}</Text>
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
                style={[s.notesSaveBtn, { backgroundColor: colors.primary, opacity: savingNotes ? 0.6 : 1 }]}
              >
                <Text style={[s.notesSaveBtnText, { color: colors.background }]}>{t('gardenMap.notesSave')}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

      </SafeAreaView>

      {/* ── Floating ghost ── */}
      {isDragging && (
        <Animated.View style={[s.ghost, ghostAnimStyle, { pointerEvents: 'none' }]}>
          <Text style={{ fontSize: 40 }}>{ghostEmoji}</Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function GardenMapScreen() {
  return <GardenMapContent />;
}

type StitchMapTabProps = {
  garden: Garden | undefined;
  plants: Plant[];
  entries: DiaryEntry[];
  cropCatalog: Record<string, CropInfo | undefined>;
  weather: WeatherData | null;
  loading: boolean;
};

function StitchMapTab({ garden, plants, entries, cropCatalog, weather, loading }: StitchMapTabProps) {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii, shadows } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'space' | 'zones' | 'list'>('zones');
  const [soilPlant, setSoilPlant] = useState<Plant | null>(null);
  const [saving, setSaving] = useState(false);

  const activePlants = useMemo(
    () => plants.filter((plant) => plant.status !== 'finished'),
    [plants]
  );
  const getCrop = (plant: Plant) => cropCatalog[plant.cropId];
  const directSun = activePlants.filter((plant) => getCrop(plant)?.sunNeeds === 'full');
  const partialSun = activePlants.filter((plant) => getCrop(plant)?.sunNeeds !== 'full');
  const formattedWeather = weather
    ? `${weather.today.tempMax}° · ${weather.today.rainProbability}%`
    : null;

  async function chooseSoilResult(kind: 'watering' | 'moist') {
    if (!soilPlant || saving) return;
    setSaving(true);
    try {
      await recordCare(
        soilPlant.id,
        kind,
        t('dailyCare.moistNote'),
        kind === 'watering' ? { liters: '0.4', method: 'hand' } : undefined,
      );
      setSoilPlant(null);
    } finally {
      setSaving(false);
    }
  }

  const renderPlant = (plant: Plant) => {
    const crop = getCrop(plant);
    return (
      <StitchMapPlantCard
        key={plant.id}
        plant={plant}
        crop={crop}
        entries={entries}
        colors={colors}
        spacing={spacing}
        fontSize={fontSize}
        fontWeight={fontWeight}
        radii={radii}
        shadows={shadows}
        t={t}
        onOpen={() => router.push(`/plant/${plant.id}`)}
        onCheck={() => setSoilPlant(plant)}
      />
    );
  };

  const zone = (title: string, subtitle: string, zonePlants: Plant[], accent: string) => (
    <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: accent }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>{title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>{subtitle}</Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{zonePlants.length}</Text>
      </View>
      {zonePlants.length > 0 ? zonePlants.map(renderPlant) : (
        <View style={{ padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('gardenMap.emptyZone', { defaultValue: 'Todavía no hay macetas en esta zona.' })}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gardens.title')}
            onPress={() => router.push('/gardens' as any)}
            hitSlop={12}
            style={{ minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 3 }}
          >
            <Ionicons name="chevron-back" size={23} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>{t('gardens.title')}</Text>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }} numberOfLines={1}>{garden?.name ?? t('gardenMap.title')}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }} numberOfLines={1}>
              {garden?.province ? `${garden.province} · ${t('gardenMap.south')}` : t('gardenMap.lead')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gardenMap.editLocations')}
            onPress={() => router.push('/garden/edit' as any)}
            hitSlop={12}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="options-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm }}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              {garden?.province ? `☀️ ${t('gardenMap.south')} · ${t('gardenMap.sunNeeds.full')} · ${formattedWeather ?? t('gardenMap.noData')}` : t('gardenMap.lead')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="navigate-outline" size={17} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                {garden?.name ?? t('gardenMap.title')} · {activePlants.length} {t('gardenMap.plantsBadge')}
              </Text>
            </View>
          </View>

          <View accessibilityRole="tablist" style={{ flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.md, padding: 3, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt }}>
            {([
              ['space', t('gardenMap.spaceSketch', { defaultValue: 'Croquis espacial' }), 'map-outline'],
              ['zones', t('gardenMap.lightZones', { defaultValue: 'Por franjas de luz' }), 'sunny-outline'],
              ['list', t('gardenMap.viewList'), 'list-outline'],
            ] as const).map(([mode, label, icon]) => {
              const active = viewMode === mode;
              return (
                <Pressable
                  key={mode}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                  onPress={() => setViewMode(mode)}
                  style={({ pressed }) => [{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, borderRadius: radii.md, backgroundColor: active ? colors.surface : 'transparent', opacity: pressed ? 0.72 : 1 }]}
                >
                  <Ionicons name={icon} size={16} color={active ? colors.primary : colors.textSecondary} />
                  <Text style={{ color: active ? colors.primaryDark : colors.textSecondary, fontSize: fontSize.xs, fontWeight: active ? fontWeight.bold : fontWeight.medium }} numberOfLines={1}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <View style={{ minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.loading')}</Text>
            </View>
          ) : viewMode === 'list' ? (
            <View style={{ padding: spacing.lg, gap: spacing.sm }}>
              {activePlants.length > 0 ? activePlants.map(renderPlant) : (
                <View style={{ alignItems: 'center', padding: spacing.xl, gap: spacing.sm, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                  <Ionicons name="leaf-outline" size={30} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' }}>{t('gardenMap.emptyTitle')}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 }}>{t('gardenMap.emptyDesc')}</Text>
                  <Button title={t('gardenMap.addPlant')} onPress={() => router.push('/plant/new' as any)} size="sm" />
                </View>
              )}
            </View>
          ) : viewMode === 'space' ? (
            <View style={{ margin: spacing.lg, padding: spacing.lg, borderRadius: radii.xl, backgroundColor: colors.primaryDark, gap: spacing.md, ...shadows.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="map-outline" size={19} color={colors.background} />
                <Text style={{ color: colors.background, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>{garden?.name ?? t('gardenMap.title')}</Text>
              </View>
              <Text style={{ color: colors.background, opacity: 0.82, fontSize: fontSize.sm, lineHeight: 20 }}>{t('gardenMap.tapToExplore')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {activePlants.length > 0 ? activePlants.map((plant) => {
                  const crop = getCrop(plant);
                  return (
                    <Pressable key={plant.id} onPress={() => router.push(`/plant/${plant.id}`)} accessibilityRole="button" accessibilityLabel={plant.name} style={({ pressed }) => [{ minWidth: 118, flexGrow: 1, padding: spacing.md, borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.14)', opacity: pressed ? 0.72 : 1 }]}>
                      <Text style={{ fontSize: 26 }}>{crop?.emoji ?? '🌱'}</Text>
                      <Text style={{ color: colors.background, fontWeight: fontWeight.bold, marginTop: spacing.xs }} numberOfLines={1}>{plant.name}</Text>
                      <Text style={{ color: colors.background, opacity: 0.76, fontSize: fontSize.xs, marginTop: 2 }}>{crop?.name ?? plant.cropId}</Text>
                    </Pressable>
                  );
                }) : <Text style={{ color: colors.background }}>{t('gardenMap.emptyDesc')}</Text>}
              </View>
            </View>
          ) : (
            <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
              {zone(t('gardenMap.sunNeeds.full'), t('gardenMap.sunNeeds.full') + ' · 6h+', directSun, colors.secondary)}
              {zone(t('gardenMap.sunNeeds.partial'), t('gardenMap.sunNeeds.partial'), partialSun, colors.primaryLight)}
            </View>
          )}

          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.secondary + '66', backgroundColor: colors.secondary + '14', flexDirection: 'row', gap: spacing.sm }}>
            <Ionicons name="bulb-outline" size={20} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>{t('gardenMap.goldenRule', { defaultValue: 'Regla de oro' })}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18, marginTop: 2 }}>{t('dailyCare.checkBody')}</Text>
            </View>
          </View>

          <Button title={t('gardenMap.addPlant')} onPress={() => router.push('/plant/new' as any)} size="lg" style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }} />
        </ScrollView>
      </View>

      <Modal visible={Boolean(soilPlant)} transparent animationType="slide" onRequestClose={() => setSoilPlant(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22,36,15,0.34)' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setSoilPlant(null)} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal style={{ padding: spacing.xl, paddingBottom: spacing.xl + 12, gap: spacing.md, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', backgroundColor: colors.border }} />
            <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>{t('dailyCare.checkTitle', { name: soilPlant?.name ?? '' })}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 23 }}>{t('dailyCare.checkBody')}</Text>
            <Button title={t('dailyCare.watered')} onPress={() => void chooseSoilResult('watering')} loading={saving} size="lg" />
            <Button title={t('dailyCare.moist')} onPress={() => void chooseSoilResult('moist')} disabled={saving} variant="outline" size="lg" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type StitchMapPlantCardProps = {
  plant: Plant;
  crop?: CropInfo;
  entries: DiaryEntry[];
  colors: ReturnType<typeof useColors>;
  spacing: Record<string, number>;
  fontSize: Record<string, number>;
  fontWeight: Theme['fontWeight'];
  radii: Record<string, number>;
  shadows: Theme['shadows'];
  t: any;
  onOpen: () => void;
  onCheck: () => void;
};

function StitchMapPlantCard({ plant, crop, entries, colors, spacing, fontSize, fontWeight, radii, shadows, t, onOpen, onCheck }: StitchMapPlantCardProps) {
  const checked = hasSoilCheckToday(plant, entries);
  const status = PLANT_STATUS_CONFIG[plant.status];
  const imageUri = plant.photoUri ?? CROP_IMAGES[plant.cropId] ?? crop?.imageUrl;
  const minLiters = CROP_CONTAINER_MIN[plant.cropId];

  return (
    <View style={{ padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surface, ...shadows.sm }}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${plant.name} · ${crop?.name ?? plant.cropId}`} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.72 : 1 }]}>
        <View style={{ width: 64, height: 64, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
          {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 28 }}>{crop?.emoji ?? status.emoji}</Text>}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }} numberOfLines={1}>{plant.name}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }} numberOfLines={1}>{crop?.name ?? plant.cropId}{plant.variety ? ` · ${plant.variety}` : ''}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: status.color, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{status.emoji} {t(`plantStatus.${plant.status}`)}</Text>
            {minLiters ? <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}><Ionicons name="flower-outline" size={12} color={colors.textSecondary} /> {minLiters} L</Text> : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
        <Text style={{ flex: 1, color: checked ? colors.success : colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18 }}>
          {checked ? <><Ionicons name="checkmark-circle-outline" size={13} color={colors.success} /> {t('dailyCare.recorded')}</> : <><Ionicons name="water-outline" size={13} color={colors.water} /> {t('gardenMap.waterNeeds.' + (crop?.waterNeeds ?? 'medium'))}</>}
        </Text>
        {!checked && <Button title={t('dailyCare.checkSoil')} onPress={onCheck} size="sm" variant="secondary" />}
      </View>
    </View>
  );
}

type FreeGardenCanvasProps = {
  plants: Plant[];
  positions: Record<string, FreeMapPosition>;
  mapFilter: MapFilter;
  mapLayer: MapLayer;
  editing: boolean;
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
  mapLayer,
  editing,
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
  const canvasHeight = Math.max(286, 52 + Math.ceil(Math.max(plants.length, 1) / 2) * 76);
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
      <View style={[styles.freeCanvasInner, { borderColor: colors.border, pointerEvents: 'none' }]} />
      <View
        style={[styles.freeCanvasGuide, { backgroundColor: colors.border, pointerEvents: 'none' }]}
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
        const layerColor = mapLayer === 'pests'
          ? plant.pestStatus === 'active'
            ? colors.error
            : plant.pestStatus === 'treated'
            ? colors.warning
            : colors.success
          : mapLayer === 'water'
          ? crop?.waterNeeds === 'high'
            ? colors.warning
            : crop?.waterNeeds === 'medium'
            ? colors.secondary
            : colors.primary
          : mapLayer === 'light'
          ? crop?.sunNeeds === 'full'
            ? colors.warning
            : crop?.sunNeeds === 'partial'
            ? colors.secondary
            : colors.primary
          : plant.pestStatus === 'active'
          ? colors.warning
          : colors.primary;
        const statusLabel = mapLayer === 'water' && crop?.waterNeeds
          ? t(`gardenMap.waterNeeds.${crop.waterNeeds}`)
          : mapLayer === 'light' && crop?.sunNeeds
          ? t(`gardenMap.sunNeeds.${crop.sunNeeds}`)
          : mapLayer === 'pests'
          ? t(`pestStatus.${plant.pestStatus ?? 'none'}`)
          : plant.pestStatus === 'active'
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
            editing && (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4),
          onPanResponderGrant: () => {
            if (!editing) return;
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
                  borderColor: isSelected ? colors.primary : mapLayer === 'plants' ? colors.border : layerColor + '88',
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
              {editing && <Ionicons name="move-outline" size={13} color={colors.textSecondary} />}
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
    loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    loadingStateText: { fontSize: fontSize.sm },
    appHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    brandMark: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    brandName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
    topActions: { flexDirection: 'row', gap: 4 },
    topAction: { width: 44, height: 44, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    intro: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
    introTitle: { fontSize: 31, lineHeight: 34, fontWeight: fontWeight.bold, letterSpacing: -0.9 },
    introLead: { fontSize: fontSize.sm, lineHeight: 21, marginTop: spacing.sm, maxWidth: 340 },
    viewSwitcher: {
      flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.sm,
      padding: 3, borderWidth: 1, borderRadius: radii.lg,
    },
    viewSwitcherTab: {
      flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: spacing.xs, borderWidth: 1, borderColor: 'transparent', borderRadius: radii.md,
    },
    todayCard: {
      marginHorizontal: spacing.xl, marginBottom: spacing.sm, padding: spacing.md,
      borderRadius: radii.md, borderWidth: 1, gap: spacing.sm,
    },
    todayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    todayIcon: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
    todayLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    todayHeading: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 2 },
    todayDescription: { fontSize: fontSize.xs, lineHeight: 17 },
    todayButton: { alignSelf: 'flex-start' },
    weatherStrip: {
      marginHorizontal: spacing.xl, marginBottom: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    },
    weatherStripEmoji: { fontSize: 24 },
    weatherStripPlace: { fontSize: fontSize.xs },
    weatherStripLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 2 },
    weatherStripTemps: { alignItems: 'flex-end' },
    weatherStripMax: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    weatherStripMin: { fontSize: fontSize.xs, marginTop: 1 },
    weatherAlertStrip: {
      marginHorizontal: spacing.xl, marginBottom: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    },
    weatherAlertText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, fontWeight: fontWeight.medium },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1,
    },
    headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    headerSub: { fontSize: fontSize.xs, marginTop: 1 },
    typeBadge: { borderRadius: radii.full, paddingHorizontal: 6, paddingVertical: 2 },
    filterRow: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, gap: spacing.sm },
    mapControls: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.xs },
    mapControlsTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, paddingHorizontal: spacing.xl },
    filterEmpty: { marginHorizontal: spacing.xl, marginTop: spacing.xs, padding: spacing.sm, borderWidth: 1, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    filterEmptyText: { flex: 1, fontSize: fontSize.xs },
    filterEmptyAction: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    filterChip: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radii.sm,
      borderWidth: 1,
    },
    filterChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    layerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
    layerLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginRight: spacing.sm },
    layerScroll: { gap: spacing.sm, paddingRight: spacing.xl },
    layerChip: {
      minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.md, borderRadius: radii.sm, borderWidth: 1,
    },
    layerChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
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
    freeMapCard: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      marginHorizontal: spacing.xl, marginTop: spacing.sm, padding: spacing.md,
      borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden',
    },
    freeMapIcon: {
      width: 36, height: 36, borderRadius: radii.md,
      alignItems: 'center', justifyContent: 'center',
    },
    freeMapTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    freeMapTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    freeMapDesc: { fontSize: fontSize.xs, lineHeight: 17, marginTop: 2 },
    proPill: { borderRadius: radii.full, paddingHorizontal: 6, paddingVertical: 2 },
    proPillText: { fontSize: 9, fontWeight: fontWeight.bold, letterSpacing: 0.4 },
    scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    listView: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    listViewTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
    listItem: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radii.xl },
    listItemIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    listItemName: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
    listItemMeta: { fontSize: fontSize.xs },
    listItemStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    listItemDot: { width: 7, height: 7, borderRadius: 4 },
    listEmpty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderWidth: 1, borderRadius: radii.xl },
    listEmptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
    listEmptyDesc: { fontSize: fontSize.sm, lineHeight: 20, textAlign: 'center' },
    compassRow: { alignItems: 'center', marginBottom: spacing.sm },
    compassBadge: { paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radii.full, borderWidth: 1 },
    fieldStage: { position: 'relative', overflow: 'hidden', paddingBottom: spacing.md },
    fieldBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
    fieldBackdropImage: { opacity: 0.82 },
    fieldBackdropTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,76,29,0.46)' },
    fieldRow: {
      position: 'absolute', left: '-28%', width: '160%', height: 44,
      backgroundColor: 'rgba(177,205,91,0.16)', borderTopWidth: 1, borderBottomWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    fieldContour: {
      position: 'absolute', width: '78%', height: 110, borderWidth: 1,
      borderColor: 'rgba(221,237,170,0.18)', borderRadius: 90,
    },
    fieldHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
    },
    fieldHeaderTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    fieldTitle: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: 0.1 },
    fieldSubtitle: { color: 'rgba(255,255,255,0.76)', fontSize: 11, marginTop: 2 },
    fieldSunPill: {
      borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 5,
      backgroundColor: 'rgba(12,40,17,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    },
    fieldSunText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: fontWeight.semibold },
    focusSummary: {
      marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md,
      borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: 'rgba(8,31,17,0.57)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden',
    },
    focusSummaryIcon: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    focusSummaryEmoji: { fontSize: 22, color: '#fff' },
    focusSummaryName: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
    focusSummaryHint: { color: 'rgba(255,255,255,0.64)', fontSize: 10, marginTop: 2 },
    focusSummaryStats: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    focusStatLabel: { color: 'rgba(255,255,255,0.56)', fontSize: 9 },
    focusStatValue: { color: '#fff', fontSize: 12, fontWeight: fontWeight.bold, marginTop: 2 },
    fieldGrid: { marginHorizontal: spacing.lg, padding: 2, gap: 2 },
    focusRing: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radii.sm, borderWidth: 1,
      borderColor: 'rgba(210,255,166,0.7)', backgroundColor: 'rgba(222,255,190,0.12)',
    },
    fieldMetrics: {
      marginHorizontal: spacing.lg, marginTop: spacing.md,
      flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    },
    fieldMetricCard: {
      width: '47%', minHeight: 68, borderRadius: radii.lg, padding: spacing.sm,
      backgroundColor: 'rgba(10,35,19,0.56)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
      justifyContent: 'space-between', overflow: 'hidden',
    },
    fieldMetricHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    fieldMetricIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    fieldMetricLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: fontWeight.medium },
    fieldMetricValue: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: 6 },
    fieldFooter: { alignItems: 'center', paddingTop: spacing.sm },
    fieldFooterText: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: fontWeight.medium },
    grid: { borderWidth: 1, overflow: 'hidden', gap: 2, padding: 2 },
    gridRow: { flexDirection: 'row', gap: 2 },
    cell: {
      flex: 1, aspectRatio: 0.85, borderRadius: radii.sm, borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center', gap: 2, padding: 2, overflow: 'visible',
    },
    cellEmoji: Platform.select({
      web: { fontSize: 25, textShadow: '0px 1px 2px rgba(0,0,0,0.35)' },
      default: { fontSize: 25, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    }),
    cellLabel: {
      maxWidth: '96%', paddingHorizontal: 5, paddingVertical: 2, borderRadius: radii.full,
      backgroundColor: 'rgba(7,29,14,0.72)', color: '#fff', fontSize: 10, fontWeight: fontWeight.semibold, textAlign: 'center',
    },
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
    rotationLink: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, borderWidth: 1,
    },
    rotationLinkTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    rotationLinkDesc: { fontSize: fontSize.xs, marginTop: 2 },
    proMapHint: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radii.md, borderWidth: 1,
    },
    proMapHintText: { flex: 1, fontSize: fontSize.xs, lineHeight: 16 },
    freeCanvas: {
      position: 'relative',
      minHeight: 286,
      borderWidth: 1,
      borderRadius: radii.md,
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
      borderRadius: radii.md,
      gap: spacing.sm,
    },
    freeLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    freeLegendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    freeLegendDot: { width: 9, height: 9, borderRadius: 5 },
    freeLegendText: { fontSize: fontSize.xs },
    selectedPlantPanel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
    freeSelectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
    freeSelectedText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
    selectedPlantHint: { fontSize: fontSize.xs, lineHeight: 16, marginTop: 2 },
    selectedCareButton: { minWidth: 92 },
    editingHint: { fontSize: fontSize.xs, lineHeight: 17 },
    freeHint: { fontSize: fontSize.xs, lineHeight: 18 },
    editLocationsButton: { width: '100%', marginTop: spacing.xs },
    emptyMapCard: {
      alignItems: 'center',
      padding: spacing.lg,
      borderWidth: 1,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
    },
    emptyMapIcon: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    emptyMapTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, textAlign: 'center' },
    emptyMapDesc: { fontSize: fontSize.sm, lineHeight: 19, textAlign: 'center', marginTop: 4, maxWidth: 290 },
    emptyMapButton: { alignSelf: 'stretch', marginTop: spacing.md },
    // ── Plant panel ──
    panel: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
    },
    panelHandle: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingHorizontal: spacing.lg, height: PANEL_COLLAPSED_H,
    },
    panelTitleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
    panelDoneButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderWidth: 1, borderRadius: radii.sm },
    panelDoneText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
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
    panelCardName: { fontSize: 10, fontWeight: fontWeight.medium, textAlign: 'center' },
    panelCardVariety: { fontSize: 9, textAlign: 'center' },
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
