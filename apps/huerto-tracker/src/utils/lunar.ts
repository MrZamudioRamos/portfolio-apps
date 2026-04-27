export type GardeningType = 'frutos' | 'hojas' | 'raices' | 'flores' | 'descanso';

export interface LunarDay {
  phase: number;        // 0–1 (0=new, 0.5=full)
  dayInCycle: number;  // 1–30
  phaseKey: string;    // i18n key, e.g. 'lunar.newMoon'
  phaseEmoji: string;
  gardeningType: GardeningType;
  gardeningEmoji: string;
  illumination: number; // 0–100 %
}

// Reference new moon: Jan 6 2000 at 18:14 UTC
const REFERENCE_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
const SYNODIC_PERIOD_MS = 29.53058770576 * 24 * 60 * 60 * 1000;

const GARDENING_EMOJI: Record<GardeningType, string> = {
  frutos:   '🍅',
  hojas:    '🥬',
  raices:   '🥕',
  flores:   '🌸',
  descanso: '😴',
};

export function getLunarDay(date: Date = new Date()): LunarDay {
  const elapsed = date.getTime() - REFERENCE_NEW_MOON;
  const cyclePos = ((elapsed % SYNODIC_PERIOD_MS) + SYNODIC_PERIOD_MS) % SYNODIC_PERIOD_MS;
  const phase = cyclePos / SYNODIC_PERIOD_MS; // 0–1
  const dayInCycle = Math.floor(phase * 29.53) + 1;

  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);

  // Phase key and emoji
  let phaseKey: string;
  let phaseEmoji: string;
  if (phase < 0.03 || phase >= 0.97) {
    phaseKey = 'lunar.newMoon';           phaseEmoji = '🌑';
  } else if (phase < 0.22) {
    phaseKey = 'lunar.waxingCrescent';   phaseEmoji = '🌒';
  } else if (phase < 0.28) {
    phaseKey = 'lunar.firstQuarter';     phaseEmoji = '🌓';
  } else if (phase < 0.47) {
    phaseKey = 'lunar.waxingGibbous';    phaseEmoji = '🌔';
  } else if (phase < 0.53) {
    phaseKey = 'lunar.fullMoon';         phaseEmoji = '🌕';
  } else if (phase < 0.72) {
    phaseKey = 'lunar.waningGibbous';    phaseEmoji = '🌖';
  } else if (phase < 0.78) {
    phaseKey = 'lunar.lastQuarter';      phaseEmoji = '🌗';
  } else {
    phaseKey = 'lunar.waningCrescent';   phaseEmoji = '🌘';
  }

  // Biodynamic gardening type
  let gardeningType: GardeningType;
  if (phase < 0.03 || phase >= 0.97) {
    gardeningType = 'descanso';
  } else if (phase < 0.25) {
    gardeningType = 'hojas';
  } else if (phase < 0.53) {
    gardeningType = 'frutos';
  } else if (phase < 0.75) {
    gardeningType = 'raices';
  } else {
    gardeningType = 'descanso';
  }

  return {
    phase,
    dayInCycle,
    phaseKey,
    phaseEmoji,
    gardeningType,
    gardeningEmoji: GARDENING_EMOJI[gardeningType],
    illumination,
  };
}

// Returns the predominant gardening type for a given month
export function getMonthGardeningProfile(year: number, month: number): GardeningType {
  const counts: Record<GardeningType, number> = { frutos: 0, hojas: 0, raices: 0, flores: 0, descanso: 0 };
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const ld = getLunarDay(new Date(year, month - 1, d));
    counts[ld.gardeningType]++;
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as GardeningType;
}
