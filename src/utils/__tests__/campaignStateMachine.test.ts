import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getNextStatuses,
  assertValidTransition,
  isTerminalStatus,
  CampaignStatus,
} from '../campaignStateMachine';

describe('campaignStateMachine', () => {
  describe('isValidTransition', () => {
    it('allows draft → scheduled', () => {
      expect(isValidTransition('draft', 'scheduled')).toBe(true);
    });

    it('allows draft → cancelled', () => {
      expect(isValidTransition('draft', 'cancelled')).toBe(true);
    });

    it('blocks draft → sending', () => {
      expect(isValidTransition('draft', 'sending')).toBe(false);
    });

    it('blocks draft → completed', () => {
      expect(isValidTransition('draft', 'completed')).toBe(false);
    });

    it('allows scheduled → sending', () => {
      expect(isValidTransition('scheduled', 'sending')).toBe(true);
    });

    it('allows scheduled → cancelled', () => {
      expect(isValidTransition('scheduled', 'cancelled')).toBe(true);
    });

    it('allows scheduled → draft (back to edit)', () => {
      expect(isValidTransition('scheduled', 'draft')).toBe(true);
    });

    it('allows sending → paused', () => {
      expect(isValidTransition('sending', 'paused')).toBe(true);
    });

    it('allows sending → completed', () => {
      expect(isValidTransition('sending', 'completed')).toBe(true);
    });

    it('allows paused → sending (resume)', () => {
      expect(isValidTransition('paused', 'sending')).toBe(true);
    });

    it('blocks completed → any', () => {
      const allStatuses: CampaignStatus[] = ['draft', 'scheduled', 'sending', 'paused', 'completed', 'cancelled'];
      for (const status of allStatuses) {
        expect(isValidTransition('completed', status)).toBe(false);
      }
    });

    it('blocks cancelled → any', () => {
      const allStatuses: CampaignStatus[] = ['draft', 'scheduled', 'sending', 'paused', 'completed', 'cancelled'];
      for (const status of allStatuses) {
        expect(isValidTransition('cancelled', status)).toBe(false);
      }
    });
  });

  describe('getNextStatuses', () => {
    it('returns correct statuses for draft', () => {
      expect(getNextStatuses('draft')).toEqual(['scheduled', 'cancelled']);
    });

    it('returns empty for completed', () => {
      expect(getNextStatuses('completed')).toEqual([]);
    });

    it('returns empty for cancelled', () => {
      expect(getNextStatuses('cancelled')).toEqual([]);
    });
  });

  describe('assertValidTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => assertValidTransition('draft', 'scheduled')).not.toThrow();
    });

    it('throws for invalid transitions', () => {
      expect(() => assertValidTransition('completed', 'draft')).toThrow(
        'Invalid campaign status transition'
      );
    });

    it('includes allowed transitions in error message', () => {
      expect(() => assertValidTransition('draft', 'completed')).toThrow(
        'scheduled, cancelled'
      );
    });
  });

  describe('isTerminalStatus', () => {
    it('returns true for completed', () => {
      expect(isTerminalStatus('completed')).toBe(true);
    });

    it('returns true for cancelled', () => {
      expect(isTerminalStatus('cancelled')).toBe(true);
    });

    it('returns false for draft', () => {
      expect(isTerminalStatus('draft')).toBe(false);
    });

    it('returns false for sending', () => {
      expect(isTerminalStatus('sending')).toBe(false);
    });
  });
});
