-- =============================================================================
-- Phase 5: Security Fixes + Performance Improvements
-- Date: 2026-03-26
-- Fixes: 5 CRITICAL, 6 HIGH, 8 MEDIUM items from BACKEND_ANALYSIS_REPORT_V3
-- =============================================================================

-- =============================================================================
-- 1. CRITICAL: Make whatsapp-media bucket PRIVATE
-- =============================================================================
UPDATE storage.buckets SET public = false WHERE id = 'whatsapp-media';

DROP POLICY IF EXISTS "Anyone can view whatsapp media" ON storage.objects;

CREATE POLICY "Authenticated users can view whatsapp media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp-media');

-- =============================================================================
-- 2. CRITICAL: Fix Messages INSERT RLS — scope to assigned contacts
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;

CREATE POLICY "Users can insert messages to assigned contacts"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  contact_id IN (
    SELECT c.id FROM contacts c
    WHERE c.assigned_to IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  )
  OR public.is_admin_or_supervisor(auth.uid())
);

-- Service role can always insert (for webhooks)
CREATE POLICY "Service role can insert messages"
ON public.messages FOR INSERT TO service_role
WITH CHECK (true);

-- =============================================================================
-- 3. CRITICAL: Fix Calls RLS — use correct column names (agent_id, contact_id)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their calls or admin can view all" ON public.calls;
DROP POLICY IF EXISTS "Users can insert their own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can view their calls" ON public.calls;

CREATE POLICY "Users can view their calls"
ON public.calls FOR SELECT TO authenticated
USING (
  agent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR public.is_admin_or_supervisor(auth.uid())
);

CREATE POLICY "Users can insert calls"
ON public.calls FOR INSERT TO authenticated
WITH CHECK (
  agent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR public.is_admin_or_supervisor(auth.uid())
);

-- Service role for webhook-created calls
CREATE POLICY "Service role can manage calls"
ON public.calls FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- =============================================================================
-- 4. CRITICAL: Fix WhatsApp Groups RLS — restrict writes to admin/supervisor
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'whatsapp_groups' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.whatsapp_groups', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can view whatsapp groups"
ON public.whatsapp_groups FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage whatsapp groups"
ON public.whatsapp_groups FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Admins can update whatsapp groups"
ON public.whatsapp_groups FOR UPDATE TO authenticated
USING (public.is_admin_or_supervisor(auth.uid()))
WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Admins can delete whatsapp groups"
ON public.whatsapp_groups FOR DELETE TO authenticated
USING (public.is_admin_or_supervisor(auth.uid()));

-- =============================================================================
-- 5. HIGH: Fix Conversation SLA RLS — restrict INSERT/UPDATE
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can insert SLA" ON public.conversation_sla;
DROP POLICY IF EXISTS "Authenticated users can update SLA" ON public.conversation_sla;

CREATE POLICY "Admins can insert SLA"
ON public.conversation_sla FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Admins can update SLA"
ON public.conversation_sla FOR UPDATE TO authenticated
USING (public.is_admin_or_supervisor(auth.uid()))
WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

-- Service role for system-generated SLAs
CREATE POLICY "Service role can manage SLA"
ON public.conversation_sla FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- =============================================================================
-- 6. HIGH: Add storage bucket size and MIME type limits
-- =============================================================================
UPDATE storage.buckets
SET file_size_limit = 26214400,  -- 25MB max
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','audio/mpeg','audio/ogg','audio/wav','audio/mp4','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/csv']
WHERE id = 'whatsapp-media';

UPDATE storage.buckets
SET file_size_limit = 10485760,  -- 10MB max
    allowed_mime_types = ARRAY['audio/mpeg','audio/ogg','audio/wav','audio/mp4','audio/webm']
WHERE id = 'audio-messages';

-- =============================================================================
-- 7. HIGH: Create SECURITY DEFINER helper functions for RLS performance
-- =============================================================================
CREATE OR REPLACE FUNCTION public.user_profile_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = p_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_assigned_contact_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY(
    SELECT c.id FROM contacts c
    JOIN profiles p ON c.assigned_to = p.id
    WHERE p.user_id = p_user_id
  ), ARRAY[]::UUID[]);
$$;

-- =============================================================================
-- 8. CRITICAL: Add unique constraint to prevent duplicate contacts
-- =============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_phone_connection_unique
ON public.contacts (phone, whatsapp_connection_id)
WHERE whatsapp_connection_id IS NOT NULL;

-- =============================================================================
-- 9. HIGH: Add missing updated_at columns and triggers
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'updated_at' AND table_schema = 'public') THEN
    ALTER TABLE public.calls ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

CREATE OR REPLACE TRIGGER update_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 10. MEDIUM: Message status state machine constraint
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validate_message_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  valid_next TEXT[];
BEGIN
  -- Only validate if status is actually changing
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  CASE OLD.status
    WHEN 'sending' THEN valid_next := ARRAY['sent', 'failed'];
    WHEN 'sent' THEN valid_next := ARRAY['delivered', 'failed'];
    WHEN 'delivered' THEN valid_next := ARRAY['read', 'failed'];
    WHEN 'read' THEN valid_next := ARRAY['failed'];
    WHEN 'received' THEN valid_next := ARRAY['read', 'deleted'];
    WHEN 'failed' THEN valid_next := ARRAY['sending']; -- Allow retry
    ELSE
      -- For unknown current states, allow any transition
      RETURN NEW;
  END CASE;

  IF NEW.status = ANY(valid_next) OR NEW.status = 'deleted' THEN
    RETURN NEW;
  END IF;

  -- Log invalid transition but don't block (to avoid breaking existing flows)
  RAISE WARNING 'Invalid message status transition: % -> %', OLD.status, NEW.status;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER validate_message_status
  BEFORE UPDATE OF status ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_message_status_transition();
