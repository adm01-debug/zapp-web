/**
 * Centralized timing constants to eliminate magic numbers.
 */

/** React Query cache configuration */
export const REACT_QUERY = {
  STALE_TIME: 1000 * 60 * 5,    // 5 minutes
  GC_TIME: 1000 * 60 * 30,      // 30 minutes
  RETRY_COUNT: 1,
} as const;

/** UI timing constants */
export const UI_TIMING = {
  TOAST_DURATION: 5000,           // 5 seconds
  DEBOUNCE_SEARCH: 300,           // 300ms search debounce
  DEBOUNCE_SUBMIT: 2000,          // 2 seconds form submit debounce
  ANIMATION_DURATION: 200,        // 200ms default animation
  SHAKE_RESET: 2000,              // 2 seconds shake animation reset
  POLLING_INTERVAL: 60000,        // 1 minute polling
  TOOLTIP_DELAY: 300,             // 300ms tooltip delay
} as const;

/** File upload limits */
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 2,
  MAX_SIZE_BYTES: 2 * 1024 * 1024,
  IMAGE_QUALITY: 0.8,
  MAX_IMAGE_WIDTH: 1920,
  MAX_IMAGE_HEIGHT: 1920,
  WHATSAPP_MAX_SIZE_MB: 25,
} as const;

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  CONTACTS_LIMIT: 2000,
  MESSAGES_LIMIT: 100,
  CAMPAIGNS_LIMIT: 100,
  QUICK_REPLIES_LIMIT: 200,
  SLA_RECORDS_LIMIT: 5000,
  AGENTS_LIMIT: 500,
} as const;

/** API rate limits (frontend-side awareness) */
export const RATE_LIMITS = {
  EVOLUTION_API_PER_SECOND: 20,
  FORM_SUBMIT_COOLDOWN_MS: 2000,
} as const;

/** Session and auth */
export const AUTH = {
  SESSION_CHECK_INTERVAL: 60000,  // 1 minute
  MFA_CODE_LENGTH: 6,
  PASSWORD_MIN_LENGTH: 6,
} as const;
