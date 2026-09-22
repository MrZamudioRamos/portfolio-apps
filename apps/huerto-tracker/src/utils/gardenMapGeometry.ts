import type { MapDimensions, MapStructure } from '../models/garden-map-plan';

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface NormalizedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Return the normalized bounding box of a physically sized, rotated object. */
export function rotatedStructureBounds(structure: MapStructure, dimensions?: MapDimensions): NormalizedBounds {
  const width = dimensions && dimensions.widthCm > 0 ? structure.widthCm / dimensions.widthCm : structure.widthCm / 100;
  const height = dimensions && dimensions.lengthCm > 0 ? structure.lengthCm / dimensions.lengthCm : structure.lengthCm / 100;
  const angle = ((structure.rotationDegrees ?? 0) % 360) * Math.PI / 180;
  const rotatedWidth = Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle));
  const rotatedHeight = Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle));
  const centerX = structure.x + width / 2;
  const centerY = structure.y + height / 2;
  return { x: centerX - rotatedWidth / 2, y: centerY - rotatedHeight / 2, width: rotatedWidth, height: rotatedHeight };
}

/** Move by center point, preserving physical dimensions and rotation. */
export function moveMapStructure(
  structure: MapStructure,
  normalizedPoint: NormalizedPoint,
  dimensions?: MapDimensions,
): MapStructure {
  const point = { x: clamp(normalizedPoint.x), y: clamp(normalizedPoint.y) };
  if (!dimensions || dimensions.widthCm <= 0 || dimensions.lengthCm <= 0) {
    return { ...structure, x: point.x, y: point.y };
  }

  const width = structure.widthCm / dimensions.widthCm;
  const height = structure.lengthCm / dimensions.lengthCm;
  const rotated = rotatedStructureBounds({ ...structure, x: 0, y: 0 }, dimensions);
  const boundedCenterX = clamp(point.x, rotated.width / 2, 1 - rotated.width / 2);
  const boundedCenterY = clamp(point.y, rotated.height / 2, 1 - rotated.height / 2);
  return {
    ...structure,
    x: boundedCenterX - width / 2,
    y: boundedCenterY - height / 2,
  };
}

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
