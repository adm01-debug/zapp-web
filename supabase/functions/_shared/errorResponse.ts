/**
 * Standardized error response format for all Edge Functions.
 * Ensures consistent error structure: { error: string, code?: string }
 */

export interface ErrorResponseOptions {
  status?: number;
  code?: string;
  corsHeaders?: Record<string, string>;
}

export function errorResponse(
  message: string,
  options: ErrorResponseOptions = {}
): Response {
  const { status = 500, code, corsHeaders = {} } = options;

  const body: Record<string, unknown> = { error: message };
  if (code) body.code = code;

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function badRequest(message: string, corsHeaders: Record<string, string> = {}): Response {
  return errorResponse(message, { status: 400, code: 'BAD_REQUEST', corsHeaders });
}

export function unauthorized(message: string = 'Unauthorized', corsHeaders: Record<string, string> = {}): Response {
  return errorResponse(message, { status: 401, code: 'UNAUTHORIZED', corsHeaders });
}

export function notFound(message: string = 'Not found', corsHeaders: Record<string, string> = {}): Response {
  return errorResponse(message, { status: 404, code: 'NOT_FOUND', corsHeaders });
}

export function tooManyRequests(retryAfter: number, corsHeaders: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMITED' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}

export function serverError(message: string = 'Internal server error', corsHeaders: Record<string, string> = {}): Response {
  return errorResponse(message, { status: 500, code: 'INTERNAL_ERROR', corsHeaders });
}
