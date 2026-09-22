import { describe, expect, it } from 'vitest';
import { EMPTY_GARDEN_MAP_PLAN, type PlannedPlanting } from '../../models/garden-map-plan';
import { buildGardenPlanCalendarTasks, estimateHarvestWindow } from '../gardenCalendar';

const crop = {
  name: 'Tomate',
  daysToHarvest: [60, 85] as [number, number],
  sowingMonths: {
    atlantica: [3, 4],
    continental: [3, 4],
    mediterranea: [2, 3],
    subtropical: [1, 2],
  },
};

function planWith(...plannedPlantings: PlannedPlanting[]) {
  return { ...EMPTY_GARDEN_MAP_PLAN, plannedPlantings };
}

describe('garden plan calendar', () => {
  it('adds an exact task for a user-planned sowing and warns outside the catalog window', () => {
    const tasks = buildGardenPlanCalendarTasks(planWith({
      id: 'sowing-1', cropId: 'tomate', count: 4, plannedDate: '2026-01-10', action: 'sowing', location: 'Bancal norte',
    }), '2026-01-10', { tomate: crop }, 'mediterranea');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      date: '2026-01-10',
      title: 'Siembra planificada: Tomate',
      kind: 'planting',
      reminderDate: '2026-01-10',
    });
    expect(tasks[0].meta).toContain('fuera de la ventana');
  });

  it('keeps legacy planting plans neutral instead of guessing whether they are sowing or transplanting', () => {
    const tasks = buildGardenPlanCalendarTasks(planWith({
      id: 'legacy', cropId: 'tomate', count: 1, plannedDate: '2026-03-10',
    }), '2026-03-10', { tomate: crop }, 'mediterranea');
    expect(tasks[0].title).toBe('Plantación planificada: Tomate');
    expect(tasks.some((task) => task.kind === 'harvest-review')).toBe(false);
  });

  it('creates a clearly estimated harvest review only for explicitly planned sowing', () => {
    const window = estimateHarvestWindow('2026-03-01', [2, 4]);
    expect(window).toEqual({ earliestDate: '2026-03-03', latestDate: '2026-03-05', reviewDate: '2026-03-04', days: [2, 4] });
    const tasks = buildGardenPlanCalendarTasks(planWith({
      id: 'sowing-1', cropId: 'tomate', count: 1, plannedDate: '2026-03-01', action: 'sowing',
    }), '2026-03-04', { tomate: { ...crop, daysToHarvest: [2, 4] } });
    expect(tasks[0]).toMatchObject({ kind: 'harvest-review', date: '2026-03-04' });
    expect(tasks[0].meta).toContain('Confirma mirando la planta');
    expect(tasks[0].reminderDate).toBeUndefined();
  });

  it('does not infer harvest dates for transplants or unknown catalog timing', () => {
    const transplant = buildGardenPlanCalendarTasks(planWith({
      id: 'transplant-1', cropId: 'tomate', count: 1, plannedDate: '2026-03-01', action: 'transplant',
    }), '2026-05-14', { tomate: crop });
    const unknown = buildGardenPlanCalendarTasks(planWith({
      id: 'sowing-2', cropId: 'unknown', count: 1, plannedDate: '2026-03-01', action: 'sowing',
    }), '2026-05-14', {});
    expect(transplant).toEqual([]);
    expect(unknown).toEqual([]);
    expect(estimateHarvestWindow('2026-02-31', [40, 50])).toBeNull();
  });
});
