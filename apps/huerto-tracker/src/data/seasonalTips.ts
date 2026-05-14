import type { ClimateZone } from '../models/garden';

export interface SeasonalTip {
  emoji: string;
  key: string;
}

// Tips indexed by [zone][month 1-12] — text comes from i18n key
const TIPS: Record<ClimateZone, SeasonalTip[]> = {
  atlantica: [
    { emoji: '🧤', key: 'seasonalTips.atlantica.1' },
    { emoji: '🌱', key: 'seasonalTips.atlantica.2' },
    { emoji: '🪴', key: 'seasonalTips.atlantica.3' },
    { emoji: '🌧️', key: 'seasonalTips.atlantica.4' },
    { emoji: '🐝', key: 'seasonalTips.atlantica.5' },
    { emoji: '💧', key: 'seasonalTips.atlantica.6' },
    { emoji: '🍅', key: 'seasonalTips.atlantica.7' },
    { emoji: '🧺', key: 'seasonalTips.atlantica.8' },
    { emoji: '🥬', key: 'seasonalTips.atlantica.9' },
    { emoji: '🧄', key: 'seasonalTips.atlantica.10' },
    { emoji: '♻️', key: 'seasonalTips.atlantica.11' },
    { emoji: '📋', key: 'seasonalTips.atlantica.12' },
  ],
  mediterranea: [
    { emoji: '🫑', key: 'seasonalTips.mediterranea.1' },
    { emoji: '🌿', key: 'seasonalTips.mediterranea.2' },
    { emoji: '🌱', key: 'seasonalTips.mediterranea.3' },
    { emoji: '🌸', key: 'seasonalTips.mediterranea.4' },
    { emoji: '💧', key: 'seasonalTips.mediterranea.5' },
    { emoji: '☀️', key: 'seasonalTips.mediterranea.6' },
    { emoji: '🍅', key: 'seasonalTips.mediterranea.7' },
    { emoji: '🧺', key: 'seasonalTips.mediterranea.8' },
    { emoji: '🥬', key: 'seasonalTips.mediterranea.9' },
    { emoji: '🧄', key: 'seasonalTips.mediterranea.10' },
    { emoji: '🥦', key: 'seasonalTips.mediterranea.11' },
    { emoji: '📋', key: 'seasonalTips.mediterranea.12' },
  ],
  continental: [
    { emoji: '🌡️', key: 'seasonalTips.continental.1' },
    { emoji: '🌱', key: 'seasonalTips.continental.2' },
    { emoji: '🪴', key: 'seasonalTips.continental.3' },
    { emoji: '🌸', key: 'seasonalTips.continental.4' },
    { emoji: '💧', key: 'seasonalTips.continental.5' },
    { emoji: '☀️', key: 'seasonalTips.continental.6' },
    { emoji: '🍅', key: 'seasonalTips.continental.7' },
    { emoji: '🧺', key: 'seasonalTips.continental.8' },
    { emoji: '🥬', key: 'seasonalTips.continental.9' },
    { emoji: '🧄', key: 'seasonalTips.continental.10' },
    { emoji: '🥦', key: 'seasonalTips.continental.11' },
    { emoji: '❄️', key: 'seasonalTips.continental.12' },
  ],
  subtropical: [
    { emoji: '🌿', key: 'seasonalTips.subtropical.1' },
    { emoji: '🍓', key: 'seasonalTips.subtropical.2' },
    { emoji: '🌱', key: 'seasonalTips.subtropical.3' },
    { emoji: '💧', key: 'seasonalTips.subtropical.4' },
    { emoji: '☀️', key: 'seasonalTips.subtropical.5' },
    { emoji: '🌊', key: 'seasonalTips.subtropical.6' },
    { emoji: '🌧️', key: 'seasonalTips.subtropical.7' },
    { emoji: '🌤️', key: 'seasonalTips.subtropical.8' },
    { emoji: '🧺', key: 'seasonalTips.subtropical.9' },
    { emoji: '🌱', key: 'seasonalTips.subtropical.10' },
    { emoji: '🥬', key: 'seasonalTips.subtropical.11' },
    { emoji: '🌿', key: 'seasonalTips.subtropical.12' },
  ],
};

export function getSeasonalTip(zone: ClimateZone, month: number): SeasonalTip {
  const tips = TIPS[zone];
  return tips[(month - 1) % 12];
}
