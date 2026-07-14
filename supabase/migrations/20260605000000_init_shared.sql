-- Migration: 20260605000000_init_shared
-- Owner: database-developer
-- Depends on: (none)
-- Tables affected: (shared functions only; auth.users trigger)
-- Description: Shared timestamp function + auto-create profiles row on signup.

-- ============================================================
-- UP
-- ============================================================

-- Shared updated_at maintainer (used by every mutable table's trigger)
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a profiles row automatically when a new auth user signs up.
-- full_name + disclaimer come from sign-up metadata; defaults are privacy-safe.
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, disclaimer_accepted, privacy_preferences)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE((NEW.raw_user_meta_data ->> 'disclaimer_accepted')::boolean, false),
    '{"location_sharing": false, "store_ai_text": false, "instant_alerts": false}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger is created in the profiles migration (after the table exists).

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_update_timestamp');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_handle_new_user');

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP FUNCTION IF EXISTS fn_handle_new_user();
-- DROP FUNCTION IF EXISTS fn_update_timestamp();
