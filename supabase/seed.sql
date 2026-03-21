-- ============================================================================
-- ZAPP-WEB: Script de Setup Inicial
-- ============================================================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- Ele configura o projeto para funcionar corretamente
-- ============================================================================

-- ============================================================================
-- 1. AUTO-CONFIRMAR EMAILS (resolve o "Email not confirmed")
-- ============================================================================

-- Confirmar todos os usuários existentes que não confirmaram email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Criar trigger para auto-confirmar novos usuários automaticamente
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Auto-confirma o email imediatamente após o cadastro
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir e cria novo
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
CREATE TRIGGER auto_confirm_email_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user_email();

-- ============================================================================
-- 2. GARANTIR QUE TRIGGERS DE PROFILE E ROLE EXISTEM
-- ============================================================================

-- Trigger para criar profile automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'admin'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para criar role automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ============================================================================
-- 3. CORRIGIR PROFILES EXISTENTES (para usuários que já fizeram signup)
-- ============================================================================

INSERT INTO public.profiles (user_id, name, email, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)),
  u.email,
  'admin'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- Criar roles para usuários existentes sem role
INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  'admin'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.id IS NULL;

-- ============================================================================
-- 4. DADOS INICIAIS (Settings, SLA, etc.)
-- ============================================================================

-- Global Settings padrão
INSERT INTO public.global_settings (key, value) VALUES
  ('company_name', '"Zapp"'),
  ('timezone', '"America/Sao_Paulo"'),
  ('language', '"pt-BR"'),
  ('auto_close_hours', '24'),
  ('max_chats_per_agent', '5'),
  ('sound_enabled', 'true'),
  ('notification_enabled', 'true'),
  ('business_hours_enabled', 'false'),
  ('welcome_message', '"Olá! Como posso ajudar?"')
ON CONFLICT (key) DO NOTHING;

-- SLA padrão
INSERT INTO public.sla_configurations (name, first_response_time, resolution_time, priority, is_active) VALUES
  ('Urgente', 300, 3600, 1, true),
  ('Alta', 900, 14400, 2, true),
  ('Normal', 1800, 28800, 3, true),
  ('Baixa', 3600, 86400, 4, true)
ON CONFLICT DO NOTHING;

-- Fila padrão
INSERT INTO public.queues (name, description, color, is_active) VALUES
  ('Atendimento Geral', 'Fila principal de atendimento', '#3B82F6', true),
  ('Vendas', 'Fila de vendas e orçamentos', '#10B981', true),
  ('Suporte Técnico', 'Fila de suporte técnico', '#F59E0B', true)
ON CONFLICT DO NOTHING;

-- Tags padrão
INSERT INTO public.tags (name, color) VALUES
  ('Urgente', '#EF4444'),
  ('VIP', '#F59E0B'),
  ('Novo Cliente', '#10B981'),
  ('Reclamação', '#EF4444'),
  ('Orçamento', '#3B82F6'),
  ('Suporte', '#8B5CF6')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. RLS POLICIES (garantir acesso autenticado)
-- ============================================================================

-- Profiles: usuários autenticados podem ver/editar
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies to recreate cleanly
  DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

  -- Authenticated users can view all profiles
  CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT TO authenticated USING (true);

  -- Users can update their own profile
  CREATE POLICY "profiles_update" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some profile policies already exist, skipping: %', SQLERRM;
END $$;

-- Contacts: acesso autenticado total
DO $$
BEGIN
  ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "contacts_all" ON public.contacts;
  CREATE POLICY "contacts_all" ON public.contacts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Contacts policy exists: %', SQLERRM;
END $$;

-- Messages: acesso autenticado total
DO $$
BEGIN
  ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "messages_all" ON public.messages;
  CREATE POLICY "messages_all" ON public.messages
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Messages policy exists: %', SQLERRM;
END $$;

-- Queues: acesso autenticado total
DO $$
BEGIN
  ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "queues_all" ON public.queues;
  CREATE POLICY "queues_all" ON public.queues
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Queues policy exists: %', SQLERRM;
END $$;

-- Tags: acesso autenticado total
DO $$
BEGIN
  ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "tags_all" ON public.tags;
  CREATE POLICY "tags_all" ON public.tags
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Tags policy exists: %', SQLERRM;
END $$;

-- Global Settings: acesso autenticado total
DO $$
BEGIN
  ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "global_settings_all" ON public.global_settings;
  CREATE POLICY "global_settings_all" ON public.global_settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Global settings policy exists: %', SQLERRM;
END $$;

-- User Roles: acesso autenticado
DO $$
BEGIN
  ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
  DROP POLICY IF EXISTS "user_roles_all" ON public.user_roles;
  CREATE POLICY "user_roles_select" ON public.user_roles
    FOR SELECT TO authenticated USING (true);
  CREATE POLICY "user_roles_all" ON public.user_roles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'User roles policy exists: %', SQLERRM;
END $$;

-- SLA: acesso autenticado
DO $$
BEGIN
  ALTER TABLE public.sla_configurations ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "sla_all" ON public.sla_configurations;
  CREATE POLICY "sla_all" ON public.sla_configurations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SLA policy exists: %', SQLERRM;
END $$;

-- Products: acesso autenticado
DO $$
BEGIN
  ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "products_all" ON public.products;
  CREATE POLICY "products_all" ON public.products
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Products policy exists: %', SQLERRM;
END $$;

-- Audit Logs: acesso autenticado (leitura)
DO $$
BEGIN
  ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
  DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
  CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT TO authenticated USING (true);
  CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Audit logs policy exists: %', SQLERRM;
END $$;

-- Notifications: acesso autenticado
DO $$
BEGIN
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "notifications_all" ON public.notifications;
  CREATE POLICY "notifications_all" ON public.notifications
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Notifications policy exists: %', SQLERRM;
END $$;

-- WhatsApp Connections: acesso autenticado
DO $$
BEGIN
  ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "whatsapp_connections_all" ON public.whatsapp_connections;
  CREATE POLICY "whatsapp_connections_all" ON public.whatsapp_connections
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'WhatsApp connections policy exists: %', SQLERRM;
END $$;

-- Campaigns: acesso autenticado
DO $$
BEGIN
  ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "campaigns_all" ON public.campaigns;
  CREATE POLICY "campaigns_all" ON public.campaigns
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Campaigns policy exists: %', SQLERRM;
END $$;

-- Queue Members: acesso autenticado
DO $$
BEGIN
  ALTER TABLE public.queue_members ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "queue_members_all" ON public.queue_members;
  CREATE POLICY "queue_members_all" ON public.queue_members
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Queue members policy exists: %', SQLERRM;
END $$;

-- Chatbot Flows: acesso autenticado
DO $$
BEGIN
  ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "chatbot_flows_all" ON public.chatbot_flows;
  CREATE POLICY "chatbot_flows_all" ON public.chatbot_flows
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Chatbot flows policy exists: %', SQLERRM;
END $$;

-- ============================================================================
-- PRONTO! Agora você pode:
-- 1. Criar uma conta no app (signup)
-- 2. Fazer login imediatamente (sem confirmação de email)
-- 3. Todos os botões funcionarão normalmente
-- ============================================================================
