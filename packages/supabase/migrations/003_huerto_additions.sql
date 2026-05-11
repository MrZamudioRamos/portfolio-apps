-- ─────────────────────────────────────────────────────────────────────────────
-- 003_huerto_additions.sql
-- Fields added during the huerto sprint (features 2, 4, 7).
-- Safe to run multiple times (IF NOT EXISTS / DROP NOT NULL is idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- diary_entries.plant_id was incorrectly NOT NULL; garden-level entries have no plant.
ALTER TABLE diary_entries ALTER COLUMN plant_id DROP NOT NULL;

-- ── gardens ──────────────────────────────────────────────────────────────────
ALTER TABLE gardens
  ADD COLUMN IF NOT EXISTS garden_type text,          -- 'huerto' | 'balcon' | 'maceta'
  ADD COLUMN IF NOT EXISTS grid_rows   integer DEFAULT 4,
  ADD COLUMN IF NOT EXISTS grid_cols   integer DEFAULT 4;

-- ── plants ───────────────────────────────────────────────────────────────────
ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS variety_id          text,  -- FK to local variety catalogue (not enforced in DB)
  ADD COLUMN IF NOT EXISTS transplant_date     date,
  ADD COLUMN IF NOT EXISTS first_harvest_date  date,
  ADD COLUMN IF NOT EXISTS pest_status         text DEFAULT 'none';  -- 'none' | 'active' | 'treated'

-- ── diary_entries ─────────────────────────────────────────────────────────────
ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS harvest_unit  text,   -- 'kg' | 'units'
  ADD COLUMN IF NOT EXISTS entry_data    jsonb;  -- arbitrary data blob (e.g. { weightGrams, unit })
