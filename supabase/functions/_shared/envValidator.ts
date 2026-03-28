/**
 * Centralized environment variable validation for Edge Functions.
 * Validates required env vars exist at function startup.
 */

export interface EnvConfig {
  required: string[];
  optional?: string[];
}

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validate that required environment variables are set.
 * Logs warnings for optional vars that are missing.
 */
export function validateEnv(config: EnvConfig): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of config.required) {
    if (!Deno.env.get(key)) {
      missing.push(key);
    }
  }

  if (config.optional) {
    for (const key of config.optional) {
      if (!Deno.env.get(key)) {
        warnings.push(`Optional env var '${key}' is not set`);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validate env vars and throw if any required vars are missing.
 * Use at function startup to fail fast.
 */
export function requireEnv(config: EnvConfig): void {
  const result = validateEnv(config);

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.warn(`[env-validator] ${warning}`);
    }
  }

  if (!result.valid) {
    throw new Error(
      `Missing required environment variables: ${result.missing.join(', ')}`
    );
  }
}

/**
 * Get an env var or throw with a descriptive error.
 */
export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Required environment variable '${key}' is not set`);
  }
  return value;
}

/** Common env var sets for reuse */
export const SUPABASE_ENV = {
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
} as const;

export const EVOLUTION_ENV = {
  required: ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY'],
} as const;

export const AI_ENV = {
  required: ['OPENAI_API_KEY'],
  optional: ['OPENAI_MODEL'],
} as const;
