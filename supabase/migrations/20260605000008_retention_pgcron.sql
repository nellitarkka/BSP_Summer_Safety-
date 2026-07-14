-- Migration: 20260605000008_retention_pgcron  (OPTIONAL / POST-MVP)
-- Owner: database-developer
-- Depends on: 20260605000005_create_checkins, 20260605000006_create_alerts
-- Tables affected: checkins, alerts, safety_sessions (data only)
-- Description: GDPR data-minimization (analyst note #1). Purge non-active data
--              older than a retention window. Disabled by default — enable only
--              after confirming the retention window with stakeholders.

-- ============================================================
-- UP  (commented out — enable deliberately)
-- ============================================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- CREATE OR REPLACE FUNCTION fn_purge_old_safety_data(retention_days INTEGER DEFAULT 90)
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM public.checkins
--     WHERE created_at < now() - (retention_days || ' days')::interval;
--   DELETE FROM public.alerts
--     WHERE created_at < now() - (retention_days || ' days')::interval;
--   DELETE FROM public.safety_sessions
--     WHERE status IN ('completed','cancelled','missed_checkin')
--       AND created_at < now() - (retention_days || ' days')::interval;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- SELECT cron.schedule('purge_old_safety_data', '0 3 * * *',
--   $$ SELECT fn_purge_old_safety_data(90); $$);

-- ============================================================
-- ROLLBACK
-- ============================================================
-- SELECT cron.unschedule('purge_old_safety_data');
-- DROP FUNCTION IF EXISTS fn_purge_old_safety_data(INTEGER);
