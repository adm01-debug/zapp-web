-- Multi-connection support: allow same phone across different WhatsApp connections
-- ================================================================================
-- Previously, contacts.phone had a global UNIQUE constraint, which prevented
-- the same contact from being associated with multiple WhatsApp connections.
-- This migration changes it to a composite unique on (phone, whatsapp_connection_id),
-- enabling 12+ simultaneous WhatsApp numbers without contact collisions.

-- 1. Drop the explicit named constraint (added in migration 20260320205425)
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_phone_unique;

-- 2. Drop the original inline UNIQUE constraint from CREATE TABLE
--    PostgreSQL auto-names inline UNIQUE constraints as {table}_{column}_key
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_phone_key;

-- 3. Add composite unique: same phone can exist across different connections,
--    but not duplicated within the same connection
ALTER TABLE public.contacts ADD CONSTRAINT contacts_phone_connection_unique
  UNIQUE (phone, whatsapp_connection_id);

-- 4. Add index on whatsapp_connection_id for efficient multi-connection queries
CREATE INDEX IF NOT EXISTS idx_contacts_connection
  ON public.contacts(whatsapp_connection_id);

-- 5. Allow phone to be nullable for email-only contacts (Gmail integration)
ALTER TABLE public.contacts ALTER COLUMN phone DROP NOT NULL;

-- 6. Partial unique index: phone-only contacts (no connection) still unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_phone_no_connection
  ON public.contacts(phone) WHERE whatsapp_connection_id IS NULL AND phone IS NOT NULL;
