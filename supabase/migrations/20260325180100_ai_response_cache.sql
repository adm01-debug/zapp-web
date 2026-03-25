-- AI Response Cache
-- Caches AI API responses to reduce costs and latency on repeated calls.
-- Entries expire after a configurable TTL (default 6 hours).
-- Periodic cleanup should be scheduled via cron or the cleanup-ai-cache edge function.

CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,       -- SHA-256 hash of the request
  function_name TEXT NOT NULL,           -- e.g. 'ai-conversation-summary'
  model TEXT,                            -- e.g. 'google/gemini-2.5-flash'
  request_hash TEXT NOT NULL,            -- hash of the message content
  response_body JSONB NOT NULL,          -- cached AI response
  token_count INTEGER,                   -- estimated tokens used
  cost_estimate NUMERIC(10,6),           -- estimated cost in USD
  hit_count INTEGER DEFAULT 0,           -- how many times this cache entry was used
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '6 hours'),
  last_hit_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_cache_key ON public.ai_response_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON public.ai_response_cache(expires_at);
CREATE INDEX idx_ai_cache_function ON public.ai_response_cache(function_name, created_at DESC);

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Service role has full access (edge functions use service_role key)
CREATE POLICY "Service role full access to ai_response_cache"
  ON public.ai_response_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- Atomic hit counter increment
-- Called from edge functions on cache hit
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_ai_cache_hit(p_cache_key TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ai_response_cache
  SET hit_count = hit_count + 1,
      last_hit_at = now()
  WHERE cache_key = p_cache_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Cleanup function for expired cache entries
-- Can be called periodically via pg_cron or the cleanup-ai-cache edge function:
--   SELECT public.cleanup_expired_ai_cache();
-- =============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
