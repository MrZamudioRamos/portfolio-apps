begin;

select plan(13);

select has_column('public', 'garden_layouts', 'map_scene', 'stores the canonical map scene');
select has_column('public', 'garden_layouts', 'map_scene_revision', 'stores the CAS revision');
select has_column('public', 'garden_layouts', 'map_scene_updated_at', 'stores the scene timestamp');
select has_function('public', 'save_garden_map_scene', array['uuid', 'bigint', 'jsonb'], 'exposes the owner CAS function');
select has_function_privilege('authenticated', 'public.save_garden_map_scene(uuid,bigint,jsonb)', 'execute', 'authenticated can call the CAS function');
select ok(not has_function_privilege('anon', 'public.save_garden_map_scene(uuid,bigint,jsonb)', 'execute'), 'anonymous clients cannot call the CAS function');

-- Seed through the postgres test role; all calls below run with authenticated
-- claims so the same RLS and auth.uid() path is exercised by the RPC.
insert into auth.users (id, email, email_confirmed_at)
values
  ('10000000-0000-4000-8000-000000000001', 'map-owner@example.test', now()),
  ('10000000-0000-4000-8000-000000000002', 'map-viewer@example.test', now())
on conflict (id) do nothing;

insert into public.profiles (id, email, tier)
values
  ('10000000-0000-4000-8000-000000000001', 'map-owner@example.test', 'free'),
  ('10000000-0000-4000-8000-000000000002', 'map-viewer@example.test', 'free')
on conflict (id) do nothing;

insert into public.gardens (id, user_id, name, climate_zone, garden_type, grid_rows, grid_cols)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Mapa de prueba', 'mediterranea', 'huerto', 2, 2)
on conflict (id) do nothing;

insert into public.garden_layouts (id, user_id, garden_id, layout)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '[]'::jsonb)
on conflict (id) do nothing;

insert into public.garden_members (garden_id, user_id, role, invited_by)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'viewer', '10000000-0000-4000-8000-000000000001')
on conflict (garden_id, user_id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (public.save_garden_map_scene(
    '20000000-0000-4000-8000-000000000001',
    0,
    '{"version":2,"dimensions":{"widthCm":100,"lengthCm":80},"structures":[{"id":"bed-1","name":"Bancal","kind":"bed","x":0,"y":0,"widthCm":80,"lengthCm":60,"note":"privada","photoUri":"file://private.jpg"}],"zones":[],"plantPlacements":[{"plantId":"plant-1","x":0.5,"y":0.5}],"plannedPlantings":[],"seasons":[],"seasonPlans":[]}'::jsonb
  )->>'status',
  'saved',
  'owner can save the first scene revision'
);
select is((public.save_garden_map_scene('20000000-0000-4000-8000-000000000001', 0, '{"version":2}'::jsonb)->>'status'), 'conflict', 'a stale owner revision is reported as a conflict');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.save_garden_map_scene('20000000-0000-4000-8000-000000000001', 1, '{"version":2}'::jsonb)$$,
  'P0001',
  'GARDEN_OWNER_REQUIRED',
  'a viewer cannot save a private scene'
);

select ok(
  not ((public.get_shared_garden_snapshot('20000000-0000-4000-8000-000000000001')->'layout'->'mapPlan'->'structures'->0) ? 'note'),
  'shared structures do not expose notes'
);
select ok(
  not ((public.get_shared_garden_snapshot('20000000-0000-4000-8000-000000000001')->'layout'->'mapPlan'->'structures'->0) ? 'photoUri'),
  'shared structures do not expose photo URIs'
);
select is(
  jsonb_array_length(public.get_shared_garden_snapshot('20000000-0000-4000-8000-000000000001')->'layout'->'mapPlan'->'plantPlacements'),
  1,
  'shared snapshot includes canonical placements'
);

select * from finish();
rollback;
