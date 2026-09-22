import { useColors, useTheme } from '@portfolio/ui';
import { useCollection } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { Plant } from '../../src/models/plant';
import { PLANT_STATUS_CONFIG } from '../../src/models/plant';
import { CROPS_BY_ID } from '../../src/data/crops';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import {
  DEFAULT_GRID_COLS,
  DEFAULT_GRID_ROWS,
  useGardenLayout,
} from '../../src/hooks/useGardenLayout';
import { useGardenFreeLayout } from '../../src/hooks/useGardenFreeLayout';
import { StitchBottomNav } from '../../src/components/StitchBottomNav';

type LayoutMode = 'sketch' | 'list';
type PlantFilter = 'all' | 'unplaced' | 'pests';

export default function GardenMapScreen() {
  const colors = useColors();
  const { spacing, fontSize, fontWeight, radii } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { activeGarden } = useActiveGarden();
  const plants = useCollection<Plant>('plants');
  const [mode, setMode] = useState<LayoutMode>('sketch');
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [focusedPlantId, setFocusedPlantId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [freeCanvasSize, setFreeCanvasSize] = useState({ width: 0, height: 0 });
  const [plantQuery, setPlantQuery] = useState('');
  const [plantFilter, setPlantFilter] = useState<PlantFilter>('all');

  const gridRows = activeGarden?.gridRows ?? DEFAULT_GRID_ROWS;
  const gridCols = activeGarden?.gridCols ?? DEFAULT_GRID_COLS;
  const {
    layout,
    loading: layoutLoading,
    placePlant,
    swapCells,
    removePlant,
    clearAll,
  } = useGardenLayout(activeGarden?.id, gridRows, gridCols);
  const {
    positions: freePositions,
    loading: freeLayoutLoading,
    setPosition,
    removePosition,
    clearAll: clearFreeLayout,
  } = useGardenFreeLayout(activeGarden?.id);

  const gardenPlants = useMemo(
    () => plants.items.filter((plant) => !plant.deletedAt && (!activeGarden?.id || plant.gardenId === activeGarden.id)),
    [activeGarden?.id, plants.items],
  );
  const plantById = useMemo(() => new Map(gardenPlants.map((plant) => [plant.id, plant])), [gardenPlants]);
  const isFreeSpace = activeGarden?.gardenType === 'balcon' || activeGarden?.gardenType === 'maceta';
  const placedIds = useMemo(() => new Set(layout.filter(Boolean) as string[]), [layout]);
  const assignedIds = useMemo(() => new Set(isFreeSpace ? Object.keys(freePositions) : Array.from(placedIds)), [freePositions, isFreeSpace, placedIds]);
  const placedCount = layout.filter((cell) => cell && plantById.has(cell)).length;
  const freePlacedCount = Object.keys(freePositions).filter((plantId) => plantById.has(plantId)).length;
  const activePlacedCount = isFreeSpace ? freePlacedCount : placedCount;
  const unplacedPlants = useMemo(() => gardenPlants.filter((plant) => !assignedIds.has(plant.id)), [assignedIds, gardenPlants]);
  const pestPlants = useMemo(() => gardenPlants.filter((plant) => plant.pestStatus === 'active'), [gardenPlants]);
  const selectedPlant = selectedPlantId ? plantById.get(selectedPlantId) : undefined;
  const focusedPlant = focusedPlantId ? plantById.get(focusedPlantId) : undefined;
  const focusedCrop = focusedPlant ? CROPS_BY_ID[focusedPlant.cropId] : undefined;
  const relatedPlants = useMemo(() => {
    if (!focusedPlant || !focusedCrop) return { companions: [] as Plant[], incompatible: [] as Plant[] };
    return gardenPlants.reduce<{ companions: Plant[]; incompatible: Plant[] }>((result, plant) => {
      if (plant.id === focusedPlant.id) return result;
      if (focusedCrop.companions.includes(plant.cropId)) result.companions.push(plant);
      if (focusedCrop.incompatible.includes(plant.cropId)) result.incompatible.push(plant);
      return result;
    }, { companions: [], incompatible: [] });
  }, [focusedCrop, focusedPlant, gardenPlants]);
  const visiblePlants = useMemo(() => {
    const query = plantQuery.trim().toLocaleLowerCase();
    return gardenPlants.filter((plant) => {
      const matchesFilter = plantFilter === 'all'
        || (plantFilter === 'unplaced' && !assignedIds.has(plant.id))
        || (plantFilter === 'pests' && plant.pestStatus === 'active');
      const matchesQuery = !query || `${plant.name} ${plant.variety ?? ''} ${CROPS_BY_ID[plant.cropId]?.name ?? ''}`.toLocaleLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [assignedIds, gardenPlants, plantFilter, plantQuery]);

  const mapPlants = useMemo(
    () => gardenPlants.map((plant) => ({
      plant,
      variety: plant.variety ?? CROPS_BY_ID[plant.cropId]?.name ?? 'Cultivo registrado',
      location: plant.bedName ?? t('gardenMap.emptyNote'),
      status: `${PLANT_STATUS_CONFIG[plant.status].label}${plant.pestStatus === 'active' ? ' · Plaga registrada' : ''}`,
    })),
    [gardenPlants, t],
  );

  useEffect(() => {
    setSelectedPlantId(null);
    setFocusedPlantId(null);
    setConfirmClear(false);
    setPlantQuery('');
    setPlantFilter('all');
  }, [activeGarden?.id]);

  function openPlant(plant: Plant) {
    router.push(`/plant/${plant.id}` as any);
  }

  function openSoil(plant: Plant) {
    router.push({ pathname: '/modal/check-soil-sheet', params: { plantId: plant.id } } as any);
  }

  async function handleCellPress(index: number) {
    const occupiedId = layout[index];

    if (selectedPlantId) {
      if (occupiedId === selectedPlantId) {
        setSelectedPlantId(null);
        return;
      }
      if (occupiedId) {
        const sourceIndex = layout.indexOf(selectedPlantId);
        if (sourceIndex >= 0) {
          await swapCells(sourceIndex, index);
          setSelectedPlantId(null);
          setFocusedPlantId(null);
          return;
        }
        return;
      }
      await placePlant(selectedPlantId, index);
      setSelectedPlantId(null);
      setFocusedPlantId(null);
      return;
    }

    if (occupiedId) {
      const plant = plantById.get(occupiedId);
      if (!plant) {
        await removePlant(occupiedId);
        return;
      }
      setFocusedPlantId(plant.id);
    }
  }

  function handleFreeCanvasPress(event: GestureResponderEvent) {
    if (!selectedPlantId || freeCanvasSize.width <= 0 || freeCanvasSize.height <= 0) {
      setFocusedPlantId(null);
      return;
    }
    const { locationX, locationY } = event.nativeEvent;
    const x = Math.min(0.84, Math.max(0.16, locationX / freeCanvasSize.width));
    const y = Math.min(0.84, Math.max(0.16, locationY / freeCanvasSize.height));
    setPosition(selectedPlantId, { x, y });
    setSelectedPlantId(null);
    setFocusedPlantId(null);
  }

  function askClearLayout() {
    if (activePlacedCount === 0) return;
    setConfirmClear(true);
  }

  const s = makeStyles(colors, spacing, fontSize, fontWeight, radii);
  const relationshipCard = focusedPlant && focusedCrop ? (
    <View style={[s.relationshipCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <View style={s.relationshipHeader}><Ionicons name="git-compare-outline" size={17} color={colors.primary} /><Text style={[s.relationshipTitle, { color: colors.text }]}>Compatibilidad del plano</Text></View>
      {relatedPlants.incompatible.length > 0 ? <View style={s.relationshipLine}><Ionicons name="close-circle-outline" size={15} color={colors.error} /><Text style={[s.relationshipText, { color: colors.error }]}>Evita juntarla con: {relatedPlants.incompatible.map((plant) => plant.name).join(', ')}</Text></View> : <View style={s.relationshipLine}><Ionicons name="checkmark-circle-outline" size={15} color={colors.success} /><Text style={[s.relationshipText, { color: colors.textSecondary }]}>No hay incompatibilidades registradas con tus plantas actuales.</Text></View>}
      {relatedPlants.companions.length > 0 && <View style={s.relationshipLine}><Ionicons name="heart-outline" size={15} color={colors.primary} /><Text style={[s.relationshipText, { color: colors.textSecondary }]}>Buenas compañeras aquí: {relatedPlants.companions.map((plant) => plant.name).join(', ')}</Text></View>}
    </View>
  ) : null;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver a Huertos" onPress={() => router.push('/gardens' as any)} hitSlop={10} style={s.back}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[s.backText, { color: colors.text }]}>Huertos</Text>
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={[s.title, { color: colors.text }]}>{activeGarden?.name ?? t('gardenMap.title')}</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>{activeGarden?.province ?? 'Sin ubicación configurada'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Editar datos del huerto" onPress={() => router.push('/garden/edit' as any)} hitSlop={10} style={s.headerAction}>
            <Ionicons name="options-outline" size={21} color={colors.text} />
          </Pressable>
        </View>

        <View style={[s.segmented, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'sketch' }} onPress={() => setMode('sketch')} style={[s.segment, mode === 'sketch' && { backgroundColor: colors.surface }]}>
            <Ionicons name="grid-outline" size={17} color={mode === 'sketch' ? colors.primary : colors.textSecondary} />
            <Text style={[s.segmentText, { color: mode === 'sketch' ? colors.primaryDark : colors.textSecondary }]}>{t('gardenMap.viewVisual')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === 'list' }} onPress={() => setMode('list')} style={[s.segment, mode === 'list' && { backgroundColor: colors.surface }]}>
            <Ionicons name="list-outline" size={17} color={mode === 'list' ? colors.primary : colors.textSecondary} />
            <Text style={[s.segmentText, { color: mode === 'list' ? colors.primaryDark : colors.textSecondary }]}>{t('gardenMap.viewList')}</Text>
          </Pressable>
        </View>

        {mode === 'sketch' ? (
          <>
            <View style={[s.mapIntro, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.mapIntroIcon, { backgroundColor: colors.primary + '16' }]}>
                <Ionicons name="navigate-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.mapIntroTitle, { color: colors.text }]}>{t('gardenMap.title')}</Text>
                <Text style={[s.mapIntroText, { color: colors.textSecondary }]}>{t('gardenMap.lead')}</Text>
              </View>
              <Text style={[s.mapCount, { color: colors.primary }]}>{activePlacedCount}/{isFreeSpace ? gardenPlants.length : gridRows * gridCols}</Text>
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel="Abrir herramientas completas del plano" onPress={() => router.push('/garden/map-tools' as any)} style={[s.plannerShortcut, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '50' }]}>
              <View style={[s.plannerShortcutIcon, { backgroundColor: colors.primary + '20' }]}><Ionicons name="construct-outline" size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={[s.plannerShortcutTitle, { color: colors.text }]}>Planifica el espacio y la temporada</Text><Text style={[s.plannerShortcutText, { color: colors.textSecondary }]}>Medidas, capas, rotación, lista y exportación</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>

            <View style={[s.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.insightHeader}>
                <View style={[s.insightIcon, { backgroundColor: (unplacedPlants.length || pestPlants.length ? colors.warning : colors.primary) + '18' }]}>
                  <Ionicons name={unplacedPlants.length || pestPlants.length ? 'sparkles-outline' : 'checkmark-circle-outline'} size={19} color={unplacedPlants.length || pestPlants.length ? colors.warning : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.insightTitle, { color: colors.text }]}>{unplacedPlants.length || pestPlants.length ? 'Revisión rápida del plano' : 'Plano bajo control'}</Text>
                  <Text style={[s.insightText, { color: colors.textSecondary }]}>{unplacedPlants.length || pestPlants.length ? 'Tienes información pendiente para organizar mejor tu espacio.' : 'Todas las plantas registradas están ubicadas y sin plagas activas.'}</Text>
                </View>
              </View>
              <View style={s.insightStats}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${unplacedPlants.length} plantas sin ubicar`} onPress={() => { setPlantFilter('unplaced'); setPlantQuery(''); }} style={[s.insightStat, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[s.insightStatValue, { color: unplacedPlants.length ? colors.warning : colors.primary }]}>{unplacedPlants.length}</Text>
                  <Text style={[s.insightStatLabel, { color: colors.textSecondary }]}>Sin ubicar</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`${pestPlants.length} plantas con plagas activas`} onPress={() => { setPlantFilter('pests'); setPlantQuery(''); }} style={[s.insightStat, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[s.insightStatValue, { color: pestPlants.length ? colors.error : colors.primary }]}>{pestPlants.length}</Text>
                  <Text style={[s.insightStatLabel, { color: colors.textSecondary }]}>Plagas activas</Text>
                </Pressable>
                <View style={[s.insightStat, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[s.insightStatValue, { color: colors.primary }]}>{activePlacedCount}</Text>
                  <Text style={[s.insightStatLabel, { color: colors.textSecondary }]}>En el plano</Text>
                </View>
              </View>
            </View>

            {isFreeSpace ? (
              <View style={[s.gridCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={s.gridHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.gridTitle, { color: colors.text }]}>Plano libre del espacio</Text>
                    <Text style={[s.gridSubtitle, { color: colors.textSecondary }]}>{selectedPlant ? `Toca el plano para colocar ${selectedPlant.name}` : 'Distribuye tus macetas, estanterías y ventanas como están en casa'}</Text>
                  </View>
                  <View style={[s.northBadge, { backgroundColor: colors.surfaceAlt }]}><Ionicons name="move-outline" size={13} color={colors.primary} /><Text style={[s.northText, { color: colors.textSecondary }]}>Libre</Text></View>
                </View>

                {freeLayoutLoading ? <View style={s.gridLoading}><ActivityIndicator color={colors.primary} /><Text style={[s.gridLoadingText, { color: colors.textSecondary }]}>Cargando plano…</Text></View> : (
                  <Pressable
                    accessibilityLabel="Plano libre del espacio"
                    onLayout={(event) => setFreeCanvasSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
                    onPress={handleFreeCanvasPress}
                    style={[s.freeCanvas, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  >
                    <View pointerEvents="none" style={s.freeCanvasGrid}>
                      {Array.from({ length: 12 }, (_, index) => <View key={index} style={[s.freeCanvasDot, { backgroundColor: colors.border }]} />)}
                    </View>
                    <Text pointerEvents="none" style={[s.freeCanvasHint, { color: colors.textSecondary }]}>{selectedPlant ? 'Toca cualquier zona para colocarla' : 'Tu espacio · pulsa una planta y después una zona'}</Text>
                    {Object.entries(freePositions).map(([plantId, position], positionIndex) => {
                      const plant = plantById.get(plantId);
                      if (!plant) return null;
                      const markerPosition = normalizeFreePosition(position, positionIndex);
                      const selected = selectedPlantId === plantId;
                      const focused = focusedPlantId === plantId;
                      return (
                        <Pressable
                          key={plantId}
                          accessibilityRole="button"
                          accessibilityLabel={`${plant.name}, posición libre`}
                          onPress={() => setFocusedPlantId(plant.id)}
                          style={[s.freeMarker, { left: `${markerPosition.x * 100}%`, top: `${markerPosition.y * 100}%`, backgroundColor: colors.surface, borderColor: focused || selected ? colors.primary : colors.border }, focused && s.freeMarkerFocused]}
                        >
                          <View style={[s.freeMarkerIcon, { backgroundColor: (plant.pestStatus === 'active' ? colors.warning : colors.primary) + '18' }]}><Ionicons name={plant.pestStatus === 'active' ? 'warning-outline' : 'leaf-outline'} size={18} color={plant.pestStatus === 'active' ? colors.warning : colors.primary} /></View>
                          <Text numberOfLines={1} style={[s.freeMarkerText, { color: colors.text }]}>{plant.name}</Text>
                        </Pressable>
                      );
                    })}
                  </Pressable>
                )}

                {focusedPlant && <View style={[s.cellActions, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}><Text style={[s.cellActionsTitle, { color: colors.text }]}>{focusedPlant.name}</Text><Text style={[s.cellActionsText, { color: colors.textSecondary }]}>Puedes volver a tocar el plano para recolocarla</Text></View>
                  <Pressable accessibilityRole="button" onPress={() => openPlant(focusedPlant)} style={[s.cellAction, { borderColor: colors.border }]}><Ionicons name="arrow-forward-outline" size={15} color={colors.primary} /><Text style={[s.cellActionText, { color: colors.primary }]}>{t('gardenMap.viewPlant')}</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => { setSelectedPlantId(focusedPlant.id); setFocusedPlantId(null); }} style={[s.cellAction, { borderColor: colors.primary }]}><Ionicons name="move-outline" size={15} color={colors.primary} /><Text style={[s.cellActionText, { color: colors.primary }]}>{t('gardenMap.movePlant')}</Text></Pressable>
                  {focusedPlant.status !== 'finished' && <Pressable accessibilityRole="button" onPress={() => openSoil(focusedPlant)} style={[s.cellAction, { borderColor: colors.info }]}><Ionicons name="water-outline" size={15} color={colors.info} /><Text style={[s.cellActionText, { color: colors.info }]}>Revisar sustrato</Text></Pressable>}
                  <Pressable accessibilityRole="button" onPress={() => { removePosition(focusedPlant.id); setFocusedPlantId(null); }} style={[s.cellAction, { borderColor: colors.border }]}><Ionicons name="remove-outline" size={15} color={colors.textSecondary} /><Text style={[s.cellActionText, { color: colors.textSecondary }]}>{t('gardenMap.remove')}</Text></Pressable>
                </View>}
                {relationshipCard}
              </View>
            ) : (
            <View style={[s.gridCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.gridHeader}>
                <View>
                  <Text style={[s.gridTitle, { color: colors.text }]}>{activeGarden?.gardenType === 'maceta' || activeGarden?.gardenType === 'balcon' ? t('gardenMap.potModeHint') : 'Croquis del espacio'}</Text>
                  <Text style={[s.gridSubtitle, { color: colors.textSecondary }]}>{selectedPlant ? `Coloca ${selectedPlant.name} en una parcela` : t('gardenMap.focusEmptyHint')}</Text>
                </View>
                <View style={[s.northBadge, { backgroundColor: colors.surfaceAlt }]}><Ionicons name="arrow-up" size={13} color={colors.primary} /><Text style={[s.northText, { color: colors.textSecondary }]}>{t('gardenMap.south')}</Text></View>
              </View>

              {layoutLoading ? <View style={s.gridLoading}><ActivityIndicator color={colors.primary} /><Text style={[s.gridLoadingText, { color: colors.textSecondary }]}>Cargando plano…</Text></View> : (
                <View style={[s.grid, { aspectRatio: gridCols / gridRows, borderColor: colors.border }]}>
                  {Array.from({ length: gridRows }, (_, row) => (
                    <View key={row} style={s.gridRow}>
                      {Array.from({ length: gridCols }, (_, col) => {
                        const index = row * gridCols + col;
                        const plantId = layout[index];
                        const plant = plantId ? plantById.get(plantId) : undefined;
                        const selected = plantId === selectedPlantId;
                        return (
                          <Pressable
                            key={index}
                            accessibilityRole="button"
                            accessibilityLabel={plant ? `${plant.name}, parcela ${index + 1}` : `Parcela vacía ${index + 1}`}
                            accessibilityState={{ selected }}
                            onPress={() => void handleCellPress(index)}
                            style={[s.gridCell, { backgroundColor: plant ? colors.primary + '15' : colors.surfaceAlt, borderColor: selected ? colors.primary : colors.border }, selected && s.gridCellSelected]}
                          >
                            {plant ? <><Ionicons name={plant.pestStatus === 'active' ? 'warning-outline' : 'leaf-outline'} size={15} color={plant.pestStatus === 'active' ? colors.warning : (selected ? colors.primaryDark : colors.primary)} /><Text numberOfLines={1} style={[s.cellPlantName, { color: colors.text }]}>{plant.name}</Text></> : <Ionicons name="add" size={15} color={colors.textDisabled} />}
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}

              <View style={s.legendRow}>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: colors.primary + '30', borderColor: colors.primary }]} /><Text style={[s.legendText, { color: colors.textSecondary }]}>{t('gardenMap.legendOccupied')}</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} /><Text style={[s.legendText, { color: colors.textSecondary }]}>{t('gardenMap.legendEmpty')}</Text></View>
              </View>
              {focusedPlant && <View style={[s.cellActions, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}><Text style={[s.cellActionsTitle, { color: colors.text }]}>{focusedPlant.name}</Text><Text style={[s.cellActionsText, { color: colors.textSecondary }]}>{t('gardenMap.focusHint')}</Text></View>
                <Pressable accessibilityRole="button" onPress={() => openPlant(focusedPlant)} style={[s.cellAction, { borderColor: colors.border }]}><Ionicons name="arrow-forward-outline" size={15} color={colors.primary} /><Text style={[s.cellActionText, { color: colors.primary }]}>{t('gardenMap.viewPlant')}</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => { setSelectedPlantId(focusedPlant.id); setFocusedPlantId(null); }} style={[s.cellAction, { borderColor: colors.primary }]}><Ionicons name="move-outline" size={15} color={colors.primary} /><Text style={[s.cellActionText, { color: colors.primary }]}>{t('gardenMap.movePlant')}</Text></Pressable>
                {focusedPlant.status !== 'finished' && <Pressable accessibilityRole="button" onPress={() => openSoil(focusedPlant)} style={[s.cellAction, { borderColor: colors.info }]}><Ionicons name="water-outline" size={15} color={colors.info} /><Text style={[s.cellActionText, { color: colors.info }]}>Revisar sustrato</Text></Pressable>}
                <Pressable accessibilityRole="button" onPress={() => { void removePlant(focusedPlant.id); setFocusedPlantId(null); }} style={[s.cellAction, { borderColor: colors.border }]}><Ionicons name="remove-outline" size={15} color={colors.textSecondary} /><Text style={[s.cellActionText, { color: colors.textSecondary }]}>{t('gardenMap.remove')}</Text></Pressable>
              </View>}
              {relationshipCard}
            </View>
            )}

            <View style={[s.plantPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.pickerHeader}><Text style={[s.pickerTitle, { color: colors.text }]}>{t('gardenMap.assignPlant')}</Text><Text style={[s.pickerMeta, { color: colors.textSecondary }]}>{gardenPlants.length} {t('gardenMap.plantsBadge')}</Text></View>
              {gardenPlants.length > 0 && <View style={[s.searchField, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Ionicons name="search-outline" size={17} color={colors.textSecondary} /><TextInput accessibilityLabel="Buscar planta para colocar" value={plantQuery} onChangeText={setPlantQuery} placeholder="Buscar planta o variedad" placeholderTextColor={colors.textDisabled} style={[s.searchInput, { color: colors.text }]} /><Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setPlantQuery('')} disabled={!plantQuery} style={{ opacity: plantQuery ? 1 : 0.35 }}><Ionicons name="close-circle" size={17} color={colors.textSecondary} /></Pressable></View>}
              {gardenPlants.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
                {([{ id: 'all', label: 'Todas', count: gardenPlants.length }, { id: 'unplaced', label: 'Sin ubicar', count: unplacedPlants.length }, { id: 'pests', label: 'Con plagas', count: pestPlants.length }] as Array<{ id: PlantFilter; label: string; count: number }>).map((filter) => <Pressable key={filter.id} accessibilityRole="button" accessibilityState={{ selected: plantFilter === filter.id }} onPress={() => setPlantFilter(filter.id)} style={[s.filterChip, { backgroundColor: plantFilter === filter.id ? colors.primary + '18' : colors.surfaceAlt, borderColor: plantFilter === filter.id ? colors.primary : colors.border }]}><Text style={[s.filterChipText, { color: plantFilter === filter.id ? colors.primaryDark : colors.textSecondary }]}>{filter.label} · {filter.count}</Text></Pressable>)}
              </ScrollView>}
              {gardenPlants.length === 0 ? <Text style={[s.pickerEmpty, { color: colors.textSecondary }]}>{t('gardenMap.emptyDesc')}</Text> : visiblePlants.length === 0 ? <Text style={[s.pickerEmpty, { color: colors.textSecondary }]}>No hay plantas que coincidan con este filtro.</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.plantChipRow}>
                {visiblePlants.map((plant) => {
                  const selected = selectedPlantId === plant.id;
                  const placed = assignedIds.has(plant.id);
                  return <Pressable key={plant.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSelectedPlantId(selected ? null : plant.id)} style={[s.plantChip, { backgroundColor: selected ? colors.primary + '18' : colors.surfaceAlt, borderColor: selected ? colors.primary : colors.border }]}><Ionicons name={placed ? 'leaf' : 'leaf-outline'} size={15} color={selected ? colors.primary : colors.textSecondary} /><Text numberOfLines={1} style={[s.plantChipText, { color: selected ? colors.primaryDark : colors.text }]}>{plant.name}</Text></Pressable>;
                })}
              </ScrollView>}
              {selectedPlant && <Text style={[s.selectedHint, { color: colors.primary }]}>{isFreeSpace ? 'Pulsa una zona del plano para colocarla' : t('gardenMap.selectedHint')}</Text>}
            </View>

            <View style={s.mapActions}>
              <Pressable accessibilityRole="button" onPress={() => router.push('/plant/new' as any)} style={[s.primaryAction, { backgroundColor: colors.primaryDark }]}><Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={s.primaryActionText}>{t('gardenMap.addPlant')}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={askClearLayout} disabled={activePlacedCount === 0} style={[s.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface, opacity: activePlacedCount === 0 ? 0.5 : 1 }]}><Ionicons name="trash-outline" size={18} color={colors.primary} /><Text style={[s.secondaryActionText, { color: colors.primary }]}>{t('gardenMap.removeFromMap')}</Text></Pressable>
              {confirmClear && <View style={[s.confirmCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Text style={[s.confirmText, { color: colors.text }]}>{t('gardenMap.removeDesc', { name: activeGarden?.name ?? t('gardenMap.title') })}</Text><View style={s.confirmActions}><Pressable accessibilityRole="button" onPress={() => setConfirmClear(false)} style={[s.confirmButton, { borderColor: colors.border }]}><Text style={[s.confirmButtonText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { if (isFreeSpace) clearFreeLayout(); else void clearAll(); setConfirmClear(false); }} style={[s.confirmButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={[s.confirmButtonText, { color: '#fff' }]}>{t('gardenMap.remove')}</Text></Pressable></View></View>}
            </View>
          </>
        ) : (
          <>
            <View style={[s.orientationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.orientationIcon, { backgroundColor: colors.primary + '18' }]}><Ionicons name="list-outline" size={20} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={[s.orientationTitle, { color: colors.text }]}>Plantas del espacio</Text><Text style={[s.orientationText, { color: colors.textSecondary }]}>Listado de cultivos registrados, sin simular horas de sol no medidas.</Text></View>
            </View>
            {mapPlants.length === 0 ? <View style={[s.orientationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="map-outline" size={24} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[s.orientationTitle, { color: colors.text }]}>{t('gardenMap.emptyTitle')}</Text><Text style={[s.orientationText, { color: colors.textSecondary }]}>{t('gardenMap.emptyDesc')}</Text></View></View> : <View style={s.listGap}>{mapPlants.map(({ plant, variety, location, status }) => <View key={plant.id} style={[s.plantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={s.plantRow}><View style={[s.plantIcon, { backgroundColor: colors.primary + '1c' }]}><Ionicons name="leaf-outline" size={23} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[s.plantName, { color: colors.text }]}>{plant.name}</Text><Text style={[s.plantVariety, { color: colors.textSecondary }]}>{variety} · {location}</Text></View></View><View style={[s.statusLine, { backgroundColor: colors.surfaceAlt }]}><Ionicons name={plant.status === 'finished' ? 'checkmark-circle-outline' : 'finger-print-outline'} size={16} color={plant.status === 'finished' ? colors.primary : colors.info} /><Text style={[s.statusText, { color: colors.textSecondary }]}>{status}</Text></View><Pressable accessibilityRole="button" onPress={() => plant.status === 'finished' ? openPlant(plant) : openSoil(plant)} style={[s.cardAction, { borderColor: colors.primary }]}><Ionicons name={plant.status === 'finished' ? 'arrow-forward-outline' : 'finger-print-outline'} size={17} color={colors.primary} /><Text style={[s.cardActionText, { color: colors.primary }]}>{plant.status === 'finished' ? t('gardenMap.viewPlant') : 'Comprobar sustrato (2 cm)'}</Text></Pressable></View>)}</View>}
          </>
        )}
      </ScrollView>
      <StitchBottomNav active="map" />
    </SafeAreaView>
  );
}

function normalizeFreePosition(position: { x: number; y: number }, index: number): { x: number; y: number } {
  const fallbackX = 0.18 + (index % 3) * 0.32;
  const fallbackY = 0.2 + Math.floor(index / 3) * 0.25;
  const normalize = (value: number, fallback: number, max: number) => {
    const numeric = Number(value);
    const normalized = Number.isFinite(numeric) ? (numeric > 1 ? numeric / 100 : numeric) : fallback;
    return Math.min(max, Math.max(0.16, normalized));
  };
  return { x: normalize(position.x, fallbackX, 0.84), y: normalize(position.y, fallbackY, 0.84) };
}

function makeStyles(colors: ReturnType<typeof useColors>, spacing: ReturnType<typeof useTheme>['spacing'], fontSize: ReturnType<typeof useTheme>['fontSize'], fontWeight: ReturnType<typeof useTheme>['fontWeight'], radii: ReturnType<typeof useTheme>['radii']) {
  return StyleSheet.create({
    container: { flex: 1 }, content: { paddingHorizontal: spacing.md, paddingBottom: 100, gap: spacing.sm },
    header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { minWidth: 82, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 1 }, backText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, headerCenter: { flex: 1, alignItems: 'center' }, title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold }, subtitle: { fontSize: fontSize.xs, marginTop: 2 }, headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: radii.lg, padding: 4, marginBottom: spacing.sm }, segment: { flex: 1, minHeight: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, segmentText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    mapIntro: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, mapIntroIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, mapIntroTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, mapIntroText: { fontSize: fontSize.xs, lineHeight: 17, marginTop: 3 }, mapCount: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, plannerShortcut: { minHeight: 66, borderWidth: 1, borderRadius: radii.lg, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, plannerShortcutIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, plannerShortcutTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, plannerShortcutText: { fontSize: 10, marginTop: 3 },
    gridCard: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.md, marginTop: spacing.sm }, gridHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.sm }, gridTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, gridSubtitle: { fontSize: fontSize.xs, marginTop: 3 }, northBadge: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }, northText: { fontSize: 10, fontWeight: fontWeight.bold }, gridLoading: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, gridLoadingText: { fontSize: fontSize.xs }, grid: { width: '100%', borderWidth: 1, borderRadius: radii.md, overflow: 'hidden', gap: 2, padding: 2 }, gridRow: { flex: 1, flexDirection: 'row', gap: 2 }, gridCell: { flex: 1, minWidth: 0, minHeight: 30, borderWidth: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, gap: 2 }, gridCellSelected: { borderWidth: 2 }, cellPlantName: { fontSize: 9, fontWeight: fontWeight.bold, maxWidth: '100%' }, legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, flexWrap: 'wrap' }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendDot: { width: 12, height: 12, borderRadius: 4, borderWidth: 1 }, legendText: { fontSize: 11 }, cellActions: { borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs }, cellActionsTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, cellActionsText: { fontSize: 10, marginTop: 2 }, cellAction: { minHeight: 38, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4 }, cellActionText: { fontSize: 11, fontWeight: fontWeight.bold },
    freeCanvas: { width: '100%', minHeight: 300, borderWidth: 1, borderRadius: radii.lg, overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center' }, freeCanvasGrid: { ...StyleSheet.absoluteFill, padding: 18, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'space-between', justifyContent: 'space-between' }, freeCanvasDot: { width: 4, height: 4, borderRadius: 2, opacity: 0.8 }, freeCanvasHint: { fontSize: 11, textAlign: 'center', maxWidth: 190, lineHeight: 16 }, freeMarker: { position: 'absolute', width: 96, minHeight: 64, marginLeft: -48, marginTop: -32, borderWidth: 1.5, borderRadius: radii.md, padding: 6, alignItems: 'center', justifyContent: 'center', gap: 3, shadowColor: '#122b1a', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, freeMarkerFocused: { borderWidth: 2.5 }, freeMarkerIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, freeMarkerText: { fontSize: 10, fontWeight: fontWeight.bold, maxWidth: 82, textAlign: 'center' },
    insightCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm }, insightHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, insightIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, insightTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, insightText: { fontSize: 11, lineHeight: 16, marginTop: 2 }, insightStats: { flexDirection: 'row', gap: spacing.xs }, insightStat: { flex: 1, minHeight: 58, borderWidth: 1, borderRadius: radii.md, paddingVertical: spacing.xs, alignItems: 'center', justifyContent: 'center' }, insightStatValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, insightStatLabel: { fontSize: 9, textAlign: 'center', marginTop: 2 }, relationshipCard: { borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, marginTop: spacing.sm, gap: spacing.xs }, relationshipHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 }, relationshipTitle: { fontSize: 12, fontWeight: fontWeight.bold }, relationshipLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 }, relationshipText: { flex: 1, fontSize: 10, lineHeight: 15 }, searchField: { minHeight: 42, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }, searchInput: { flex: 1, minWidth: 0, fontSize: 12, paddingVertical: 0 }, filterRow: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: 2 }, filterChip: { minHeight: 34, borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' }, filterChipText: { fontSize: 10, fontWeight: fontWeight.bold },
    plantPicker: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md }, pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, pickerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, pickerMeta: { fontSize: 11 }, plantChipRow: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: 2 }, plantChip: { minHeight: 44, maxWidth: 180, borderRadius: radii.full, borderWidth: 1, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 }, plantChipText: { fontSize: 12, fontWeight: fontWeight.bold, flexShrink: 1 }, pickerEmpty: { fontSize: fontSize.xs, lineHeight: 18, marginTop: spacing.sm }, selectedHint: { fontSize: 11, fontWeight: fontWeight.bold, marginTop: spacing.sm }, mapActions: { gap: spacing.sm, marginTop: spacing.sm }, primaryAction: { minHeight: 50, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, primaryActionText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold }, secondaryAction: { minHeight: 46, borderWidth: 1, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, secondaryActionText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, confirmCard: { borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, gap: spacing.sm }, confirmText: { fontSize: fontSize.xs, lineHeight: 17 }, confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }, confirmButton: { minHeight: 40, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' }, confirmButtonText: { fontSize: 12, fontWeight: fontWeight.bold },
    orientationCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, orientationIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, orientationTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, orientationText: { fontSize: fontSize.xs, marginTop: 3 }, sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: spacing.sm }, slotRow: { gap: spacing.xs, paddingRight: spacing.md }, slot: { minHeight: 42, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 5 }, listGap: { gap: spacing.sm }, plantCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm }, plantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, plantIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, plantName: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, plantVariety: { fontSize: fontSize.xs, marginTop: 3 }, statusLine: { borderRadius: radii.sm, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 }, statusText: { fontSize: fontSize.xs, flex: 1 }, cardAction: { minHeight: 44, borderWidth: 1.5, borderRadius: radii.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, cardActionText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, flexShrink: 1 },
  });
}
