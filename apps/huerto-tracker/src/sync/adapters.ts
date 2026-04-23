import type { Garden } from '../models/garden';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import type { GardenReminder } from '../models/reminder';

// ── Garden ───────────────────────────────────────────────────────────────────

export function gardenToRow(g: Garden, userId: string) {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    province: g.province ?? null,
    climate_zone: g.climateZone,
    created_at: g.createdAt,
    updated_at: g.updatedAt,
  };
}

export function rowToGarden(r: ReturnType<typeof gardenToRow>): Garden {
  return {
    id: r.id,
    name: r.name,
    province: r.province ?? '',
    climateZone: r.climate_zone as Garden['climateZone'],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── Plant ────────────────────────────────────────────────────────────────────

export function plantToRow(p: Plant, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    garden_id: p.gardenId,
    crop_id: p.cropId,
    name: p.name,
    variety: p.variety ?? null,
    status: p.status,
    planted_at: p.sowingDate ?? null,
    photo_uri: p.photoUri ?? null,
    notes: p.notes ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

export function rowToPlant(r: ReturnType<typeof plantToRow>): Plant {
  return {
    id: r.id,
    gardenId: r.garden_id,
    cropId: r.crop_id,
    name: r.name,
    variety: r.variety ?? undefined,
    status: r.status as Plant['status'],
    sowingDate: r.planted_at ?? undefined,
    photoUri: r.photo_uri ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── DiaryEntry ───────────────────────────────────────────────────────────────

export function entryToRow(e: DiaryEntry, userId: string) {
  return {
    id: e.id,
    user_id: userId,
    garden_id: e.gardenId,
    plant_id: e.plantId ?? null,
    type: e.type,
    notes: e.notes ?? null,
    photo_uri: e.photoUri ?? null,
    harvest_weight_g: (e.data?.weightGrams as number) ?? null,
    recorded_at: e.date,
    created_at: e.createdAt,
  };
}

export function rowToEntry(r: ReturnType<typeof entryToRow>): DiaryEntry {
  return {
    id: r.id,
    gardenId: r.garden_id,
    plantId: r.plant_id ?? undefined,
    type: r.type as DiaryEntry['type'],
    date: r.recorded_at,
    notes: r.notes ?? undefined,
    photoUri: r.photo_uri ?? undefined,
    data: r.harvest_weight_g != null ? { weightGrams: r.harvest_weight_g } : undefined,
    createdAt: r.created_at,
    updatedAt: r.created_at,
  };
}

// ── Reminder ─────────────────────────────────────────────────────────────────

export function reminderToRow(r: GardenReminder, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    garden_id: r.gardenId,
    plant_id: r.plantId ?? null,
    type: r.type,
    title: r.title,
    frequency: r.frequency,
    time_hour: r.time.hour,
    time_minute: r.time.minute,
    enabled: r.enabled,
    notification_id: r.notificationId ?? null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

export function rowToReminder(r: ReturnType<typeof reminderToRow>): GardenReminder {
  return {
    id: r.id,
    gardenId: r.garden_id,
    plantId: r.plant_id ?? undefined,
    type: r.type as GardenReminder['type'],
    title: r.title,
    frequency: r.frequency as GardenReminder['frequency'],
    time: { hour: r.time_hour, minute: r.time_minute },
    enabled: r.enabled,
    notificationId: r.notification_id ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
