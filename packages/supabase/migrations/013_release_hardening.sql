-- Release hardening: close privilege-escalation and cross-owner relationship gaps.
-- This migration is additive/reversible at the policy level and does not delete data.

-- A client must never be able to promote its own profile by updating `tier`.
create or replace function public.prevent_profile_tier_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    new.tier := old.tier;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_tier_escalation on public.profiles;
create trigger profiles_prevent_tier_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_tier_escalation();

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Foreign keys alone do not prove that a referenced row belongs to the caller.
-- Keep all relationships inside the same user's garden graph.
drop policy if exists "plants_insert" on public.plants;
create policy "plants_insert" on public.plants
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.gardens g where g.id = garden_id and g.user_id = auth.uid())
    and exists (select 1 from public.crops c where c.id = crop_id and c.active = true)
  );

drop policy if exists "plants_update" on public.plants;
create policy "plants_update" on public.plants
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.gardens g where g.id = garden_id and g.user_id = auth.uid())
    and exists (select 1 from public.crops c where c.id = crop_id and c.active = true)
  );

drop policy if exists "diary_entries_insert" on public.diary_entries;
create policy "diary_entries_insert" on public.diary_entries
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.gardens g where g.id = garden_id and g.user_id = auth.uid())
    and (plant_id is null or exists (
      select 1 from public.plants p
      where p.id = plant_id and p.user_id = auth.uid() and p.garden_id = garden_id
    ))
  );

drop policy if exists "diary_entries_update" on public.diary_entries;
create policy "diary_entries_update" on public.diary_entries
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.gardens g where g.id = garden_id and g.user_id = auth.uid())
    and (plant_id is null or exists (
      select 1 from public.plants p
      where p.id = plant_id and p.user_id = auth.uid() and p.garden_id = garden_id
    ))
  );

drop policy if exists "reminders_insert" on public.reminders;
create policy "reminders_insert" on public.reminders
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.gardens g where g.id = garden_id and g.user_id = auth.uid())
    and (plant_id is null or exists (
      select 1 from public.plants p
      where p.id = plant_id and p.user_id = auth.uid() and p.garden_id = garden_id
    ))
  );

drop policy if exists "reminders_update" on public.reminders;
create policy "reminders_update" on public.reminders
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.gardens g where g.id = garden_id and g.user_id = auth.uid())
    and (plant_id is null or exists (
      select 1 from public.plants p
      where p.id = plant_id and p.user_id = auth.uid() and p.garden_id = garden_id
    ))
  );

drop policy if exists "garden_layouts_insert" on public.garden_layouts;
create policy "garden_layouts_insert" on public.garden_layouts
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.gardens g where g.id = garden_id and g.user_id = auth.uid())
  );

drop policy if exists "garden_layouts_update" on public.garden_layouts;
create policy "garden_layouts_update" on public.garden_layouts
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.gardens g where g.id = garden_id and g.user_id = auth.uid())
  );

drop policy if exists "cost_entries_insert" on public.cost_entries;
create policy "cost_entries_insert" on public.cost_entries
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.gardens g where g.id = garden_id and g.user_id = auth.uid())
    and (plant_id is null or exists (
      select 1 from public.plants p
      where p.id = plant_id and p.user_id = auth.uid() and p.garden_id = garden_id
    ))
  );

drop policy if exists "cost_entries_update" on public.cost_entries;
create policy "cost_entries_update" on public.cost_entries
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.gardens g where g.id = garden_id and g.user_id = auth.uid())
    and (plant_id is null or exists (
      select 1 from public.plants p
      where p.id = plant_id and p.user_id = auth.uid() and p.garden_id = garden_id
    ))
  );

-- The counter is called only by Edge Functions with service_role. Prevent a
-- public RPC caller from incrementing arbitrary users' counters.
alter function public.increment_ai_usage(uuid, timestamptz, integer)
  set search_path = public, pg_temp;
revoke all on function public.increment_ai_usage(uuid, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.increment_ai_usage(uuid, timestamptz, integer) to service_role;

-- Keep analytics write-only and constrain payload size to avoid unbounded rows.
drop policy if exists "anon insert only" on public.share_events;
create policy "anon insert only" on public.share_events
  for insert to anon
  with check (
    char_length(app) between 1 and 80
    and char_length(event_type) between 1 and 120
    and (ref_code is null or char_length(ref_code) <= 200)
    and (device_id is null or char_length(device_id) <= 200)
  );
