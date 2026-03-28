/**
 * Webhook signature verification utility.
 * Validates HMAC-SHA256 signatures on incoming webhook payloads.
 *
 * Usage:
 *   const isValid = await verifyWebhookSignature(payload, signature, secret);
 */

/**
 * Compute HMAC-SHA256 signature for a payload.
 */
async function computeHMAC(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify an HMAC-SHA256 webhook signature.
 * Compares the provided signature against the computed one using timing-safe comparison.
 *
 * @param payload - The raw request body string
 * @param signature - The signature from the webhook header
 * @param secret - The shared secret for HMAC computation
 * @returns true if the signature is valid
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!payload || !signature || !secret) return false;

  const computed = await computeHMAC(payload, secret);

  // Strip optional "sha256=" prefix
  const cleanSignature = signature.replace(/^sha256=/, '').toLowerCase();
  const cleanComputed = computed.toLowerCase();

  // Timing-safe comparison to prevent timing attacks
  if (cleanSignature.length !== cleanComputed.length) return false;

  const encoder = new TextEncoder();
  const a = encoder.encode(cleanSignature);
  const b = encoder.encode(cleanComputed);

  // Use crypto.subtle.timingSafeEqual if available (Deno 1.38+), fallback to manual
  if (typeof crypto.subtle.timingSafeEqual === 'function') {
    try {
      return crypto.subtle.timingSafeEqual(a, b);
    } catch {
      // Fallback
    }
  }

  // Manual constant-time comparison
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Extract webhook signature from common header patterns.
 * Supports: X-Signature, X-Hub-Signature-256, X-Webhook-Signature
 */
export function extractWebhookSignature(req: Request): string | null {
  return req.headers.get('x-signature')
    || req.headers.get('x-hub-signature-256')
    || req.headers.get('x-webhook-signature')
    || null;
}
