-- Migration: 20260605000004_create_session_contacts
-- Owner: database-developer
-- Depends on: 20260605000002_create_trusted_contacts, 20260605000003_create_safety_sessions
-- Tables affected: session_contacts
-- Description: M:N join of sessions <-> selected trusted contacts.
--              Replaces uuid[] (analyst note #3). Composite FKs enforce same-owner
--              for both session and contact (verifier #1).

-- ============================================================
-- UP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Composite FKs guarantee the session AND the contact belong to the same user
  CONSTRAINT fk_session_owner FOREIGN KEY (session_id, user_id)
    REFERENCES public.safety_sessions(id, user_id) ON DELETE CASCADE,
  CONSTRAINT fk_contact_owner FOREIGN KEY (contact_id, user_id)
    REFERENCES public.trusted_contacts(id, user_id) ON DELETE CASCADE,
  CONSTRAINT session_contacts_unique UNIQUE (session_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_session_contacts_session ON public.session_contacts(session_id);
CREATE INDEX IF NOT EXISTS idx_session_contacts_user ON public.session_contacts(user_id);

ALTER TABLE public.session_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_contacts_select_own" ON public.session_contacts;
CREATE POLICY "session_contacts_select_own" ON public.session_contacts
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "session_contacts_insert_own" ON public.session_contacts;
CREATE POLICY "session_contacts_insert_own" ON public.session_contacts
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "session_contacts_delete_own" ON public.session_contacts;
CREATE POLICY "session_contacts_delete_own" ON public.session_contacts
  FOR DELETE USING (user_id = auth.uid());
-- No UPDATE policy: rows are immutable (delete + re-insert to change selection).

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'session_contacts'; -- expect 3

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP TABLE IF EXISTS public.session_contacts CASCADE;
