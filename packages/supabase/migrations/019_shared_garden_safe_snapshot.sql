-- Expose only the fields needed by the read-only share screen. RLS policies on
-- raw rows would disclose private notes/photos to a viewer using direct API calls.
drop policy if exists gardens_select_shared_viewer on public.gardens;
drop policy if exists plants_select_shared_viewer on public.plants;
drop policy if exists garden_layouts_select_shared_viewer on public.garden_layouts;

create or replace function public.get_shared_garden_snapshot(p_garden_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_garden jsonb;
  v_plants jsonb;
  v_raw_layout jsonb;
  v_grid jsonb;
  v_free jsonb;
  v_raw_plan jsonb;
  v_structures jsonb := '[]'::jsonb;
  v_zones jsonb := '[]'::jsonb;
  v_plantings jsonb := '[]'::jsonb;
  v_plan jsonb;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_garden_owner(p_garden_id) and not public.is_garden_viewer(p_garden_id) then
    raise exception 'GARDEN_ACCESS_DENIED';
  end if;

  select jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'province', g.province,
    'climate_zone', g.climate_zone,
    'grid_rows', g.grid_rows,
    'grid_cols', g.grid_cols
  ) into v_garden
  from public.gardens g
  where g.id = p_garden_id and g.deleted_at is null;
  if v_garden is null then raise exception 'GARDEN_NOT_FOUND'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'crop_id', p.crop_id,
    'name', p.name,
    'variety', p.variety,
    'status', p.status,
    'bed_name', p.bed_name
  ) order by p.name), '[]'::jsonb) into v_plants
  from public.plants p
  where p.garden_id = p_garden_id and p.deleted_at is null;

  select gl.layout into v_raw_layout
  from public.garden_layouts gl
  where gl.garden_id = p_garden_id;
  v_grid := case when jsonb_typeof(v_raw_layout->'grid') = 'array' then v_raw_layout->'grid' else '[]'::jsonb end;
  v_free := case when jsonb_typeof(v_raw_layout->'free') = 'object' then v_raw_layout->'free' else '{}'::jsonb end;
  v_raw_plan := v_raw_layout->'mapPlan';

  if jsonb_typeof(v_raw_plan) = 'object' then
    if jsonb_typeof(v_raw_plan->'structures') = 'array' then
      select coalesce(jsonb_agg(value - 'note' - 'photoUri'), '[]'::jsonb)
      into v_structures from jsonb_array_elements(v_raw_plan->'structures') as item(value);
    end if;
    if jsonb_typeof(v_raw_plan->'zones') = 'array' then
      select coalesce(jsonb_agg(value - 'note' - 'photoUri'), '[]'::jsonb)
      into v_zones from jsonb_array_elements(v_raw_plan->'zones') as item(value);
    end if;
    if jsonb_typeof(v_raw_plan->'plannedPlantings') = 'array' then
      select coalesce(jsonb_agg(value - 'note'), '[]'::jsonb)
      into v_plantings from jsonb_array_elements(v_raw_plan->'plannedPlantings') as item(value);
    end if;
    v_plan := jsonb_build_object(
      'version', coalesce(v_raw_plan->'version', '1'::jsonb),
      'dimensions', v_raw_plan->'dimensions',
      'structures', v_structures,
      'zones', v_zones,
      'plannedPlantings', v_plantings
    );
  end if;

  return jsonb_build_object(
    'garden', v_garden,
    'plants', v_plants,
    'layout', jsonb_build_object('grid', v_grid, 'free', v_free, 'mapPlan', v_plan)
  );
end;
$$;

revoke all on function public.get_shared_garden_snapshot(uuid) from public, anon;
grant execute on function public.get_shared_garden_snapshot(uuid) to authenticated;
