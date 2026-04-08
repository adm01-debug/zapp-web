-- Contact type-based visibility: clients exclusive, suppliers shared
-- ====================================================================
-- REGRA DE NEGÓCIO:
--   - Clientes (cliente, lead) → EXCLUSIVOS do vendedor (assigned_to)
--   - Fornecedores e similares → COMPARTILHADOS entre todos os agentes
--   - Admin/supervisor → vê tudo
--
-- Tipos compartilhados: fornecedor, parceiro, transportadora,
--   prestador_servico, colaborador, sicoob_gifts, outros
-- Tipos exclusivos: cliente, lead

-- ─── 1. Helper function: is this a shared contact type? ─────────────
CREATE OR REPLACE FUNCTION public.is_shared_contact_type(ctype text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ctype IS NOT NULL AND ctype NOT IN ('cliente', 'lead');
$$;

-- ─── 2. Replace contacts SELECT policy ──────────────────────────────
-- Old: only assigned_to + visibility grants + admin
-- New: + shared types visible to all authenticated users
DROP POLICY IF EXISTS "Users can view their assigned contacts" ON public.contacts;
CREATE POLICY "Users can view their assigned contacts"
  ON public.contacts FOR SELECT TO authenticated
  USING (
    -- Exclusive clients: only visible to assigned agent (+ visibility grants)
    assigned_to IN (SELECT public.get_visible_agent_ids(auth.uid()))
    -- Shared types: visible to all authenticated users
    OR public.is_shared_contact_type(contact_type)
    -- Admin/supervisor: see everything
    OR public.is_admin_or_supervisor(auth.uid())
  );

-- ─── 3. Replace contacts UPDATE policy ──────────────────────────────
-- Shared contacts: any agent can update
-- Exclusive clients: only assigned agent
DROP POLICY IF EXISTS "Users can update their assigned contacts" ON public.contacts;
CREATE POLICY "Users can update their assigned contacts"
  ON public.contacts FOR UPDATE TO authenticated
  USING (
    assigned_to IN (SELECT public.get_visible_agent_ids(auth.uid()))
    OR public.is_shared_contact_type(contact_type)
    OR public.is_admin_or_supervisor(auth.uid())
  );

-- ─── 4. Replace messages SELECT policy ──────────────────────────────
-- Messages from shared contacts should also be visible to all
DROP POLICY IF EXISTS "Users can view messages from their assigned contacts" ON public.messages;
CREATE POLICY "Users can view messages from their assigned contacts"
  ON public.messages FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.assigned_to IN (SELECT public.get_visible_agent_ids(auth.uid()))
         OR public.is_shared_contact_type(c.contact_type)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- ─── 5. Update related tables to respect shared contacts ────────────

-- contact_notes: allow viewing/editing notes on shared contacts
DROP POLICY IF EXISTS "Users can view notes for their contacts" ON public.contact_notes;
CREATE POLICY "Users can view notes for their contacts"
  ON public.contact_notes FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.assigned_to IN (SELECT public.get_visible_agent_ids(auth.uid()))
         OR public.is_shared_contact_type(c.contact_type)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

DROP POLICY IF EXISTS "Users can manage notes for their contacts" ON public.contact_notes;
CREATE POLICY "Users can manage notes for their contacts"
  ON public.contact_notes FOR ALL TO authenticated
  USING (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.assigned_to IN (SELECT public.get_visible_agent_ids(auth.uid()))
         OR public.is_shared_contact_type(c.contact_type)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
  )
  WITH CHECK (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.assigned_to IN (SELECT public.get_visible_agent_ids(auth.uid()))
         OR public.is_shared_contact_type(c.contact_type)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

-- ─── 6. Auto-assignment trigger update ──────────────────────────────
-- Shared contact types should NOT be auto-assigned to a specific agent
-- (they remain available to all). Only 'cliente' and 'lead' get assigned.
CREATE OR REPLACE FUNCTION public.auto_assign_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only auto-assign exclusive types (cliente, lead)
  -- Shared types (fornecedor, parceiro, etc.) remain unassigned
  IF NEW.assigned_to IS NULL AND NOT public.is_shared_contact_type(NEW.contact_type) THEN
    SELECT agent_id INTO NEW.assigned_to
    FROM public.client_wallet_rules
    WHERE is_active = true
      AND (whatsapp_connection_id = NEW.whatsapp_connection_id OR whatsapp_connection_id IS NULL)
    ORDER BY priority ASC
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 7. Performance: partial index for shared contacts ──────────────
CREATE INDEX IF NOT EXISTS idx_contacts_shared_type
  ON public.contacts(contact_type)
  WHERE contact_type NOT IN ('cliente', 'lead');

-- ─── 8. Documentation comment ───────────────────────────────────────
COMMENT ON FUNCTION public.is_shared_contact_type IS
  'Returns true if the contact type should be shared across all agents. '
  'Exclusive types (cliente, lead) are only visible to their assigned agent. '
  'Shared types (fornecedor, parceiro, transportadora, prestador_servico, etc.) are visible to all.';
