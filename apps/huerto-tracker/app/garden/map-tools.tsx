import { useColors, useTheme } from '@portfolio/ui';
import { useCollection, generateId } from '@portfolio/storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StitchBottomNav } from '../../src/components/StitchBottomNav';
import { CROPS_BY_ID } from '../../src/data/crops';
import { useActiveGarden } from '../../src/hooks/useActiveGarden';
import { useGardenFreeLayout } from '../../src/hooks/useGardenFreeLayout';
import { DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS, useGardenLayout } from '../../src/hooks/useGardenLayout';
import { useGardenMapPlan } from '../../src/hooks/useGardenMapPlan';
import { usePro } from '../../src/hooks/usePro';
import { useWeather } from '../../src/hooks/useWeather';
import type { GardenMapPlan, GardenSeasonSnapshot, LightLevel, IrrigationKind, MapStructure, MapStructureKind, MapZone } from '../../src/models/garden-map-plan';
import type { Plant } from '../../src/models/plant';
import { createSeasonPlanFromSnapshot, findMapCropAssociations, findSpacingWarnings, generateSuccessionDates, getOccupancyWindow, getSeasonRotationWarnings, soilVolumeLiters, dateFallsInMonths } from '../../src/utils/gardenMapPlanner';
import { expoWeekdayForDate, getForecastCareNotes } from '../../src/utils/weatherPlanner';

type PlannerTab = 'space' | 'season' | 'materials' | 'share';
type PendingPlace = { type: 'structure' | 'zone'; id: string } | null;
type MappedPlant = { plant: Plant; x: number; y: number; index: number };

const TABS: Array<{ id: PlannerTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'space', label: 'Espacio', icon: 'resize-outline' },
  { id: 'season', label: 'Temporada', icon: 'calendar-outline' },
  { id: 'materials', label: 'Materiales', icon: 'basket-outline' },
  { id: 'share', label: 'Compartir', icon: 'share-outline' },
];
const STRUCTURE_KINDS: Array<{ id: MapStructureKind; label: string }> = [
  { id: 'bed', label: 'Bancal' }, { id: 'planter', label: 'Jardinera' }, { id: 'pot', label: 'Maceta' },
  { id: 'path', label: 'Pasillo' }, { id: 'wall', label: 'Pared' }, { id: 'trellis', label: 'Tutor' }, { id: 'greenhouse', label: 'Invernadero' },
];
const LIGHT_LEVELS: Array<{ id: LightLevel; label: string }> = [
  { id: 'full', label: 'Sol directo' }, { id: 'partial', label: 'Semisombra' }, { id: 'shade', label: 'Sombra' },
];
const IRRIGATION_KINDS: Array<{ id: IrrigationKind; label: string }> = [
  { id: 'drip', label: 'Goteo' }, { id: 'manual', label: 'Manual' }, { id: 'none', label: 'Sin riego fijo' },
];
const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);

