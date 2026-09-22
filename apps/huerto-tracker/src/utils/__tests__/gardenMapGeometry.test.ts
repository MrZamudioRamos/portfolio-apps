import { describe, expect, it } from 'vitest';
import { moveMapStructure, rotatedStructureBounds } from '../gardenMapGeometry';

describe('garden map geometry', () => {
  it('keeps a moved rectangular structure inside the measured garden bounds', () => {
    const result = moveMapStructure(
      { id: 'bed', name: 'Bancal', kind: 'bed', x: 0.8, y: 0.8, widthCm: 80, lengthCm: 60, rotationDegrees: 0 },
      { x: 1, y: 1 },
      { widthCm: 100, lengthCm: 100 },
    );

    expect(result.x).toBeLessThanOrEqual(0.2);
    expect(result.y).toBeLessThanOrEqual(0.4);
  });

  it('clamps the rotated bounding box while preserving the structure angle and physical dimensions', () => {
    const result = moveMapStructure(
      { id: 'bed', name: 'Bancal', kind: 'bed', x: 0, y: 0, widthCm: 80, lengthCm: 40, rotationDegrees: 45 },
      { x: 1, y: 1 },
      { widthCm: 100, lengthCm: 100 },
    );
    const bounds = rotatedStructureBounds(result, { widthCm: 100, lengthCm: 100 });

    expect(result.rotationDegrees).toBe(45);
    expect(result.widthCm).toBe(80);
    expect(result.lengthCm).toBe(40);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(1.000001);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(1.000001);
  });

  it('keeps relative normalized placement when the garden has no measured dimensions', () => {
    const result = moveMapStructure(
      { id: 'row', name: 'Fila', kind: 'row', x: 0.2, y: 0.3, widthCm: 50, lengthCm: 10, rowSpacingCm: 25 },
      { x: 0.6, y: 0.4 },
    );

    expect(result).toMatchObject({ x: 0.6, y: 0.4, rowSpacingCm: 25, kind: 'row' });
  });
});
