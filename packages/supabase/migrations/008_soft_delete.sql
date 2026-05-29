-- 008_soft_delete.sql
-- Cross-device soft-delete: deletions become a synced `deleted_at` tombstone
-- instead of a physical DELETE, so a delete on one device propagates to others
-- via the normal pull/merge (which is additive and never removed local rows).
--
-- The client keeps soft-deleted rows locally (hidden from the UI) and upserts
-- them with deleted_at set; other devices pull the tombstone and hide the row.

-- deleted_at on every user-data table
alter table gardens        add column if not exists deleted_at timestamptz;
alter table plants         add column if not exists deleted_at timestamptz;
alter table diary_entries  add column if not exists deleted_at timestamptz;
alter table reminders      add column if not exists deleted_at timestamptz;
alter table user_profiles  add column if not exists deleted_at timestamptz;
alter table custom_crops   add column if not exists deleted_at timestamptz;
alter table cost_entries   add column if not exists deleted_at timestamptz;
alter table garden_layouts add column if not exists deleted_at timestamptz;

-- diary_entries had no updated_at; soft-delete (and edit) sync needs it so the
-- merge can pick the newer version. Backfill existing rows from created_at.
alter table diary_entries add column if not exists updated_at timestamptz;
update diary_entries set updated_at = created_at where updated_at is null;
alter table diary_entries alter column updated_at set default now();
alter table diary_entries alter column updated_at set not null;

-- Partial indexes to keep "list live rows" fast as tombstones accumulate.
create index if not exists gardens_live_idx        on gardens        (user_id) where deleted_at is null;
create index if not exists plants_live_idx         on plants         (user_id) where deleted_at is null;
create index if not exists diary_entries_live_idx  on diary_entries  (user_id) where deleted_at is null;
create index if not exists reminders_live_idx      on reminders      (user_id) where deleted_at is null;
create index if not exists custom_crops_live_idx   on custom_crops   (user_id) where deleted_at is null;
create index if not exists cost_entries_live_idx   on cost_entries   (user_id) where deleted_at is null;

-- Note: RLS policies (by user_id) are unchanged. SELECT must keep returning
-- soft-deleted rows so clients receive the tombstone — do NOT filter deleted_at
-- in policies. Optional future purge job can hard-DELETE rows older than N days.
