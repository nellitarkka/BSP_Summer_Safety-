-- Migration: 20260605000001_create_profiles
-- Owner: auth-developer
-- Depends on: 20260605000000_init_shared
-- Tables affected: profiles
-- Description: User profile (1:1 with auth.users). Isolation: id = auth.uid().

-- ============================================================
-- UP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL DEFAULT '',
  email               TEXT NOT NULL,
  phone               TEXT,
  disclaimer_accepted BOOLEAN NOT NULL DEFAULT false,
  privacy_preferences JSONB NOT NULL DEFAULT
    '{"location_sharing": false, "store_ai_text": false, "instant_alerts": false}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (id = auth.uid());

DROP TRIGGER IF EXISTS trg_profiles_update_timestamp ON public.profiles;
CREATE TRIGGER trg_profiles_update_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Auto-create profile on new auth user (function from migration 000)
DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- Needed so child tables can use composite FK (id, user_id) for ownership checks
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_unique UNIQUE (id);

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles');
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles'; -- expect 4

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
