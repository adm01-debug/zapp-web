-- Dead Letter Queue table for failed message operations
-- Part of Sprint 3: Resiliência

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dlq_status_attempts ON dead_letter_queue(status, attempts);
CREATE INDEX IF NOT EXISTS idx_dlq_operation ON dead_letter_queue(operation);
CREATE INDEX IF NOT EXISTS idx_dlq_first_attempt ON dead_letter_queue(first_attempt_at);

-- RLS policies
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access dead letter queue
CREATE POLICY "Service role only" ON dead_letter_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Update trigger
CREATE TRIGGER set_dlq_updated_at
  BEFORE UPDATE ON dead_letter_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE dead_letter_queue IS 'Stores failed operations for retry processing';
COMMENT ON COLUMN dead_letter_queue.operation IS 'Type of operation that failed (e.g., send_message, sync_contact)';
COMMENT ON COLUMN dead_letter_queue.payload IS 'Original operation payload for retry';
COMMENT ON COLUMN dead_letter_queue.attempts IS 'Number of retry attempts made';
COMMENT ON COLUMN dead_letter_queue.status IS 'Current status: pending, processing, completed, failed';
