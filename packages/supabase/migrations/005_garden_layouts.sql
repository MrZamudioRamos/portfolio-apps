-- ─────────────────────────────────────────────────────────────────────────────
-- 005_garden_layouts.sql
-- Stores the garden grid layout (plant-to-cell mapping) per garden.
-- 1:1 with gardens — id = garden_id.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists garden_layouts (
  id          uuid primary key references gardens(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  garden_id   uuid not null references gardens(id) on delete cascade,
  layout      jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

alter table garden_layouts enable row level security;

create policy "garden_layouts_select" on garden_layouts
  for select using (auth.uid() = user_id);

create policy "garden_layouts_insert" on garden_layouts
  for insert with check (auth.uid() = user_id);

create policy "garden_layouts_update" on garden_layouts
  for update using (auth.uid() = user_id);

create policy "garden_layouts_delete" on garden_layouts
  for delete using (auth.uid() = user_id);
