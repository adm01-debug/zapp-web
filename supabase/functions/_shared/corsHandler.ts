/**
 * Centralized CORS handler for all Edge Functions.
 * Replaces the duplicated getCorsHeaders() pattern across 15+ functions.
 *
 * Key improvements over the old pattern:
 * - Rejects unknown origins instead of falling back to first allowed origin
 * - Includes security headers (X-Content-Type-Options, X-Frame-Options, etc.)
 * - Provides handleCorsPrefllight() for consistent OPTIONS handling
 *
 * Usage:
 *   import { getCorsHeaders, handleCorsPreflight, SECURITY_HEADERS } from '../_shared/corsHandler.ts';
 *
 *   if (req.method === 'OPTIONS') return handleCorsPreflight(req);
 *   const corsHeaders = getCorsHeaders(req);
 */

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);

/**
 * Security headers applied to all responses.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Get CORS headers for a request.
 * Returns empty Access-Control-Allow-Origin if origin is not in the whitelist,
 * effectively rejecting the cross-origin request.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  // Only allow explicitly whitelisted origins; reject all others
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-request-id, x-trace-id, x-idempotency-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '3600',
    'Access-Control-Expose-Headers': 'x-request-id, x-trace-id, retry-after',
    ...SECURITY_HEADERS,
  };
}

/**
 * Handle CORS preflight (OPTIONS) request.
 * Returns 204 No Content with appropriate CORS headers.
 */
export function handleCorsPreflight(req: Request): Response {
  const origin = req.headers.get('origin') || '';
  if (!ALLOWED_ORIGINS.includes(origin) && ALLOWED_ORIGINS.length > 0) {
    // Reject preflight from unknown origins
    return new Response(null, { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

/**
 * Create a JSON response with CORS and security headers.
 */
export function jsonResponse(
  body: unknown,
  status: number,
  req: Request,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}
