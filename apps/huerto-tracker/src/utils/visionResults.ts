import type { PestDiagnosis } from './pestIdentify';
import type { PlantScanResult } from './plantScan';

const CONFIDENCE = new Set(['alta', 'media', 'baja']);
const GROWTH_STAGES = new Set(['seedling', 'vegetative', 'flowering', 'fruiting', 'dormant']);
const DIAGNOSIS_TYPES = new Set(['plaga', 'enfermedad', 'deficiencia', 'saludable']);
const TREATMENT_TYPES = new Set(['organico', 'preventivo', 'quimico']);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.trim().length <= maxLength
    ? value.trim()
    : null;
}

function invalidResult(): never {
  const error = new Error('PARSE_ERROR') as Error & { code: string };
  error.code = 'PARSE_ERROR';
  throw error;
}

export function parsePlantScanResult(value: unknown, allowedCropIds: ReadonlySet<string>): PlantScanResult {
  const result = record(value);
  if (!result || typeof result.identified !== 'boolean'
    || !CONFIDENCE.has(String(result.confidence))
    || !GROWTH_STAGES.has(String(result.growthStage))) {
    return invalidResult();
  }

  const cropName = text(result.cropName, 120);
  const notes = text(result.notes, 1000);
  if (cropName === null || notes === null) return invalidResult();

  const cropId = typeof result.cropId === 'string' && allowedCropIds.has(result.cropId)
    ? result.cropId
    : null;

  return {
    identified: result.identified,
    cropId,
    cropName,
    growthStage: result.growthStage as PlantScanResult['growthStage'],
    notes,
    confidence: result.confidence as PlantScanResult['confidence'],
  };
}

export function parsePestDiagnosis(value: unknown): PestDiagnosis {
  const result = record(value);
  if (!result || typeof result.detected !== 'boolean'
    || !DIAGNOSIS_TYPES.has(String(result.type))
    || !CONFIDENCE.has(String(result.confidence))
    || !Array.isArray(result.treatments) || result.treatments.length > 5) {
    return invalidResult();
  }

  const name = text(result.name, 120);
  const description = text(result.description, 1000);
  const symptoms = text(result.symptoms, 1000);
  if (name === null || description === null || symptoms === null) return invalidResult();

  const treatments = result.treatments.map((item) => {
    const treatment = record(item);
    if (!treatment || !TREATMENT_TYPES.has(String(treatment.type))) return invalidResult();
    const treatmentName = text(treatment.name, 120);
    const instructions = text(treatment.instructions, 1000);
    if (treatmentName === null || instructions === null) return invalidResult();
    return {
      type: treatment.type as PestDiagnosis['treatments'][number]['type'],
      name: treatmentName,
      instructions,
    };
  });

  return {
    detected: result.detected,
    name,
    type: result.type as PestDiagnosis['type'],
    confidence: result.confidence as PestDiagnosis['confidence'],
    description,
    symptoms,
    treatments,
  };
}
