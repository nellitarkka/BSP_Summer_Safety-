-- Migration: 20260605000002_create_trusted_contacts
-- Owner: database-developer
-- Depends on: 20260605000001_create_profiles
-- Tables affected: trusted_contacts
-- Description: Trusted/emergency contacts, owner-scoped. FR-10..14.

-- ============================================================
-- UP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  relationship     TEXT,
  preferred_method TEXT NOT NULL DEFAULT 'app'
                     CHECK (preferred_method IN ('sms','email','call','app')),
  is_emergency     BOOLEAN NOT NULL DEFAULT false,
  priority         INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- FR-14: name required (NOT NULL above) AND at least one of phone/email
  CONSTRAINT trusted_contacts_phone_or_email CHECK (phone IS NOT NULL OR email IS NOT NULL),
  -- enables composite FK ownership check from session_contacts (verifier #1)
  CONSTRAINT trusted_contacts_id_user_unique UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON public.trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_emergency
  ON public.trusted_contacts(user_id, is_emergency, priority);

ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trusted_contacts_select_own" ON public.trusted_contacts;
CREATE POLICY "trusted_contacts_select_own" ON public.trusted_contacts
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "trusted_contacts_insert_own" ON public.trusted_contacts;
CREATE POLICY "trusted_contacts_insert_own" ON public.trusted_contacts
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "trusted_contacts_update_own" ON public.trusted_contacts;
CREATE POLICY "trusted_contacts_update_own" ON public.trusted_contacts
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "trusted_contacts_delete_own" ON public.trusted_contacts;
CREATE POLICY "trusted_contacts_delete_own" ON public.trusted_contacts
  FOR DELETE USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_trusted_contacts_update_timestamp ON public.trusted_contacts;
CREATE TRIGGER trg_trusted_contacts_update_timestamp
  BEFORE UPDATE ON public.trusted_contacts
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'trusted_contacts'; -- expect 4

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP TABLE IF EXISTS public.trusted_contacts CASCADE;
