import type { BaseItem } from '@portfolio/storage';
import type { CropCategory, CropInfo } from '../data/crops';
import type { ClimateZone } from './garden';

export interface CustomCrop extends BaseItem {
  name: string;
  emoji: string;
  category: CropCategory;
  daysToHarvestMin: number;
  daysToHarvestMax: number;
  sowingMonths: number[];
  harvestMonths: number[];
  sunNeeds: 'full' | 'partial' | 'shade';
  waterNeeds: 'high' | 'medium' | 'low';
  spacing: number;
  notes: string;
}

const ALL_ZONES: ClimateZone[] = ['atlantica', 'continental', 'mediterranea', 'subtropical'];

export function customCropToCropInfo(cc: CustomCrop): CropInfo & { isCustom: true } {
  const sowingByZone = Object.fromEntries(
    ALL_ZONES.map((z) => [z, cc.sowingMonths])
  ) as Record<ClimateZone, number[]>;
  const harvestByZone = Object.fromEntries(
    ALL_ZONES.map((z) => [z, cc.harvestMonths])
  ) as Record<ClimateZone, number[]>;
  return {
    id: cc.id,
    name: cc.name,
    emoji: cc.emoji,
    category: cc.category,
    sowingMonths: sowingByZone,
    harvestMonths: harvestByZone,
    daysToHarvest: [cc.daysToHarvestMin, cc.daysToHarvestMax],
    sunNeeds: cc.sunNeeds,
    waterNeeds: cc.waterNeeds,
    spacing: cc.spacing,
    companions: [],
    incompatible: [],
    tips: cc.notes,
    isCustom: true,
  };
}
