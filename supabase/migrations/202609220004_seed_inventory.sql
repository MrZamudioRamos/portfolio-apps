-- Gardener-owned inventory, populated only by user actions (no demo rows).
create table if not exists public.seed_lots (
  id            uuid primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  garden_id     uuid not null references public.gardens(id) on delete cascade,
  crop_id       text not null,
  crop_name     text not null check (length(trim(crop_name)) > 0),
  variety       text,
  brand         text,
  packet_count  integer not null check (packet_count between 0 and 100000),
  low_stock_at  integer check (low_stock_at between 1 and 100000),
  expires_on    date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists seed_lots_user_garden_updated_idx
  on public.seed_lots (user_id, garden_id, updated_at desc);

alter table public.seed_lots enable row level security;

drop policy if exists seed_lots_select on public.seed_lots;
create policy seed_lots_select on public.seed_lots
  for select using (
    auth.uid() = seed_lots.user_id
    and exists (select 1 from public.gardens g where g.id = seed_lots.garden_id and g.user_id = auth.uid())
  );

drop policy if exists seed_lots_insert on public.seed_lots;
create policy seed_lots_insert on public.seed_lots
  for insert with check (
    auth.uid() = seed_lots.user_id
    and exists (select 1 from public.gardens g where g.id = seed_lots.garden_id and g.user_id = auth.uid())
  );

drop policy if exists seed_lots_update on public.seed_lots;
create policy seed_lots_update on public.seed_lots
  for update using (
    auth.uid() = seed_lots.user_id
    and exists (select 1 from public.gardens g where g.id = seed_lots.garden_id and g.user_id = auth.uid())
  ) with check (
    auth.uid() = seed_lots.user_id
    and exists (select 1 from public.gardens g where g.id = seed_lots.garden_id and g.user_id = auth.uid())
  );

drop policy if exists seed_lots_delete on public.seed_lots;
create policy seed_lots_delete on public.seed_lots
  for delete using (
    auth.uid() = seed_lots.user_id
    and exists (select 1 from public.gardens g where g.id = seed_lots.garden_id and g.user_id = auth.uid())
  );
