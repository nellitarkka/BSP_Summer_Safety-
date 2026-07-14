-- Migration: 20260605000009_indexes_cleanup
-- Owner: database-developer
-- Depends on: 20260605000006_create_alerts, 20260605000004_create_session_contacts
-- Tables affected: alerts, session_contacts, profiles
-- Description: database-verifier follow-ups #1 (FK indexes) and #2 (drop redundant unique).

-- ============================================================
-- UP
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alerts_session ON public.alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_alerts_contact ON public.alerts(contact_id);
CREATE INDEX IF NOT EXISTS idx_session_contacts_contact ON public.session_contacts(contact_id);

-- profiles_id_unique duplicates the PRIMARY KEY on profiles(id).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_unique;

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP INDEX IF EXISTS idx_alerts_session;
-- DROP INDEX IF EXISTS idx_alerts_contact;
-- DROP INDEX IF EXISTS idx_session_contacts_contact;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_unique UNIQUE (id);
