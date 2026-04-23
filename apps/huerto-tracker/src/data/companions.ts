import { CROPS_BY_ID, type CropInfo } from './crops';

export function getCompanions(cropId: string): CropInfo[] {
  const crop = CROPS_BY_ID[cropId];
  if (!crop) return [];
  return crop.companions
    .map((id) => CROPS_BY_ID[id])
    .filter((c): c is CropInfo => c !== undefined);
}

export function getIncompatible(cropId: string): CropInfo[] {
  const crop = CROPS_BY_ID[cropId];
  if (!crop) return [];
  return crop.incompatible
    .map((id) => CROPS_BY_ID[id])
    .filter((c): c is CropInfo => c !== undefined);
}

export function areCompatible(cropIdA: string, cropIdB: string): boolean {
  const cropA = CROPS_BY_ID[cropIdA];
  const cropB = CROPS_BY_ID[cropIdB];
  if (!cropA || !cropB) return true;
  return (
    !cropA.incompatible.includes(cropIdB) &&
    !cropB.incompatible.includes(cropIdA)
  );
}

export function getCompatibilityStatus(
  cropIdA: string,
  cropIdB: string
): 'companion' | 'incompatible' | 'neutral' {
  const cropA = CROPS_BY_ID[cropIdA];
  const cropB = CROPS_BY_ID[cropIdB];
  if (!cropA || !cropB) return 'neutral';

  const aLikesB = cropA.companions.includes(cropIdB);
  const bLikesA = cropB.companions.includes(cropIdA);
  const aHatesB = cropA.incompatible.includes(cropIdB);
  const bHatesA = cropB.incompatible.includes(cropIdA);

  if (aHatesB || bHatesA) return 'incompatible';
  if (aLikesB || bLikesA) return 'companion';
  return 'neutral';
}
