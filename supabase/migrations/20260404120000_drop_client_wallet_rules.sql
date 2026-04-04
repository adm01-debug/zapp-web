-- Drop client_wallet_rules table and related objects
-- This feature was never implemented in the frontend and is being removed to avoid confusion.

-- 1. Drop triggers that depend on auto_assign_contact function
DROP TRIGGER IF EXISTS auto_assign_contact_trigger ON public.contacts;
DROP TRIGGER IF EXISTS on_contact_created_auto_assign ON public.contacts;

-- 2. Drop the function
DROP FUNCTION IF EXISTS public.auto_assign_contact();

-- 3. Drop policies
DROP POLICY IF EXISTS "Authenticated users can view wallet rules" ON public.client_wallet_rules;
DROP POLICY IF EXISTS "Admins can manage wallet rules" ON public.client_wallet_rules;

-- 4. Drop the table
DROP TABLE IF EXISTS public.client_wallet_rules;