export default function GardenMapToolsScreen() {
  const colors = useColors();
  const theme = useTheme();
  const router = useRouter();
  const { tab: tabParam, cropId: cropIdParam } = useLocalSearchParams<{ tab?: string; cropId?: string }>();
  const { activeGarden } = useActiveGarden();
  const { isPro } = usePro();
  const { weather, loading: weatherLoading, error: weatherError, refresh: refreshWeather } = useWeather(activeGarden?.province);
  const plants = useCollection<Plant>('plants');
  const [tab, setTab] = useState<PlannerTab>(() => tabParam === 'season' ? 'season' : 'space');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [pendingPlace, setPendingPlace] = useState<PendingPlace>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const canvasRef = useRef<View>(null);
  const [widthInput, setWidthInput] = useState('');
  const [lengthInput, setLengthInput] = useState('');
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [structureName, setStructureName] = useState('Bancal nuevo');
  const [structureKind, setStructureKind] = useState<MapStructureKind>('bed');
  const [structureWidth, setStructureWidth] = useState('');
  const [structureLength, setStructureLength] = useState('');
  const [structureDepth, setStructureDepth] = useState('');
  const [structureNote, setStructureNote] = useState('');
  const [zoneName, setZoneName] = useState('Zona nueva');
  const [zoneKind, setZoneKind] = useState<'light' | 'irrigation'>('light');
  const [zoneWidthCm, setZoneWidthCm] = useState('');
  const [zoneLengthCm, setZoneLengthCm] = useState('');
  const [lightLevel, setLightLevel] = useState<LightLevel | null>(null);
  const [irrigationKind, setIrrigationKind] = useState<IrrigationKind | null>(null);
  const [zoneNote, setZoneNote] = useState('');
  const initialCrop = typeof cropIdParam === 'string' ? CROPS_BY_ID[cropIdParam] : undefined;
  const [cropQuery, setCropQuery] = useState(initialCrop?.name ?? '');
  const [selectedCropId, setSelectedCropId] = useState<string | null>(initialCrop?.id ?? null);
  const [plannedCount, setPlannedCount] = useState('');
  const [successionRounds, setSuccessionRounds] = useState('1');
  const [successionInterval, setSuccessionInterval] = useState('');
  const [plannedDate, setPlannedDate] = useState(new Date());
  const [plannedAction, setPlannedAction] = useState<'sowing' | 'transplant' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [plannedLocation, setPlannedLocation] = useState('');
  const [plannedNote, setPlannedNote] = useState('');

  const gridRows = activeGarden?.gridRows ?? DEFAULT_GRID_ROWS;
  const gridCols = activeGarden?.gridCols ?? DEFAULT_GRID_COLS;
  const { layout, placePlant, swapCells } = useGardenLayout(activeGarden?.id, gridRows, gridCols);
  const { positions: freePositions, setPosition } = useGardenFreeLayout(activeGarden?.id);
  const { plan, setPlan, loading: planLoading, error: planError } = useGardenMapPlan(activeGarden?.id);
  const isFreeSpace = activeGarden?.gardenType === 'balcon' || activeGarden?.gardenType === 'maceta';
  const gardenPlants = useMemo(() => plants.items.filter((plant) => !plant.deletedAt && plant.gardenId === activeGarden?.id), [activeGarden?.id, plants.items]);
  const plantById = useMemo(() => new Map(gardenPlants.map((plant) => [plant.id, plant])), [gardenPlants]);
  const cropList = useMemo(() => Object.values(CROPS_BY_ID).sort((a, b) => a.name.localeCompare(b.name, 'es')), []);
  const visibleCrops = useMemo(() => {
    const query = cropQuery.trim().toLocaleLowerCase();
    return cropList.filter((crop) => !query || crop.name.toLocaleLowerCase().includes(query)).slice(0, 12);
  }, [cropList, cropQuery]);
  const selectedCrop = selectedCropId ? CROPS_BY_ID[selectedCropId] : undefined;
  const dimensionRatio = plan.dimensions ? plan.dimensions.widthCm / plan.dimensions.lengthCm : 1;
  const canvasAspect = Math.min(2.2, Math.max(0.55, dimensionRatio));
  const currentYear = new Date().getFullYear();

  const mappedPlants = useMemo<MappedPlant[]>(() => gardenPlants.flatMap((plant) => {
    if (isFreeSpace) {
      const position = freePositions[plant.id];
      if (!position) return [];
      return [{ plant, x: Math.max(0, Math.min(1, position.x > 1 ? position.x / 100 : position.x)), y: Math.max(0, Math.min(1, position.y > 1 ? position.y / 100 : position.y)), index: -1 }];
    }
    const index = layout.indexOf(plant.id);
    if (index < 0) return [];
    return [{ plant, x: ((index % gridCols) + 0.5) / gridCols, y: (Math.floor(index / gridCols) + 0.5) / gridRows, index }];
  }), [freePositions, gardenPlants, gridCols, gridRows, isFreeSpace, layout]);
  const spacingWarnings = useMemo(() => findSpacingWarnings(
    mappedPlants.map(({ plant, x, y }) => ({
      id: plant.id, name: plant.name, x, y,
      spacingCm: CROPS_BY_ID[plant.cropId]?.spacing,
      groupKey: plant.bedName ?? (isFreeSpace ? plant.id : 'huerto-general'),
    })), plan.dimensions,
  ), [isFreeSpace, mappedPlants, plan.dimensions]);
  const currentSeasonPlants = useMemo(() => mappedPlants.map(({ plant, x, y, index }) => ({
    plantId: plant.id,
    cropId: plant.cropId,
    name: plant.name,
    rotationGroup: CROPS_BY_ID[plant.cropId]?.rotationGroup,
    locationKey: plant.bedName?.trim().toLocaleLowerCase() || (index >= 0 ? `parcela-${Math.floor(index / gridCols)}-${index % gridCols}` : `posicion-${Math.round(x * 20)}-${Math.round(y * 20)}`),
    x, y,
  })), [gridCols, mappedPlants]);
  const previousSeasons = useMemo(() => plan.seasons.filter((season) => season.year < currentYear).sort((a, b) => b.year - a.year), [currentYear, plan.seasons]);
  const rotationWarnings = useMemo(() => getSeasonRotationWarnings(currentSeasonPlants, previousSeasons), [currentSeasonPlants, previousSeasons]);
  const mapAssociations = useMemo(() => findMapCropAssociations(
    mappedPlants.map(({ plant, index }) => ({
      plantId: plant.id,
      cropId: plant.cropId,
      name: plant.name,
      locationKey: plant.bedName?.trim().toLocaleLowerCase() || (index >= 0 ? `parcela-${Math.floor(index / gridCols)}-${index % gridCols}` : `posicion-${plant.id}`),
    })),
    CROPS_BY_ID,
  ), [gridCols, mappedPlants]);
  const lightMismatches = useMemo(() => {
    if (!plan.dimensions) return [];
    return mappedPlants.flatMap(({ plant, x, y }) => {
      const need = CROPS_BY_ID[plant.cropId]?.sunNeeds;
      if (!need) return [];
      const zone = plan.zones.find((candidate) => candidate.kind === 'light'
        && x >= candidate.x && x <= candidate.x + candidate.widthCm / plan.dimensions!.widthCm
        && y >= candidate.y && y <= candidate.y + candidate.lengthCm / plan.dimensions!.lengthCm);
      if (!zone?.lightLevel || !((need === 'full' && zone.lightLevel === 'shade') || (need === 'shade' && zone.lightLevel === 'full'))) return [];
      return [{ name: plant.name, zone: zone.name, need, observed: zone.lightLevel }];
    });
  }, [mappedPlants, plan.dimensions, plan.zones]);
  const datedPlan = useMemo(() => [...plan.plannedPlantings].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)), [plan.plannedPlantings]);
  const now = new Date();

  useEffect(() => {
    if (!planLoading) {
      setWidthInput(plan.dimensions ? String(plan.dimensions.widthCm) : '');
      setLengthInput(plan.dimensions ? String(plan.dimensions.lengthCm) : '');
    }
  }, [plan.dimensions, planLoading]);

  useEffect(() => {
    const crop = typeof cropIdParam === 'string' ? CROPS_BY_ID[cropIdParam] : undefined;
    if (!crop) return;
    setTab('season');
    setSelectedCropId(crop.id);
    setCropQuery(crop.name);
  }, [cropIdParam]);

  function updatePlan(update: (current: GardenMapPlan) => GardenMapPlan) {
    if (planLoading || !activeGarden?.id) return;
    setPlan((current) => update(current));
  }

  function notice(text: string) {
    setMessage(text);
    setFormError('');
  }

  function saveDimensions() {
    const widthCm = Number(widthInput);
    const lengthCm = Number(lengthInput);
    if (!Number.isFinite(widthCm) || !Number.isFinite(lengthCm) || widthCm <= 0 || lengthCm <= 0) {
      setFormError('Indica ancho y largo mayores que cero, en centímetros.');
      return;
    }
    if (plan.structures.some((item) => item.widthCm > widthCm || item.lengthCm > lengthCm)
      || plan.zones.some((item) => item.widthCm > widthCm || item.lengthCm > lengthCm)) {
      setFormError('Las nuevas medidas no pueden ser menores que uno de los espacios o zonas ya definidos.');
      return;
    }
    updatePlan((current) => ({
      ...current,
      dimensions: { widthCm, lengthCm },
      structures: current.structures.map((item) => ({
        ...item,
        x: Math.min(item.x, 1 - item.widthCm / widthCm),
        y: Math.min(item.y, 1 - item.lengthCm / lengthCm),
      })),
      zones: current.zones.map((item) => ({
        ...item,
        x: Math.min(item.x, 1 - item.widthCm / widthCm),
        y: Math.min(item.y, 1 - item.lengthCm / lengthCm),
      })),
    }));
    notice('Medidas guardadas. Las comprobaciones espaciales ya pueden calcularse.');
  }

  function setStructurePosition(id: string, pageX: number, pageY: number) {
    if (!canvasSize.width || !canvasSize.height) return;
    const item = plan.structures.find((structure) => structure.id === id);
    if (!item) return;
    const width = plan.dimensions ? item.widthCm / plan.dimensions.widthCm : 0.28;
    const height = plan.dimensions ? item.lengthCm / plan.dimensions.lengthCm : 0.22;
    const x = Math.max(0, Math.min(1 - width, (pageX - canvasSize.x) / canvasSize.width - width / 2));
    const y = Math.max(0, Math.min(1 - height, (pageY - canvasSize.y) / canvasSize.height - height / 2));
    updatePlan((current) => ({ ...current, structures: current.structures.map((entry) => entry.id === id ? { ...entry, x, y } : entry) }));
  }

  function setZonePosition(id: string, pageX: number, pageY: number) {
    if (!canvasSize.width || !canvasSize.height) return;
    const selected = plan.zones.find((zone) => zone.id === id);
    if (!selected || !plan.dimensions) return;
    const width = selected.widthCm / plan.dimensions.widthCm;
    const height = selected.lengthCm / plan.dimensions.lengthCm;
    updatePlan((current) => ({ ...current, zones: current.zones.map((zone) => zone.id === id ? {
      ...zone,
      x: Math.max(0, Math.min(1 - width, (pageX - canvasSize.x) / canvasSize.width - width / 2)),
      y: Math.max(0, Math.min(1 - height, (pageY - canvasSize.y) / canvasSize.height - height / 2)),
    } : zone) }));
  }

  function placePending(event: { nativeEvent: { locationX: number; locationY: number } }) {
    if (!pendingPlace || !canvasSize.width || !canvasSize.height) return;
    const pageX = canvasSize.x + event.nativeEvent.locationX;
    const pageY = canvasSize.y + event.nativeEvent.locationY;
    if (pendingPlace.type === 'structure') setStructurePosition(pendingPlace.id, pageX, pageY);
    else setZonePosition(pendingPlace.id, pageX, pageY);
    setPendingPlace(null);
    notice('Ubicación actualizada en el plano.');
  }

  function setPlantPosition(plantId: string, pageX: number, pageY: number) {
    if (!canvasSize.width || !canvasSize.height) return;
    const x = Math.max(isFreeSpace ? 0.16 : 0.02, Math.min(isFreeSpace ? 0.84 : 0.98, (pageX - canvasSize.x) / canvasSize.width));
    const y = Math.max(isFreeSpace ? 0.16 : 0.02, Math.min(isFreeSpace ? 0.84 : 0.98, (pageY - canvasSize.y) / canvasSize.height));
    if (isFreeSpace) {
      setPosition(plantId, { x, y });
      return;
    }
    const col = Math.max(0, Math.min(gridCols - 1, Math.floor(x * gridCols)));
    const row = Math.max(0, Math.min(gridRows - 1, Math.floor(y * gridRows)));
    const target = row * gridCols + col;
    const source = layout.indexOf(plantId);
    const occupied = layout[target];
    if (source < 0 || source === target) return;
    if (occupied && occupied !== plantId) void swapCells(source, target);
    else void placePlant(plantId, target);
  }

  function editStructure(item: MapStructure) {
    setEditingStructureId(item.id);
    setStructureName(item.name);
    setStructureKind(item.kind);
    setStructureWidth(String(item.widthCm));
    setStructureLength(String(item.lengthCm));
    setStructureDepth(item.depthCm ? String(item.depthCm) : '');
    setStructureNote(item.note ?? '');
  }

  function saveStructure() {
    const widthCm = Number(structureWidth);
    const lengthCm = Number(structureLength);
    const depthCm = structureDepth.trim() ? Number(structureDepth) : undefined;
    if (!structureName.trim() || !Number.isFinite(widthCm) || !Number.isFinite(lengthCm) || widthCm <= 0 || lengthCm <= 0 || (depthCm !== undefined && (!Number.isFinite(depthCm) || depthCm <= 0))) {
      setFormError('Revisa el nombre y las medidas del elemento. Las medidas deben ser mayores que cero.');
      return;
    }
    if (plan.dimensions && (widthCm > plan.dimensions.widthCm || lengthCm > plan.dimensions.lengthCm)) {
      setFormError('El elemento no cabe dentro de las medidas del área principal. Revisa sus dimensiones.');
      return;
    }
    if (editingStructureId) {
      updatePlan((current) => ({ ...current, structures: current.structures.map((item) => item.id === editingStructureId ? { ...item, name: structureName.trim(), kind: structureKind, widthCm, lengthCm, depthCm, note: structureNote.trim() || undefined } : item) }));
      setPendingPlace({ type: 'structure', id: editingStructureId });
      notice('Cambios guardados. Toca el plano para recolocar el elemento.');
      return;
    }
    const id = generateId();
    const item: MapStructure = { id, name: structureName.trim(), kind: structureKind, widthCm, lengthCm, depthCm, x: 0.04, y: 0.04, note: structureNote.trim() || undefined };
    updatePlan((current) => ({ ...current, structures: [...current.structures, item] }));
    setEditingStructureId(id);
    setPendingPlace({ type: 'structure', id });
    notice('Elemento creado. Toca el plano para elegir su posición.');
  }

  function addZone() {
    if (!zoneName.trim()) {
      setFormError('Pon un nombre para la zona.');
      return;
    }
    const widthCm = Number(zoneWidthCm);
    const lengthCm = Number(zoneLengthCm);
    if (!plan.dimensions || !Number.isFinite(widthCm) || !Number.isFinite(lengthCm) || widthCm <= 0 || lengthCm <= 0 || widthCm > plan.dimensions.widthCm || lengthCm > plan.dimensions.lengthCm) {
      setFormError('Guarda primero las medidas generales y define un ancho y largo válidos para esta zona.');
      return;
    }
    if ((zoneKind === 'light' && !lightLevel) || (zoneKind === 'irrigation' && !irrigationKind)) {
      setFormError('Elige qué condición describe esta zona antes de guardarla.');
      return;
    }
    const zoneId = editingZoneId ?? generateId();
    const zone: MapZone = {
      id: zoneId, name: zoneName.trim(), kind: zoneKind, x: editingZoneId ? plan.zones.find((item) => item.id === editingZoneId)?.x ?? 0.03 : 0.03, y: editingZoneId ? plan.zones.find((item) => item.id === editingZoneId)?.y ?? 0.03 : 0.03, widthCm, lengthCm,
      ...(zoneKind === 'light' && lightLevel ? { lightLevel } : {}),
      ...(zoneKind === 'irrigation' && irrigationKind ? { irrigation: irrigationKind } : {}),
      note: zoneNote.trim() || undefined,
    };
    updatePlan((current) => ({ ...current, zones: editingZoneId ? current.zones.map((item) => item.id === editingZoneId ? { ...zone, photoUri: item.photoUri } : item) : [...current.zones, zone] }));
    setPendingPlace({ type: 'zone', id: zoneId });
    notice(editingZoneId ? 'Cambios guardados. Toca el plano para recolocar la zona.' : 'Zona creada. Toca el plano para situarla.');
  }

  function editZone(zone: MapZone) {
    setEditingZoneId(zone.id);
    setZoneName(zone.name);
    setZoneKind(zone.kind);
    setZoneWidthCm(String(zone.widthCm));
    setZoneLengthCm(String(zone.lengthCm));
    setLightLevel(zone.lightLevel ?? null);
    setIrrigationKind(zone.irrigation ?? null);
    setZoneNote(zone.note ?? '');
  }

  function updateZone(id: string, patch: Partial<MapZone>) {
    updatePlan((current) => ({ ...current, zones: current.zones.map((zone) => zone.id === id ? { ...zone, ...patch } : zone) }));
  }

  async function addStructurePhoto(id: string) {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError('Permite el acceso a Fotos para adjuntar una imagen a esta zona.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.82 });
      if (result.canceled || !result.assets[0]) return;
      updatePlan((current) => ({ ...current, structures: current.structures.map((item) => item.id === id ? { ...item, photoUri: result.assets[0].uri } : item) }));
      notice('Foto adjuntada. Se sincronizará con el huerto cuando haya conexión.');
    } catch {
      setFormError('No se pudo abrir la galería. Puedes seguir guardando notas y medidas.');
    }
  }

  async function addZonePhoto(id: string) {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError('Permite el acceso a Fotos para adjuntar una imagen a esta zona.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.82 });
      if (result.canceled || !result.assets[0]) return;
      updatePlan((current) => ({ ...current, zones: current.zones.map((item) => item.id === id ? { ...item, photoUri: result.assets[0].uri } : item) }));
      notice('Foto de la zona guardada en el plano.');
    } catch {
      setFormError('No se pudo abrir la galería. Puedes seguir guardando notas y medidas.');
    }
  }

  function saveSeason() {
    if (mappedPlants.length === 0) {
      setFormError('Coloca al menos una planta en el plano antes de guardar la temporada.');
      return;
    }
    const snapshot: GardenSeasonSnapshot = {
      id: generateId(), year: currentYear, label: `Temporada ${currentYear}`,
      savedAt: new Date().toISOString(), gridRows, gridCols,
      grid: [...layout], free: { ...freePositions }, plants: currentSeasonPlants,
    };
    updatePlan((current) => ({ ...current, seasons: [snapshot, ...current.seasons].slice(0, 12) }));
    notice(`Plano guardado como referencia para ${currentYear}.`);
  }

  function prepareNextSeason(season: GardenSeasonSnapshot) {
    if (!isPro) {
      router.push('/paywall?source=map_season_planner' as any);
      return;
    }
    const targetYear = Math.max(currentYear + 1, season.year + 1);
    if ((plan.seasonPlans ?? []).some((item) => item.year === targetYear)) {
      setFormError(`Ya existe un plan para ${targetYear}. Puedes editar sus meses o quitarlo antes de crear otro.`);
      return;
    }
    const draft = createSeasonPlanFromSnapshot(season, targetYear, generateId(), new Date().toISOString());
    if (!draft) {
      setFormError('No se pudo crear una copia segura de esta temporada.');
      return;
    }
    updatePlan((current) => ({ ...current, seasonPlans: [draft, ...(current.seasonPlans ?? [])].slice(0, 12) }));
    notice(`Plan ${targetYear} creado como borrador. No se han añadido plantas activas ni fechas automáticamente.`);
  }

  function setSeasonPlantMonth(seasonPlanId: string, plantId: string, month: number) {
    updatePlan((current) => ({
      ...current,
      seasonPlans: (current.seasonPlans ?? []).map((seasonPlan) => seasonPlan.id !== seasonPlanId ? seasonPlan : {
        ...seasonPlan,
        plants: seasonPlan.plants.map((plant) => plant.id === plantId
          ? { ...plant, plannedMonth: plant.plannedMonth === month ? undefined : month }
          : plant),
      }),
    }));
  }

  function addPlannedPlanting() {
    const count = Number(plannedCount);
    if (!selectedCrop || !plannedAction || !Number.isInteger(count) || count <= 0) {
      setFormError('Elige un cultivo del catálogo e indica una cantidad entera mayor que cero.');
      return;
    }
    const rounds = Number(successionRounds);
    const intervalDays = Number(successionInterval);
    const dates = generateSuccessionDates(localIsoDate(plannedDate), rounds, rounds === 1 ? 0 : intervalDays);
    if (!dates) {
      setFormError('Indica entre 1 y 12 tandas. Si son varias, sepáralas entre 1 y 90 días.');
      return;
    }
    const successionId = rounds > 1 ? generateId() : undefined;
    const items = dates.map((date, index) => ({
      id: generateId(), cropId: selectedCrop.id, count, plannedDate: date, action: plannedAction,
      location: plannedLocation.trim() || undefined,
      note: plannedNote.trim() || undefined,
      ...(successionId ? { successionId, successionIndex: index + 1, successionTotal: rounds, intervalDays } : {}),
    }));
    updatePlan((current) => ({ ...current, plannedPlantings: [...current.plannedPlantings, ...items] }));
    setSelectedCropId(null);
    setPlannedAction(null);
    setCropQuery('');
    setPlannedNote('');
    setSuccessionRounds('1');
    setSuccessionInterval('');
    notice(rounds > 1 ? `${rounds} tandas de ${selectedCrop.name} añadidas al calendario.` : `${selectedCrop.name} añadido al calendario del plano.`);
  }

  const structureLiters = plan.structures.reduce((total, item) => {
    if (!['bed', 'planter', 'pot'].includes(item.kind) || !item.depthCm) return total;
    return total + (soilVolumeLiters(item.widthCm, item.lengthCm, item.depthCm) ?? 0);
  }, 0);
  const currentCounts = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const { plant } of mappedPlants) {
      const crop = CROPS_BY_ID[plant.cropId];
      const key = `${plant.cropId}:${plant.variety ?? ''}`;
      const row = counts.get(key) ?? { name: plant.variety ? `${crop?.name ?? plant.name} · ${plant.variety}` : crop?.name ?? plant.name, count: 0 };
      row.count += 1;
      counts.set(key, row);
    }
    return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [mappedPlants]);

  function buildShareText() {
    const dimensions = plan.dimensions ? `${plan.dimensions.widthCm} × ${plan.dimensions.lengthCm} cm` : 'sin medidas configuradas';
    const cropLines = currentCounts.map((item) => `• ${item.name}: ${item.count} en el plano`);
    const plannedLines = datedPlan.map((item) => `• ${CROPS_BY_ID[item.cropId]?.name ?? 'Cultivo'}: ${item.count} · ${formatDate(item.plannedDate)}${item.location ? ` · ${item.location}` : ''}`);
    const structureLines = plan.structures.map((item) => `• ${item.name}: ${item.widthCm} × ${item.lengthCm} cm${item.depthCm ? ` · ${item.depthCm} cm de fondo` : ''}${item.note ? ` · ${item.note}` : ''}`);
    const zoneLines = plan.zones.map((zone) => `• ${zone.name}: ${zone.kind === 'light' ? LIGHT_LEVELS.find((item) => item.id === zone.lightLevel)?.label ?? 'luz sin clasificar' : IRRIGATION_KINDS.find((item) => item.id === zone.irrigation)?.label ?? 'riego sin clasificar'} · ${zone.widthCm} × ${zone.lengthCm} cm${zone.note ? ` · ${zone.note}` : ''}`);
    const seasonLines = plan.seasons.map((season) => `• ${season.label}: ${season.plants.map((plant) => plant.name).join(', ') || 'sin cultivos registrados'}`);
    return [
      `Plano de ${activeGarden?.name ?? 'mi huerto'} · Semilla`, `Medidas: ${dimensions}`,
      '', 'Cultivos colocados:', ...(cropLines.length ? cropLines : ['• Sin cultivos colocados']),
      '', 'Próximas plantaciones:', ...(plannedLines.length ? plannedLines : ['• No hay plantaciones planificadas']),
      '', 'Espacios:', ...(structureLines.length ? structureLines : ['• No hay elementos medidos']),
      '', 'Zonas de luz y riego:', ...(zoneLines.length ? zoneLines : ['• No hay zonas guardadas']),
      '', 'Temporadas archivadas:', ...(seasonLines.length ? seasonLines : ['• No hay temporadas guardadas']),
    ].join('\n');
  }

  async function sharePlan() {
    try {
      await Share.share({ title: `Plano de ${activeGarden?.name ?? 'mi huerto'}`, message: buildShareText() });
    } catch {
      setFormError('No se pudo abrir las opciones para compartir en este dispositivo.');
    }
  }

  async function printPlan() {
    try {
      const html = createPrintHtml(activeGarden?.name ?? 'Mi huerto', buildShareText(), plan, currentCounts, mappedPlants);
      await Print.printAsync({ html, orientation: 'portrait' });
    } catch {
      setFormError('No se pudo abrir la impresión. Prueba a compartir el resumen de texto.');
    }
  }

  function removeStructure(id: string) {
    updatePlan((current) => ({ ...current, structures: current.structures.filter((item) => item.id !== id) }));
    if (editingStructureId === id) setEditingStructureId(null);
    setPendingPlace((current) => current?.type === 'structure' && current.id === id ? null : current);
  }

  function captureCanvasOrigin() {
    canvasRef.current?.measureInWindow((x, y, width, height) => setCanvasSize({ x, y, width, height }));
  }

  const styles = makeStyles(colors, theme);
  const lightColor = colors.warning;
  const waterColor = colors.info;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver al mapa" onPress={() => router.replace('/garden/map' as any)} hitSlop={10} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={[styles.backText, { color: colors.text }]}>Mapa</Text>
          </Pressable>
          <View style={styles.headerTitle}><Text style={[styles.title, { color: colors.text }]}>Planificador del huerto</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>{activeGarden?.name ?? 'Sin huerto activo'}</Text></View>
          <View style={{ width: 56 }} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map((item) => {
            const active = tab === item.id;
            return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => { setTab(item.id); setFormError(''); }} style={[styles.tab, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }]}>
              <Ionicons name={item.icon} size={17} color={active ? '#fff' : colors.textSecondary} /><Text style={[styles.tabText, { color: active ? '#fff' : colors.textSecondary }]}>{item.label}</Text>
            </Pressable>;
          })}
        </ScrollView>

        {message ? <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: colors.primary + '12' }]}><Ionicons name="checkmark-circle-outline" size={17} color={colors.primary} /><Text style={[styles.noticeText, { color: colors.text }]}>{message}</Text><Pressable accessibilityLabel="Cerrar aviso" onPress={() => setMessage('')}><Ionicons name="close" size={17} color={colors.textSecondary} /></Pressable></View> : null}
        {formError ? <View accessibilityLiveRegion="assertive" style={[styles.error, { backgroundColor: colors.error + '12' }]}><Ionicons name="alert-circle-outline" size={17} color={colors.error} /><Text style={[styles.noticeText, { color: colors.error }]}>{formError}</Text></View> : null}
        {planError ? <View style={[styles.error, { backgroundColor: colors.error + '12' }]}><Text style={[styles.noticeText, { color: colors.error }]}>No se pudo guardar la configuración del mapa en este dispositivo.</Text></View> : null}
        {planLoading ? <Text style={[styles.helper, { color: colors.textSecondary }]}>Cargando tu plano guardado…</Text> : null}

        {tab === 'space' && <>
          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Medidas y zonas</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Define el espacio real; las alertas de distancia solo se activan con medidas.</Text></View>
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Dimensiones del área principal (cm)</Text>
            <View style={styles.inputRow}>
              <NumberInput label="Ancho" value={widthInput} onChangeText={setWidthInput} styles={styles} colors={colors} />
              <NumberInput label="Largo" value={lengthInput} onChangeText={setLengthInput} styles={styles} colors={colors} />
            </View>
            <ActionButton label="Guardar medidas" icon="save-outline" onPress={saveDimensions} primary styles={styles} colors={colors} />
            <Text style={[styles.helper, { color: colors.textSecondary }]}>Área útil: {plan.dimensions ? `${(plan.dimensions.widthCm * plan.dimensions.lengthCm / 10000).toFixed(2)} m²` : 'aún no calculada'}.</Text>
          </View>

          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>{plan.dimensions ? 'Tu plano a escala' : 'Croquis del espacio · sin escala'}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{pendingPlace ? 'Toca el mapa para colocar el elemento seleccionado; también puedes arrastrar los cultivos.' : 'Arrastra los cultivos para reubicarlos. En huerto, soltar sobre otra planta intercambia sus posiciones.'}</Text></View>
          <View
            ref={canvasRef}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setCanvasSize((current) => ({ ...current, width, height }));
              requestAnimationFrame(captureCanvasOrigin);
            }}
            style={[styles.mapCanvas, { aspectRatio: canvasAspect, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
          >
            <Pressable accessibilityRole="button" accessibilityLabel="Ubicar elemento en el mapa" onPress={(event) => placePending(event)} style={StyleSheet.absoluteFill}>
              <View pointerEvents="none" style={styles.mapGuides}>{Array.from({ length: 25 }, (_, index) => <View key={index} style={[styles.mapDot, { backgroundColor: colors.border }]} />)}</View>
              <Text pointerEvents="none" style={[styles.mapNorth, { color: colors.textSecondary }]}>N ↑</Text>
              {plan.zones.map((zone) => <DraggableMarker key={`zone-${zone.id}`} onDrop={(x, y) => setZonePosition(zone.id, x, y)} style={{ left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${Math.min(1, zone.widthCm / (plan.dimensions?.widthCm ?? zone.widthCm)) * 100}%`, height: `${Math.min(1, zone.lengthCm / (plan.dimensions?.lengthCm ?? zone.lengthCm)) * 100}%`, backgroundColor: (zone.kind === 'light' ? lightColor : waterColor) + '24', borderColor: (zone.kind === 'light' ? lightColor : waterColor) + '99' }}>
                <Text numberOfLines={1} style={[styles.zoneLabel, { color: colors.text }]}>{zone.name}</Text>
              </DraggableMarker>)}
              {plan.structures.map((item) => {
                const width = plan.dimensions ? Math.min(1, item.widthCm / plan.dimensions.widthCm) : 0.28;
                const height = plan.dimensions ? Math.min(1, item.lengthCm / plan.dimensions.lengthCm) : 0.22;
                return <DraggableMarker key={`structure-${item.id}`} onDrop={(x, y) => setStructurePosition(item.id, x, y)} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%`, borderColor: item.kind === 'path' ? colors.textDisabled : colors.primary, backgroundColor: item.kind === 'path' ? colors.textDisabled + '24' : colors.primary + '16' }}>
                  <Text numberOfLines={2} style={[styles.structureLabel, { color: colors.text }]}>{item.name}</Text>
                </DraggableMarker>;
              })}
              {mappedPlants.map(({ plant, x, y }) => <DraggableMarker key={`plant-${plant.id}`} onDrop={(pageX, pageY) => setPlantPosition(plant.id, pageX, pageY)} style={{ left: `${x * 100}%`, top: `${y * 100}%` }} marker>
                <View style={[styles.plantMarker, { backgroundColor: colors.surface, borderColor: plant.pestStatus === 'active' ? colors.warning : colors.primary }]}>
                  <Ionicons name={plant.pestStatus === 'active' ? 'warning-outline' : 'leaf-outline'} size={15} color={plant.pestStatus === 'active' ? colors.warning : colors.primary} /><Text numberOfLines={1} style={[styles.plantMarkerText, { color: colors.text }]}>{plant.name}</Text>
                </View>
              </DraggableMarker>)}
              {mappedPlants.length === 0 && plan.structures.length === 0 && <View pointerEvents="none" style={styles.canvasEmpty}><Ionicons name="map-outline" size={26} color={colors.textDisabled} /><Text style={[styles.helper, { color: colors.textSecondary }]}>Coloca plantas desde el editor y añade aquí bancales, macetas y zonas.</Text></View>}
            </Pressable>
          </View>
          <View style={styles.legendRow}><Legend color={lightColor} label="Luz marcada por ti" styles={styles} colors={colors} /><Legend color={waterColor} label="Riego marcado por ti" styles={styles} colors={colors} /><Legend color={colors.primary} label="Cultivo registrado" styles={styles} colors={colors} /></View>

          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Bancales, macetas y estructuras</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Cada elemento puede tener dimensiones, fondo, notas y foto.</Text></View>
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>{editingStructureId ? 'Editar elemento' : 'Añadir elemento'}</Text>
            <TextInput accessibilityLabel="Nombre del espacio" value={structureName} onChangeText={setStructureName} placeholder="Nombre del espacio" placeholderTextColor={colors.textDisabled} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>{STRUCTURE_KINDS.map((item) => <ChoiceChip key={item.id} selected={structureKind === item.id} label={item.label} onPress={() => setStructureKind(item.id)} styles={styles} colors={colors} />)}</ScrollView>
            <View style={styles.inputRow}>
              <NumberInput label="Ancho cm" value={structureWidth} onChangeText={setStructureWidth} styles={styles} colors={colors} />
              <NumberInput label="Largo cm" value={structureLength} onChangeText={setStructureLength} styles={styles} colors={colors} />
              {['bed', 'planter', 'pot'].includes(structureKind) && <NumberInput label="Fondo cm" value={structureDepth} onChangeText={setStructureDepth} styles={styles} colors={colors} />}
            </View>
            <TextInput accessibilityLabel="Notas del espacio" value={structureNote} onChangeText={setStructureNote} placeholder="Notas: material, ubicación, observaciones…" placeholderTextColor={colors.textDisabled} style={[styles.input, styles.multiline, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} multiline />
            <View style={styles.buttonRow}><ActionButton label={editingStructureId ? 'Guardar cambios' : 'Añadir al plano'} icon={editingStructureId ? 'save-outline' : 'add-outline'} onPress={saveStructure} primary styles={styles} colors={colors} />{editingStructureId && <ActionButton label="Foto" icon="image-outline" onPress={() => void addStructurePhoto(editingStructureId)} styles={styles} colors={colors} />}{editingStructureId && <ActionButton label="Cancelar" icon="close-outline" onPress={() => setEditingStructureId(null)} styles={styles} colors={colors} />}</View>
            {editingStructureId && plan.structures.find((item) => item.id === editingStructureId)?.photoUri ? <Image source={{ uri: plan.structures.find((item) => item.id === editingStructureId)?.photoUri }} style={styles.structurePhoto} accessibilityLabel="Foto del espacio" /> : null}
            {plan.structures.length > 0 && <View style={styles.list}>{plan.structures.map((item) => <View key={item.id} style={[styles.listRow, { borderColor: colors.border }]}>
              <View style={styles.listMain}><Ionicons name={iconForStructure(item.kind)} size={18} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.name}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{item.widthCm} × {item.lengthCm} cm{item.depthCm ? ` · fondo ${item.depthCm} cm` : ''}</Text></View></View>
              <View style={styles.buttonRow}><SmallButton label="Editar" icon="create-outline" onPress={() => editStructure(item)} styles={styles} colors={colors} /><SmallButton label="Ubicar" icon="move-outline" onPress={() => { setPendingPlace({ type: 'structure', id: item.id }); notice(`Toca el plano para ubicar ${item.name}.`); }} styles={styles} colors={colors} /><SmallButton label="Quitar" icon="trash-outline" onPress={() => removeStructure(item.id)} styles={styles} colors={colors} /></View>
            </View>)}</View>}
          </View>

          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Capas de luz y riego</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Describe las condiciones que has observado; Semilla no simula mediciones que no tiene.</Text></View>
          <View style={styles.section}>
            <TextInput accessibilityLabel="Nombre de la zona" value={zoneName} onChangeText={setZoneName} placeholder="Nombre de la zona" placeholderTextColor={colors.textDisabled} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
            <View style={styles.choiceRow}>{(['light', 'irrigation'] as const).map((kind) => <ChoiceChip key={kind} selected={zoneKind === kind} label={kind === 'light' ? 'Luz' : 'Riego'} onPress={() => setZoneKind(kind)} styles={styles} colors={colors} />)}</View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>{(zoneKind === 'light' ? LIGHT_LEVELS : IRRIGATION_KINDS).map((item) => <ChoiceChip key={item.id} selected={zoneKind === 'light' ? lightLevel === item.id : irrigationKind === item.id} label={item.label} onPress={() => zoneKind === 'light' ? setLightLevel(item.id as LightLevel) : setIrrigationKind(item.id as IrrigationKind)} styles={styles} colors={colors} />)}</ScrollView>
            <View style={styles.inputRow}><NumberInput label="Ancho zona cm" value={zoneWidthCm} onChangeText={setZoneWidthCm} styles={styles} colors={colors} /><NumberInput label="Largo zona cm" value={zoneLengthCm} onChangeText={setZoneLengthCm} styles={styles} colors={colors} /></View>
            <TextInput accessibilityLabel="Nota de la zona" value={zoneNote} onChangeText={setZoneNote} placeholder="Nota opcional de esta zona" placeholderTextColor={colors.textDisabled} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
            <View style={styles.buttonRow}><ActionButton label={editingZoneId ? 'Guardar zona' : 'Añadir zona al plano'} icon={editingZoneId ? 'save-outline' : 'add-outline'} onPress={addZone} primary styles={styles} colors={colors} />{editingZoneId && <ActionButton label="Foto" icon="image-outline" onPress={() => void addZonePhoto(editingZoneId)} styles={styles} colors={colors} />}{editingZoneId && <ActionButton label="Cancelar" icon="close-outline" onPress={() => setEditingZoneId(null)} styles={styles} colors={colors} />}</View>
            {editingZoneId && plan.zones.find((item) => item.id === editingZoneId)?.photoUri ? <Image source={{ uri: plan.zones.find((item) => item.id === editingZoneId)?.photoUri }} style={styles.structurePhoto} accessibilityLabel="Foto de la zona" /> : null}
            {plan.zones.length > 0 && <View style={styles.list}>{plan.zones.map((zone) => <View key={zone.id} style={[styles.listRow, { borderColor: colors.border }]}>
              <View style={styles.listMain}><View style={[styles.colorDot, { backgroundColor: zone.kind === 'light' ? lightColor : waterColor }]} /><View style={{ flex: 1 }}><TextInput accessibilityLabel={`Nombre de zona ${zone.name}`} value={zone.name} onChangeText={(name) => updateZone(zone.id, { name })} style={[styles.rowTitle, { color: colors.text, padding: 0 }]} /><Text style={[styles.helper, { color: colors.textSecondary }]}>{zone.kind === 'light' ? LIGHT_LEVELS.find((item) => item.id === zone.lightLevel)?.label : IRRIGATION_KINDS.find((item) => item.id === zone.irrigation)?.label} · {zone.widthCm} × {zone.lengthCm} cm{zone.note ? ` · ${zone.note}` : ''}</Text></View></View>
              {zone.photoUri ? <Image source={{ uri: zone.photoUri }} style={styles.structurePhoto} accessibilityLabel={`Foto de ${zone.name}`} /> : null}
              <View style={styles.buttonRow}><SmallButton label="Editar" icon="create-outline" onPress={() => editZone(zone)} styles={styles} colors={colors} /><SmallButton label="Ubicar" icon="move-outline" onPress={() => { setPendingPlace({ type: 'zone', id: zone.id }); notice(`Toca el plano para ubicar ${zone.name}.`); }} styles={styles} colors={colors} /><SmallButton label="Quitar" icon="trash-outline" onPress={() => updatePlan((current) => ({ ...current, zones: current.zones.filter((item) => item.id !== zone.id) }))} styles={styles} colors={colors} /></View>
            </View>)}</View>}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.listMain}><Ionicons name={lightMismatches.length ? 'sunny-outline' : 'eye-outline'} size={20} color={lightMismatches.length ? colors.warning : colors.info} /><Text style={[styles.sectionTitle, { color: colors.text }]}>Luz observada y cultivos</Text></View>
            {!plan.zones.some((zone) => zone.kind === 'light') ? <Text style={[styles.helper, { color: colors.textSecondary }]}>Marca una zona de luz para comparar sus condiciones con las necesidades del catálogo.</Text> : lightMismatches.length ? <View style={styles.list}>{lightMismatches.map((item, index) => <Text key={`${item.name}-${index}`} style={[styles.helper, { color: colors.warning }]}>• {item.name} necesita {item.need === 'full' ? 'sol directo' : 'sombra'} en el catálogo, pero «{item.zone}» está marcada como {item.observed === 'full' ? 'sol directo' : 'sombra'}.</Text>)}</View> : <Text style={[styles.helper, { color: colors.textSecondary }]}>No hay conflictos extremos entre las zonas marcadas y las necesidades conocidas. Los datos de luz son tus observaciones, no una medición automática.</Text>}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.listMain}><Ionicons name={spacingWarnings.length ? 'warning-outline' : 'checkmark-circle-outline'} size={20} color={spacingWarnings.length ? colors.warning : colors.success} /><Text style={[styles.sectionTitle, { color: colors.text }]}>Separación entre cultivos</Text></View>
            {!plan.dimensions ? <Text style={[styles.helper, { color: colors.textSecondary }]}>Añade las medidas del huerto para comparar distancias con el espaciamiento del catálogo.</Text> : spacingWarnings.length ? <View style={styles.list}>{spacingWarnings.map((warning, index) => <Text key={`${warning.first}-${warning.second}-${index}`} style={[styles.helper, { color: colors.text }]}>• {warning.first} y {warning.second}: {Math.round(warning.distanceCm)} cm entre centros; el catálogo indica al menos {warning.requiredCm} cm.</Text>)}</View> : <Text style={[styles.helper, { color: colors.textSecondary }]}>{mappedPlants.length < 2 ? 'Coloca al menos dos cultivos para revisar sus distancias.' : 'No aparecen separaciones inferiores a las indicadas por el catálogo para este plano.'}</Text>}
          </View>
        </>}

        {tab === 'season' && <>
          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Calendario y rotación</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Fechas guardadas por ti y ventanas publicadas en el catálogo para {activeGarden?.climateZone ?? 'tu zona'}.</Text></View>
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Añadir una plantación planificada</Text>
            <TextInput accessibilityLabel="Buscar cultivo" value={cropQuery} onChangeText={setCropQuery} placeholder="Buscar en el catálogo de cultivos" placeholderTextColor={colors.textDisabled} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
            <Text style={[styles.label, { color: colors.text }]}>¿Qué vas a hacer?</Text>
            <View style={styles.choiceRow}><ChoiceChip selected={plannedAction === 'sowing'} label="Siembra" onPress={() => setPlannedAction('sowing')} styles={styles} colors={colors} /><ChoiceChip selected={plannedAction === 'transplant'} label="Trasplante" onPress={() => setPlannedAction('transplant')} styles={styles} colors={colors} /></View>
            <Text style={[styles.label, { color: colors.text }]}>Cultivo</Text>
            <View style={styles.cropChoices}>{visibleCrops.map((crop) => <ChoiceChip key={crop.id} selected={selectedCropId === crop.id} label={`${crop.emoji} ${crop.name}`} onPress={() => { setSelectedCropId(crop.id); setCropQuery(crop.name); }} styles={styles} colors={colors} />)}</View>
            {plannedAction === 'sowing' && selectedCrop && activeGarden && selectedCrop.sowingMonths[activeGarden.climateZone]?.length > 0 && <Text style={[styles.helper, { color: colors.textSecondary }]}>Meses que indica el catálogo para siembra: {monthList(selectedCrop.sowingMonths[activeGarden.climateZone])}. Es una referencia estacional.</Text>}
            <View style={styles.inputRow}><NumberInput label="Unidades por tanda" value={plannedCount} onChangeText={setPlannedCount} styles={styles} colors={colors} /><Pressable accessibilityRole="button" accessibilityLabel={`Fecha de inicio ${localIsoDate(plannedDate)}`} onPress={() => setShowDatePicker(true)} style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="calendar-outline" size={17} color={colors.primary} /><Text style={[styles.inputText, { color: colors.text }]}>{localIsoDate(plannedDate)}</Text></Pressable></View>
            <View style={styles.inputRow}><NumberInput label="Número de tandas" value={successionRounds} onChangeText={setSuccessionRounds} styles={styles} colors={colors} /><NumberInput label="Intervalo en días" value={successionInterval} onChangeText={setSuccessionInterval} styles={styles} colors={colors} /></View>
            <Text style={[styles.helper, { color: colors.textSecondary }]}>Una tanda crea una sola fecha. Para escalonar, indica de 2 a 12 tandas y un intervalo de 1 a 90 días.</Text>
            {showDatePicker && <DateTimePicker value={plannedDate} mode="date" display={Platform.OS === 'ios' ? 'compact' : 'default'} onChange={(_, date) => { if (date) setPlannedDate(date); if (Platform.OS !== 'ios') setShowDatePicker(false); }} />}
            <TextInput accessibilityLabel="Ubicación planificada" value={plannedLocation} onChangeText={setPlannedLocation} placeholder="Bancal o zona (opcional)" placeholderTextColor={colors.textDisabled} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
            <TextInput accessibilityLabel="Nota de la plantación" value={plannedNote} onChangeText={setPlannedNote} placeholder="Nota o repetición de siembra (opcional)" placeholderTextColor={colors.textDisabled} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
            <ActionButton label="Añadir al calendario" icon="calendar-number-outline" onPress={addPlannedPlanting} primary styles={styles} colors={colors} />
            {datedPlan.length === 0 ? <Text style={[styles.helper, { color: colors.textSecondary }]}>Aún no hay plantaciones planificadas guardadas para este huerto.</Text> : <View style={styles.list}>{datedPlan.map((item) => {
              const crop = CROPS_BY_ID[item.cropId];
              const sowMonths = activeGarden && crop ? crop.sowingMonths[activeGarden.climateZone] : [];
              const withinWindow = dateFallsInMonths(item.plannedDate, sowMonths ?? []);
              return <View key={item.id} style={[styles.listRow, { borderColor: colors.border }]}><View style={styles.listMain}><Ionicons name="leaf-outline" size={18} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{crop?.name ?? 'Cultivo archivado'} · {item.count} unidades</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{formatDate(item.plannedDate)}{item.successionIndex && item.successionTotal ? ` · Tanda ${item.successionIndex} de ${item.successionTotal}` : ''}{item.location ? ` · ${item.location}` : ''}</Text>{crop && sowMonths?.length > 0 && !withinWindow && <Text style={[styles.helper, { color: colors.warning }]}>Esta fecha queda fuera de los meses de siembra que muestra el catálogo para la zona elegida.</Text>}{item.note ? <Text style={[styles.helper, { color: colors.textSecondary }]}>{item.note}</Text> : null}</View></View><SmallButton label={item.successionId ? 'Quitar tanda' : 'Quitar'} icon="trash-outline" onPress={() => updatePlan((current) => ({ ...current, plannedPlantings: current.plannedPlantings.filter((entry) => entry.id !== item.id) }))} styles={styles} colors={colors} /></View>;
            })}</View>}
          </View>

          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Cosecha estimada de tus plantas</Text></View>
          <View style={styles.section}>
            {mappedPlants.length === 0 ? <Text style={[styles.helper, { color: colors.textSecondary }]}>Coloca plantas en el mapa para ver fechas registradas o estimaciones basadas en el catálogo.</Text> : <View style={styles.list}>{mappedPlants.map(({ plant }) => <View key={plant.id} style={[styles.listRow, { borderColor: colors.border }]}><View style={styles.listMain}><Ionicons name="time-outline" size={18} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{plant.name}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{harvestText(plant, CROPS_BY_ID[plant.cropId]?.daysToHarvest, now)}</Text></View></View></View>)}</View>}
          </View>

          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Rotación por ubicación</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Se compara el grupo botánico guardado en el catálogo con temporadas archivadas en la misma parcela.</Text></View>
          <View style={styles.section}>
            <ActionButton label={`Guardar el plano como temporada ${currentYear}`} icon="archive-outline" onPress={saveSeason} primary styles={styles} colors={colors} />
            {rotationWarnings.length ? <View style={styles.list}>{rotationWarnings.map(({ current, previous }, index) => <Text key={`${current.plantId}-${index}`} style={[styles.helper, { color: colors.warning }]}>• {current.name}: grupo {current.rotationGroup}, también registrado en {previous.year} en esta ubicación.</Text>)}</View> : <Text style={[styles.helper, { color: colors.textSecondary }]}>{previousSeasons.length === 0 ? 'Guarda una temporada y vuelve aquí otro año para revisar las repeticiones.' : 'No hay coincidencias de grupo botánico en las ubicaciones comparables.'}</Text>}
            {previousSeasons.length === 0 && mappedPlants.some(({ plant }) => !CROPS_BY_ID[plant.cropId]?.rotationGroup) && <Text style={[styles.helper, { color: colors.textSecondary }]}>Algunos cultivos aún no tienen grupo de rotación verificado en el catálogo; se omiten en el análisis.</Text>}
            {plan.seasons.length ? <View style={styles.list}>{plan.seasons.map((season) => <View key={season.id} style={[styles.listRow, { borderColor: colors.border }]}><View style={styles.listMain}><Ionicons name="time-outline" size={18} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{season.label}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{season.plants.length} cultivos · guardada {formatDate(season.savedAt.slice(0, 10))}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{season.plants.map((item) => item.name).join(', ')}</Text></View></View><View style={styles.buttonRow}><SmallButton label={`Plan ${Math.max(currentYear + 1, season.year + 1)}`} icon="copy-outline" onPress={() => prepareNextSeason(season)} styles={styles} colors={colors} /><SmallButton label="Quitar" icon="trash-outline" onPress={() => updatePlan((current) => ({ ...current, seasons: current.seasons.filter((entry) => entry.id !== season.id) }))} styles={styles} colors={colors} /></View></View>)}</View> : <Text style={[styles.helper, { color: colors.textSecondary }]}>Guarda el plano actual para conservar su distribución y poder usarlo como base de otra temporada.</Text>}
          </View>

          {isPro ? <>
            {(plan.seasonPlans ?? []).map((seasonPlan) => <View key={seasonPlan.id} style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.listMain}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{seasonPlan.label}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Borrador separado de tus plantas activas · copia {seasonPlan.gridRows} × {seasonPlan.gridCols} y conserva las ubicaciones.</Text></View><SmallButton label="Quitar" icon="trash-outline" onPress={() => updatePlan((current) => ({ ...current, seasonPlans: (current.seasonPlans ?? []).filter((item) => item.id !== seasonPlan.id) }))} styles={styles} colors={colors} /></View>
              {seasonPlan.plants.length === 0 ? <Text style={[styles.helper, { color: colors.textSecondary }]}>La temporada archivada no contenía cultivos para copiar.</Text> : seasonPlan.plants.map((plant) => {
                const crop = CROPS_BY_ID[plant.cropId];
                const catalogMonths = activeGarden && crop ? crop.sowingMonths[activeGarden.climateZone] : [];
                const choices = catalogMonths?.length ? catalogMonths : MONTH_NUMBERS;
                return <View key={plant.id} style={[styles.listRow, { borderColor: colors.border }]}>
                  <View style={styles.listMain}><Ionicons name="leaf-outline" size={17} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{plant.name}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{plant.locationKey}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{catalogMonths?.length ? 'Meses de siembra indicados por el catálogo:' : 'El catálogo no indica meses para este cultivo; elige una referencia manual:'}</Text></View></View>
                  <View style={styles.choiceRow}>{choices.map((month) => <ChoiceChip key={month} selected={plant.plannedMonth === month} label={monthShortLabel(month)} onPress={() => setSeasonPlantMonth(seasonPlan.id, plant.id, month)} styles={styles} colors={colors} />)}</View>
                </View>;
              })}
              {seasonPlan.plants.length > 0 && <Text style={[styles.helper, { color: colors.textSecondary }]}>Elegir el mismo mes otra vez lo deja sin programar. El mes es orientativo; el día concreto se decide al añadir la siembra al calendario.</Text>}
            </View>)}

            <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Ocupación estimada por meses</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Las barras terminan en la duración media de cosecha del catálogo. Son una referencia, no una fecha garantizada para liberar el bancal.</Text></View>
            {[...new Set([currentYear, ...(plan.seasonPlans ?? []).map((seasonPlan) => seasonPlan.year)])].sort((a, b) => a - b).map((year) => {
              const scheduledRows = plan.plannedPlantings.filter((item) => Number(item.plannedDate.slice(0, 4)) === year).map((item) => ({
                id: item.id, cropId: item.cropId, name: CROPS_BY_ID[item.cropId]?.name ?? item.cropId, count: item.count,
                month: Number(item.plannedDate.slice(5, 7)), location: item.location,
              }));
              const draftRows = (plan.seasonPlans ?? []).filter((seasonPlan) => seasonPlan.year === year).flatMap((seasonPlan) => seasonPlan.plants
                .filter((plant) => plant.plannedMonth !== undefined)
                .map((plant) => ({ id: plant.id, cropId: plant.cropId, name: plant.name, count: 1, month: plant.plannedMonth!, location: plant.locationKey })));
              const rows = [...scheduledRows, ...draftRows];
              const pending = (plan.seasonPlans ?? []).filter((seasonPlan) => seasonPlan.year === year).reduce((total, seasonPlan) => total + seasonPlan.plants.filter((plant) => plant.plannedMonth === undefined).length, 0);
              return <View key={year} style={styles.section}>
                <Text style={[styles.label, { color: colors.text }]}>{year}</Text>
                {rows.length === 0 ? <Text style={[styles.helper, { color: colors.textSecondary }]}>{pending ? `${pending} cultivos copiados todavía esperan un mes.` : 'No hay cultivos planificados con mes para mostrar.'}</Text> : <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.timelineContent}>
                  <View>
                    <View style={styles.timelineHeader}><Text style={[styles.timelineName, { color: colors.textSecondary }]}>Cultivo</Text><View style={styles.timelineMonths}>{MONTH_NUMBERS.map((month) => <Text key={month} style={[styles.timelineMonth, { color: colors.textSecondary }]}>{monthShortLabel(month)}</Text>)}</View></View>
                    {rows.map((row) => {
                      const window = getOccupancyWindow(row.month, CROPS_BY_ID[row.cropId]?.daysToHarvest);
                      return <View key={row.id} style={styles.timelineHeader}>
                        <View style={styles.timelineName}><Text numberOfLines={1} style={[styles.helper, { color: colors.text }]}>{row.name} × {row.count}</Text>{row.location ? <Text numberOfLines={1} style={[styles.timelineMeta, { color: colors.textSecondary }]}>{row.location}</Text> : null}</View>
                        <View style={styles.timelineMonths}>{MONTH_NUMBERS.map((month) => {
                          const occupied = window ? month >= window.startMonth && month <= window.endMonth : month === row.month;
                          return <View key={month} accessibilityLabel={`${monthShortLabel(month)}${occupied ? ', ocupación estimada' : ''}`} style={[styles.timelineCell, { borderColor: colors.border, backgroundColor: occupied ? colors.primary : colors.surfaceAlt }]} />;
                        })}</View>
                      </View>;
                    })}
                  </View>
                </ScrollView>}
                {pending > 0 && rows.length > 0 && <Text style={[styles.helper, { color: colors.textSecondary }]}>{pending} cultivos copiados todavía esperan un mes.</Text>}
              </View>;
            })}

            <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Asociaciones del catálogo</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Relaciones explícitas entre cultivos que ya has colocado; se muestran como referencia del catálogo, no como garantía agronómica.</Text></View>
            <View style={styles.section}>{mapAssociations.length ? <View style={styles.list}>{mapAssociations.map((association) => <View key={`${association.firstPlantId}-${association.secondPlantId}`} style={styles.listMain}><Ionicons name={association.kind === 'incompatible' ? 'alert-circle-outline' : 'people-outline'} size={18} color={association.kind === 'incompatible' ? colors.warning : colors.success} /><Text style={[styles.helper, { color: colors.text, flex: 1 }]}>{association.firstName} + {association.secondName}: {association.kind === 'incompatible' ? 'el catálogo los marca como incompatibles' : 'el catálogo los relaciona como acompañantes'}{association.sameLocation ? ' · misma ubicación indicada' : ''}</Text></View>)}</View> : <Text style={[styles.helper, { color: colors.textSecondary }]}>No hay asociaciones declaradas en el catálogo entre los cultivos que aparecen en este plano.</Text>}</View>

            <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Previsión para tu huerto</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Pronóstico real para {activeGarden?.province ?? 'tu ubicación configurada'}; úsalo para revisar, no para automatizar el riego.</Text></View>
            <View style={styles.section}>
              <View style={styles.listMain}><Text style={[styles.helper, { color: colors.textSecondary, flex: 1 }]}>{weather ? `${weather.source === 'live' ? 'Actualizada' : 'En caché'} · ${new Date(weather.fetchedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}` : weatherLoading ? 'Consultando el servicio meteorológico…' : weatherError ? 'No hay previsión disponible ahora.' : 'Configura una provincia para consultar la previsión.'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Actualizar previsión" disabled={weatherLoading} onPress={() => void refreshWeather()} style={[styles.smallButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: weatherLoading ? 0.5 : 1 }]}><Ionicons name="refresh-outline" size={15} color={colors.primary} /><Text style={[styles.smallButtonText, { color: colors.primary }]}>{weatherLoading ? 'Actualizando' : 'Actualizar'}</Text></Pressable></View>
              {weatherError && <Text style={[styles.helper, { color: colors.warning }]}>No se pudo consultar el proveedor. Si aparece una previsión en caché, está identificada como tal.</Text>}
              {weather && <View style={styles.list}>{[weather.today, ...weather.forecast].map((day) => <View key={day.date} style={[styles.listRow, { borderColor: colors.border }]}><View style={styles.listMain}><Ionicons name="partly-sunny-outline" size={18} color={colors.primary} /><Text style={[styles.rowTitle, { color: colors.text, flex: 1 }]}>{formatDate(day.date)}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{Math.round(day.tempMin)}° / {Math.round(day.tempMax)}° · {day.precipitationMm} mm · {day.rainProbability}% lluvia</Text></View></View>)}</View>}
              {weather && getForecastCareNotes([weather.today, ...weather.forecast]).map((note, index) => {
                const isFuture = note.date > localIsoDate(new Date());
                const weekday = expoWeekdayForDate(note.date);
                return <View key={`${note.date}-${note.kind}-${index}`} style={[styles.listMain, { alignItems: 'flex-start' }]}>
                  <Ionicons name={note.kind === 'rain' ? 'rainy-outline' : note.kind === 'cold' ? 'snow-outline' : 'sunny-outline'} size={17} color={colors.warning} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={[styles.helper, { color: colors.textSecondary }]}><Text style={{ color: colors.text, fontWeight: '700' }}>{formatDate(note.date)} · {note.title}. </Text>{note.detail}</Text>
                    {isFuture && weekday !== null && <Pressable accessibilityRole="button" accessibilityLabel={`Crear recordatorio para ${formatDate(note.date)}: ${note.title}`} onPress={() => router.push((`/reminder/new?title=${encodeURIComponent(note.title)}&type=custom&frequency=once&weekday=${weekday}&date=${note.date}`) as any)} style={({ pressed }) => [styles.smallButton, { alignSelf: 'flex-start', minHeight: 44, backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                      <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                      <Text style={[styles.smallButtonText, { color: colors.primary, fontSize: 12 }]}>Crear recordatorio</Text>
                    </Pressable>}
                  </View>
                </View>;
              })}
            </View>
          </> : <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Planificación de temporadas · Pro</Text>
            <Text style={[styles.helper, { color: colors.textSecondary }]}>Copia una temporada sin alterar tus plantas, distribuye los cultivos por meses y consulta su ocupación estimada.</Text>
            <ActionButton label="Ver Semilla Pro" icon="lock-closed-outline" onPress={() => router.push('/paywall?source=map_season_planner' as any)} primary styles={styles} colors={colors} />
          </View>}
        </>}

        {tab === 'materials' && <>
          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Lista del plano</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Cantidades derivadas de tus plantas colocadas y de las siembras que has planificado.</Text></View>
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Cultivos que ya tienes en el plano</Text>
            {currentCounts.length ? <View style={styles.list}>{currentCounts.map((item) => <View key={item.name} style={[styles.listRow, { borderColor: colors.border }]}><View style={styles.listMain}><Ionicons name="leaf-outline" size={18} color={colors.primary} /><Text style={[styles.rowTitle, { color: colors.text, flex: 1 }]}>{item.name}</Text></View><Text style={[styles.quantity, { color: colors.primary }]}>{item.count}</Text></View>)}</View> : <Text style={[styles.helper, { color: colors.textSecondary }]}>No hay plantas colocadas. Las plantas sin ubicar no se cuentan como parte de este plano.</Text>}
            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Próximos plantones o siembras</Text>
            {datedPlan.length ? <View style={styles.list}>{datedPlan.map((item) => <View key={item.id} style={[styles.listRow, { borderColor: colors.border }]}><View style={styles.listMain}><Ionicons name="calendar-outline" size={18} color={colors.info} /><Text style={[styles.rowTitle, { color: colors.text, flex: 1 }]}>{CROPS_BY_ID[item.cropId]?.name ?? 'Cultivo'} · {formatDate(item.plannedDate)}</Text></View><Text style={[styles.quantity, { color: colors.primary }]}>{item.count}</Text></View>)}</View> : <Text style={[styles.helper, { color: colors.textSecondary }]}>No has añadido plantaciones futuras.</Text>}
          </View>
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Sustrato para espacios con fondo medido</Text>
            {structureLiters > 0 ? <><Text style={[styles.volume, { color: colors.primary }]}>{Math.round(structureLiters)} L</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Volumen geométrico sumado de bancales, jardineras y macetas con fondo indicado. No descuenta drenaje, volumen de plantas ni asentamiento del sustrato.</Text></> : <Text style={[styles.helper, { color: colors.textSecondary }]}>Añade ancho, largo y fondo a un bancal, jardinera o maceta para calcular su volumen geométrico. Los pasillos y estructuras no se incluyen.</Text>}
          </View>
          <View style={[styles.section, { backgroundColor: colors.surfaceAlt }]}><View style={styles.listMain}><Ionicons name="information-circle-outline" size={19} color={colors.info} /><Text style={[styles.rowTitle, { color: colors.text }]}>Sin cantidades de compra inventadas</Text></View><Text style={[styles.helper, { color: colors.textSecondary }]}>La lista usa unidades de cultivo reales. No estima sobres, semillas de reserva, bolsas ni litros de mezcla si el catálogo o tus medidas no los especifican.</Text></View>
        </>}

        {tab === 'share' && <>
          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Guarda o comparte el plano</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>Incluye medidas, estructuras, cultivos colocados, próximas siembras y temporadas archivadas.</Text></View>
          <View style={styles.section}>
            <View style={styles.previewSummary}><Text style={[styles.rowTitle, { color: colors.text }]}>{activeGarden?.name ?? 'Mi huerto'}</Text><Text style={[styles.helper, { color: colors.textSecondary }]}>{plan.dimensions ? `${plan.dimensions.widthCm} × ${plan.dimensions.lengthCm} cm` : 'Medidas no configuradas'} · {mappedPlants.length} plantas · {plan.structures.length} espacios · {plan.seasons.length} temporadas guardadas</Text></View>
            <ActionButton label="Imprimir o guardar como PDF" icon="print-outline" onPress={() => void printPlan()} primary styles={styles} colors={colors} />
            <ActionButton label="Compartir resumen" icon="share-social-outline" onPress={() => void sharePlan()} styles={styles} colors={colors} />
            <ActionButton label="Invitar a consultar este huerto" icon="people-outline" onPress={() => router.push('/garden/share' as any)} styles={styles} colors={colors} />
            <Text style={[styles.helper, { color: colors.textSecondary }]}>Las notas y fotos de tus espacios se guardan en el plano y se sincronizan con tu cuenta; el resumen compartido no incluye fotos privadas.</Text>
          </View>
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Contenido incluido</Text>
            <View style={styles.listMain}><Ionicons name="checkmark-circle-outline" size={17} color={colors.success} /><Text style={[styles.helper, { color: colors.textSecondary, flex: 1 }]}>Cultivos y cantidades presentes en el mapa</Text></View>
            <View style={styles.listMain}><Ionicons name="checkmark-circle-outline" size={17} color={colors.success} /><Text style={[styles.helper, { color: colors.textSecondary, flex: 1 }]}>Dimensiones y volumen geométrico configurado</Text></View>
            <View style={styles.listMain}><Ionicons name="checkmark-circle-outline" size={17} color={colors.success} /><Text style={[styles.helper, { color: colors.textSecondary, flex: 1 }]}>Calendario próximo y temporadas archivadas</Text></View>
            <View style={styles.listMain}><Ionicons name="checkmark-circle-outline" size={17} color={colors.success} /><Text style={[styles.helper, { color: colors.textSecondary, flex: 1 }]}>Zonas de luz y riego descritas por ti</Text></View>
          </View>
        </>}
      </ScrollView>
      <StitchBottomNav active="map" />
    </SafeAreaView>
  );
}

