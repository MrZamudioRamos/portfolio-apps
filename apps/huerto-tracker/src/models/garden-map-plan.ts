import type { FreeMapPositions } from '../hooks/useGardenFreeLayout';
import type { GridLayout } from '../hooks/useGardenLayout';

export type MapStructureKind = 'bed' | 'planter' | 'pot' | 'path' | 'wall' | 'trellis' | 'greenhouse';
export type MapZoneKind = 'light' | 'irrigation';
export type LightLevel = 'full' | 'partial' | 'shade';
export type IrrigationKind = 'drip' | 'manual' | 'none';

export interface MapDimensions {
  widthCm: number;
  lengthCm: number;
}

export interface MapStructure {
  id: string;
  name: string;
  kind: MapStructureKind;
  x: number;
  y: number;
  widthCm: number;
  lengthCm: number;
  depthCm?: number;
  note?: string;
  photoUri?: string;
}

export interface MapZone {
  id: string;
  name: string;
  kind: MapZoneKind;
  x: number;
  y: number;
  widthCm: number;
  lengthCm: number;
  lightLevel?: LightLevel;
  irrigation?: IrrigationKind;
  note?: string;
  photoUri?: string;
}

export interface PlannedPlanting {
  id: string;
  cropId: string;
  count: number;
  plannedDate: string;
  /** Explicit user-selected action; absent on older plans to preserve their meaning. */
  action?: 'sowing' | 'transplant';
  location?: string;
  note?: string;
  successionId?: string;
  successionIndex?: number;
  successionTotal?: number;
  intervalDays?: number;
}

export interface SeasonPlantSnapshot {
  plantId: string;
  cropId: string;
  name: string;
  rotationGroup?: string;
  locationKey: string;
  x: number;
  y: number;
}

export interface GardenSeasonSnapshot {
  id: string;
  year: number;
  label: string;
  savedAt: string;
  gridRows: number;
  gridCols: number;
  grid: GridLayout;
  free: FreeMapPositions;
  plants: SeasonPlantSnapshot[];
}

export interface GardenSeasonPlanPlant {
  id: string;
  cropId: string;
  name: string;
  rotationGroup?: string;
  locationKey: string;
  x: number;
  y: number;
  /** Month chosen by the gardener. Missing means it has not been scheduled yet. */
  plannedMonth?: number;
}

export interface GardenSeasonPlan {
  id: string;
  year: number;
  label: string;
  createdAt: string;
  sourceSeasonId: string;
  gridRows: number;
  gridCols: number;
  plants: GardenSeasonPlanPlant[];
}

export interface GardenMapPlan {
  version: 1;
  dimensions?: MapDimensions;
  structures: MapStructure[];
  zones: MapZone[];
  plannedPlantings: PlannedPlanting[];
  seasons: GardenSeasonSnapshot[];
  seasonPlans?: GardenSeasonPlan[];
}

export const EMPTY_GARDEN_MAP_PLAN: GardenMapPlan = {
  version: 1,
  structures: [],
  zones: [],
  plannedPlantings: [],
  seasons: [],
  seasonPlans: [],
};

export function normalizeGardenMapPlan(value: unknown): GardenMapPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_GARDEN_MAP_PLAN;
  const input = value as Partial<GardenMapPlan>;
  const dimensions = input.dimensions;
  const safeDimensions = dimensions
    && Number.isFinite(dimensions.widthCm) && dimensions.widthCm > 0
    && Number.isFinite(dimensions.lengthCm) && dimensions.lengthCm > 0
    ? { widthCm: dimensions.widthCm, lengthCm: dimensions.lengthCm }
    : undefined;
  return {
    version: 1,
    dimensions: safeDimensions,
    structures: Array.isArray(input.structures) ? input.structures.filter(isStructure) : [],
    zones: Array.isArray(input.zones) ? input.zones.filter(isZone) : [],
    plannedPlantings: Array.isArray(input.plannedPlantings) ? input.plannedPlantings.filter(isPlannedPlanting) : [],
    seasons: Array.isArray(input.seasons) ? input.seasons.filter(isSeasonSnapshot).slice(0, 12) : [],
    seasonPlans: Array.isArray(input.seasonPlans) ? input.seasonPlans.filter(isSeasonPlan).slice(0, 12) : [],
  };
}

