-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

-- Catalog tables: public read, no writes from clients
alter table climate_zones enable row level security;
alter table province_zones enable row level security;
alter table crops enable row level security;

create policy "catalog_read" on climate_zones for select using (true);
create policy "catalog_read" on province_zones for select using (true);
create policy "catalog_read" on crops for select using (active = true);

-- profiles: users see and edit only their own
alter table profiles enable row level security;

create policy "profiles_select" on profiles
  for select using (auth.uid() = id);

create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

-- gardens: users own their gardens
alter table gardens enable row level security;

create policy "gardens_select" on gardens
  for select using (auth.uid() = user_id);

create policy "gardens_insert" on gardens
  for insert with check (auth.uid() = user_id);

create policy "gardens_update" on gardens
  for update using (auth.uid() = user_id);

create policy "gardens_delete" on gardens
  for delete using (auth.uid() = user_id);

-- plants: users own their plants
alter table plants enable row level security;

create policy "plants_select" on plants
  for select using (auth.uid() = user_id);

create policy "plants_insert" on plants
  for insert with check (auth.uid() = user_id);

create policy "plants_update" on plants
  for update using (auth.uid() = user_id);

create policy "plants_delete" on plants
  for delete using (auth.uid() = user_id);

-- diary_entries: users own their entries
alter table diary_entries enable row level security;

create policy "diary_entries_select" on diary_entries
  for select using (auth.uid() = user_id);

create policy "diary_entries_insert" on diary_entries
  for insert with check (auth.uid() = user_id);

create policy "diary_entries_update" on diary_entries
  for update using (auth.uid() = user_id);

create policy "diary_entries_delete" on diary_entries
  for delete using (auth.uid() = user_id);

-- reminders: users own their reminders
alter table reminders enable row level security;

create policy "reminders_select" on reminders
  for select using (auth.uid() = user_id);

create policy "reminders_insert" on reminders
  for insert with check (auth.uid() = user_id);

create policy "reminders_update" on reminders
  for update using (auth.uid() = user_id);

create policy "reminders_delete" on reminders
  for delete using (auth.uid() = user_id);
