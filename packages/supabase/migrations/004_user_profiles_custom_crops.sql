-- ─────────────────────────────────────────────────────────────────────────────
-- 004_user_profiles_custom_crops.sql
-- Adds onboarding user_profiles, user-defined custom_crops, and missing
-- garden columns (hemisphere, color, notes, photo_uri).
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── user_profiles ─────────────────────────────────────────────────────────────

create table if not exists user_profiles (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  space_types     jsonb not null default '[]',
  growing_methods jsonb not null default '[]',
  sunlight        text not null,
  experience      text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "user_profiles_select" on user_profiles
  for select using (auth.uid() = user_id);

create policy "user_profiles_insert" on user_profiles
  for insert with check (auth.uid() = user_id);

create policy "user_profiles_update" on user_profiles
  for update using (auth.uid() = user_id);

create policy "user_profiles_delete" on user_profiles
  for delete using (auth.uid() = user_id);

-- ── custom_crops ──────────────────────────────────────────────────────────────

create table if not exists custom_crops (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references profiles(id) on delete cascade,
  name                 text not null,
  emoji                text not null,
  category             text not null,
  days_to_harvest_min  integer,
  days_to_harvest_max  integer,
  sowing_months        jsonb not null default '[]',
  harvest_months       jsonb not null default '[]',
  sun_needs            text,
  water_needs          text,
  spacing              integer,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table custom_crops enable row level security;

create policy "custom_crops_select" on custom_crops
  for select using (auth.uid() = user_id);

create policy "custom_crops_insert" on custom_crops
  for insert with check (auth.uid() = user_id);

create policy "custom_crops_update" on custom_crops
  for update using (auth.uid() = user_id);

create policy "custom_crops_delete" on custom_crops
  for delete using (auth.uid() = user_id);

-- ── gardens: add missing columns ──────────────────────────────────────────────

alter table gardens
  add column if not exists hemisphere text,
  add column if not exists color      text,
  add column if not exists notes      text,
  add column if not exists photo_uri  text;