function DraggableMarker({ children, style, onDrop, marker = false }: { children: React.ReactNode; style: StyleProp<ViewStyle>; onDrop: (pageX: number, pageY: number) => void; marker?: boolean }) {
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.hypot(gesture.dx, gesture.dy) > 5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gesture) => onDrop(gesture.moveX, gesture.moveY),
  }), [onDrop]);
  return <View {...responder.panHandlers} style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }, marker && { marginLeft: -48, marginTop: -15 }, style]}>{children}</View>;
}

function NumberInput({ label, value, onChangeText, styles, colors }: { label: string; value: string; onChangeText: (value: string) => void; styles: ReturnType<typeof makeStyles>; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.numberWrap}><Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>;
}

function ChoiceChip({ selected, label, onPress, styles, colors }: { selected: boolean; label: string; onPress: () => void; styles: ReturnType<typeof makeStyles>; colors: ReturnType<typeof useColors> }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.choiceChip, { backgroundColor: selected ? colors.primary + '16' : colors.surfaceAlt, borderColor: selected ? colors.primary : colors.border }]}><Text style={[styles.choiceText, { color: selected ? colors.primaryDark : colors.textSecondary }]}>{label}</Text></Pressable>;
}

function ActionButton({ label, icon, onPress, styles, colors, primary = false }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; styles: ReturnType<typeof makeStyles>; colors: ReturnType<typeof useColors>; primary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.actionButton, { backgroundColor: primary ? colors.primaryDark : colors.surface, borderColor: primary ? colors.primaryDark : colors.border }]}><Ionicons name={icon} size={18} color={primary ? '#fff' : colors.primary} /><Text style={[styles.actionText, { color: primary ? '#fff' : colors.primary }]}>{label}</Text></Pressable>;
}

