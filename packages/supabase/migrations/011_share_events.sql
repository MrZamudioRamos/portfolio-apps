create table if not exists share_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  app         text not null,
  event_type  text not null,
  ref_code    text,
  device_id   text
);

-- anon can insert attribution events, nothing else
alter table share_events enable row level security;

create policy "anon insert only"
  on share_events
  for insert
  to anon
  with check (true);
