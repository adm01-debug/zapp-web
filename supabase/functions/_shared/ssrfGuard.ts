/**
 * SSRF (Server-Side Request Forgery) prevention utility.
 * Validates that outbound HTTP requests only target approved hosts.
 *
 * Usage:
 *   assertAllowedHost(url); // throws if host is not whitelisted
 */

/**
 * Whitelist of allowed external hosts for outbound requests.
 * Add hosts here as the system integrates with new services.
 */
const ALLOWED_HOSTS = new Set([
  // Evolution API (WhatsApp)
  'api.evolution.com.br',
  'evolution-api.com',
  // AI Gateway
  'ai.gateway.lovable.dev',
  // Email (Resend)
  'api.resend.com',
  // Mapbox
  'api.mapbox.com',
  // ElevenLabs
  'api.elevenlabs.io',
  // Bitrix24
  'bitrix24.com.br',
  'bitrix24.com',
  // Supabase (own project)
  'supabase.co',
  'supabase.com',
]);

/**
 * Additional host patterns that are allowed (suffix matching).
 * Useful for subdomains like *.supabase.co or *.bitrix24.com.br
 */
const ALLOWED_HOST_SUFFIXES = [
  '.supabase.co',
  '.supabase.com',
  '.bitrix24.com.br',
  '.bitrix24.com',
  '.evolution-api.com',
];

/**
 * Hosts that should NEVER be allowed (internal/private networks).
 */
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^169\.254\.\d+\.\d+$/,  // Link-local
  /^metadata\.google\.internal$/i,
  /^metadata\.internal$/i,
];

/**
 * Check if a hostname matches any blocked pattern (private/internal networks).
 */
function isBlockedHost(hostname: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(hostname));
}

/**
 * Check if a hostname is in the allowed whitelist.
 */
function isAllowedHost(hostname: string): boolean {
  if (ALLOWED_HOSTS.has(hostname)) return true;
  return ALLOWED_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix));
}

/**
 * Validate that a URL targets an allowed host.
 * Throws an error if the host is blocked or not whitelisted.
 *
 * @param urlString - The URL to validate
 * @throws Error if the URL targets a blocked or non-whitelisted host
 */
export function assertAllowedHost(urlString: string): void {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`SSRF Guard: Invalid URL: ${urlString}`);
  }

  const hostname = url.hostname.toLowerCase();

  // Block private/internal networks first
  if (isBlockedHost(hostname)) {
    throw new Error(`SSRF Guard: Blocked request to private/internal host: ${hostname}`);
  }

  // Only allow explicitly whitelisted hosts
  if (!isAllowedHost(hostname)) {
    throw new Error(`SSRF Guard: Host not whitelisted: ${hostname}. Add it to ALLOWED_HOSTS if this is intentional.`);
  }

  // Block non-HTTP(S) protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`SSRF Guard: Blocked non-HTTP protocol: ${url.protocol}`);
  }
}

/**
 * Safe fetch wrapper that validates the URL before making the request.
 * Drop-in replacement for fetch() with SSRF protection.
 */
export async function safeFetch(
  url: string | URL,
  init?: RequestInit
): Promise<Response> {
  const urlString = url instanceof URL ? url.toString() : url;
  assertAllowedHost(urlString);
  return fetch(urlString, init);
}

/**
 * Get the current allowed hosts list (for debugging/health checks).
 */
export function getAllowedHosts(): string[] {
  return [...ALLOWED_HOSTS];
}
