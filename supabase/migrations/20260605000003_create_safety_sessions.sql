-- Migration: 20260605000003_create_safety_sessions
-- Owner: database-developer
-- Depends on: 20260605000001_create_profiles
-- Tables affected: safety_sessions
-- Description: Safety session lifecycle. FR-18..26, FR-55. Status enum FR-25.

-- ============================================================
-- UP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.safety_sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_location           TEXT NOT NULL,
  destination              TEXT NOT NULL,
  route_data               JSONB,
  start_time               TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_arrival_time    TIMESTAMPTZ,
  checkin_interval_minutes INTEGER NOT NULL CHECK (checkin_interval_minutes > 0),
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','completed','cancelled','missed_checkin')),
  location_sharing_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT safety_sessions_id_user_unique UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_safety_sessions_user_status
  ON public.safety_sessions(user_id, status);
-- At most one active session per user (verifier #5)
CREATE UNIQUE INDEX IF NOT EXISTS uq_safety_sessions_one_active
  ON public.safety_sessions(user_id) WHERE status = 'active';

ALTER TABLE public.safety_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "safety_sessions_select_own" ON public.safety_sessions;
CREATE POLICY "safety_sessions_select_own" ON public.safety_sessions
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "safety_sessions_insert_own" ON public.safety_sessions;
CREATE POLICY "safety_sessions_insert_own" ON public.safety_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "safety_sessions_update_own" ON public.safety_sessions;
CREATE POLICY "safety_sessions_update_own" ON public.safety_sessions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "safety_sessions_delete_own" ON public.safety_sessions;
CREATE POLICY "safety_sessions_delete_own" ON public.safety_sessions
  FOR DELETE USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_safety_sessions_update_timestamp ON public.safety_sessions;
CREATE TRIGGER trg_safety_sessions_update_timestamp
  BEFORE UPDATE ON public.safety_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'safety_sessions'; -- expect 4

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP TABLE IF EXISTS public.safety_sessions CASCADE;