function SmallButton({ label, icon, onPress, styles, colors }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; styles: ReturnType<typeof makeStyles>; colors: ReturnType<typeof useColors> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.smallButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name={icon} size={15} color={colors.primary} /><Text style={[styles.smallButtonText, { color: colors.primary }]}>{label}</Text></Pressable>;
}

function Legend({ color, label, styles, colors }: { color: string; label: string; styles: ReturnType<typeof makeStyles>; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.legendItem}><View style={[styles.colorDot, { backgroundColor: color }]} /><Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text></View>;
}

function iconForStructure(kind: MapStructureKind): keyof typeof Ionicons.glyphMap {
  const icons: Record<MapStructureKind, keyof typeof Ionicons.glyphMap> = {
    bed: 'grid-outline', planter: 'albums-outline', pot: 'flower-outline', path: 'remove-outline',
    wall: 'square-outline', trellis: 'git-branch-outline', greenhouse: 'home-outline',
  };
  return icons[kind];
}

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function monthList(months: number[]): string {
  return months.map((month) => new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2026, month - 1, 1))).join(', ');
}

function monthShortLabel(month: number): string {
  return new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(2026, month - 1, 1)).replace('.', '');
}

function harvestText(plant: Plant, days: [number, number] | undefined, today: Date): string {
  if (plant.firstHarvestDate) return `Primera cosecha registrada: ${formatDate(plant.firstHarvestDate)}.`;
  const start = plant.transplantDate ?? plant.sowingDate;
  if (!start || !days) return 'Añade una fecha de siembra o trasplante y el catálogo para mostrar una estimación.';
  const base = new Date(`${start.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(base.getTime())) return 'La fecha registrada no permite calcular una estimación.';
  const min = new Date(base); min.setDate(min.getDate() + days[0]);
  const max = new Date(base); max.setDate(max.getDate() + days[1]);
  const status = max < today ? 'Ventana estimada ya pasada' : 'Ventana estimada de cosecha';
  return `${status}: ${formatDate(localIsoDate(min))} – ${formatDate(localIsoDate(max))}, basada en ${days[0]}–${days[1]} días del catálogo.`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function createPrintHtml(gardenName: string, summary: string, plan: GardenMapPlan, crops: Array<{ name: string; count: number }>, plants: MappedPlant[]): string {
  const cropRows = crops.map((item) => `<li>${escapeHtml(item.name)} — ${item.count}</li>`).join('');
  const structureRows = plan.structures.map((item) => `<li>${escapeHtml(item.name)} · ${item.widthCm} × ${item.lengthCm} cm${item.depthCm ? ` × ${item.depthCm} cm` : ''}</li>`).join('');
  const lines = summary.split('\n').map((line) => escapeHtml(line)).join('<br>');
  const svg = createMapSvg(plan, plants);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Plano de ${escapeHtml(gardenName)}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#18351f;margin:28px;line-height:1.45}h1{font-size:24px}h2{font-size:16px;margin-top:22px;border-bottom:1px solid #c9dec2;padding-bottom:6px}.panel{background:#f1f7ec;border:1px solid #d5e7cf;border-radius:12px;padding:14px}li{margin:5px 0}.muted{color:#4d6552;font-size:12px}.map{width:100%;height:auto;border:1px solid #c9dec2;border-radius:12px}@page{margin:14mm}</style></head><body><h1>Plano de ${escapeHtml(gardenName)}</h1><div class="panel">${lines}</div><h2>Distribución del espacio</h2>${svg}<h2>Cultivos colocados</h2><ul>${cropRows || '<li>Sin cultivos colocados</li>'}</ul><h2>Espacios medidos</h2><ul>${structureRows || '<li>Sin espacios configurados</li>'}</ul><p class="muted">Generado en Semilla. Si no se registraron dimensiones, el croquis no está a escala. Las zonas de luz y riego reflejan observaciones configuradas por la persona usuaria.</p></body></html>`;
}

function createMapSvg(plan: GardenMapPlan, plants: MappedPlant[]): string {
  const widthCm = plan.dimensions?.widthCm ?? 600;
  const lengthCm = plan.dimensions?.lengthCm ?? 400;
  const width = 800;
  const height = Math.max(360, Math.min(650, width * lengthCm / widthCm));
  const zones = plan.zones.map((zone) => {
    const x = zone.x * width;
    const y = zone.y * height;
    const rectWidth = Math.min(width, zone.widthCm / widthCm * width);
    const rectHeight = Math.min(height, zone.lengthCm / lengthCm * height);
    const color = zone.kind === 'light' ? '#E7AE23' : '#58A7C1';
    return `<g><rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" rx="12" fill="${color}" fill-opacity=".22" stroke="${color}" stroke-width="2"/><text x="${x + 8}" y="${y + 20}" font-size="13" fill="#18351f">${escapeHtml(zone.name)}</text></g>`;
  }).join('');
  const structures = plan.structures.map((item) => {
    const x = item.x * width;
    const y = item.y * height;
    const rectWidth = Math.min(width, item.widthCm / widthCm * width);
    const rectHeight = Math.min(height, item.lengthCm / lengthCm * height);
    const color = item.kind === 'path' ? '#87918A' : '#408D4E';
    return `<g><rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" rx="8" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="2"/><text x="${x + 8}" y="${y + 20}" font-size="13" fill="#18351f">${escapeHtml(item.name)}</text></g>`;
  }).join('');
  const markers = plants.map(({ plant, x, y }) => `<g><circle cx="${x * width}" cy="${y * height}" r="9" fill="#348C48" stroke="#fff" stroke-width="3"/><text x="${x * width + 12}" y="${y * height + 4}" font-size="13" fill="#18351f">${escapeHtml(plant.name)}</text></g>`).join('');
  return `<svg class="map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Croquis del huerto"><rect width="100%" height="100%" rx="12" fill="#F3F7EF" stroke="#C9DEC2"/>${zones}${structures}${markers}</svg>`;
}

function makeStyles(colors: ReturnType<typeof useColors>, theme: ReturnType<typeof useTheme>) {
  const { spacing, fontSize, fontWeight, radii } = theme;
  return StyleSheet.create({
    container: { flex: 1 }, content: { paddingHorizontal: spacing.md, paddingBottom: 110, gap: spacing.sm },
    header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 56, minHeight: 44, flexDirection: 'row', alignItems: 'center' }, backText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, headerTitle: { flex: 1, alignItems: 'center' }, title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' }, subtitle: { fontSize: fontSize.xs, marginTop: 2 },
    tabRow: { gap: spacing.xs, paddingBottom: spacing.xs }, tab: { minHeight: 44, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, tabText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
    notice: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radii.md }, error: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radii.md }, noticeText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17 },
    sectionHeading: { gap: 3, marginTop: spacing.md }, sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, helper: { fontSize: fontSize.xs, lineHeight: 18 }, label: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: spacing.xs }, section: { padding: spacing.md, gap: spacing.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }, numberWrap: { flex: 1, minWidth: 0, gap: 4 }, inputLabel: { fontSize: 10, fontWeight: fontWeight.bold }, input: { minHeight: 44, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.sm, fontSize: fontSize.sm }, inputText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, multiline: { minHeight: 68, paddingTop: 10, textAlignVertical: 'top' }, dateButton: { minHeight: 44, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    actionButton: { minHeight: 46, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, actionText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, textAlign: 'center', flexShrink: 1 }, buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, smallButton: { minHeight: 38, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, smallButtonText: { fontSize: 10, fontWeight: fontWeight.bold },
    choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, cropChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, choiceChip: { minHeight: 38, borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' }, choiceText: { fontSize: 11, fontWeight: fontWeight.bold },
    mapCanvas: { width: '100%', minHeight: 220, maxHeight: 470, borderWidth: 1, borderRadius: radii.lg, overflow: 'hidden', position: 'relative' }, mapGuides: { ...StyleSheet.absoluteFill, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', alignContent: 'space-around', padding: 12 }, mapDot: { width: 3, height: 3, borderRadius: 2, opacity: 0.7 }, mapNorth: { position: 'absolute', top: 8, right: 10, zIndex: 3, fontSize: 10, fontWeight: fontWeight.bold }, zoneLabel: { fontSize: 9, fontWeight: fontWeight.bold, textAlign: 'center' }, structureLabel: { fontSize: 10, fontWeight: fontWeight.bold, textAlign: 'center', paddingHorizontal: 2 }, plantMarker: { minHeight: 30, maxWidth: 100, borderWidth: 1.5, borderRadius: radii.full, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }, plantMarkerText: { fontSize: 9, fontWeight: fontWeight.bold, maxWidth: 68 }, canvasEmpty: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, gap: 8 }, legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendText: { fontSize: 9 }, colorDot: { width: 12, height: 12, borderRadius: 4 },
    list: { gap: spacing.xs }, listRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm, gap: spacing.xs }, listMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, rowTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold }, structurePhoto: { width: 94, height: 72, borderRadius: radii.md, resizeMode: 'cover' }, quantity: { fontSize: fontSize.md, fontWeight: fontWeight.bold }, volume: { fontSize: 30, fontWeight: fontWeight.bold }, previewSummary: { gap: 5 },
    timelineContent: { minWidth: 490, paddingVertical: spacing.xs }, timelineHeader: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, timelineName: { width: 125 }, timelineMonths: { flexDirection: 'row', gap: 2 }, timelineMonth: { width: 27, textAlign: 'center', fontSize: 9, textTransform: 'lowercase' }, timelineCell: { width: 27, height: 14, borderWidth: 1, borderRadius: 3 }, timelineMeta: { fontSize: 9 },
  });
}
