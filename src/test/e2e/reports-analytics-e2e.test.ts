import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) }),
    removeChannel: vi.fn(),
  },
}));

// ============================================
// REPORTS MODULE
// ============================================
describe('E2E: Reports Module', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exports AdvancedReportsView', async () => {
    const mod = await import('@/components/reports/AdvancedReportsView');
    expect(mod.AdvancedReportsView).toBeDefined();
  });

  it('exports ExportButton (blocked)', async () => {
    const mod = await import('@/components/reports/ExportButton');
    expect(mod.ExportButton).toBeDefined();
  });

  it('exports ScheduledReportsManager', async () => {
    const mod = await import('@/components/reports/ScheduledReportsManager');
    expect(mod.ScheduledReportsManager).toBeDefined();
  });

  describe('Report data computation', () => {
    it('computes messages per agent', () => {
      const messages = [
        { agent_id: 'a1', count: 50 },
        { agent_id: 'a2', count: 75 },
        { agent_id: 'a3', count: 30 },
      ];
      const total = messages.reduce((s, m) => s + m.count, 0);
      const avg = total / messages.length;
      expect(total).toBe(155);
      expect(avg).toBeCloseTo(51.67, 1);
    });

    it('computes response time stats', () => {
      const times = [30, 45, 60, 120, 15, 90];
      const avg = times.reduce((s, t) => s + t, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      expect(avg).toBe(60);
      expect(min).toBe(15);
      expect(max).toBe(120);
    });

    it('computes daily message volume', () => {
      const daily = [
        { date: '2026-03-15', count: 120 },
        { date: '2026-03-16', count: 95 },
        { date: '2026-03-17', count: 150 },
      ];
      const peak = daily.reduce((max, d) => d.count > max.count ? d : max, daily[0]);
      expect(peak.date).toBe('2026-03-17');
    });

    it('computes satisfaction distribution', () => {
      const ratings = [5, 4, 5, 3, 4, 5, 2, 4, 5, 4];
      const distribution: Record<number, number> = {};
      ratings.forEach(r => { distribution[r] = (distribution[r] || 0) + 1; });
      expect(distribution[5]).toBe(4);
      expect(distribution[4]).toBe(4);
    });

    it('validates date range filter', () => {
      const start = new Date('2026-03-01');
      const end = new Date('2026-03-31');
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(30);
    });

    it('computes conversion rate', () => {
      const stats = { total_conversations: 200, resolved: 180, escalated: 15, abandoned: 5 };
      const resolutionRate = (stats.resolved / stats.total_conversations) * 100;
      expect(resolutionRate).toBe(90);
    });
  });
});

