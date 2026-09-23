import { describe, expect, it } from 'vitest';
import { buildNewPlantDraft, getPlantNameAfterCropChange } from '../plantDraft';

describe('buildNewPlantDraft', () => {
  it('refuses to create a plant without its garden, catalog crop, and name', () => {
    const valid = {
      gardenId: 'garden-1',
      cropId: 'tomato',
      name: '  Cherry  ',
      status: 'growing' as const,
      propagationMethod: 'bought' as const,
    };

    expect(buildNewPlantDraft({ ...valid, cropId: null })).toBeNull();
    expect(buildNewPlantDraft({ ...valid, gardenId: null })).toBeNull();
    expect(buildNewPlantDraft({ ...valid, name: '   ' })).toBeNull();
  });

  it('preserves the chosen variety, propagation, date, status, and persisted photo', () => {
    expect(buildNewPlantDraft({
      gardenId: 'garden-1',
      cropId: 'tomato',
      name: '  Mi tomate  ',
      variety: '  Cherry  ',
      varietyId: 'tomato-cherry',
      sowingDate: '2026-04-12',
      status: 'transplanted',
      propagationMethod: 'bought',
      photoUri: 'file:///plants/tomato.jpg',
    })).toEqual({
      gardenId: 'garden-1',
      cropId: 'tomato',
      name: 'Mi tomate',
      variety: 'Cherry',
      varietyId: 'tomato-cherry',
      sowingDate: '2026-04-12',
      status: 'transplanted',
      propagationMethod: 'bought',
      photoUri: 'file:///plants/tomato.jpg',
    });
  });

  it('does not record sowing before a guided grower confirms they started', () => {
    expect(buildNewPlantDraft({
      gardenId: 'garden-1',
      cropId: 'tomato',
      name: 'Tomate',
      sowingDate: '2026-04-12',
      status: 'growing',
      propagationMethod: 'bought',
      guided: true,
    })).toEqual({
      gardenId: 'garden-1',
      cropId: 'tomato',
      name: 'Tomate',
      status: 'seedling',
      propagationMethod: 'seed',
    });
  });
});

describe('getPlantNameAfterCropChange', () => {
  it('updates an automatically filled crop name but preserves a user-edited name', () => {
    expect(getPlantNameAfterCropChange('Tomate', 'Tomate', 'Albahaca')).toBe('Albahaca');
    expect(getPlantNameAfterCropChange('Mi planta favorita', 'Tomate', 'Albahaca')).toBe('Mi planta favorita');
    expect(getPlantNameAfterCropChange('', null, 'Albahaca')).toBe('Albahaca');
    expect(getPlantNameAfterCropChange('Nombre antes de elegir', null, 'Albahaca')).toBe('Nombre antes de elegir');
  });
});
