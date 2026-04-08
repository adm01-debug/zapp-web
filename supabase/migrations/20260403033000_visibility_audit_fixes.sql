-- Fix visibility gaps found in audit of contact_type_visibility migration
-- ========================================================================

-- ─── 1. CRITICAL: search_contacts must respect visibility rules ──────
-- Was SECURITY DEFINER (bypasses RLS). Add explicit visibility filtering.
CREATE OR REPLACE FUNCTION public.search_contacts(
  search_term text DEFAULT '',
  contact_type_filter text DEFAULT NULL,
  company_filter text DEFAULT NULL,
  job_title_filter text DEFAULT NULL,
  tag_filter text DEFAULT NULL,
  date_from timestamptz DEFAULT NULL,
  sort_field text DEFAULT 'name',
  sort_direction text DEFAULT 'asc',
  page_size int DEFAULT 50,
  page_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  nickname text,
  surname text,
  job_title text,
  company text,
  phone text,
  email text,
  avatar_url text,
  tags text[],
  notes text,
  contact_type text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_search text;
  v_is_admin boolean;
  v_visible_ids uuid[];
BEGIN
  v_search := COALESCE(NULLIF(TRIM(search_term), ''), NULL);
  v_is_admin := public.is_admin_or_supervisor(auth.uid());

  -- Pre-compute visible agent IDs for non-admin users
  IF NOT v_is_admin THEN
    SELECT array_agg(aid) INTO v_visible_ids
    FROM public.get_visible_agent_ids(auth.uid()) AS aid;
  END IF;

  -- Get total count with visibility filtering
  SELECT COUNT(*) INTO v_total
  FROM public.contacts c
  WHERE
    -- Visibility: admin sees all, agents see assigned + shared
    (v_is_admin OR c.assigned_to = ANY(v_visible_ids) OR public.is_shared_contact_type(c.contact_type))
    AND (v_search IS NULL OR (
      c.name ILIKE '%' || v_search || '%' OR
      c.nickname ILIKE '%' || v_search || '%' OR
      c.surname ILIKE '%' || v_search || '%' OR
      c.phone ILIKE '%' || v_search || '%' OR
      c.email ILIKE '%' || v_search || '%' OR
      c.company ILIKE '%' || v_search || '%' OR
      c.job_title ILIKE '%' || v_search || '%'
    ))
    AND (contact_type_filter IS NULL OR c.contact_type = contact_type_filter)
    AND (company_filter IS NULL OR c.company = company_filter)
    AND (job_title_filter IS NULL OR c.job_title = job_title_filter)
    AND (tag_filter IS NULL OR tag_filter = ANY(c.tags))
    AND (date_from IS NULL OR c.created_at >= date_from);

  RETURN QUERY
  SELECT
    c.id, c.name, c.nickname, c.surname, c.job_title, c.company,
    c.phone, c.email, c.avatar_url, c.tags, c.notes, c.contact_type,
    c.created_at, c.updated_at,
    v_total AS total_count
  FROM public.contacts c
  WHERE
    (v_is_admin OR c.assigned_to = ANY(v_visible_ids) OR public.is_shared_contact_type(c.contact_type))
    AND (v_search IS NULL OR (
      c.name ILIKE '%' || v_search || '%' OR
      c.nickname ILIKE '%' || v_search || '%' OR
      c.surname ILIKE '%' || v_search || '%' OR
      c.phone ILIKE '%' || v_search || '%' OR
      c.email ILIKE '%' || v_search || '%' OR
      c.company ILIKE '%' || v_search || '%' OR
      c.job_title ILIKE '%' || v_search || '%'
    ))
    AND (contact_type_filter IS NULL OR c.contact_type = contact_type_filter)
    AND (company_filter IS NULL OR c.company = company_filter)
    AND (job_title_filter IS NULL OR c.job_title = job_title_filter)
    AND (tag_filter IS NULL OR tag_filter = ANY(c.tags))
    AND (date_from IS NULL OR c.created_at >= date_from)
  ORDER BY
    CASE WHEN sort_field = 'name' AND sort_direction = 'asc' THEN c.name END ASC,
    CASE WHEN sort_field = 'name' AND sort_direction = 'desc' THEN c.name END DESC,
    CASE WHEN sort_field = 'created_at' AND sort_direction = 'asc' THEN c.created_at END ASC,
    CASE WHEN sort_field = 'created_at' AND sort_direction = 'desc' THEN c.created_at END DESC,
    CASE WHEN sort_field = 'updated_at' AND sort_direction = 'desc' THEN c.updated_at END DESC,
    c.name ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Fix contacts_count_by_type to respect visibility
CREATE OR REPLACE FUNCTION public.contacts_count_by_type()
RETURNS TABLE (contact_type text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.contact_type, COUNT(*) AS count
  FROM public.contacts c
  WHERE
    public.is_admin_or_supervisor(auth.uid())
    OR c.assigned_to IN (SELECT public.get_visible_agent_ids(auth.uid()))
    OR public.is_shared_contact_type(c.contact_type)
  GROUP BY c.contact_type
  ORDER BY count DESC;
$$;

-- ─── 2. HIGH: Update related table policies for shared contacts ──────

-- contact_tags: add shared type visibility
DROP POLICY IF EXISTS "Users can view tags for their contacts" ON public.contact_tags;
CREATE POLICY "Users can view tags for their contacts"
  ON public.contact_tags FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.assigned_to IN (SELECT public.get_visible_agent_ids(auth.uid()))
         OR public.is_shared_contact_type(c.contact_type)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

DROP POLICY IF EXISTS "Users can manage tags for their contacts" ON public.contact_tags;
CREATE POLICY "Users can manage tags for their contacts"
  ON public.contact_tags FOR ALL TO authenticated
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

-- contact_custom_fields: add shared type visibility
DROP POLICY IF EXISTS "Users can view custom fields for their contacts" ON public.contact_custom_fields;
CREATE POLICY "Users can view custom fields for their contacts"
  ON public.contact_custom_fields FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.assigned_to IN (SELECT public.get_visible_agent_ids(auth.uid()))
         OR public.is_shared_contact_type(c.contact_type)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

DROP POLICY IF EXISTS "Users can manage custom fields for their contacts" ON public.contact_custom_fields;
CREATE POLICY "Users can manage custom fields for their contacts"
  ON public.contact_custom_fields FOR ALL TO authenticated
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

-- messages UPDATE: add shared type visibility (was missing)
DROP POLICY IF EXISTS "Users can update messages for their assigned contacts" ON public.messages;
CREATE POLICY "Users can update messages for their assigned contacts"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    contact_id IN (
      SELECT c.id FROM public.contacts c
      WHERE c.assigned_to IN (SELECT public.get_visible_agent_ids(auth.uid()))
         OR public.is_shared_contact_type(c.contact_type)
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
  );

-- ─── 3. HIGH: Prevent orphan contacts on type change ─────────────────
-- When contact_type changes to exclusive type, auto-assign if no owner
CREATE OR REPLACE FUNCTION public.auto_assign_on_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only fire when contact_type changes to an exclusive type
  IF OLD.contact_type IS DISTINCT FROM NEW.contact_type
     AND NOT public.is_shared_contact_type(NEW.contact_type)
     AND NEW.assigned_to IS NULL THEN

    -- Try auto-assignment via wallet rules
    SELECT agent_id INTO NEW.assigned_to
    FROM public.client_wallet_rules
    WHERE is_active = true
      AND (whatsapp_connection_id = NEW.whatsapp_connection_id OR whatsapp_connection_id IS NULL)
    ORDER BY priority ASC
    LIMIT 1;

    -- If still no assignment, the UPDATE will proceed but contact will
    -- only be visible to admins. This is a safety measure.
    IF NEW.assigned_to IS NULL THEN
      RAISE WARNING 'Contact % changed to exclusive type "%" but no assignment rule found. Contact visible only to admins.',
        NEW.id, NEW.contact_type;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_assign_on_type_change
  BEFORE UPDATE OF contact_type ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_on_type_change();

-- ─── 4. HIGH: Enforce contact_type NOT NULL + no empty string ────────
ALTER TABLE public.contacts ALTER COLUMN contact_type SET NOT NULL;
ALTER TABLE public.contacts ALTER COLUMN contact_type SET DEFAULT 'cliente';
DO $$ BEGIN
  ALTER TABLE public.contacts ADD CONSTRAINT contact_type_not_empty CHECK (contact_type <> '');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
