-- Persist the selected weekday and exact local date for scheduled reminders.
-- Existing rows remain valid with NULL values and retain their prior behavior.
alter table public.reminders
  add column if not exists weekday smallint,
  add column if not exists due_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reminders_weekday_range_check'
  ) then
    alter table public.reminders
      add constraint reminders_weekday_range_check
      check (weekday is null or weekday between 1 and 7);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'reminders_due_date_frequency_check'
  ) then
    alter table public.reminders
      add constraint reminders_due_date_frequency_check
      check (due_date is null or frequency = 'once');
  end if;
end $$;
