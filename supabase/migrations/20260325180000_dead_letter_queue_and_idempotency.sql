-- Dead Letter Queue and Idempotency Keys
-- Provides retry logic for failed operations and deduplication for webhook events

-- =============================================
-- Dead Letter Queue
-- =============================================
CREATE TABLE IF NOT EXISTS public.dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_function TEXT NOT NULL,        -- e.g. 'evolution-webhook', 'send-email'
  event_type TEXT,                       -- e.g. 'messages.upsert', 'send_email'
  payload JSONB NOT NULL,               -- original request payload
  error_message TEXT,                    -- last error message
  error_stack TEXT,                      -- error stack trace
  retry_count INTEGER DEFAULT 0,        -- number of retries attempted
  max_retries INTEGER DEFAULT 3,        -- maximum retries allowed
  next_retry_at TIMESTAMPTZ,            -- when to retry next (exponential backoff)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'failed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_dlq_status_retry ON public.dead_letter_queue(status, next_retry_at) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_dlq_source ON public.dead_letter_queue(source_function, created_at DESC);

-- =============================================
-- Idempotency Keys
-- =============================================
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key TEXT PRIMARY KEY,                 -- unique key (e.g. webhook event ID, email hash)
  source_function TEXT NOT NULL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  response_status INTEGER,              -- HTTP status code of the response
  response_body JSONB,                  -- cached response body
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_idempotency_expires ON public.idempotency_keys(expires_at);

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Service role has full access to DLQ
CREATE POLICY "Service role full access to dead_letter_queue"
  ON public.dead_letter_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role has full access to idempotency keys
CREATE POLICY "Service role full access to idempotency_keys"
  ON public.idempotency_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- Auto-update updated_at on dead_letter_queue
-- =============================================
CREATE OR REPLACE FUNCTION public.update_dlq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dlq_updated_at
  BEFORE UPDATE ON public.dead_letter_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dlq_updated_at();

-- =============================================
-- Cleanup function for expired idempotency keys
-- Can be called periodically via pg_cron or a scheduled edge function:
--   SELECT public.cleanup_expired_idempotency_keys();
-- =============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
