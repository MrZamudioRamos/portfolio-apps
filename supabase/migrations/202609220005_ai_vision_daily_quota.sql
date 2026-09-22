-- Temporary beta protection for authenticated AI requests across all proxies.
-- One request consumes one per-user and one global daily slot, atomically.

create table if not exists public.ai_user_daily_usage (
  day_bucket date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  call_count integer not null default 0 check (call_count >= 0),
  primary key (day_bucket, user_id)
);

create table if not exists public.ai_global_daily_usage (
  day_bucket date primary key,
  call_count integer not null default 0 check (call_count >= 0)
);

alter table public.ai_user_daily_usage enable row level security;
alter table public.ai_global_daily_usage enable row level security;
revoke all on table public.ai_user_daily_usage, public.ai_global_daily_usage
  from public, anon, authenticated, service_role;

create or replace function public.consume_ai_daily_quota(
  p_user_id uuid,
  p_day_bucket date
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_count integer;
  v_global_count integer;
begin
  if p_user_id is null or p_day_bucket is null then
    raise exception 'Invalid quota parameters';
  end if;

  -- Serialize all reservations for the same UTC day so the global cap cannot
  -- be exceeded by simultaneous requests.
  perform pg_catalog.pg_advisory_xact_lock(
    174911,
    (p_day_bucket - date '2000-01-01')
  );

  select call_count into v_global_count
  from public.ai_global_daily_usage
  where day_bucket = p_day_bucket;

  if coalesce(v_global_count, 0) >= 25 then
    return 'global_limit';
  end if;

  select call_count into v_user_count
  from public.ai_user_daily_usage
  where day_bucket = p_day_bucket and user_id = p_user_id;

  if coalesce(v_user_count, 0) >= 3 then
    return 'user_limit';
  end if;

  insert into public.ai_global_daily_usage as current_row (day_bucket, call_count)
  values (p_day_bucket, 1)
  on conflict (day_bucket) do update set call_count = current_row.call_count + 1;

  insert into public.ai_user_daily_usage as current_row (day_bucket, user_id, call_count)
  values (p_day_bucket, p_user_id, 1)
  on conflict (day_bucket, user_id) do update set call_count = current_row.call_count + 1;

  return 'allowed';
end;
$$;

revoke all on function public.consume_ai_daily_quota(uuid, date)
  from public, anon, authenticated;
grant execute on function public.consume_ai_daily_quota(uuid, date)
  to service_role;
