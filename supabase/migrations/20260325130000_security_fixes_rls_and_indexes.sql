-- Migration: Security fixes for RLS policies and missing indexes
-- Date: 2026-03-25
-- Description: Fixes critical RLS policy gaps and adds performance indexes
-- This migration is idempotent (uses DROP IF EXISTS / IF NOT EXISTS throughout)

-- =============================================================================
-- 1. CRITICAL: Fix WhatsApp Connections RLS (restrict to admins/supervisors)
-- =============================================================================
-- Previously any authenticated user could insert/update/delete connections.
-- Now only admins and supervisors can perform write operations.

DROP POLICY IF EXISTS "Authenticated users can insert connections" ON public.whatsapp_connections;
DROP POLICY IF EXISTS "Authenticated users can update connections" ON public.whatsapp_connections;
DROP POLICY IF EXISTS "Authenticated users can delete connections" ON public.whatsapp_connections;

CREATE POLICY "Admins and supervisors can insert connections"
ON public.whatsapp_connections FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Admins and supervisors can update connections"
ON public.whatsapp_connections FOR UPDATE
TO authenticated
USING (public.is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Admins and supervisors can delete connections"
ON public.whatsapp_connections FOR DELETE
TO authenticated
USING (public.is_admin_or_supervisor(auth.uid()));

-- =============================================================================
-- 2. CRITICAL: Fix Contacts INSERT Policy
-- =============================================================================
-- Validate that contacts can only be assigned to the inserting user's profile,
-- left unassigned, or assigned by an admin/supervisor.

DROP POLICY IF EXISTS "Users can insert contacts" ON public.contacts;

CREATE POLICY "Users can insert contacts"
ON public.contacts FOR INSERT
TO authenticated
WITH CHECK (
  assigned_to IS NULL
  OR assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_admin_or_supervisor(auth.uid())
);

-- =============================================================================
-- 3. CRITICAL: Fix Calls Table RLS
-- =============================================================================
-- Restrict call visibility to participants or admins/supervisors.
-- Restrict call creation to the caller or admins/supervisors.

DROP POLICY IF EXISTS "Users can view calls" ON public.calls;
DROP POLICY IF EXISTS "Users can insert calls" ON public.calls;

CREATE POLICY "Users can view their calls or admin can view all"
ON public.calls FOR SELECT
TO authenticated
USING (
  caller_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR receiver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_admin_or_supervisor(auth.uid())
);

CREATE POLICY "Users can insert their own calls"
ON public.calls FOR INSERT
TO authenticated
WITH CHECK (
  caller_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_admin_or_supervisor(auth.uid())
);

-- =============================================================================
-- 4. MEDIUM: Fix Notifications INSERT Policy
-- =============================================================================
-- Restrict notification creation to the user's own profile or admins.

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications or admin can insert any"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_admin_or_supervisor(auth.uid())
);

-- =============================================================================
-- 5. HIGH: Add Missing Indexes
-- =============================================================================
-- Performance indexes for frequently queried columns and foreign key lookups.

CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON public.contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_connection_id ON public.contacts(whatsapp_connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON public.messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_created ON public.messages(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sla_contact ON public.conversation_sla(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sla_config ON public.conversation_sla(sla_configuration_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_composite ON public.campaign_contacts(campaign_id, contact_id);

-- =============================================================================
-- 6. LOW-MEDIUM: Add UNIQUE constraint for default SLA
-- =============================================================================
-- Ensure only one SLA configuration can be marked as the default at a time.

CREATE UNIQUE INDEX IF NOT EXISTS idx_sla_default_unique
ON public.sla_configurations(is_default)
WHERE is_default = true;
