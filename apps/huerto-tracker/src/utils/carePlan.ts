import type { CropInfo } from '../data/crops';
import type { DiaryEntry, TreatmentData } from '../models/diary-entry';
import type { Plant } from '../models/plant';
import { dateToStr } from './dateStr';

const WATER_DAYS: Record<CropInfo['waterNeeds'], number> = {
  high: 2,
  medium: 4,
  low: 7,
};

const TRANSPLANT_AFTER_DAYS = 42;
const PLAN_HORIZON_DAYS = 14;

export type CareTaskKind = 'water' | 'pest' | 'transplant' | 'harvest' | 'treatment' | 'check';
export type CareTaskPriority = 'today' | 'soon' | 'planned';

export interface CareTask {
  id: string;
  plantId: string;
  cropId: string;
  plantName: string;
  emoji: string;
  kind: CareTaskKind;
  dueDate: string;
  priority: CareTaskPriority;
  titleKey: string;
  reasonKey: string;
}

function addDays(date: string, days: number): string {
  const next = new Date(date + 'T12:00:00');
  next.setDate(next.getDate() + days);
  return dateToStr(next);
}

function diffDays(from: string, to: string): number {
  return Math.round((new Date(to + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime()) / 86_400_000);
}

function priorityFor(dueDate: string, today: string): CareTaskPriority {
  const days = diffDays(today, dueDate);
  if (days <= 0) return 'today';
  if (days <= 3) return 'soon';
  return 'planned';
}

function latestEntry(entries: DiaryEntry[], types?: DiaryEntry['type'][]): DiaryEntry | undefined {
  return entries
    .filter((entry) => !entry.deletedAt && (!types || types.includes(entry.type)))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function estimatedHarvestDate(plant: Plant, crop: CropInfo | undefined): string | undefined {
  if (plant.firstHarvestDate) return plant.firstHarvestDate;
  if (!plant.sowingDate || !crop) return undefined;
  const days = Math.round((crop.daysToHarvest[0] + crop.daysToHarvest[1]) / 2);
  return addDays(plant.sowingDate, days);
}

/**
 * Builds a concise, date-aware care queue from the user's own plants and diary.
 * The output is deliberately pure so the same plan can power the home preview,
 * the Pro screen and notification scheduling without creating a second source
 * of truth.
 */
export function buildCarePlan(
  plants: Plant[],
  cropsById: Record<string, CropInfo>,
  entries: DiaryEntry[],
  now: Date = new Date(),
): CareTask[] {
  const today = dateToStr(now);
  const horizon = addDays(today, PLAN_HORIZON_DAYS);
  const tasks: CareTask[] = [];

  function addTask(
    plant: Plant,
    crop: CropInfo,
    kind: CareTaskKind,
    dueDate: string,
    titleKey: string,
    reasonKey: string,
  ) {
    if (dueDate > horizon && kind !== 'water') return;
    tasks.push({
      id: `${plant.id}:${kind}:${dueDate}`,
      plantId: plant.id,
      cropId: crop.id,
      plantName: plant.name,
      emoji: crop.emoji,
      kind,
      dueDate,
      priority: priorityFor(dueDate, today),
      titleKey,
      reasonKey,
    });
  }

  for (const plant of plants) {
    if (plant.status === 'finished') continue;
    const crop = cropsById[plant.cropId];
    if (!crop) continue;
    if (plant.status === 'seedling' && !plant.sowingDate && (plant.propagationMethod ?? 'seed') === 'seed') continue;

    const plantEntries = entries.filter((entry) => entry.plantId === plant.id && entry.gardenId === plant.gardenId);
    const todaySoilIsMoist = plantEntries.some(
      (entry) => entry.date === today && entry.type === 'note' && entry.data && 'soilCheck' in entry.data && entry.data.soilCheck === 'moist',
    );
    const lastWatering = latestEntry(plantEntries, ['watering']);
    const waterReference = lastWatering?.date ?? plant.sowingDate;
    const waterDue = waterReference ? addDays(waterReference, WATER_DAYS[crop.waterNeeds]) : today;
    if (!todaySoilIsMoist && waterDue <= horizon) {
      addTask(plant, crop, 'water', waterDue, 'carePlan.task.waterTitle', 'carePlan.task.waterReason');
    }

    if (plant.pestStatus === 'active') {
      addTask(plant, crop, 'pest', today, 'carePlan.task.pestTitle', 'carePlan.task.pestReason');
    }

    if (plant.status === 'seedling' && plant.sowingDate) {
      const transplantDate = addDays(plant.sowingDate, TRANSPLANT_AFTER_DAYS);
      addTask(plant, crop, 'transplant', transplantDate, 'carePlan.task.transplantTitle', 'carePlan.task.transplantReason');
    }

    const harvestDate = estimatedHarvestDate(plant, crop);
    if (harvestDate && (harvestDate <= horizon || ['fruiting', 'harvesting'].includes(plant.status))) {
      addTask(plant, crop, 'harvest', harvestDate, 'carePlan.task.harvestTitle', 'carePlan.task.harvestReason');
    }

    const treatment = latestEntry(plantEntries, ['treatment']);
    const waitDays = Number((treatment?.data as TreatmentData | undefined)?.waitDays ?? 0);
    if (treatment && waitDays > 0) {
      const safeDate = addDays(treatment.date, waitDays);
      if (safeDate >= today && safeDate <= horizon) {
        addTask(plant, crop, 'treatment', safeDate, 'carePlan.task.treatmentTitle', 'carePlan.task.treatmentReason');
      }
    }

    const hasAction = tasks.some((task) => task.plantId === plant.id);
    if (!hasAction) {
      const lastCare = latestEntry(plantEntries)?.date ?? plant.sowingDate ?? today;
      addTask(plant, crop, 'check', addDays(lastCare, 7), 'carePlan.task.checkTitle', 'carePlan.task.checkReason');
    }
  }

  const priorityOrder: Record<CareTaskPriority, number> = { today: 0, soon: 1, planned: 2 };
  return tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.dueDate.localeCompare(b.dueDate) || a.plantName.localeCompare(b.plantName));
}

