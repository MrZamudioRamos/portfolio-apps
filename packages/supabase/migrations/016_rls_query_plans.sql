-- Release hardening: evaluate auth.uid() once per statement and keep
-- relationship checks scoped to the same garden.

alter policy profiles_select on public.profiles
  using ((select auth.uid()) = id);
alter policy profiles_update on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy gardens_select on public.gardens
  using ((select auth.uid()) = user_id);
alter policy gardens_insert on public.gardens
  with check ((select auth.uid()) = user_id);
alter policy gardens_update on public.gardens
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy gardens_delete on public.gardens
  using ((select auth.uid()) = user_id);

alter policy plants_select on public.plants
  using ((select auth.uid()) = user_id);
alter policy plants_insert on public.plants
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.gardens g
      where g.id = public.plants.garden_id
        and g.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.crops c
      where c.id = public.plants.crop_id
        and c.active = true
    )
  );
alter policy plants_update on public.plants
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.gardens g
      where g.id = public.plants.garden_id
        and g.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.crops c
      where c.id = public.plants.crop_id
        and c.active = true
    )
  );
alter policy plants_delete on public.plants
  using ((select auth.uid()) = user_id);

alter policy diary_entries_select on public.diary_entries
  using ((select auth.uid()) = user_id);
alter policy diary_entries_insert on public.diary_entries
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.gardens g
      where g.id = public.diary_entries.garden_id
        and g.user_id = (select auth.uid())
    )
    and (
      plant_id is null
      or exists (
        select 1 from public.plants p
        where p.id = public.diary_entries.plant_id
          and p.user_id = (select auth.uid())
          and p.garden_id = public.diary_entries.garden_id
      )
    )
  );
alter policy diary_entries_update on public.diary_entries
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.gardens g
      where g.id = public.diary_entries.garden_id
        and g.user_id = (select auth.uid())
    )
    and (
      plant_id is null
      or exists (
        select 1 from public.plants p
        where p.id = public.diary_entries.plant_id
          and p.user_id = (select auth.uid())
          and p.garden_id = public.diary_entries.garden_id
      )
    )
  );
alter policy diary_entries_delete on public.diary_entries
  using ((select auth.uid()) = user_id);

alter policy reminders_select on public.reminders
  using ((select auth.uid()) = user_id);
alter policy reminders_insert on public.reminders
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.gardens g
      where g.id = public.reminders.garden_id
        and g.user_id = (select auth.uid())
    )
    and (
      plant_id is null
      or exists (
        select 1 from public.plants p
        where p.id = public.reminders.plant_id
          and p.user_id = (select auth.uid())
          and p.garden_id = public.reminders.garden_id
      )
    )
  );
alter policy reminders_update on public.reminders
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.gardens g
      where g.id = public.reminders.garden_id
        and g.user_id = (select auth.uid())
    )
    and (
      plant_id is null
      or exists (
        select 1 from public.plants p
        where p.id = public.reminders.plant_id
          and p.user_id = (select auth.uid())
          and p.garden_id = public.reminders.garden_id
      )
    )
  );
alter policy reminders_delete on public.reminders
  using ((select auth.uid()) = user_id);

alter policy garden_layouts_select on public.garden_layouts
  using ((select auth.uid()) = user_id);
alter policy garden_layouts_insert on public.garden_layouts
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.gardens g
      where g.id = public.garden_layouts.garden_id
        and g.user_id = (select auth.uid())
    )
  );
alter policy garden_layouts_update on public.garden_layouts
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.gardens g
      where g.id = public.garden_layouts.garden_id
        and g.user_id = (select auth.uid())
    )
  );
alter policy garden_layouts_delete on public.garden_layouts
  using ((select auth.uid()) = user_id);

alter policy cost_entries_select on public.cost_entries
  using ((select auth.uid()) = user_id);
alter policy cost_entries_insert on public.cost_entries
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.gardens g
      where g.id = public.cost_entries.garden_id
        and g.user_id = (select auth.uid())
    )
    and (
      plant_id is null
      or exists (
        select 1 from public.plants p
        where p.id = public.cost_entries.plant_id
          and p.user_id = (select auth.uid())
          and p.garden_id = public.cost_entries.garden_id
      )
    )
  );
alter policy cost_entries_update on public.cost_entries
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.gardens g
      where g.id = public.cost_entries.garden_id
        and g.user_id = (select auth.uid())
    )
    and (
      plant_id is null
      or exists (
        select 1 from public.plants p
        where p.id = public.cost_entries.plant_id
          and p.user_id = (select auth.uid())
          and p.garden_id = public.cost_entries.garden_id
      )
    )
  );
alter policy cost_entries_delete on public.cost_entries
  using ((select auth.uid()) = user_id);

alter policy user_profiles_select on public.user_profiles
  using ((select auth.uid()) = user_id);
alter policy user_profiles_insert on public.user_profiles
  with check ((select auth.uid()) = user_id);
alter policy user_profiles_update on public.user_profiles
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy user_profiles_delete on public.user_profiles
  using ((select auth.uid()) = user_id);

alter policy custom_crops_select on public.custom_crops
  using ((select auth.uid()) = user_id);
alter policy custom_crops_insert on public.custom_crops
  with check ((select auth.uid()) = user_id);
alter policy custom_crops_update on public.custom_crops
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy custom_crops_delete on public.custom_crops
  using ((select auth.uid()) = user_id);
