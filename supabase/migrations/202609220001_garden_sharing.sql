-- Secure, read-only garden sharing. Invites are email-bound, single-use and expire after seven days.
create table if not exists public.garden_members (
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role = 'viewer'),
  invited_by uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (garden_id, user_id)
);

create table if not exists public.garden_invitations (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  invited_email text not null check (char_length(invited_email) between 3 and 254),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz
);

create index if not exists garden_members_user_idx on public.garden_members(user_id, garden_id);
create index if not exists garden_invitations_owner_idx on public.garden_invitations(garden_id, created_at desc);

alter table public.garden_members enable row level security;
alter table public.garden_invitations enable row level security;

create or replace function public.is_garden_owner(p_garden_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.gardens g
    where g.id = p_garden_id and g.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_garden_viewer(p_garden_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.garden_members gm
    where gm.garden_id = p_garden_id
      and gm.user_id = (select auth.uid())
      and gm.role = 'viewer'
  );
$$;

revoke all on function public.is_garden_owner(uuid) from public, anon;
revoke all on function public.is_garden_viewer(uuid) from public, anon;
grant execute on function public.is_garden_owner(uuid) to authenticated;
grant execute on function public.is_garden_viewer(uuid) to authenticated;

create policy garden_members_select_self_or_owner on public.garden_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_garden_owner(garden_id));

create policy garden_members_delete_self_or_owner on public.garden_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or (public.is_garden_owner(garden_id) and user_id <> (select auth.uid())));

create policy garden_invitations_select_owner on public.garden_invitations
  for select to authenticated
  using (public.is_garden_owner(garden_id));

create policy garden_invitations_delete_owner on public.garden_invitations
  for delete to authenticated
  using (public.is_garden_owner(garden_id));

create policy gardens_select_shared_viewer on public.gardens
  for select to authenticated
  using (public.is_garden_viewer(id));

create policy plants_select_shared_viewer on public.plants
  for select to authenticated
  using (public.is_garden_viewer(garden_id));

create policy garden_layouts_select_shared_viewer on public.garden_layouts
  for select to authenticated
  using (public.is_garden_viewer(garden_id));

-- The database, not the client, verifies ownership and binds the invite to an email.
create or replace function public.create_garden_viewer_invite(p_garden_id uuid, p_email text)
returns jsonb
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_owner_email text;
  v_invite public.garden_invitations%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_garden_owner(p_garden_id) then raise exception 'GARDEN_OWNER_REQUIRED'; end if;
  if char_length(v_email) < 3 or char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'INVALID_EMAIL';
  end if;
  select lower(u.email) into v_owner_email from auth.users u where u.id = (select auth.uid());
  if v_email = v_owner_email then raise exception 'CANNOT_INVITE_SELF'; end if;

  update public.garden_invitations
  set revoked_at = now()
  where garden_id = p_garden_id and invited_email = v_email
    and accepted_at is null and revoked_at is null;

  insert into public.garden_invitations(garden_id, invited_email, invited_by)
  values (p_garden_id, v_email, (select auth.uid()))
  returning * into v_invite;

  return jsonb_build_object('id', v_invite.id, 'token', v_invite.token, 'expires_at', v_invite.expires_at);
end;
$$;

-- A high-entropy token may reveal only the invited garden's name and target email.
create or replace function public.preview_garden_viewer_invite(p_token uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'garden_id', g.id,
    'garden_name', g.name,
    'invited_email', i.invited_email,
    'expires_at', i.expires_at
  )
  from public.garden_invitations i
  join public.gardens g on g.id = i.garden_id
  where i.token = p_token and i.revoked_at is null
    and i.accepted_at is null and i.expires_at > now()
  limit 1;
$$;

create or replace function public.accept_garden_viewer_invite(p_token uuid)
returns jsonb
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_invite public.garden_invitations%rowtype;
  v_email text;
  v_confirmed_at timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'AUTH_REQUIRED'; end if;
  select lower(u.email), u.email_confirmed_at into v_email, v_confirmed_at
  from auth.users u where u.id = (select auth.uid());
  if v_email is null or v_confirmed_at is null then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;

  select * into v_invite from public.garden_invitations i
  where i.token = p_token for update;
  if not found then raise exception 'INVITE_NOT_FOUND'; end if;
  if v_invite.invited_email <> v_email then raise exception 'INVITE_EMAIL_MISMATCH'; end if;
  if v_invite.accepted_at is not null then
    if v_invite.accepted_by = (select auth.uid()) then
      return jsonb_build_object('garden_id', v_invite.garden_id);
    end if;
    raise exception 'INVITE_ALREADY_USED';
  end if;
  if v_invite.revoked_at is not null or v_invite.expires_at <= now() then raise exception 'INVITE_EXPIRED'; end if;

  insert into public.garden_members(garden_id, user_id, role, invited_by)
  values (v_invite.garden_id, (select auth.uid()), 'viewer', v_invite.invited_by)
  on conflict (garden_id, user_id) do nothing;
  update public.garden_invitations
  set accepted_at = now(), accepted_by = (select auth.uid())
  where id = v_invite.id;

  return jsonb_build_object('garden_id', v_invite.garden_id);
end;
$$;

revoke all on function public.create_garden_viewer_invite(uuid, text) from public, anon;
revoke all on function public.accept_garden_viewer_invite(uuid) from public, anon;
revoke all on function public.preview_garden_viewer_invite(uuid) from public;
grant execute on function public.create_garden_viewer_invite(uuid, text) to authenticated;
grant execute on function public.accept_garden_viewer_invite(uuid) to authenticated;
grant execute on function public.preview_garden_viewer_invite(uuid) to anon, authenticated;
