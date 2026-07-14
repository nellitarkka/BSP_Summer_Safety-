-- Migration: 20260605000007_create_ai_safety_requests
-- Owner: integration-developer
-- Depends on: 20260605000001_create_profiles
-- Tables affected: ai_safety_requests
-- Description: OPTIONAL AI tips log. Privacy-first: user_input stored ONLY with
--              consent (profiles.privacy_preferences.store_ai_text = true).
--              Verifier #3: user_id is NOT NULL (owner-scoped); no nullable-owner rows.

-- ============================================================
-- UP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_safety_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  situation_category TEXT,
  user_input         TEXT,  -- written only when store_ai_text consent is true
  ai_response        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_user_created
  ON public.ai_safety_requests(user_id, created_at DESC);

ALTER TABLE public.ai_safety_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_requests_select_own" ON public.ai_safety_requests;
CREATE POLICY "ai_requests_select_own" ON public.ai_safety_requests
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "ai_requests_insert_own" ON public.ai_safety_requests;
CREATE POLICY "ai_requests_insert_own" ON public.ai_safety_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "ai_requests_delete_own" ON public.ai_safety_requests;
CREATE POLICY "ai_requests_delete_own" ON public.ai_safety_requests
  FOR DELETE USING (user_id = auth.uid());
-- No UPDATE policy: AI logs are append-only for the owner.

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ai_safety_requests'; -- expect 3

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP TABLE IF EXISTS public.ai_safety_requests CASCADE;
