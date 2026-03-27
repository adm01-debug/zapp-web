/**
 * Campaign status state machine.
 * Enforces valid status transitions for campaigns.
 */

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'completed'
  | 'cancelled'
  | 'paused';

const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['sending', 'cancelled', 'draft'],
  sending: ['paused', 'completed', 'cancelled'],
  paused: ['sending', 'cancelled'],
  completed: [],   // terminal state
  cancelled: [],   // terminal state
};

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(
  from: CampaignStatus,
  to: CampaignStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get allowed next statuses from current status.
 */
export function getNextStatuses(current: CampaignStatus): CampaignStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/**
 * Assert that a transition is valid, throwing if not.
 */
export function assertValidTransition(
  from: CampaignStatus,
  to: CampaignStatus
): void {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid campaign status transition: ${from} → ${to}. Allowed: ${getNextStatuses(from).join(', ') || 'none (terminal state)'}`
    );
  }
}

/**
 * Check if a status is terminal (no further transitions possible).
 */
export function isTerminalStatus(status: CampaignStatus): boolean {
  return getNextStatuses(status).length === 0;
}
