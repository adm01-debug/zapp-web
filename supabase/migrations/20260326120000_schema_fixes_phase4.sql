-- Migration: Schema fixes phase 4
-- Date: 2026-03-26
-- Description: Fix RLS policies (campaigns, chatbot_flows, sales_deals),
--   add missing FK constraints, composite indexes, and CSAT uniqueness.
-- This migration is idempotent (uses DROP IF EXISTS / IF NOT EXISTS throughout).

-- =============================================================================
-- 1. Fix RLS on campaigns
-- =============================================================================
-- Problem: "Authenticated can insert campaigns" allows any user to create
-- campaigns. Remove the overly permissive INSERT policy and replace with
-- admin/supervisor-only write access.  The existing SELECT policy is fine.

DROP POLICY IF EXISTS "Authenticated can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.campaigns;

-- Re-create the admin/supervisor ALL policy with explicit WITH CHECK
CREATE POLICY "Admins and supervisors can manage campaigns"
ON public.campaigns FOR ALL
TO authenticated
USING (public.is_admin_or_supervisor(auth.uid()))
WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

-- =============================================================================
-- 2. Fix RLS on chatbot_flows
-- =============================================================================
-- Same problem: permissive INSERT policy lets any authenticated user create flows.

DROP POLICY IF EXISTS "Authenticated can insert chatbot flows" ON public.chatbot_flows;
DROP POLICY IF EXISTS "Admins can manage chatbot flows" ON public.chatbot_flows;

CREATE POLICY "Admins and supervisors can manage chatbot flows"
ON public.chatbot_flows FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Admins and supervisors can update chatbot flows"
ON public.chatbot_flows FOR UPDATE
TO authenticated
USING (public.is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Admins and supervisors can delete chatbot flows"
ON public.chatbot_flows FOR DELETE
TO authenticated
USING (public.is_admin_or_supervisor(auth.uid()));

-- =============================================================================
-- 3. Fix RLS on sales_deals
-- =============================================================================
-- Problem: "Authenticated users can manage deals" FOR ALL allows any user to
-- insert/update/delete deals. Replace with read-all + admin/supervisor write.

DROP POLICY IF EXISTS "Authenticated users can manage deals" ON public.sales_deals;

CREATE POLICY "Authenticated users can view deals"
ON public.sales_deals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and supervisors can manage deals"
ON public.sales_deals FOR ALL
TO authenticated
USING (public.is_admin_or_supervisor(auth.uid()))
WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

-- =============================================================================
-- 4. Add missing FK constraints
-- =============================================================================

-- 4a. campaigns.created_by -> profiles(id)
-- Note: The original CREATE TABLE already includes this FK inline:
--   created_by UUID REFERENCES public.profiles(id)
-- No action needed; the constraint already exists.

-- 4b. message_templates.user_id -> auth.users(id) ON DELETE CASCADE
-- The message_templates table has user_id UUID NOT NULL but no FK constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_templates_user_id_fkey'
  ) THEN
    ALTER TABLE public.message_templates
    ADD CONSTRAINT message_templates_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- 5. Add missing composite indexes for reporting
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_sender_contact
  ON public.messages(sender, contact_id);

CREATE INDEX IF NOT EXISTS idx_conversation_sla_breached
  ON public.conversation_sla(first_response_breached, resolution_breached);

CREATE INDEX IF NOT EXISTS idx_campaigns_status_created
  ON public.campaigns(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_cache_created
  ON public.ai_response_cache(created_at);

CREATE INDEX IF NOT EXISTS idx_dlq_created
  ON public.dead_letter_queue(created_at);

-- =============================================================================
-- 6. Calls table schema mismatch notice
-- =============================================================================
-- IMPORTANT: The RLS policies in 20260325130000_security_fixes_rls_and_indexes.sql
-- reference columns caller_id and receiver_id on public.calls. However, the
-- actual calls table (created in 20251215025014) has contact_id and agent_id
-- instead. The RLS SELECT policy uses:
--   caller_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
--   OR receiver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
-- These columns do NOT exist. The correct columns are contact_id (FK to contacts)
-- and agent_id (FK to profiles). This means the RLS policies on calls are
-- effectively broken -- they will always evaluate to false for non-admin users
-- because PostgreSQL returns NULL for non-existent column references in policies
-- that were created before the column check (or will fail outright).
--
-- A follow-up migration should either:
--   a) Add caller_id / receiver_id columns to calls, OR
--   b) Rewrite the calls RLS policies to use contact_id / agent_id.

-- =============================================================================
-- 7. CSAT auto-config uniqueness
-- =============================================================================
-- Ensure only one active CSAT config per WhatsApp connection.
-- Note: The column in csat_auto_config is "is_enabled" (not "is_active").

CREATE UNIQUE INDEX IF NOT EXISTS idx_csat_auto_config_connection
ON public.csat_auto_config(whatsapp_connection_id)
WHERE is_enabled = true;
