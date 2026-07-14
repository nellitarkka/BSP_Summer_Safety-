-- Migration: 20260605000006_create_alerts
-- Owner: api-developer
-- Depends on: 20260605000002_create_trusted_contacts, 20260605000003_create_safety_sessions
-- Tables affected: alerts
-- Description: Alert records (sent/simulated). FR-36, FR-37, FR-31.

-- ============================================================
-- UP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.safety_sessions(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.trusted_contacts(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('sms','email','app','sos')),
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'created'
               CHECK (status IN ('created','sent','simulated','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON public.alerts(user_id, created_at DESC);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select_own" ON public.alerts;
CREATE POLICY "alerts_select_own" ON public.alerts
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "alerts_insert_own" ON public.alerts;
CREATE POLICY "alerts_insert_own" ON public.alerts
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "alerts_update_own" ON public.alerts;
CREATE POLICY "alerts_update_own" ON public.alerts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "alerts_delete_own" ON public.alerts;
CREATE POLICY "alerts_delete_own" ON public.alerts
  FOR DELETE USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_alerts_update_timestamp ON public.alerts;
CREATE TRIGGER trg_alerts_update_timestamp
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'alerts'; -- expect 4

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP TABLE IF EXISTS public.alerts CASCADE;
