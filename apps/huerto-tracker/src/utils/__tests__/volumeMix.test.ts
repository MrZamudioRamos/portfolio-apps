import { describe, expect, it } from 'vitest';
import { calculateVolumeMix, canEditVolumeMix, loadVolumeMixRecipe, parseVolumeLiters, sanitizeVolumeInput, saveVolumeMixRecipe, type VolumeMixStorage } from '../volumeMix';

function memoryStorage(): VolumeMixStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
  };
}

describe('volume mix calculator', () => {
  it('locks recipe editing while loading or saving', () => {
    expect(canEditVolumeMix(false, false)).toBe(true);
    expect(canEditVolumeMix(true, false)).toBe(false);
    expect(canEditVolumeMix(false, true)).toBe(false);
  });

  it('calculates an 80/20 reference mix from a valid litre amount', () => {
    expect(calculateVolumeMix('20')).toEqual({
      totalLiters: 20,
      substrateLiters: 16,
      perliteLiters: 4,
      substratePercent: 80,
      aerationPercent: 20,
    });
    expect(calculateVolumeMix('10,5')).toEqual({
      totalLiters: 10.5,
      substrateLiters: 8.4,
      perliteLiters: 2.1,
      substratePercent: 80,
      aerationPercent: 20,
    });
  });

  it('rejects empty, zero, negative, malformed, and non-finite litre inputs', () => {
    for (const input of ['', '   ', '0', '-2', '1,2,3', 'abc', 'Infinity']) {
      expect(parseVolumeLiters(input), input).toBeNull();
      expect(calculateVolumeMix(input), input).toBeNull();
    }
  });

  it('keeps a single decimal separator while sanitizing keyboard input', () => {
    expect(sanitizeVolumeInput(' 1,25 L ')).toBe('1,25');
    expect(sanitizeVolumeInput('1.2,3')).toBe('1.23');
  });

  it('stores and restores a recipe only for the same garden', async () => {
    const storage = memoryStorage();
    const recipe = { presetId: 'aromatic' as const, volumeText: '7,5' };
    await saveVolumeMixRecipe('garden-a', recipe, storage);

    await expect(loadVolumeMixRecipe('garden-a', storage)).resolves.toEqual(recipe);
    await expect(loadVolumeMixRecipe('garden-b', storage)).resolves.toBeNull();
  });

  it('treats malformed JSON and invalid stored recipes as an empty state', async () => {
    const storage = memoryStorage();
    await storage.setItem('@huerto/volume-mix/garden-a', '{bad json');
    await expect(loadVolumeMixRecipe('garden-a', storage)).resolves.toBeNull();
    await storage.setItem('@huerto/volume-mix/garden-a', JSON.stringify({ presetId: 'unknown', volumeText: '20' }));
    await expect(loadVolumeMixRecipe('garden-a', storage)).resolves.toBeNull();
  });

  it('does not claim a save for missing gardens or invalid recipes', async () => {
    const storage = memoryStorage();
    await expect(saveVolumeMixRecipe('', { presetId: 'fruiting', volumeText: '20' }, storage)).rejects.toThrow();
    await expect(saveVolumeMixRecipe('garden-a', { presetId: 'fruiting', volumeText: '' }, storage)).rejects.toThrow();
  });

  it('propagates storage write failures so the UI can show a recoverable error', async () => {
    const storage: VolumeMixStorage = {
      getItem: async () => null,
      setItem: async () => { throw new Error('device storage unavailable'); },
    };
    await expect(saveVolumeMixRecipe('garden-a', { presetId: 'fruiting', volumeText: '20' }, storage)).rejects.toThrow('device storage unavailable');
  });
});
