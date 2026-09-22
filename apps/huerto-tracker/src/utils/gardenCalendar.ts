import type { CropInfo } from '../data/crops';
import type { ClimateZone } from '../models/garden';
import type { GardenMapPlan, PlannedPlanting } from '../models/garden-map-plan';
import { dateFallsInMonths } from './gardenMapPlanner';

export interface EstimatedHarvestWindow {
  earliestDate: string;
  latestDate: string;
  reviewDate: string;
  days: [number, number];
}

export interface GardenPlanCalendarTask {
  id: string;
  date: string;
  title: string;
  meta: string;
  kind: 'planting' | 'harvest-review';
  /** Exact, user-selected date. Only this kind can offer an exact-date notification. */
  reminderDate?: string;
}

type CalendarCrop = Pick<CropInfo, 'name' | 'daysToHarvest' | 'sowingMonths'>;

export function estimateHarvestWindow(
  sowingDate: string,
  daysToHarvest?: [number, number],
): EstimatedHarvestWindow | null {
  if (!isLocalDateKey(sowingDate) || !daysToHarvest
    || !daysToHarvest.every((days) => Number.isInteger(days) && days > 0 && days <= 730)
    || daysToHarvest[1] < daysToHarvest[0]) return null;

  const earliestDate = addLocalDays(sowingDate, daysToHarvest[0]);
  const latestDate = addLocalDays(sowingDate, daysToHarvest[1]);
  const reviewDate = addLocalDays(sowingDate, Math.round((daysToHarvest[0] + daysToHarvest[1]) / 2));
  if (!earliestDate || !latestDate || !reviewDate) return null;
  return { earliestDate, latestDate, reviewDate, days: daysToHarvest };
}

/** Derives calendar entries from the saved plan; never writes generated tasks back to storage. */
export function buildGardenPlanCalendarTasks(
  plan: GardenMapPlan,
  selectedDate: string,
  crops: Record<string, CalendarCrop>,
  climateZone?: ClimateZone,
): GardenPlanCalendarTask[] {
  if (!isLocalDateKey(selectedDate)) return [];
  const tasks: GardenPlanCalendarTask[] = [];

  for (const planting of plan.plannedPlantings) {
    if (!isLocalDateKey(planting.plannedDate)) continue;
    const crop = crops[planting.cropId];
    if (planting.plannedDate === selectedDate) {
      tasks.push(createPlantingTask(planting, crop, climateZone));
    }

    // Harvest duration is meaningful here only when the user explicitly chose sowing.
    if (planting.action !== 'sowing' || !crop) continue;
    const window = estimateHarvestWindow(planting.plannedDate, crop.daysToHarvest);
    if (!window || window.reviewDate !== selectedDate) continue;
    tasks.push({
      id: `harvest-review:${planting.id}`,
      date: window.reviewDate,
      title: `Revisar primera cosecha: ${crop.name}`,
      meta: `Orientativo: el catálogo indica ${window.days[0]}–${window.days[1]} días desde la siembra (ventana ${window.earliestDate}–${window.latestDate}). Confirma mirando la planta.`,
      kind: 'harvest-review',
    });
  }

  return tasks.sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

function createPlantingTask(
  planting: PlannedPlanting,
  crop: CalendarCrop | undefined,
  climateZone?: ClimateZone,
): GardenPlanCalendarTask {
  const actionLabel = planting.action === 'sowing'
    ? 'Siembra planificada'
    : planting.action === 'transplant'
      ? 'Trasplante planificado'
      : 'Plantación planificada';
  const cropName = crop?.name ?? 'Cultivo del plano';
  const details = [`${planting.count} ${planting.count === 1 ? 'unidad' : 'unidades'}`];
  if (planting.location?.trim()) details.push(planting.location.trim());
  if (planting.successionIndex && planting.successionTotal) {
    details.push(`Tanda ${planting.successionIndex} de ${planting.successionTotal}`);
  }
  if (planting.action === 'sowing' && crop && climateZone) {
    const months = crop.sowingMonths[climateZone];
    if (months?.length && !dateFallsInMonths(planting.plannedDate, months)) {
      details.push('fuera de la ventana de siembra del catálogo para esta zona');
    }
  }
  if (planting.note?.trim()) details.push(planting.note.trim());

  return {
    id: `planting:${planting.id}`,
    date: planting.plannedDate,
    title: `${actionLabel}: ${cropName}`,
    meta: details.join(' · '),
    kind: 'planting',
    reminderDate: planting.plannedDate,
  };
}

function addLocalDays(value: string, days: number): string | null {
  const date = parseLocalDate(value);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function isLocalDateKey(value: string): boolean {
  return parseLocalDate(value) !== null;
}

function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
