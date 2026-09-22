import { describe, expect, it } from 'vitest';
import { parsePestDiagnosis, parsePlantScanResult } from '../visionResults';

describe('vision result validation', () => {
  it('keeps a plant match only when it belongs to the supplied catalog', () => {
    const result = parsePlantScanResult({
      identified: true,
      cropId: 'tomate',
      cropName: 'Tomate',
      growthStage: 'flowering',
      notes: 'Se aprecian flores.',
      confidence: 'media',
    }, new Set(['tomate']));

    expect(result.cropId).toBe('tomate');

    const untrustedMatch = parsePlantScanResult({
      identified: true,
      cropId: 'not-in-catalog',
      cropName: 'Planta desconocida',
      growthStage: 'vegetative',
      notes: 'No hay coincidencia exacta.',
      confidence: 'baja',
    }, new Set(['tomate']));

    expect(untrustedMatch.cropId).toBeNull();
    expect(untrustedMatch.cropName).toBe('Planta desconocida');
  });

  it('rejects malformed model fields instead of trusting them as app state', () => {
    expect(() => parsePlantScanResult({
      identified: true,
      cropId: 'tomate',
      cropName: 'Tomate',
      growthStage: 'made-up-stage',
      notes: '',
      confidence: 'alta',
    }, new Set(['tomate']))).toThrowError(expect.objectContaining({ code: 'PARSE_ERROR' }));
  });

  it('accepts bounded diagnosis results and rejects unsupported treatment types', () => {
    const result = parsePestDiagnosis({
      detected: true,
      name: 'Pulgón',
      type: 'plaga',
      confidence: 'media',
      description: 'Se observan pequeños insectos en los brotes.',
      symptoms: 'Hojas enrolladas.',
      treatments: [{ type: 'organico', name: 'Inspección manual', instructions: 'Retira los insectos y vuelve a revisar.' }],
    });
    expect(result.treatments).toHaveLength(1);

    expect(() => parsePestDiagnosis({
      detected: true,
      name: 'Problema',
      type: 'plaga',
      confidence: 'alta',
      description: 'Texto.',
      symptoms: 'Texto.',
      treatments: [{ type: 'dangerous', name: 'Producto', instructions: 'Aplicar.' }],
    })).toThrowError(expect.objectContaining({ code: 'PARSE_ERROR' }));
  });
});
