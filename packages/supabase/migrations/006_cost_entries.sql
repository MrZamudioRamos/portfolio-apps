-- ─────────────────────────────────────────────────────────────────────────────
-- 006_cost_entries.sql
-- Manual expense tracking per garden/plant.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists cost_entries (
  id          uuid primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  garden_id   uuid not null references gardens(id) on delete cascade,
  plant_id    uuid references plants(id) on delete set null,
  category    text not null,
  amount      numeric(10,2) not null,
  description text,
  date        date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table cost_entries enable row level security;

create policy "cost_entries_select" on cost_entries
  for select using (auth.uid() = user_id);

create policy "cost_entries_insert" on cost_entries
  for insert with check (auth.uid() = user_id);

create policy "cost_entries_update" on cost_entries
  for update using (auth.uid() = user_id);

create policy "cost_entries_delete" on cost_entries
  for delete using (auth.uid() = user_id);
