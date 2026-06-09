import type { Garden } from '../models/garden';
import type { Plant } from '../models/plant';
import type { DiaryEntry } from '../models/diary-entry';
import type { GardenReminder } from '../models/reminder';
import type { UserProfile } from '../models/user-profile';
import type { CustomCrop } from '../models/custom-crop';
import type { CostEntry } from '../models/cost-entry';
import type { GridLayout } from '../hooks/useGardenLayout';

// Skip local-only file:// URIs when syncing to cloud — they don't exist on other devices.
// Multi-device photo sync would require uploading to Supabase Storage (not yet implemented).
function syncablePhotoUri(uri: string | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  return null;
}

// ── Garden ───────────────────────────────────────────────────────────────────

export function gardenToRow(g: Garden, userId: string) {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    province: g.province ?? null,
    climate_zone: g.climateZone,
    garden_type: g.gardenType ?? null,
    grid_rows: g.gridRows ?? null,
    grid_cols: g.gridCols ?? null,
    hemisphere: g.hemisphere ?? null,
    color: g.color ?? null,
    notes: g.notes ?? null,
    photo_uri: syncablePhotoUri(g.photoUri),
    created_at: g.createdAt,
    updated_at: g.updatedAt,
    deleted_at: g.deletedAt ?? null,
  };
}

export function rowToGarden(r: ReturnType<typeof gardenToRow>): Garden {
  return {
    id: r.id,
    name: r.name,
    province: r.province ?? '',
    climateZone: r.climate_zone as Garden['climateZone'],
    gardenType: (r.garden_type as Garden['gardenType']) ?? undefined,
    gridRows: r.grid_rows ?? undefined,
    gridCols: r.grid_cols ?? undefined,
    hemisphere: (r.hemisphere as Garden['hemisphere']) ?? undefined,
    color: r.color ?? undefined,
    notes: r.notes ?? undefined,
    photoUri: r.photo_uri ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? undefined,
  };
}

// ── UserProfile ───────────────────────────────────────────────────────────────

export function userProfileToRow(p: UserProfile, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    space_types: p.spaceTypes,
    growing_methods: p.growingMethods,
    sunlight: p.sunlight,
    experience: p.experience,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    deleted_at: p.deletedAt ?? null,
  };
}

export function rowToUserProfile(r: ReturnType<typeof userProfileToRow>): UserProfile {
  return {
    id: r.id,
    spaceTypes: r.space_types as UserProfile['spaceTypes'],
    growingMethods: r.growing_methods as UserProfile['growingMethods'],
    sunlight: r.sunlight as UserProfile['sunlight'],
    experience: r.experience as UserProfile['experience'],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? undefined,
  };
}

// ── CustomCrop ────────────────────────────────────────────────────────────────

export function customCropToRow(c: CustomCrop, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    emoji: c.emoji,
    category: c.category,
    days_to_harvest_min: c.daysToHarvestMin,
    days_to_harvest_max: c.daysToHarvestMax,
    sowing_months: c.sowingMonths,
    harvest_months: c.harvestMonths,
    sun_needs: c.sunNeeds,
    water_needs: c.waterNeeds,
    spacing: c.spacing,
    notes: c.notes,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted_at: c.deletedAt ?? null,
  };
}

export function rowToCustomCrop(r: ReturnType<typeof customCropToRow>): CustomCrop {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    category: r.category as CustomCrop['category'],
    daysToHarvestMin: r.days_to_harvest_min,
    daysToHarvestMax: r.days_to_harvest_max,
    sowingMonths: r.sowing_months as number[],
    harvestMonths: r.harvest_months as number[],
    sunNeeds: r.sun_needs as CustomCrop['sunNeeds'],
    waterNeeds: r.water_needs as CustomCrop['waterNeeds'],
    spacing: r.spacing,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? undefined,
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
    variety_id: p.varietyId ?? null,
    status: p.status,
    planted_at: p.sowingDate ?? null,
    transplant_date: p.transplantDate ?? null,
    first_harvest_date: p.firstHarvestDate ?? null,
    pest_status: p.pestStatus ?? null,
    photo_uri: syncablePhotoUri(p.photoUri),
    notes: p.notes ?? null,
    harvest_goal_kg: p.harvestGoalKg ?? null,
    soil_ph: p.soilPh ?? null,
    soil_texture: p.soilTexture ?? null,
    soil_notes: p.soilNotes ?? null,
    bed_name: p.bedName ?? null,
    propagation_method: p.propagationMethod ?? null,
    germination_date: p.germinationDate ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    deleted_at: p.deletedAt ?? null,
  };
}

