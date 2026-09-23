import { describe, expect, it } from 'vitest';
import { DISEASES } from '../../data/diseases';
import { filterDiseaseCatalog } from '../diseaseGuide';

describe('filterDiseaseCatalog', () => {
  it('filters by type and searches symptoms, descriptions and affected crops', () => {
    const pests = filterDiseaseCatalog(DISEASES, '', 'plaga');
    expect(pests.length).toBeGreaterThan(0);
    expect(pests.every(({ type }) => type === 'plaga')).toBe(true);

    expect(filterDiseaseCatalog(DISEASES, 'melaza', null).map(({ id }) => id)).toContain('pulgon');
    expect(filterDiseaseCatalog(DISEASES, 'calabacín', null).map(({ id }) => id)).toContain('oidio');
  });

  it('supports translated searchable fields and ignores accents/case', () => {
    const result = filterDiseaseCatalog(DISEASES, 'SINTOMA', null, (disease) =>
      disease.id === 'mildiu' ? 'Síntoma de hoja' : disease.name,
    );
    expect(result.map(({ id }) => id)).toEqual(['mildiu']);
  });

  it('returns the full catalog for an empty query and no rows for unmatched searches', () => {
    expect(filterDiseaseCatalog(DISEASES, '   ', null)).toBe(DISEASES);
    expect(filterDiseaseCatalog(DISEASES, 'síntoma inexistente 9348', null)).toEqual([]);
  });
});
