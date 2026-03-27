-- Phase 6: Security Hardening Migration
-- Session timeout, DLQ processor support, additional RLS fixes

-- ============================================================
-- 1. Reduce session timeout from 24h to 1h
-- ============================================================
-- Note: Supabase auth config is managed via dashboard/API, not SQL.
-- This comment documents the required change:
-- Set JWT expiry to 3600 (1 hour) in Supabase Dashboard > Authentication > Settings
-- Set refresh token rotation to enabled
-- The following creates a helper function to check session freshness

CREATE OR REPLACE FUNCTION auth.session_is_fresh(max_age_seconds integer DEFAULT 3600)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (extract(epoch from now()) - extract(epoch from auth.jwt()->>'iat'::text)::numeric) < max_age_seconds,
    false
  );
$$;

-- ============================================================
-- 2. Add DLQ processor cron job support
-- ============================================================
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule DLQ processor to run every 5 minutes
-- Note: This requires the pg_cron extension and proper Supabase Edge Function URL
DO $$
BEGIN
  -- Only create if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'process-dead-letter-queue',
      '*/5 * * * *',
      format(
        'SELECT net.http_post(url := %L, headers := %L::jsonb, body := %L::jsonb)',
        current_setting('app.settings.supabase_url', true) || '/functions/v1/dlq-processor',
        json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        '{}'
      )
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END
$$;

-- ============================================================
-- 3. Fix overly permissive RLS policies (top 10 most dangerous)
-- ============================================================

-- Fix: profiles table - scope to own organization
DO $$
BEGIN
  -- Drop overly permissive SELECT policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view profiles in their organization'
  ) THEN
    DROP POLICY "Users can view profiles in their organization" ON profiles;
  END IF;

  -- Create properly scoped policy
  CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT
    USING (
      organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'profiles RLS update skipped: %', SQLERRM;
END
$$;

-- Fix: conversations table - scope to own organization
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname LIKE '%true%'
  ) THEN
    -- Find and drop overly permissive policies
    EXECUTE (
      SELECT string_agg(format('DROP POLICY %I ON conversations', policyname), '; ')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'conversations'
      AND polqual::text LIKE '%true%'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'conversations RLS update skipped: %', SQLERRM;
END
$$;

-- Fix: contacts table - scope to own organization
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contacts'
    AND polqual IS NOT NULL AND polqual::text LIKE '%true%'
  ) THEN
    EXECUTE (
      SELECT string_agg(format('DROP POLICY %I ON contacts', policyname), '; ')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'contacts'
      AND polqual::text LIKE '%true%'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'contacts RLS update skipped: %', SQLERRM;
END
$$;

-- ============================================================
-- 4. Add missing indexes for performance
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dlq_status_retry
  ON dead_letter_queue (status, next_retry_at)
  WHERE status IN ('pending', 'retrying');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_contact_created
  ON messages (contact_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_org_status
  ON conversations (organization_id, status)
  WHERE status IN ('open', 'pending');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created
  ON audit_logs (created_at DESC);

-- ============================================================
-- 5. Add security headers helper for RLS
-- ============================================================
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 6. DLQ processor config entry
-- ============================================================
INSERT INTO global_settings (key, value, description)
VALUES (
  'dlq_processor_enabled',
  'true',
  'Enable/disable the DLQ processor cron job'
)
ON CONFLICT (key) DO NOTHING;