export function rowToPlant(r: ReturnType<typeof plantToRow>): Plant {
  return {
    id: r.id,
    gardenId: r.garden_id,
    cropId: r.crop_id,
    name: r.name,
    variety: r.variety ?? undefined,
    varietyId: r.variety_id ?? undefined,
    status: r.status as Plant['status'],
    sowingDate: r.planted_at ?? undefined,
    transplantDate: r.transplant_date ?? undefined,
    firstHarvestDate: r.first_harvest_date ?? undefined,
    pestStatus: (r.pest_status as Plant['pestStatus']) ?? undefined,
    photoUri: r.photo_uri ?? undefined,
    notes: r.notes ?? undefined,
    harvestGoalKg: r.harvest_goal_kg != null ? Number(r.harvest_goal_kg) : undefined,
    soilPh: r.soil_ph ?? undefined,
    soilTexture: (r.soil_texture as Plant['soilTexture']) ?? undefined,
    soilNotes: r.soil_notes ?? undefined,
    bedName: r.bed_name ?? undefined,
    propagationMethod: (r.propagation_method as Plant['propagationMethod']) ?? undefined,
    germinationDate: r.germination_date ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? undefined,
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
    photo_uri: syncablePhotoUri(e.photoUri),
    harvest_weight_g: (e.data?.weightGrams as number) ?? null,
    harvest_unit: (e.data?.unit as string) ?? null,
    entry_data: e.data ?? null,
    recorded_at: e.date,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    deleted_at: e.deletedAt ?? null,
  };
}

export function rowToEntry(r: ReturnType<typeof entryToRow>): DiaryEntry {
  const data: Record<string, unknown> | undefined =
    r.entry_data
      ? r.entry_data
      : r.harvest_weight_g != null
        ? { weightGrams: r.harvest_weight_g, unit: r.harvest_unit ?? 'kg' }
        : undefined;

  return {
    id: r.id,
    gardenId: r.garden_id,
    plantId: r.plant_id ?? undefined,
    type: r.type as DiaryEntry['type'],
    date: r.recorded_at,
    notes: r.notes ?? undefined,
    photoUri: r.photo_uri ?? undefined,
    data,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
    deletedAt: r.deleted_at ?? undefined,
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
    deleted_at: r.deletedAt ?? null,
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
    deletedAt: r.deleted_at ?? undefined,
  };
}

// ── CostEntry ─────────────────────────────────────────────────────────────────

export function costEntryToRow(c: CostEntry, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    garden_id: c.gardenId,
    plant_id: c.plantId ?? null,
    category: c.category,
    amount: c.amount,
    description: c.description ?? null,
    date: c.date,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted_at: c.deletedAt ?? null,
  };
}

export function rowToCostEntry(r: ReturnType<typeof costEntryToRow>): CostEntry {
  return {
    id: r.id,
    gardenId: r.garden_id,
    plantId: r.plant_id ?? undefined,
    category: r.category as CostEntry['category'],
    amount: Number(r.amount),
    description: r.description ?? undefined,
    date: r.date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? undefined,
  };
}

// ── GardenLayout ──────────────────────────────────────────────────────────────

export function gardenLayoutToRow(gardenId: string, layout: GridLayout, userId: string, updatedAt?: string) {
  return {
    id: gardenId,
    user_id: userId,
    garden_id: gardenId,
    layout,
    updated_at: updatedAt ?? new Date().toISOString(),
  };
}

export function rowToGardenLayout(r: ReturnType<typeof gardenLayoutToRow>): { gardenId: string; layout: GridLayout; updatedAt: string } {
  return {
    gardenId: r.garden_id,
    layout: (r.layout ?? []) as GridLayout,
    updatedAt: r.updated_at,
  };
}
