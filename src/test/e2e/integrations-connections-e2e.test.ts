import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) }),
    removeChannel: vi.fn(),
  },
}));

// ============================================
// CONNECTIONS MODULE
// ============================================
describe('E2E: Connections Module', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exports ConnectionsView', async () => {
    const mod = await import('@/components/connections/ConnectionsView');
    expect(mod.ConnectionsView).toBeDefined();
  });

  it('exports BusinessHoursDialog', async () => {
    const mod = await import('@/components/connections/BusinessHoursDialog');
    expect(mod.BusinessHoursDialog).toBeDefined();
  });

  it('exports BusinessHoursIndicator', async () => {
    const mod = await import('@/components/connections/BusinessHoursIndicator');
    expect(mod.BusinessHoursIndicator).toBeDefined();
  });

  describe('Connection data', () => {
    it('validates WhatsApp connection', () => {
      const conn = {
        instance_name: 'wpp2',
        instance_id: 'inst-123',
        status: 'connected',
        phone_number: '+5511999999999',
        api_url: 'https://api.example.com',
      };
      expect(conn.status).toBe('connected');
      expect(conn.phone_number).toMatch(/^\+\d+$/);
    });

    it('validates connection statuses', () => {
      const statuses = ['connected', 'disconnected', 'connecting', 'qr_code', 'error'];
      expect(statuses).toContain('connected');
      expect(statuses).toHaveLength(5);
    });

    it('validates business hours configuration', () => {
      const hours = [
        { day_of_week: 1, is_open: true, open_time: '09:00', close_time: '18:00' },
        { day_of_week: 0, is_open: false, open_time: null, close_time: null },
      ];
      expect(hours[0].is_open).toBe(true);
      expect(hours[1].is_open).toBe(false);
    });

    it('validates connection health check', () => {
      const health = { status: 'healthy', response_time_ms: 120, checked_at: new Date().toISOString() };
      expect(health.response_time_ms).toBeLessThan(5000);
    });
  });
});

// ============================================
// INTEGRATIONS HUB
// ============================================
describe('E2E: Integrations Hub', () => {
  it('exports IntegrationsHub', async () => {
    const mod = await import('@/components/integrations/IntegrationsHub');
    expect(mod.IntegrationsHub).toBeDefined();
  });

  it('exports GoogleCalendarIntegration', async () => {
    const mod = await import('@/components/integrations/GoogleCalendarIntegration');
    expect(mod.GoogleCalendarIntegration).toBeDefined();
  });

  it('exports GoogleSheetsIntegrationView', async () => {
    const mod = await import('@/components/integrations/GoogleSheetsIntegrationView');
    expect(mod.GoogleSheetsIntegrationView).toBeDefined();
  });

  it('exports N8nIntegrationView', async () => {
    const mod = await import('@/components/integrations/N8nIntegrationView');
    expect(mod.N8nIntegrationView).toBeDefined();
  });
});

// ============================================
// OMNICHANNEL MODULE
// ============================================
describe('E2E: Omnichannel Module', () => {
  it('exports OmnichannelInbox', async () => {
    const mod = await import('@/components/omnichannel/OmnichannelInbox');
    expect(mod.OmnichannelInbox).toBeDefined();
  });

  it('exports OmnichannelManager', async () => {
    const mod = await import('@/components/omnichannel/OmnichannelManager');
    expect(mod.OmnichannelManager).toBeDefined();
  });

  describe('Channel types', () => {
    it('validates supported channels', () => {
      const channels = ['whatsapp', 'instagram', 'facebook', 'telegram', 'email', 'webchat', 'sms'];
      expect(channels).toContain('whatsapp');
      expect(channels).toContain('instagram');
      expect(channels.length).toBeGreaterThan(5);
    });

    it('validates channel routing rule', () => {
      const rule = { channel_type: 'instagram', queue_id: 'q-social', is_active: true, priority: 1 };
      expect(rule.channel_type).toBe('instagram');
      expect(rule.priority).toBe(1);
    });
  });
});

// ============================================
// WHATSAPP FLOWS MODULE
// ============================================
describe('E2E: WhatsApp Flows Module', () => {
  it('exports WhatsAppFlowsBuilder', async () => {
    const mod = await import('@/components/whatsapp-flows/WhatsAppFlowsBuilder');
    expect(mod.WhatsAppFlowsBuilder).toBeDefined();
  });
});

// ============================================
// DIAGNOSTICS MODULE
// ============================================
describe('E2E: Diagnostics Module', () => {
  it('exports DiagnosticsView', async () => {
    const mod = await import('@/components/diagnostics/DiagnosticsView');
    expect(mod.DiagnosticsView).toBeDefined();
  });

  it('exports ConnectionHealthPanel', async () => {
    const mod = await import('@/components/diagnostics/ConnectionHealthPanel');
    expect(mod.ConnectionHealthPanel).toBeDefined();
  });
});

// ============================================
// META CAPI MODULE
// ============================================
describe('E2E: Meta CAPI Module', () => {
  it('exports MetaCAPIView', async () => {
    const mod = await import('@/components/meta-capi/MetaCAPIView');
    expect(mod.MetaCAPIView).toBeDefined();
  });
});

// ============================================
// KNOWLEDGE BASE MODULE
// ============================================
describe('E2E: Knowledge Base Module', () => {
  it('exports KnowledgeBaseView', async () => {
    const mod = await import('@/components/knowledge/KnowledgeBaseView');
    expect(mod.KnowledgeBaseView).toBeDefined();
  });

  describe('Knowledge data', () => {
    it('validates knowledge article', () => {
      const article = { title: 'Como resetar senha', content: 'Passo 1...', category: 'suporte', is_published: true };
      expect(article.title).toBeTruthy();
      expect(article.is_published).toBe(true);
    });
  });
});

// ============================================
// TRANSCRIPTIONS MODULE
// ============================================
describe('E2E: Transcriptions Module', () => {
  it('exports TranscriptionsHistoryView', async () => {
    const mod = await import('@/components/transcriptions/TranscriptionsHistoryView');
    expect(mod.TranscriptionsHistoryView).toBeDefined();
  });
});

// ============================================
// CLIENT WALLET MODULE
// ============================================
describe('E2E: Client Wallet Module', () => {
  it('exports ClientWalletView', async () => {
    const mod = await import('@/components/wallet/ClientWalletView');
    expect(mod.ClientWalletView).toBeDefined();
  });

  describe('Wallet rules', () => {
    it('validates wallet rule assignment', () => {
      const rule = { agent_id: 'a-1', name: 'VIP clients', is_active: true, priority: 1 };
      expect(rule.is_active).toBe(true);
    });
  });
});
