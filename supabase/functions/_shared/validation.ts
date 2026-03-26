/**
 * Lightweight input validation for Edge Functions (no external dependencies).
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateRequired(obj: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter(f => obj[f] === undefined || obj[f] === null || obj[f] === '');
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
}

export function validateUUID(value: string, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`Invalid UUID for ${fieldName}: ${value}`);
  }
}

export function validateEmail(value: string, fieldName: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    throw new ValidationError(`Invalid email for ${fieldName}: ${value}`);
  }
}

export function validateStringLength(value: string, fieldName: string, min: number, max: number): void {
  if (value.length < min || value.length > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max} characters`);
  }
}

export function validatePhoneE164(value: string, fieldName: string): void {
  const e164Regex = /^\+?[1-9]\d{1,14}$/;
  if (!e164Regex.test(value.replace(/[\s\-\(\)]/g, ''))) {
    throw new ValidationError(`Invalid phone number for ${fieldName}: ${value}`);
  }
}

export function validateEnum(value: string, fieldName: string, allowed: string[]): void {
  if (!allowed.includes(value)) {
    throw new ValidationError(`Invalid value for ${fieldName}: ${value}. Allowed: ${allowed.join(', ')}`);
  }
}

export function validationErrorResponse(error: ValidationError, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
