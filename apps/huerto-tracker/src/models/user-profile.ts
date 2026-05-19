import type { BaseItem } from '@portfolio/storage';

export type SpaceType = 'backyard' | 'balcony' | 'indoor' | 'farm' | 'other';
export type GrowingMethod = 'ground' | 'raisedBeds' | 'indoorContainers' | 'outdoorContainers';
export type SunlightLevel = 'full' | 'partial' | 'shade';
export type ExperienceLevel = 'beginner' | 'some' | 'expert';

export interface UserProfile extends BaseItem {
  spaceTypes: SpaceType[];
  growingMethods: GrowingMethod[];
  sunlight: SunlightLevel;
  experience: ExperienceLevel;
}

export const SPACE_TYPE_CONFIG: Record<SpaceType, { emoji: string }> = {
  backyard: { emoji: '🏡' },
  balcony: { emoji: '🪟' },
  indoor: { emoji: '🛋️' },
  farm: { emoji: '🚜' },
  other: { emoji: '📦' },
};

export const GROWING_METHOD_CONFIG: Record<GrowingMethod, { emoji: string }> = {
  ground: { emoji: '🌱' },
  raisedBeds: { emoji: '🟫' },
  indoorContainers: { emoji: '🪴' },
  outdoorContainers: { emoji: '🌻' },
};

export const SUNLIGHT_CONFIG: Record<SunlightLevel, { emoji: string }> = {
  full: { emoji: '☀️' },
  partial: { emoji: '🌤️' },
  shade: { emoji: '☁️' },
};

export const EXPERIENCE_CONFIG: Record<ExperienceLevel, { emoji: string }> = {
  beginner: { emoji: '🌱' },
  some: { emoji: '🌿' },
  expert: { emoji: '🌳' },
};
