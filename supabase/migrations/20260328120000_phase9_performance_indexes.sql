-- Phase 9: Performance indexes for common query patterns
-- These indexes target the most frequent dashboard, inbox, and admin queries

-- Contacts: dashboard queries filter by queue_id and sort by updated_at
CREATE INDEX IF NOT EXISTS idx_contacts_queue_updated
  ON contacts(queue_id, updated_at DESC);

-- Contacts: queue assignment queries filter unassigned contacts per queue
CREATE INDEX IF NOT EXISTS idx_contacts_queue_unassigned
  ON contacts(queue_id) WHERE assigned_to IS NULL;

-- Messages: inbox queries join on contact_id and sort by created_at
CREATE INDEX IF NOT EXISTS idx_messages_contact_sender_created
  ON messages(contact_id, sender, created_at DESC);

-- Rate limit logs: admin dashboard filters blocked entries by date
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_blocked_created
  ON rate_limit_logs(blocked, created_at DESC);

-- Campaign contacts: delivery tracking queries
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_delivery
  ON campaign_contacts(campaign_id, delivered_at DESC, read_at DESC);

-- Idempotency keys: lookups by key with status filter (used by dedup logic)
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_status
  ON idempotency_keys(key, status);

-- Audit logs: admin queries filter by action type and date
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
  ON audit_logs(action, created_at DESC);

-- Notifications: user notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read, created_at DESC);
