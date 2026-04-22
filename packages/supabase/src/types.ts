export type ClimateZone = 'atlantica' | 'continental' | 'mediterranea' | 'subtropical';
export type CropCategory = 'frutas' | 'hojas' | 'raices' | 'legumbres' | 'cruciferas' | 'cucurbitaceas' | 'aromaticas' | 'bulbos';
export type UserTier = 'guest' | 'free' | 'pro';
export type PlantStatus = 'seedling' | 'growing' | 'flowering' | 'harvesting' | 'dormant' | 'dead';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  tier: UserTier;
  created_at: string;
  updated_at: string;
}

export interface RemoteCrop {
  id: string;
  name: string;
  emoji: string;
  category: CropCategory;
  sowing_months_atlantica: number[];
  sowing_months_continental: number[];
  sowing_months_mediterranea: number[];
  sowing_months_subtropical: number[];
  harvest_months_atlantica: number[];
  harvest_months_continental: number[];
  harvest_months_mediterranea: number[];
  harvest_months_subtropical: number[];
  days_to_harvest_min: number;
  days_to_harvest_max: number;
  sun_needs: 'full' | 'partial' | 'shade';
  water_needs: 'high' | 'medium' | 'low';
  spacing_cm: number;
  companions: string[];
  incompatible: string[];
  tips: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RemoteClimateZone {
  id: ClimateZone;
  label: string;
  emoji: string;
  description: string;
}

export interface RemoteProvinceZone {
  province: string;
  zone: ClimateZone;
}

export interface RemoteGarden {
  id: string;
  user_id: string;
  name: string;
  province: string | null;
  climate_zone: ClimateZone;
  created_at: string;
  updated_at: string;
}

export interface RemotePlant {
  id: string;
  user_id: string;
  garden_id: string;
  crop_id: string;
  name: string;
  variety: string | null;
  status: PlantStatus;
  planted_at: string | null;
  photo_uri: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RemoteDiaryEntry {
  id: string;
  user_id: string;
  plant_id: string;
  garden_id: string;
  type: string;
  notes: string | null;
  photo_uri: string | null;
  harvest_weight_g: number | null;
  recorded_at: string;
  created_at: string;
}

export interface RemoteReminder {
  id: string;
  user_id: string;
  garden_id: string;
  plant_id: string | null;
  type: string;
  title: string;
  frequency: string;
  time_hour: number;
  time_minute: number;
  enabled: boolean;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> };
      crops: { Row: RemoteCrop; Insert: never; Update: never };
      climate_zones: { Row: RemoteClimateZone; Insert: never; Update: never };
      province_zones: { Row: RemoteProvinceZone; Insert: never; Update: never };
      gardens: { Row: RemoteGarden; Insert: Omit<RemoteGarden, 'created_at' | 'updated_at'>; Update: Partial<RemoteGarden> };
      plants: { Row: RemotePlant; Insert: Omit<RemotePlant, 'created_at' | 'updated_at'>; Update: Partial<RemotePlant> };
      diary_entries: { Row: RemoteDiaryEntry; Insert: Omit<RemoteDiaryEntry, 'created_at'>; Update: Partial<RemoteDiaryEntry> };
      reminders: { Row: RemoteReminder; Insert: Omit<RemoteReminder, 'created_at' | 'updated_at'>; Update: Partial<RemoteReminder> };
    };
  };
}
