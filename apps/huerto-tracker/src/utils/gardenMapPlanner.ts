import type { GardenMapPlan, GardenMapPlanV2, GardenSeasonPlan, GardenSeasonPlanPlant, GardenSeasonSnapshot, MapDimensions, SeasonPlantSnapshot } from '../models/garden-map-plan';

export interface SpacingPlant {
  id: string;
  name: string;
  x: number;
  y: number;
  spacingCm?: number;
  groupKey?: string;
}

export interface SpacingWarning {
  first: string;
  second: string;
  distanceCm: number;
  requiredCm: number;
}

export type MapSpacingStatus =
  | { status: 'known'; warnings: SpacingWarning[] }
  | { status: 'unknown'; reason: 'dimensions' | 'crop-spacing' };

export function getMapSpacingStatus(
  plants: Array<Pick<SpacingPlant, 'id' | 'x' | 'y' | 'spacingCm'> & Partial<Pick<SpacingPlant, 'name' | 'groupKey'>>>,
  dimensions?: MapDimensions,
): MapSpacingStatus {
  if (!dimensions || dimensions.widthCm <= 0 || dimensions.lengthCm <= 0) return { status: 'unknown', reason: 'dimensions' };
  if (plants.some((plant) => !Number.isFinite(plant.spacingCm) || Number(plant.spacingCm) <= 0)) return { status: 'unknown', reason: 'crop-spacing' };
  const warnings = findSpacingWarnings(plants.map((plant) => ({
    ...plant,
    name: plant.name ?? plant.id,
    spacingCm: Number(plant.spacingCm),
  })), dimensions);
  return { status: 'known', warnings };
}

export function placePlantOnMap(
  scene: GardenMapPlan,
  plantId: string,
  point: { x: number; y: number },
  structureId?: string,
): GardenMapPlanV2 {
  const base: GardenMapPlanV2 = scene.version === 2
    ? { ...scene, plantPlacements: [...scene.plantPlacements] }
    : { ...scene, version: 2, plantPlacements: [] };
  const placement = {
    plantId,
    x: clampNormalized(point.x),
    y: clampNormalized(point.y),
    ...(structureId ? { structureId } : {}),
  };
  return {
    ...base,
    plantPlacements: [...base.plantPlacements.filter((item) => item.plantId !== plantId), placement],
  };
}

function clampNormalized(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function soilVolumeLiters(widthCm: number, lengthCm: number, depthCm: number): number | null {
  if (![widthCm, lengthCm, depthCm].every((value) => Number.isFinite(value) && value > 0)) return null;
  return (widthCm * lengthCm * depthCm) / 1000;
}

/** x/y are normalized map coordinates (0..1); dimensions are centimeters. */
export function findSpacingWarnings(plants: SpacingPlant[], dimensions?: MapDimensions): SpacingWarning[] {
  if (!dimensions || dimensions.widthCm <= 0 || dimensions.lengthCm <= 0) return [];
  const warnings: SpacingWarning[] = [];
  for (let i = 0; i < plants.length; i += 1) {
    const a = plants[i];
    if (!a.spacingCm || a.spacingCm <= 0) continue;
    for (let j = i + 1; j < plants.length; j += 1) {
      const b = plants[j];
      if (!b.spacingCm || b.spacingCm <= 0) continue;
      if (a.groupKey && b.groupKey && a.groupKey !== b.groupKey) continue;
      const dx = (a.x - b.x) * dimensions.widthCm;
      const dy = (a.y - b.y) * dimensions.lengthCm;
      // Normalize floating-point noise (for example 24.999999999999996 cm).
      const distanceCm = Number(Math.hypot(dx, dy).toFixed(2));
      const requiredCm = Math.max(a.spacingCm, b.spacingCm);
      if (distanceCm + 0.001 < requiredCm) warnings.push({ first: a.name, second: b.name, distanceCm, requiredCm });
    }
  }
  return warnings;
}

export function dateFallsInMonths(date: string, months: number[]): boolean {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || months.length === 0) return false;
  return months.includes(parsed.getMonth() + 1);
}

