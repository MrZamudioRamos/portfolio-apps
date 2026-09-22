import type { FreeMapPositions } from '../hooks/useGardenFreeLayout';
import type { GridLayout } from '../hooks/useGardenLayout';
import { EMPTY_GARDEN_MAP_PLAN, normalizeGardenMapPlan, type GardenMapPlan, type GardenMapPlanV2, type MapPlantPlacement } from '../models/garden-map-plan';

export function migrateLegacyMapScene(input: {
  plan: unknown;
  grid: GridLayout;
  rows: number;
  cols: number;
  free: FreeMapPositions;
  preferFree: boolean;
}): GardenMapPlanV2 {
  const { plan, grid, rows, cols, free, preferFree } = input;
  if (!Number.isInteger(rows) || rows <= 0 || !Number.isInteger(cols) || cols <= 0) {
    throw new TypeError('Garden grid dimensions must be positive integers');
  }

  const normalized = normalizeGardenMapPlan(plan ?? EMPTY_GARDEN_MAP_PLAN);
  if (normalized.version === 2) return normalized;

  const placements: MapPlantPlacement[] = [];
  const indexByPlantId = new Map<string, number>();
  grid.forEach((plantId, index) => {
    if (!plantId || index >= rows * cols || indexByPlantId.has(plantId)) return;
    const row = Math.floor(index / cols);
    const col = index % cols;
    indexByPlantId.set(plantId, placements.length);
    placements.push({ plantId, x: (col + 0.5) / cols, y: (row + 0.5) / rows });
  });

  for (const [plantId, position] of Object.entries(free ?? {})) {
    if (!isValidPosition(position)) continue;
    const existingIndex = indexByPlantId.get(plantId);
    if (existingIndex === undefined) {
      indexByPlantId.set(plantId, placements.length);
      placements.push({ plantId, x: position.x, y: position.y });
    } else if (preferFree) {
      placements[existingIndex] = { plantId, x: position.x, y: position.y };
    }
  }

  return { ...normalized, version: 2, plantPlacements: placements };
}

function isValidPosition(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== 'object') return false;
  const position = value as { x?: unknown; y?: unknown };
  return typeof position.x === 'number' && Number.isFinite(position.x) && position.x >= 0 && position.x <= 1
    && typeof position.y === 'number' && Number.isFinite(position.y) && position.y >= 0 && position.y <= 1;
}
