/**
 * JWT verification utility for Supabase Edge Functions.
 * Validates JWT tokens from the Authorization header using Supabase's JWKS.
 *
 * Usage:
 *   const { user, error } = await verifyJWT(req);
 *   if (error) return unauthorized(error, corsHeaders);
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

export interface JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface VerifyResult {
  user: JWTPayload | null;
  token: string | null;
  error: string | null;
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

/**
 * Verify JWT token using Supabase's auth.getUser().
 * This validates the token signature, expiration, and audience via Supabase's auth service.
 *
 * Returns the decoded user payload or an error message.
 */
export async function verifyJWT(req: Request): Promise<VerifyResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return { user: null, token: null, error: 'Missing or invalid Authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, token, error: 'Server misconfiguration: missing Supabase credentials' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null, token, error: error?.message || 'Invalid or expired token' };
    }

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    };

    return { user: payload, token, error: null };
  } catch (err) {
    return { user: null, token, error: `JWT verification failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Quick auth check — returns user payload or null.
 * Use when you need the user but want to handle errors yourself.
 */
export async function getAuthUser(req: Request): Promise<JWTPayload | null> {
  const result = await verifyJWT(req);
  return result.user;
}

/**
 * List of functions that should skip JWT verification.
 * These use alternative auth mechanisms (API keys, webhook tokens, etc.)
 */
export const JWT_EXEMPT_FUNCTIONS = new Set([
  'evolution-webhook',    // Authenticates via API key header
  'whatsapp-webhook',     // Authenticates via hub.verify_token
  'public-api',           // Authenticates via x-api-key header
  'health',               // Public health endpoint
  'get-mapbox-token',     // Public token endpoint
  'webauthn',             // Has its own passkey auth flow
  'detect-new-device',    // Called during login flow
  'approve-password-reset', // Has own admin check
]);
