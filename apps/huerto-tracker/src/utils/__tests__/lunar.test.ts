import { describe, it, expect } from 'vitest';
import { getLunarDay, getMonthGardeningProfile, type GardeningType } from '../lunar';

// Reference new moon: Jan 6 2000 at 18:14 UTC — phase = 0
const REF_NEW_MOON = new Date('2000-01-06T18:14:00Z');
const SYNODIC_MS = 29.53058770576 * 24 * 60 * 60 * 1000;

/** Returns a Date at an exact fractional phase (0–1) from the reference new moon */
function dateAtPhase(phase: number): Date {
  return new Date(REF_NEW_MOON.getTime() + phase * SYNODIC_MS);
}

const VALID_GARDENING_TYPES: GardeningType[] = ['frutos', 'hojas', 'raices', 'flores', 'descanso'];

describe('getLunarDay', () => {
  it('devuelve phase en el rango [0, 1)', () => {
    const result = getLunarDay(dateAtPhase(0.37));
    expect(result.phase).toBeGreaterThanOrEqual(0);
    expect(result.phase).toBeLessThan(1);
  });

  it('devuelve dayInCycle entre 1 y 29', () => {
    for (const phase of [0, 0.1, 0.25, 0.5, 0.75, 0.99]) {
      const { dayInCycle } = getLunarDay(dateAtPhase(phase));
      expect(dayInCycle).toBeGreaterThanOrEqual(1);
      expect(dayInCycle).toBeLessThanOrEqual(30); // Math.floor(phase * 29.53) + 1 puede dar 30 a phase ≈ 0.99
    }
  });

  it('devuelve illumination entre 0 y 100', () => {
    for (const phase of [0, 0.1, 0.25, 0.5, 0.75, 0.99]) {
      const { illumination } = getLunarDay(dateAtPhase(phase));
      expect(illumination).toBeGreaterThanOrEqual(0);
      expect(illumination).toBeLessThanOrEqual(100);
    }
  });

  it('luna nueva (phase ≈ 0) → illumination ≈ 0 y nombre correcto', () => {
    const result = getLunarDay(REF_NEW_MOON);
    expect(result.illumination).toBeLessThanOrEqual(5);
    expect(result.phaseName).toBe('Luna nueva');
    expect(result.phaseEmoji).toBe('🌑');
  });

  it('luna llena (phase = 0.5) → illumination ≈ 100 y nombre correcto', () => {
    const result = getLunarDay(dateAtPhase(0.5));
    expect(result.illumination).toBeGreaterThanOrEqual(95);
    expect(result.phaseName).toBe('Luna llena');
    expect(result.phaseEmoji).toBe('🌕');
  });

  describe('gardeningType según fase', () => {
    it('phase = 0 (luna nueva) → descanso', () => {
      expect(getLunarDay(REF_NEW_MOON).gardeningType).toBe('descanso');
    });

    it('phase = 0.15 (cuarto creciente) → hojas', () => {
      expect(getLunarDay(dateAtPhase(0.15)).gardeningType).toBe('hojas');
    });

    it('phase = 0.35 (luna gibosa creciente) → frutos', () => {
      expect(getLunarDay(dateAtPhase(0.35)).gardeningType).toBe('frutos');
    });

    it('phase = 0.50 (luna llena) → frutos', () => {
      expect(getLunarDay(dateAtPhase(0.50)).gardeningType).toBe('frutos');
    });

    it('phase = 0.65 (luna gibosa menguante) → raices', () => {
      expect(getLunarDay(dateAtPhase(0.65)).gardeningType).toBe('raices');
    });

    it('phase = 0.85 (último cuarto) → descanso', () => {
      expect(getLunarDay(dateAtPhase(0.85)).gardeningType).toBe('descanso');
    });

    it('phase = 0.98 (cerca de luna nueva) → descanso', () => {
      expect(getLunarDay(dateAtPhase(0.98)).gardeningType).toBe('descanso');
    });
  });

  it('siempre devuelve un gardeningType válido', () => {
    for (let p = 0; p < 1; p += 0.05) {
      const { gardeningType } = getLunarDay(dateAtPhase(p));
      expect(VALID_GARDENING_TYPES).toContain(gardeningType);
    }
  });

  it('gardeningLabel, gardeningEmoji y recommendation no están vacíos', () => {
    const result = getLunarDay(dateAtPhase(0.3));
    expect(result.gardeningLabel.length).toBeGreaterThan(0);
    expect(result.gardeningEmoji.length).toBeGreaterThan(0);
    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  it('usa la fecha actual si no se pasa argumento', () => {
    const result = getLunarDay();
    expect(result.phase).toBeGreaterThanOrEqual(0);
    expect(result.phase).toBeLessThan(1);
  });

  it('el dayInCycle crece con la fecha dentro de un ciclo', () => {
    const day1 = getLunarDay(dateAtPhase(0.05));
    const day2 = getLunarDay(dateAtPhase(0.5));
    expect(day2.dayInCycle).toBeGreaterThan(day1.dayInCycle);
  });
});

describe('getMonthGardeningProfile', () => {
  it('devuelve un GardeningType válido para cualquier mes del año', () => {
    for (let month = 1; month <= 12; month++) {
      const profile = getMonthGardeningProfile(2024, month);
      expect(VALID_GARDENING_TYPES).toContain(profile);
    }
  });

  it('devuelve un GardeningType válido para un rango amplio de años', () => {
    for (const year of [2000, 2010, 2020, 2025, 2030]) {
      const profile = getMonthGardeningProfile(year, 6);
      expect(VALID_GARDENING_TYPES).toContain(profile);
    }
  });
});