/** Returns locally formatted calendar dates for an explicit sowing succession. */
export function generateSuccessionDates(startDate: string, rounds: number, intervalDays: number): string[] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(rounds) || rounds < 1 || rounds > 12) return null;
  if (!Number.isInteger(intervalDays) || (rounds > 1 && (intervalDays < 1 || intervalDays > 90))) return null;

  const [year, month, day] = startDate.split('-').map(Number);
  const first = new Date(year, month - 1, day, 12);
  if (first.getFullYear() !== year || first.getMonth() !== month - 1 || first.getDate() !== day) return null;

  return Array.from({ length: rounds }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index * intervalDays);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
}

export function getSeasonRotationWarnings(current: SeasonPlantSnapshot[], previous: GardenSeasonSnapshot[]) {
  const past = previous.flatMap((season) => season.plants.map((plant) => ({ ...plant, year: season.year })));
  return current.flatMap((plant) => {
    if (!plant.rotationGroup) return [];
    const match = past.find((earlier) => earlier.locationKey === plant.locationKey && earlier.rotationGroup === plant.rotationGroup);
    return match ? [{ current: plant, previous: match }] : [];
  });
}

/** Creates a separate proposal; it never turns archived plants into live plants. */
export function createSeasonPlanFromSnapshot(
  season: GardenSeasonSnapshot,
  targetYear: number,
  planId: string,
  createdAt: string,
): GardenSeasonPlan | null {
  if (!Number.isInteger(targetYear) || targetYear <= season.year || !planId || !createdAt) return null;
  const plants: GardenSeasonPlanPlant[] = season.plants.map((plant, index) => ({
    id: `${planId}:${index + 1}`,
    cropId: plant.cropId,
    name: plant.name,
    rotationGroup: plant.rotationGroup,
    locationKey: plant.locationKey,
    x: plant.x,
    y: plant.y,
  }));
  return {
    id: planId,
    year: targetYear,
    label: `Plan ${targetYear} · desde ${season.label}`,
    createdAt,
    sourceSeasonId: season.id,
    gridRows: season.gridRows,
    gridCols: season.gridCols,
    plants,
  };
}

export interface OccupancyWindow {
  startMonth: number;
  endMonth: number;
  continuesNextYear: boolean;
}

/** Catalog days are an estimate; no window is returned when the catalog has none. */
export function getOccupancyWindow(startMonth: number, daysToHarvest?: [number, number]): OccupancyWindow | null {
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) return null;
  if (!daysToHarvest || !daysToHarvest.every((day) => Number.isFinite(day) && day > 0) || daysToHarvest[1] < daysToHarvest[0]) return null;
  const estimatedMonths = Math.max(1, Math.ceil(((daysToHarvest[0] + daysToHarvest[1]) / 2) / 30));
  const lastMonth = startMonth + estimatedMonths - 1;
  return {
    startMonth,
    endMonth: Math.min(12, lastMonth),
    continuesNextYear: lastMonth > 12,
  };
}

export interface CropAssociation {
  id: string;
  name: string;
  companions: string[];
  incompatible: string[];
}

export interface MappedCropPresence {
  plantId: string;
  cropId: string;
  name: string;
  locationKey: string;
}

export interface MapCropAssociation {
  firstPlantId: string;
  firstName: string;
  secondPlantId: string;
  secondName: string;
  kind: 'companion' | 'incompatible';
  sameLocation: boolean;
}

/** Reports only explicit two-way/one-way relations from the active crop catalog. */
export function findMapCropAssociations(
  plants: MappedCropPresence[],
  catalog: Record<string, CropAssociation>,
): MapCropAssociation[] {
  const result: MapCropAssociation[] = [];
  for (let i = 0; i < plants.length; i += 1) {
    for (let j = i + 1; j < plants.length; j += 1) {
      const first = plants[i];
      const second = plants[j];
      if (first.cropId === second.cropId) continue;
      const cropA = catalog[first.cropId];
      const cropB = catalog[second.cropId];
      if (!cropA || !cropB) continue;
      const incompatible = cropA.incompatible.includes(second.cropId) || cropB.incompatible.includes(first.cropId);
      const companion = cropA.companions.includes(second.cropId) || cropB.companions.includes(first.cropId);
      if (!incompatible && !companion) continue;
      result.push({
        firstPlantId: first.plantId,
        firstName: first.name,
        secondPlantId: second.plantId,
        secondName: second.name,
        kind: incompatible ? 'incompatible' : 'companion',
        sameLocation: first.locationKey === second.locationKey,
      });
    }
  }
  return result;
}

export function formatSeasonLocation(row: number, col: number): string {
  return `parcela-${row}-${col}`;
}
