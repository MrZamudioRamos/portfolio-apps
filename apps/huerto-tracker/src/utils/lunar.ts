export type GardeningType = 'frutos' | 'hojas' | 'raices' | 'flores' | 'descanso';

export interface LunarDay {
  phase: number;        // 0–1 (0=new, 0.5=full)
  dayInCycle: number;  // 1–29
  phaseName: string;
  phaseEmoji: string;
  gardeningType: GardeningType;
  gardeningLabel: string;
  gardeningEmoji: string;
  recommendation: string;
  illumination: number; // 0–100 %
}

// Reference new moon: Jan 6 2000 at 18:14 UTC
const REFERENCE_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
const SYNODIC_PERIOD_MS = 29.53058770576 * 24 * 60 * 60 * 1000;

export function getLunarDay(date: Date = new Date()): LunarDay {
  const elapsed = date.getTime() - REFERENCE_NEW_MOON;
  const cyclePos = ((elapsed % SYNODIC_PERIOD_MS) + SYNODIC_PERIOD_MS) % SYNODIC_PERIOD_MS;
  const phase = cyclePos / SYNODIC_PERIOD_MS; // 0–1
  const dayInCycle = Math.floor(phase * 29.53) + 1; // 1–29

  // Illumination approximation
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);

  // Phase name and emoji
  let phaseName: string;
  let phaseEmoji: string;
  if (phase < 0.03 || phase >= 0.97) {
    phaseName = 'Luna nueva'; phaseEmoji = '🌑';
  } else if (phase < 0.22) {
    phaseName = 'Cuarto creciente'; phaseEmoji = '🌒';
  } else if (phase < 0.28) {
    phaseName = 'Cuarto creciente'; phaseEmoji = '🌓';
  } else if (phase < 0.47) {
    phaseName = 'Luna gibosa creciente'; phaseEmoji = '🌔';
  } else if (phase < 0.53) {
    phaseName = 'Luna llena'; phaseEmoji = '🌕';
  } else if (phase < 0.72) {
    phaseName = 'Luna gibosa menguante'; phaseEmoji = '🌖';
  } else if (phase < 0.78) {
    phaseName = 'Cuarto menguante'; phaseEmoji = '🌗';
  } else {
    phaseName = 'Luna menguante'; phaseEmoji = '🌘';
  }

  // Biodynamic gardening type
  let gardeningType: GardeningType;
  if (phase < 0.03 || phase >= 0.97) {
    // New moon ±1 day: descanso
    gardeningType = 'descanso';
  } else if (phase < 0.25) {
    // Waxing crescent: leaf/stem crops
    gardeningType = 'hojas';
  } else if (phase < 0.5) {
    // Waxing gibbous → full moon: fruit crops
    gardeningType = 'frutos';
  } else if (phase < 0.53) {
    // Full moon ±1 day: fruit crops (peak)
    gardeningType = 'frutos';
  } else if (phase < 0.75) {
    // Waning gibbous: root crops
    gardeningType = 'raices';
  } else {
    // Last quarter → new moon: descanso / roots
    gardeningType = 'descanso';
  }

  const GARDENING_CONFIG: Record<GardeningType, { label: string; emoji: string; recommendation: string }> = {
    frutos: {
      label: 'Día de frutos',
      emoji: '🍅',
      recommendation: 'Ideal para sembrar, trasplantar y cosechar tomates, pimientos, pepinos y calabacines.',
    },
    hojas: {
      label: 'Día de hojas',
      emoji: '🥬',
      recommendation: 'Buen momento para lechugas, espinacas, acelgas y hierbas aromáticas.',
    },
    raices: {
      label: 'Día de raíces',
      emoji: '🥕',
      recommendation: 'Perfecto para zanahorias, rábanos, remolachas y patatas.',
    },
    flores: {
      label: 'Día de flores',
      emoji: '🌸',
      recommendation: 'Favorable para plantas ornamentales y cultivos de flor.',
    },
    descanso: {
      label: 'Día de descanso',
      emoji: '😴',
      recommendation: 'Mejor evitar labores importantes. Día para planificar y preparar herramientas.',
    },
  };

  const config = GARDENING_CONFIG[gardeningType];

  return {
    phase,
    dayInCycle,
    phaseName,
    phaseEmoji,
    gardeningType,
    gardeningLabel: config.label,
    gardeningEmoji: config.emoji,
    recommendation: config.recommendation,
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