function isStructure(value: unknown): value is MapStructure {
  if (!value || typeof value !== 'object') return false;
  const item = value as MapStructure;
  return typeof item.id === 'string' && typeof item.name === 'string'
    && ['bed', 'planter', 'pot', 'path', 'wall', 'trellis', 'greenhouse'].includes(item.kind)
    && [item.x, item.y, item.widthCm, item.lengthCm].every(Number.isFinite)
    && item.x >= 0 && item.x <= 1 && item.y >= 0 && item.y <= 1
    && item.widthCm > 0 && item.lengthCm > 0
    && (item.photoUri === undefined || isSafePhotoUri(item.photoUri));
}

function isZone(value: unknown): value is MapZone {
  if (!value || typeof value !== 'object') return false;
  const item = value as MapZone;
  return typeof item.id === 'string' && typeof item.name === 'string'
    && (item.kind === 'light' || item.kind === 'irrigation')
    && [item.x, item.y, item.widthCm, item.lengthCm].every(Number.isFinite)
    && item.x >= 0 && item.x <= 1 && item.y >= 0 && item.y <= 1
    && item.widthCm > 0 && item.lengthCm > 0
    && (item.lightLevel === undefined || ['full', 'partial', 'shade'].includes(item.lightLevel))
    && (item.irrigation === undefined || ['drip', 'manual', 'none'].includes(item.irrigation))
    && (item.photoUri === undefined || isSafePhotoUri(item.photoUri));
}

function isSafePhotoUri(value: string): boolean {
  return /^(https:\/\/|file:\/\/|content:\/\/|blob:|data:image\/(jpeg|png|webp);base64,)/i.test(value);
}

function isPlannedPlanting(value: unknown): value is PlannedPlanting {
  if (!value || typeof value !== 'object') return false;
  const item = value as PlannedPlanting;
  const hasSuccession = item.successionId !== undefined;
  const validSuccession = hasSuccession
    ? typeof item.successionId === 'string' && item.successionId.length > 0
      && Number.isInteger(item.successionIndex) && item.successionIndex! >= 1 && item.successionIndex! <= 12
      && Number.isInteger(item.successionTotal) && item.successionTotal! >= item.successionIndex! && item.successionTotal! <= 12
      && Number.isInteger(item.intervalDays) && item.intervalDays! >= 1 && item.intervalDays! <= 90
    : item.successionIndex === undefined && item.successionTotal === undefined && item.intervalDays === undefined;
  return typeof item.id === 'string' && typeof item.cropId === 'string'
    && Number.isInteger(item.count) && item.count > 0
    && typeof item.plannedDate === 'string' && !Number.isNaN(Date.parse(item.plannedDate))
    && (item.action === undefined || item.action === 'sowing' || item.action === 'transplant')
    && validSuccession;
}

function isSeasonSnapshot(value: unknown): value is GardenSeasonSnapshot {
  if (!value || typeof value !== 'object') return false;
  const item = value as GardenSeasonSnapshot;
  const validPlants = Array.isArray(item.plants) && item.plants.every((plant) => plant && typeof plant.plantId === 'string'
    && typeof plant.cropId === 'string' && typeof plant.name === 'string'
    && typeof plant.locationKey === 'string' && Number.isFinite(plant.x) && Number.isFinite(plant.y));
  const validFree = !!item.free && typeof item.free === 'object' && Object.values(item.free).every((position) => position
    && Number.isFinite(position.x) && Number.isFinite(position.y));
  return typeof item.id === 'string' && Number.isInteger(item.year) && typeof item.savedAt === 'string'
    && typeof item.label === 'string' && Number.isInteger(item.gridRows) && Number.isInteger(item.gridCols)
    && validPlants && Array.isArray(item.grid) && item.grid.every((plantId) => plantId === null || typeof plantId === 'string')
    && validFree;
}

function isSeasonPlan(value: unknown): value is GardenSeasonPlan {
  if (!value || typeof value !== 'object') return false;
  const item = value as GardenSeasonPlan;
  const plants = Array.isArray(item.plants) && item.plants.every((plant) => plant && typeof plant.id === 'string'
    && typeof plant.cropId === 'string' && typeof plant.name === 'string'
    && typeof plant.locationKey === 'string' && Number.isFinite(plant.x) && Number.isFinite(plant.y)
    && plant.x >= 0 && plant.x <= 1 && plant.y >= 0 && plant.y <= 1
    && (plant.plannedMonth === undefined || (Number.isInteger(plant.plannedMonth) && plant.plannedMonth >= 1 && plant.plannedMonth <= 12)));
  return typeof item.id === 'string' && Number.isInteger(item.year) && typeof item.label === 'string'
    && typeof item.createdAt === 'string' && typeof item.sourceSeasonId === 'string'
    && Number.isInteger(item.gridRows) && item.gridRows > 0 && Number.isInteger(item.gridCols) && item.gridCols > 0
    && plants;
}
