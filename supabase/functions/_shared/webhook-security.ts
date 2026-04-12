/**
 * Webhook Security Module
 * Provides HMAC signature validation and rate limiting for Evolution API webhooks
 * 
 * @module webhook-security
 */

import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

// ========================================
// Types
// ========================================

export interface WebhookValidationResult {
  valid: boolean;
  reason?: string;
  signature?: string;
  expectedSignature?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export interface SecurityLogEvent {
  timestamp: string;
  event: 'hmac_validation' | 'rate_limit' | 'ip_block' | 'suspicious_activity';
  success: boolean;
  details: Record<string, unknown>;
}

// ========================================
// HMAC Signature Validation
// ========================================

/**
 * Validates the HMAC-SHA256 signature of a webhook payload
 * 
 * Evolution API sends signature in:
 * - x-hub-signature-256: sha256=<hex>
 * - x-hub-signature: sha1=<hex> (legacy, we prefer sha256)
 * 
 * @param payload - Raw request body as string
 * @param signature - Signature header value (e.g., "sha256=abc123...")
 * @param secret - Webhook secret configured in Evolution API
 * @returns Validation result with detailed reason on failure
 */
export async function validateHmacSignature(
  payload: string,
  signature: string | null,
  secret: string | null
): Promise<WebhookValidationResult> {
  // If no secret configured, skip validation (graceful degradation)
  if (!secret) {
    console.warn('[WebhookSecurity] WEBHOOK_SECRET not configured - skipping HMAC validation');
    return {
      valid: true,
      reason: 'HMAC validation skipped - no secret configured',
    };
  }

  // If secret is configured but no signature provided, reject
  if (!signature) {
    return {
      valid: false,
      reason: 'Missing signature header (x-hub-signature-256)',
    };
  }

  // Parse signature format: "sha256=<hex>" or "sha1=<hex>"
  const [algorithm, providedHash] = signature.split('=');
  
  if (!algorithm || !providedHash) {
    return {
      valid: false,
      reason: `Invalid signature format: ${signature}`,
    };
  }

  // We only support sha256 for security
  if (algorithm !== 'sha256') {
    return {
      valid: false,
      reason: `Unsupported algorithm: ${algorithm}. Only sha256 is accepted.`,
    };
  }

  try {
    // Compute expected signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadData);
    const expectedHash = encodeHex(new Uint8Array(signatureBuffer));

    // Constant-time comparison to prevent timing attacks
    const isValid = timingSafeEqual(providedHash, expectedHash);

    if (!isValid) {
      logSecurityEvent({
        event: 'hmac_validation',
        success: false,
        details: {
          providedPrefix: providedHash.substring(0, 8) + '...',
          expectedPrefix: expectedHash.substring(0, 8) + '...',
          payloadLength: payload.length,
        },
      });
    }

    return {
      valid: isValid,
      reason: isValid ? undefined : 'Signature mismatch',
      signature: providedHash.substring(0, 16) + '...',
      expectedSignature: expectedHash.substring(0, 16) + '...',
    };
  } catch (error) {
    console.error('[WebhookSecurity] HMAC computation error:', error);
    return {
      valid: false,
      reason: `HMAC computation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ========================================
// Rate Limiting (In-Memory for Edge Functions)
// ========================================

// Simple in-memory rate limiter for edge functions
// Note: This resets on cold starts, for production use Redis/Upstash
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple rate limiting for webhook endpoints
 * 
 * @param identifier - Unique identifier (IP, instance name, etc.)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const key = `rl:${identifier}`;
  const existing = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!existing || existing.resetAt < now) {
    // New window
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Existing window
  existing.count++;
  const allowed = existing.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - existing.count);

  if (!allowed) {
    logSecurityEvent({
      event: 'rate_limit',
      success: false,
      details: {
        identifier,
        count: existing.count,
        maxRequests,
        retryAfter: Math.ceil((existing.resetAt - now) / 1000),
      },
    });
  }

  return {
    allowed,
    remaining,
    resetAt: new Date(existing.resetAt),
    retryAfter: allowed ? undefined : Math.ceil((existing.resetAt - now) / 1000),
  };
}

// ========================================
// Security Logging
// ========================================

/**
 * Logs security-related events in structured format
 */
export function logSecurityEvent(event: Omit<SecurityLogEvent, 'timestamp'>): void {
  const fullEvent: SecurityLogEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  const prefix = event.success ? '[SecurityOK]' : '[SecurityALERT]';
  console.log(`${prefix} ${JSON.stringify(fullEvent)}`);
}

// ========================================
// Middleware Helper
// ========================================

/**
 * Validates webhook request with HMAC and rate limiting
 * Returns null if valid, or Response object if rejected
 */
export async function validateWebhookRequest(
  req: Request,
  rawBody: string,
  options: {
    corsHeaders: Record<string, string>;
    enableHmac?: boolean;
    enableRateLimit?: boolean;
    rateLimitIdentifier?: string;
    maxRequestsPerMinute?: number;
  }
): Promise<Response | null> {
  const {
    corsHeaders,
    enableHmac = true,
    enableRateLimit = true,
    rateLimitIdentifier,
    maxRequestsPerMinute = 100,
  } = options;

  // 1. Rate limiting
  if (enableRateLimit) {
    const identifier = rateLimitIdentifier || 
      req.headers.get('x-forwarded-for')?.split(',')[0] || 
      req.headers.get('cf-connecting-ip') || 
      'unknown';

    const rateResult = checkRateLimit(identifier, maxRequestsPerMinute, 60000);
    
    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateResult.retryAfter),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateResult.resetAt.toISOString(),
          },
        }
      );
    }
  }

  // 2. HMAC Validation
  if (enableHmac) {
    const signature = 
      req.headers.get('x-hub-signature-256') ||
      req.headers.get('x-hub-signature') ||
      req.headers.get('X-Hub-Signature-256') ||
      req.headers.get('X-Hub-Signature');

    const webhookSecret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET') || Deno.env.get('WEBHOOK_SECRET');

    const hmacResult = await validateHmacSignature(rawBody, signature, webhookSecret);

    if (!hmacResult.valid) {
      logSecurityEvent({
        event: 'hmac_validation',
        success: false,
        details: {
          reason: hmacResult.reason,
          hasSignatureHeader: !!signature,
          hasSecretConfigured: !!webhookSecret,
        },
      });

      return new Response(
        JSON.stringify({
          error: 'Invalid webhook signature',
          reason: hmacResult.reason,
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  // All validations passed
  return null;
}

// ========================================
// IP Allowlist (Optional)
// ========================================

const EVOLUTION_API_IPS = new Set([
  // Add known Evolution API IPs here if needed
  // This is optional and should be configured based on deployment
]);

/**
 * Checks if request IP is in allowlist (optional feature)
 * Returns true if no allowlist configured or IP is allowed
 */
export function isIpAllowed(req: Request): boolean {
  if (EVOLUTION_API_IPS.size === 0) {
    return true; // No allowlist configured
  }

  const ip = 
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip');

  if (!ip) {
    console.warn('[WebhookSecurity] Could not determine client IP');
    return true; // Allow if can't determine IP
  }

  const allowed = EVOLUTION_API_IPS.has(ip);
  
  if (!allowed) {
    logSecurityEvent({
      event: 'ip_block',
      success: false,
      details: { ip },
    });
  }

  return allowed;
}
