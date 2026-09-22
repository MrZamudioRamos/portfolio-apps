-- Versioned, additive map scene storage.
-- The legacy `layout` JSONB remains untouched so older clients can continue
-- reading and writing it while newer clients use the CAS-protected scene.

alter table public.garden_layouts
  add column if not exists map_scene jsonb,
  add column if not exists map_scene_revision bigint not null default 0,
  add column if not exists map_scene_updated_at timestamptz;

-- Only an owner may write the canonical scene. The compare-and-swap happens
-- in the same UPDATE as the revision increment, so concurrent writes cannot
-- silently replace one another.
create or replace function public.save_garden_map_scene(
  p_garden_id uuid,
  p_expected_revision bigint,
  p_scene jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_scene jsonb;
  v_revision bigint;
  v_updated_at timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'INVALID_MAP_SCENE_REVISION';
  end if;
  if p_scene is null or jsonb_typeof(p_scene) <> 'object' then
    raise exception 'INVALID_MAP_SCENE';
  end if;
  if not public.is_garden_owner(p_garden_id) then
    raise exception 'GARDEN_OWNER_REQUIRED';
  end if;

  update public.garden_layouts
  set map_scene = p_scene,
      map_scene_revision = map_scene_revision + 1,
      map_scene_updated_at = now(),
      updated_at = now()
  where garden_id = p_garden_id
    and user_id = (select auth.uid())
    and map_scene_revision = p_expected_revision
  returning map_scene, map_scene_revision, map_scene_updated_at
  into v_scene, v_revision, v_updated_at;

  if found then
    return jsonb_build_object(
      'status', 'saved',
      'revision', v_revision,
      'updatedAt', v_updated_at,
      'scene', v_scene
    );
  end if;

  select gl.map_scene, gl.map_scene_revision,
         coalesce(gl.map_scene_updated_at, gl.updated_at, now())
    into v_scene, v_revision, v_updated_at
  from public.garden_layouts gl
  where gl.garden_id = p_garden_id and gl.user_id = (select auth.uid());

  if not found then raise exception 'GARDEN_LAYOUT_NOT_FOUND'; end if;
  return jsonb_build_object(
    'status', 'conflict',
    'revision', v_revision,
    'updatedAt', v_updated_at,
    'scene', v_scene
  );
end;
$$;

revoke all on function public.save_garden_map_scene(uuid, bigint, jsonb) from public, anon;
grant execute on function public.save_garden_map_scene(uuid, bigint, jsonb) to authenticated;

-- Shared viewers receive only the public projection. Private notes/photo URIs
-- are removed in SQL, before the JSON crosses the database API boundary.
create or replace function public.get_shared_garden_snapshot(p_garden_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_garden jsonb;
  v_plants jsonb;
  v_raw_layout jsonb;
  v_grid jsonb := '[]'::jsonb;
  v_free jsonb := '{}'::jsonb;
  v_raw_plan jsonb;
  v_structures jsonb := '[]'::jsonb;
  v_zones jsonb := '[]'::jsonb;
  v_plantings jsonb := '[]'::jsonb;
  v_placements jsonb := '[]'::jsonb;
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

  select gl.layout, gl.map_scene
    into v_raw_layout, v_raw_plan
  from public.garden_layouts gl
  where gl.garden_id = p_garden_id;

  if jsonb_typeof(v_raw_layout) = 'array' then
    v_grid := v_raw_layout;
  elsif jsonb_typeof(v_raw_layout) = 'object' then
    v_grid := case when jsonb_typeof(v_raw_layout->'grid') = 'array' then v_raw_layout->'grid' else '[]'::jsonb end;
    v_free := case when jsonb_typeof(v_raw_layout->'free') = 'object' then v_raw_layout->'free' else '{}'::jsonb end;
    if v_raw_plan is null then v_raw_plan := v_raw_layout->'mapPlan'; end if;
  end if;

  if jsonb_typeof(v_raw_plan) = 'object' then
    if jsonb_typeof(v_raw_plan->'structures') = 'array' then
      select coalesce(jsonb_agg(value - array['note', 'photoUri', 'photo_uri']), '[]'::jsonb)
        into v_structures from jsonb_array_elements(v_raw_plan->'structures') as item(value);
    end if;
    if jsonb_typeof(v_raw_plan->'zones') = 'array' then
      select coalesce(jsonb_agg(value - array['note', 'photoUri', 'photo_uri']), '[]'::jsonb)
        into v_zones from jsonb_array_elements(v_raw_plan->'zones') as item(value);
    end if;
    if jsonb_typeof(v_raw_plan->'plannedPlantings') = 'array' then
      select coalesce(jsonb_agg(value - 'note'), '[]'::jsonb)
        into v_plantings from jsonb_array_elements(v_raw_plan->'plannedPlantings') as item(value);
    end if;
    if jsonb_typeof(v_raw_plan->'plantPlacements') = 'array' then
      v_placements := v_raw_plan->'plantPlacements';
    end if;
    v_plan := jsonb_build_object(
      'version', coalesce(v_raw_plan->'version', '1'::jsonb),
      'dimensions', v_raw_plan->'dimensions',
      'structures', v_structures,
      'zones', v_zones,
      'plantPlacements', v_placements,
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
