import { useCollection } from '@portfolio/storage';
import { useMemo } from 'react';
import type { CropInfo } from '../data/crops';
import { type CustomCrop, customCropToCropInfo } from '../models/custom-crop';

export function useCustomCrops() {
  const collection = useCollection<CustomCrop>('custom_crops');

  const customCropsById = useMemo(
    () =>
      Object.fromEntries(
        collection.items.map((cc) => [cc.id, customCropToCropInfo(cc)])
      ) as Record<string, CropInfo & { isCustom: true }>,
    [collection.items]
  );

  return { collection, customCropsById };
}
