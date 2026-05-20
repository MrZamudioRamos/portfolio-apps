-- ─────────────────────────────────────────────────────────────────────────────
-- 007_plant_extra_fields.sql
-- Plant fields present in the app model but missing from the DB schema.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS harvest_goal_kg  numeric(8,3),
  ADD COLUMN IF NOT EXISTS soil_ph          text,
  ADD COLUMN IF NOT EXISTS soil_texture     text,   -- 'sandy' | 'loamy' | 'clay' | 'silty' | 'peaty'
  ADD COLUMN IF NOT EXISTS soil_notes       text,
  ADD COLUMN IF NOT EXISTS bed_name         text;
