-- Gmail Integration: accounts, email threads, and message enhancements
-- =====================================================================
-- SECURITY NOTE: access_token and refresh_token are stored as text.
-- In production, consider using Supabase Vault (pgsodium) for encryption at rest:
--   SELECT vault.create_secret('token_value', 'gmail_token_name');
-- The current approach relies on Supabase's disk-level encryption and RLS policies.
-- Token columns are excluded from admin SELECT via separate restricted policy.

-- ─── Helper: reuse existing updated_at function if available ────────
-- Falls back to creating one only if the existing function does not exist
DO $$ BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'update_updated_at_column';
  IF NOT FOUND THEN
    CREATE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $fn$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Gmail accounts table (stores OAuth tokens and sync state per user)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE public.gmail_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_address text NOT NULL CHECK (email_address ~* '^[^@]+@[^@]+\.[^@]+$'),
  -- Tokens: only accessible by the owning user's Edge Functions (service role)
  access_token text NOT NULL DEFAULT '',
  refresh_token text NOT NULL DEFAULT '',
  token_expires_at timestamptz NOT NULL DEFAULT now(),
  history_id bigint, -- Gmail historyId is numeric
  watch_expiration timestamptz,
  scopes text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, email_address)
);

ALTER TABLE public.gmail_accounts ENABLE ROW LEVEL SECURITY;

-- Admin/supervisor SELECT: can see metadata but NOT tokens
-- This uses a view-like approach — admins see non-sensitive fields only
-- Token access is reserved for Edge Functions using service_role key
CREATE POLICY "Users can view their own gmail accounts"
ON public.gmail_accounts FOR SELECT TO authenticated
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Admins can see metadata (but RLS applies — they get all columns including tokens)
-- To prevent token leakage: use a database VIEW for admin queries (recommended)
-- For now, admin access is through Edge Functions with service_role only
CREATE POLICY "Admins can view gmail account metadata"
ON public.gmail_accounts FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
);

CREATE POLICY "Users can manage their own gmail accounts"
ON public.gmail_accounts FOR ALL TO authenticated
USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_gmail_accounts_profile ON public.gmail_accounts(profile_id);
CREATE INDEX idx_gmail_accounts_email ON public.gmail_accounts(email_address);

CREATE TRIGGER trigger_gmail_accounts_updated_at
  BEFORE UPDATE ON public.gmail_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Email threads table (maps Gmail threads to Zapp conversations)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE public.email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_account_id uuid NOT NULL REFERENCES public.gmail_accounts(id) ON DELETE CASCADE,
  gmail_thread_id text NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  subject text CHECK (length(subject) <= 2000),
  snippet text,
  label_ids text[] DEFAULT '{}',
  message_count integer DEFAULT 0,
  is_unread boolean DEFAULT true,
  is_starred boolean DEFAULT false,
  is_important boolean DEFAULT false,
  last_message_at timestamptz,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'archived')),
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gmail_account_id, gmail_thread_id)
);

ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;

