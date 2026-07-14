-- Migration: 20260605000005_create_checkins
-- Owner: database-developer
-- Depends on: 20260605000003_create_safety_sessions
-- Tables affected: checkins
-- Description: Check-in schedule + responses. FR-23, FR-27..31. Status enum.

-- ============================================================
-- UP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checkins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id     UUID NOT NULL REFERENCES public.safety_sessions(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  completed_time TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','missed','help_requested')),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkins_session ON public.checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_session_status ON public.checkins(session_id, status);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkins_select_own" ON public.checkins;
CREATE POLICY "checkins_select_own" ON public.checkins
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "checkins_insert_own" ON public.checkins;
CREATE POLICY "checkins_insert_own" ON public.checkins
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "checkins_update_own" ON public.checkins;
CREATE POLICY "checkins_update_own" ON public.checkins
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "checkins_delete_own" ON public.checkins;
CREATE POLICY "checkins_delete_own" ON public.checkins
  FOR DELETE USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_checkins_update_timestamp ON public.checkins;
CREATE TRIGGER trg_checkins_update_timestamp
  BEFORE UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'checkins'; -- expect 4

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP TABLE IF EXISTS public.checkins CASCADE;
