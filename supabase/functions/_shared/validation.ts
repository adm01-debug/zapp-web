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

export function validateCPF(value: string, fieldName: string): void {
  const clean = value.replace(/\D/g, '');
  if (clean.length !== 11) {
    throw new ValidationError(`Invalid CPF for ${fieldName}: must have 11 digits`);
  }
  // Reject all-same-digit CPFs
  if (/^(\d)\1{10}$/.test(clean)) {
    throw new ValidationError(`Invalid CPF for ${fieldName}`);
  }
  // Mod11 digit 1
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (parseInt(clean[9]) !== d1) {
    throw new ValidationError(`Invalid CPF for ${fieldName}`);
  }
  // Mod11 digit 2
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  if (parseInt(clean[10]) !== d2) {
    throw new ValidationError(`Invalid CPF for ${fieldName}`);
  }
}

export function validateCNPJ(value: string, fieldName: string): void {
  const clean = value.replace(/\D/g, '');
  if (clean.length !== 14) {
    throw new ValidationError(`Invalid CNPJ for ${fieldName}: must have 14 digits`);
  }
  if (/^(\d)\1{13}$/.test(clean)) {
    throw new ValidationError(`Invalid CNPJ for ${fieldName}`);
  }
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(clean[i]) * weights1[i];
  let d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(clean[12]) !== d1) {
    throw new ValidationError(`Invalid CNPJ for ${fieldName}`);
  }
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(clean[i]) * weights2[i];
  let d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(clean[13]) !== d2) {
    throw new ValidationError(`Invalid CNPJ for ${fieldName}`);
  }
}

export function validateURL(value: string, fieldName: string): void {
  try {
    new URL(value);
  } catch {
    throw new ValidationError(`Invalid URL for ${fieldName}: ${value}`);
  }
}

export function validateDateISO(value: string, fieldName: string): void {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Invalid date for ${fieldName}: ${value}`);
  }
}

export function validateNumberRange(value: number, fieldName: string, min: number, max: number): void {
  if (typeof value !== 'number' || isNaN(value) || value < min || value > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }
}

export function validationErrorResponse(error: ValidationError, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
