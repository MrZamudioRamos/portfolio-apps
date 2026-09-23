import type { Plant, PropagationMethod } from '../models/plant';

export type NewPlantDraftInput = {
  gardenId?: string | null;
  cropId?: string | null;
  name: string;
  variety?: string | null;
  varietyId?: string | null;
  sowingDate?: string | null;
  status: Plant['status'];
  propagationMethod: PropagationMethod;
  photoUri?: string | null;
  guided?: boolean;
  started?: boolean;
};

export type NewPlantDraft = Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>;

/** Build only a complete, catalog-backed plant record from the add-plant form. */
export function buildNewPlantDraft(input: NewPlantDraftInput): NewPlantDraft | null {
  const gardenId = input.gardenId?.trim();
  const cropId = input.cropId?.trim();
  const name = input.name.trim();
  if (!gardenId || !cropId || !name) return null;

  const waitingToStart = input.guided === true && input.started !== true;
  const variety = input.variety?.trim();

  return {
    gardenId,
    cropId,
    name,
    ...(variety ? { variety } : {}),
    ...(input.varietyId ? { varietyId: input.varietyId } : {}),
    ...(waitingToStart || !input.sowingDate ? {} : { sowingDate: input.sowingDate }),
    status: waitingToStart ? 'seedling' : input.status,
    propagationMethod: waitingToStart ? 'seed' : input.propagationMethod,
    ...(input.photoUri ? { photoUri: input.photoUri } : {}),
  };
}
