import type { DiseaseInfo, DiseaseType } from '../data/diseases';

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

/** Filters the editorial catalog; callers may include localized fields in searchText. */
export function filterDiseaseCatalog<T extends DiseaseInfo>(
  diseases: T[],
  query: string,
  typeFilter: DiseaseType | null,
  searchText: (disease: T) => string = (disease) => [
    disease.name,
    disease.symptoms,
    disease.description,
    ...disease.affectedCrops,
    ...disease.visualSigns,
    ...disease.treatments.flatMap(({ name, instructions }) => [name, instructions]),
  ].join(' '),
): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery && !typeFilter) return diseases;

  return diseases.filter((disease) => {
    if (typeFilter && disease.type !== typeFilter) return false;
    return !normalizedQuery || normalizeSearchText(searchText(disease)).includes(normalizedQuery);
  });
}