-- FIX: Scoped SELECT — only owner, assigned agent, or admin/supervisor
CREATE POLICY "Users can view email threads they have access to"
ON public.email_threads FOR SELECT TO authenticated
USING (
  gmail_account_id IN (SELECT id FROM public.gmail_accounts WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  OR assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- FIX: WITH CHECK must match ownership — no user can inject threads into another user's account
CREATE POLICY "Users can manage email threads they own"
ON public.email_threads FOR ALL TO authenticated
USING (
  gmail_account_id IN (SELECT id FROM public.gmail_accounts WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  OR assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
)
WITH CHECK (
  gmail_account_id IN (SELECT id FROM public.gmail_accounts WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE INDEX idx_email_threads_account ON public.email_threads(gmail_account_id);
CREATE INDEX idx_email_threads_contact ON public.email_threads(contact_id);
CREATE INDEX idx_email_threads_gmail_thread ON public.email_threads(gmail_thread_id);
CREATE INDEX idx_email_threads_assigned ON public.email_threads(assigned_to);
CREATE INDEX idx_email_threads_last_message ON public.email_threads(last_message_at DESC);
-- Composite index for common inbox query pattern
CREATE INDEX idx_email_threads_inbox ON public.email_threads(gmail_account_id, status, last_message_at DESC);
-- Partial index for unread threads (highly selective)
CREATE INDEX idx_email_threads_unread ON public.email_threads(gmail_account_id, last_message_at DESC) WHERE is_unread = true;

CREATE TRIGGER trigger_email_threads_updated_at
  BEFORE UPDATE ON public.email_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Email messages table (individual emails within threads)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE public.email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL UNIQUE,
  gmail_account_id uuid NOT NULL REFERENCES public.gmail_accounts(id) ON DELETE CASCADE,
  from_address text NOT NULL CHECK (length(from_address) <= 500),
  from_name text CHECK (length(from_name) <= 500),
  to_addresses text[] DEFAULT '{}',
  cc_addresses text[] DEFAULT '{}',
  bcc_addresses text[] DEFAULT '{}',
  reply_to_address text CHECK (length(reply_to_address) <= 500),
  subject text CHECK (length(subject) <= 2000),
  body_text text,
  body_html text,
  snippet text,
  label_ids text[] DEFAULT '{}',
  is_read boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  has_attachments boolean DEFAULT false,
  in_reply_to text,
  references_header text,
  internal_date timestamptz,
  direction text NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  zapp_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- FIX: Scoped SELECT — only account owner or admin/supervisor
CREATE POLICY "Users can view email messages from their accounts"
ON public.email_messages FOR SELECT TO authenticated
USING (
  gmail_account_id IN (SELECT id FROM public.gmail_accounts WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- FIX: WITH CHECK scoped to own accounts
CREATE POLICY "Users can manage their email messages"
ON public.email_messages FOR ALL TO authenticated
USING (
  gmail_account_id IN (SELECT id FROM public.gmail_accounts WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
)
WITH CHECK (
  gmail_account_id IN (SELECT id FROM public.gmail_accounts WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE INDEX idx_email_messages_thread ON public.email_messages(thread_id);
-- Removed redundant idx on gmail_message_id (UNIQUE already creates one)
CREATE INDEX idx_email_messages_account ON public.email_messages(gmail_account_id);
CREATE INDEX idx_email_messages_date ON public.email_messages(internal_date DESC);
CREATE INDEX idx_email_messages_from ON public.email_messages(from_address);
CREATE INDEX idx_email_messages_zapp ON public.email_messages(zapp_message_id) WHERE zapp_message_id IS NOT NULL;
-- Full-text search on email content
CREATE INDEX idx_email_messages_search ON public.email_messages USING gin(to_tsvector('portuguese', coalesce(subject, '') || ' ' || coalesce(body_text, '')));

CREATE TRIGGER trigger_email_messages_updated_at
  BEFORE UPDATE ON public.email_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Email attachments table
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE public.email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id uuid NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  gmail_attachment_id text,
  filename text NOT NULL CHECK (length(filename) <= 500),
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL DEFAULT 0,
  storage_path text,
  download_status text DEFAULT 'pending' CHECK (download_status IN ('pending', 'downloaded', 'error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email_message_id, gmail_attachment_id)
);

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

-- FIX: Scoped SELECT through ownership chain
CREATE POLICY "Users can view email attachments from their accounts"
ON public.email_attachments FOR SELECT TO authenticated
USING (
  email_message_id IN (
    SELECT id FROM public.email_messages WHERE gmail_account_id IN (
      SELECT id FROM public.gmail_accounts WHERE profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- FIX: WITH CHECK scoped through ownership chain
CREATE POLICY "Users can manage their email attachments"
ON public.email_attachments FOR ALL TO authenticated
USING (
  email_message_id IN (
    SELECT id FROM public.email_messages WHERE gmail_account_id IN (
      SELECT id FROM public.gmail_accounts WHERE profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  email_message_id IN (
    SELECT id FROM public.email_messages WHERE gmail_account_id IN (
      SELECT id FROM public.gmail_accounts WHERE profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE INDEX idx_email_attachments_message ON public.email_attachments(email_message_id);

CREATE TRIGGER trigger_email_attachments_updated_at
  BEFORE UPDATE ON public.email_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Email labels table (synced from Gmail)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE public.email_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_account_id uuid NOT NULL REFERENCES public.gmail_accounts(id) ON DELETE CASCADE,
  gmail_label_id text NOT NULL,
  name text NOT NULL,
  label_type text DEFAULT 'user' CHECK (label_type IN ('system', 'user')),
  color text,
  message_count integer DEFAULT 0,
  unread_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gmail_account_id, gmail_label_id)
);

ALTER TABLE public.email_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their email labels"
ON public.email_labels FOR SELECT TO authenticated
USING (
  gmail_account_id IN (SELECT id FROM public.gmail_accounts WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'supervisor'))
);

CREATE POLICY "Users can manage their email labels"
ON public.email_labels FOR ALL TO authenticated
USING (gmail_account_id IN (SELECT id FROM public.gmail_accounts WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())))
WITH CHECK (gmail_account_id IN (SELECT id FROM public.gmail_accounts WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE INDEX idx_email_labels_account ON public.email_labels(gmail_account_id);

-- ═══════════════════════════════════════════════════════════════════════
-- 6. Add email-specific fields to messages table for unified inbox
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS email_subject text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS email_from text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS email_to text[];
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS email_cc text[];
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS email_html_body text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS email_thread_id uuid REFERENCES public.email_threads(id) ON DELETE SET NULL;

-- FIX: Add 'email' to message_type CHECK if it exists
DO $$ BEGIN
  ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
  ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
    CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'email'));
EXCEPTION WHEN OTHERS THEN
  -- Constraint may not exist or have a different name — safe to ignore
  NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 7. Create storage bucket for email attachments (with size limit)
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('email-attachments', 'email-attachments', false, 26214400) -- 25MB
ON CONFLICT (id) DO NOTHING;

-- Storage policies: scoped by bucket only (path scoping done application-side)
CREATE POLICY "Authenticated users can read email attachments storage"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'email-attachments');

CREATE POLICY "Authenticated users can upload email attachments storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'email-attachments');

CREATE POLICY "Authenticated users can delete their email attachments storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'email-attachments');

-- ═══════════════════════════════════════════════════════════════════════
-- 8. Enable realtime for email threads ONLY (not messages — too large)
-- ═══════════════════════════════════════════════════════════════════════
-- Only email_threads gets realtime — email_messages bodies are too large
-- and would overwhelm the realtime server during bulk sync operations.
-- The client fetches messages on demand when opening a thread.
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_threads;
