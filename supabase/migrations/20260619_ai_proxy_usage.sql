-- Migration: ai_usage — per-user hourly rate limiting for AI proxy calls
-- Applied: 2026-06-19

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  hour_bucket timestamptz NOT NULL,
  call_count  integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, hour_bucket)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Only the service role (Edge Function) can read or write this table.
-- No user-facing SELECT or INSERT policy → all direct client access denied.
CREATE POLICY "service role only" ON ai_usage USING (false);

-- Atomic increment helper called by the ai-proxy Edge Function.
-- SECURITY DEFINER runs as the table owner so the anon/service clients
-- don't need direct table INSERT/UPDATE grants.
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id    uuid,
  p_hour_bucket timestamptz,
  p_limit       int  DEFAULT 20
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO ai_usage (user_id, hour_bucket, call_count)
  VALUES (p_user_id, p_hour_bucket, 1)
  ON CONFLICT (user_id, hour_bucket)
  DO UPDATE SET call_count = ai_usage.call_count + 1
  RETURNING call_count INTO v_count;
  RETURN v_count;
END;
$$;
