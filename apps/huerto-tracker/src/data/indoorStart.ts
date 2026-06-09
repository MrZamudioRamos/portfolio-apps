export interface IndoorStartConfig {
  indoorWeeks: number;
  hardeningDays: number;
  germinationDays: [number, number];
}

export const INDOOR_START: Record<string, IndoorStartConfig> = {
  tomate:     { indoorWeeks: 8,  hardeningDays: 10, germinationDays: [5, 10] },
  pimiento:   { indoorWeeks: 10, hardeningDays: 10, germinationDays: [7, 14] },
  berenjena:  { indoorWeeks: 10, hardeningDays: 10, germinationDays: [7, 14] },
  pepino:     { indoorWeeks: 3,  hardeningDays: 7,  germinationDays: [3, 7]  },
  calabacin:  { indoorWeeks: 3,  hardeningDays: 7,  germinationDays: [3, 7]  },
  calabaza:   { indoorWeeks: 3,  hardeningDays: 7,  germinationDays: [5, 10] },
  melon:      { indoorWeeks: 3,  hardeningDays: 7,  germinationDays: [4, 8]  },
  sandia:     { indoorWeeks: 4,  hardeningDays: 7,  germinationDays: [5, 10] },
  col:        { indoorWeeks: 6,  hardeningDays: 10, germinationDays: [4, 7]  },
  brocoli:    { indoorWeeks: 6,  hardeningDays: 10, germinationDays: [4, 7]  },
  coliflor:   { indoorWeeks: 6,  hardeningDays: 10, germinationDays: [4, 7]  },
  kale:       { indoorWeeks: 5,  hardeningDays: 7,  germinationDays: [4, 7]  },
  puerro:     { indoorWeeks: 8,  hardeningDays: 10, germinationDays: [7, 14] },
  apio:       { indoorWeeks: 10, hardeningDays: 10, germinationDays: [10, 21] },
  albahaca:   { indoorWeeks: 4,  hardeningDays: 7,  germinationDays: [5, 10] },
  guindilla:  { indoorWeeks: 10, hardeningDays: 10, germinationDays: [7, 14] },
  lechuga:    { indoorWeeks: 3,  hardeningDays: 5,  germinationDays: [2, 5]  },
  acelga:     { indoorWeeks: 4,  hardeningDays: 7,  germinationDays: [4, 8]  },
  espinaca:   { indoorWeeks: 4,  hardeningDays: 7,  germinationDays: [4, 10] },
};

export interface SeedlingSchedule {
  indoorStart: Date;
  hardeningStart: Date;
  transplant: Date;
}

export function getSeedlingSchedule(
  cropId: string,
  sowingDate: string,
): SeedlingSchedule | null {
  const cfg = INDOOR_START[cropId];
  if (!cfg) return null;
  const sow = new Date(sowingDate + 'T12:00:00');
  const transplant = new Date(sow.getTime() + cfg.indoorWeeks * 7 * 86_400_000);
  const hardeningStart = new Date(transplant.getTime() - cfg.hardeningDays * 86_400_000);
  return { indoorStart: sow, hardeningStart, transplant };
}

export function getIndoorStartMonth(cropId: string): number | null {
  const cfg = INDOOR_START[cropId];
  if (!cfg) return null;
  return cfg.indoorWeeks;
}