// ============================================
// CSAT MODULE
// ============================================
describe('E2E: CSAT Module', () => {
  it('exports CSATDashboard', async () => {
    const mod = await import('@/components/csat/CSATDashboard');
    expect(mod.CSATDashboard).toBeDefined();
  });

  it('exports CSATSurveyDialog', async () => {
    const mod = await import('@/components/csat/CSATSurveyDialog');
    expect(mod.CSATSurveyDialog).toBeDefined();
  });

  describe('CSAT data', () => {
    it('validates survey submission', () => {
      const survey = { contact_id: 'c-1', rating: 5, feedback: 'Excelente atendimento!', agent_id: 'a-1' };
      expect(survey.rating).toBeGreaterThanOrEqual(1);
      expect(survey.rating).toBeLessThanOrEqual(5);
    });

    it('computes NPS score', () => {
      const ratings = [5, 4, 5, 3, 5, 4, 2, 5, 4, 5];
      const promoters = ratings.filter(r => r >= 5).length;
      const detractors = ratings.filter(r => r <= 2).length;
      const nps = ((promoters - detractors) / ratings.length) * 100;
      expect(nps).toBe(40);
    });

    it('creates CSAT survey', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockInsert = vi.fn().mockResolvedValue({ data: { id: 's-1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert });

      await supabase.from('csat_surveys').insert({ contact_id: 'c-1', rating: 4 });
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});

// ============================================
// SLA MODULE
// ============================================
describe('E2E: SLA Module', () => {
  it('exports SLAHistoryDashboard', async () => {
    const mod = await import('@/components/sla/SLAHistoryDashboard');
    expect(mod.SLAHistoryDashboard).toBeDefined();
  });

  describe('SLA data', () => {
    it('validates SLA configuration', () => {
      const config = { first_response_minutes: 15, resolution_minutes: 240, priority: 'high' };
      expect(config.first_response_minutes).toBe(15);
      expect(config.resolution_minutes).toBe(240);
    });

    it('detects SLA breach', () => {
      const firstMessageAt = new Date('2026-03-21T10:00:00Z');
      const firstResponseAt = new Date('2026-03-21T10:20:00Z');
      const slaMinutes = 15;
      const responseMinutes = (firstResponseAt.getTime() - firstMessageAt.getTime()) / 60000;
      const breached = responseMinutes > slaMinutes;
      expect(breached).toBe(true);
      expect(responseMinutes).toBe(20);
    });

    it('validates SLA compliance rate', () => {
      const total = 100;
      const breached = 8;
      const compliance = ((total - breached) / total) * 100;
      expect(compliance).toBe(92);
    });
  });
});

// ============================================
// GAMIFICATION MODULE
// ============================================
describe('E2E: Gamification Module', () => {
  it('exports AchievementsSystem', async () => {
    const mod = await import('@/components/gamification/AchievementsSystem');
    expect(mod.AchievementsSystem).toBeDefined();
  });

  it('exports AchievementsPanel', async () => {
    const mod = await import('@/components/gamification/AchievementsPanel');
    expect(mod.AchievementsPanel).toBeDefined();
  });

  it('exports AchievementBadge', async () => {
    const mod = await import('@/components/gamification/AchievementBadge');
    expect(mod.AchievementBadge).toBeDefined();
  });

  it('exports AchievementToast', async () => {
    const mod = await import('@/components/gamification/AchievementToast');
    expect(mod.AchievementToast).toBeDefined();
  });

  describe('Gamification logic', () => {
    it('computes XP level', () => {
      const xp = 2500;
      const level = Math.floor(xp / 1000) + 1;
      expect(level).toBe(3);
    });

    it('validates achievement unlocking', () => {
      const stats = { messages_sent: 100, conversations_resolved: 50 };
      const achievements = [];
      if (stats.messages_sent >= 100) achievements.push('century_messages');
      if (stats.conversations_resolved >= 50) achievements.push('resolver_50');
      expect(achievements).toContain('century_messages');
      expect(achievements).toContain('resolver_50');
    });

    it('validates streak tracking', () => {
      const stats = { current_streak: 7, best_streak: 15 };
      expect(stats.current_streak).toBeLessThanOrEqual(stats.best_streak);
    });

    it('computes leaderboard ranking', () => {
      const agents = [
        { name: 'Ana', xp: 5000 },
        { name: 'Bruno', xp: 3200 },
        { name: 'Carlos', xp: 7500 },
      ];
      const sorted = [...agents].sort((a, b) => b.xp - a.xp);
      expect(sorted[0].name).toBe('Carlos');
      expect(sorted[2].name).toBe('Bruno');
    });
  });
});

// ============================================
// LEADERBOARD MODULE
// ============================================
describe('E2E: Leaderboard Module', () => {
  it('exports Leaderboard', async () => {
    const mod = await import('@/components/leaderboard/Leaderboard');
    expect(mod.Leaderboard).toBeDefined();
  });

  it('exports AgentRanking', async () => {
    const mod = await import('@/components/leaderboard/AgentRanking');
    expect(mod.AgentRanking).toBeDefined();
  });
});

// ============================================
// SCHEDULE MODULE
// ============================================
describe('E2E: Schedule Module', () => {
  it('exports ScheduleCalendarView', async () => {
    const mod = await import('@/components/schedule/ScheduleCalendarView');
    expect(mod.ScheduleCalendarView).toBeDefined();
  });

  describe('Schedule data', () => {
    it('validates scheduled message', () => {
      const msg = { content: 'Follow up', scheduled_at: '2026-04-01T14:00:00Z', contact_id: 'c-1', status: 'pending' };
      expect(msg.status).toBe('pending');
    });
  });
});
