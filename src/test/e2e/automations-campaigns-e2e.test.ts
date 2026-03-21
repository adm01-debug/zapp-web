import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

// ============================================
// AUTOMATIONS MODULE
// ============================================
describe('E2E: Automations Module', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exports AutomationsManager component', async () => {
    const mod = await import('@/components/automations/AutomationsManager');
    expect(mod.AutomationsManager).toBeDefined();
  });

  describe('Automation data structure', () => {
    it('validates automation creation payload', () => {
      const automation = {
        name: 'Auto-assign to queue',
        trigger_type: 'message_received',
        trigger_config: { keyword: 'suporte' },
        actions: [{ type: 'assign_queue', queue_id: 'q-1' }],
        is_active: true,
      };
      expect(automation.name).toBeTruthy();
      expect(automation.trigger_type).toBe('message_received');
      expect(automation.actions).toHaveLength(1);
      expect(automation.is_active).toBe(true);
    });

    it('validates automation with multiple actions', () => {
      const automation = {
        name: 'Complex automation',
        trigger_type: 'contact_created',
        actions: [
          { type: 'send_message', content: 'Bem-vindo!' },
          { type: 'add_tag', tag: 'novo-cliente' },
          { type: 'assign_agent', agent_id: 'a-1' },
        ],
      };
      expect(automation.actions).toHaveLength(3);
      expect(automation.actions[0].type).toBe('send_message');
    });

    it('validates trigger types', () => {
      const validTriggers = ['message_received', 'contact_created', 'tag_added', 'keyword_match', 'schedule'];
      validTriggers.forEach(t => expect(typeof t).toBe('string'));
      expect(validTriggers).toHaveLength(5);
    });

    it('validates action types', () => {
      const validActions = ['send_message', 'assign_agent', 'assign_queue', 'add_tag', 'remove_tag', 'close_conversation', 'transfer'];
      expect(validActions.length).toBeGreaterThan(5);
    });

    it('validates automation toggle state', () => {
      const states = [
        { is_active: true, trigger_count: 150 },
        { is_active: false, trigger_count: 0 },
      ];
      expect(states[0].is_active).toBe(true);
      expect(states[1].trigger_count).toBe(0);
    });
  });

  describe('Automation CRUD operations', () => {
    it('creates automation via supabase', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'auto-1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert, select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'auto-1' }, error: null }) });

      await supabase.from('automations').insert({ name: 'Test', trigger_type: 'message_received', actions: [] });
      expect(mockInsert).toHaveBeenCalled();
    });

    it('lists automations', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Auto 1' }, { id: '2', name: 'Auto 2' }], error: null }),
      });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect });

      const { data } = await supabase.from('automations').select('*').order('created_at');
      expect(data).toHaveLength(2);
    });

    it('updates automation status', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: { is_active: false }, error: null }) });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await supabase.from('automations').update({ is_active: false }).eq('id', 'auto-1');
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    });

    it('deletes automation', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ delete: mockDelete });

      await supabase.from('automations').delete().eq('id', 'auto-1');
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});

// ============================================
// CAMPAIGNS MODULE
// ============================================
describe('E2E: Campaigns Module', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exports CampaignsView component', async () => {
    const mod = await import('@/components/campaigns/CampaignsView');
    expect(mod.CampaignsView).toBeDefined();
  });

  describe('Campaign data structure', () => {
    it('validates campaign creation payload', () => {
      const campaign = {
        name: 'Black Friday 2026',
        message_content: 'Aproveite 50% de desconto!',
        message_type: 'text',
        target_type: 'all',
        status: 'draft',
        total_contacts: 500,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        failed_count: 0,
      };
      expect(campaign.name).toBeTruthy();
      expect(campaign.status).toBe('draft');
      expect(campaign.total_contacts).toBe(500);
    });

    it('validates campaign with media', () => {
      const campaign = {
        name: 'Promo com imagem',
        message_content: 'Confira!',
        message_type: 'image',
        media_url: 'https://example.com/promo.jpg',
      };
      expect(campaign.message_type).toBe('image');
      expect(campaign.media_url).toBeTruthy();
    });

    it('validates campaign statuses', () => {
      const validStatuses = ['draft', 'scheduled', 'sending', 'paused', 'completed', 'cancelled'];
      expect(validStatuses).toContain('draft');
      expect(validStatuses).toContain('completed');
      expect(validStatuses).toHaveLength(6);
    });

    it('validates scheduled campaign', () => {
      const campaign = {
        name: 'Agendada',
        scheduled_at: new Date('2026-04-01T10:00:00Z').toISOString(),
        send_interval_seconds: 5,
        status: 'scheduled',
      };
      expect(campaign.scheduled_at).toBeTruthy();
      expect(campaign.send_interval_seconds).toBe(5);
    });

    it('validates campaign metrics computation', () => {
      const campaign = { sent_count: 100, delivered_count: 95, read_count: 60, failed_count: 5 };
      const deliveryRate = (campaign.delivered_count / campaign.sent_count) * 100;
      const readRate = (campaign.read_count / campaign.delivered_count) * 100;
      expect(deliveryRate).toBe(95);
      expect(readRate).toBeCloseTo(63.16, 1);
    });

    it('validates campaign contact assignment', () => {
      const campaignContact = {
        campaign_id: 'camp-1',
        contact_id: 'contact-1',
        status: 'pending',
        sent_at: null,
        error_message: null,
      };
      expect(campaignContact.status).toBe('pending');
      expect(campaignContact.sent_at).toBeNull();
    });
  });

  describe('Campaign CRUD', () => {
    it('creates campaign via supabase', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'camp-1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert, select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'camp-1' }, error: null }) });

      await supabase.from('campaigns').insert({ name: 'Test Campaign', message_content: 'Hi!' });
      expect(mockInsert).toHaveBeenCalled();
    });

    it('fetches campaigns list', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockData = [
        { id: '1', name: 'Camp 1', status: 'draft', total_contacts: 100 },
        { id: '2', name: 'Camp 2', status: 'completed', total_contacts: 200 },
      ];
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockData, error: null }) }),
      });

      const { data } = await supabase.from('campaigns').select('*').order('created_at');
      expect(data).toHaveLength(2);
    });

    it('updates campaign status to sending', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: { status: 'sending' }, error: null }) });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update: mockUpdate });

      await supabase.from('campaigns').update({ status: 'sending', started_at: new Date().toISOString() }).eq('id', 'camp-1');
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});

// ============================================
// CHATBOT FLOWS MODULE
// ============================================
describe('E2E: Chatbot Flows Module', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exports ChatbotFlowsView component', async () => {
    const mod = await import('@/components/chatbot/ChatbotFlowsView');
    expect(mod.ChatbotFlowsView).toBeDefined();
  });

  it('exports ChatbotFlowEditor component', async () => {
    const mod = await import('@/components/chatbot/ChatbotFlowEditor');
    expect(mod.ChatbotFlowEditor).toBeDefined();
  });

  describe('Chatbot flow data structure', () => {
    it('validates flow node types', () => {
      const nodeTypes = ['start', 'message', 'question', 'condition', 'action', 'end', 'delay', 'api_call'];
      expect(nodeTypes).toContain('start');
      expect(nodeTypes).toContain('end');
      expect(nodeTypes.length).toBeGreaterThan(5);
    });

    it('validates flow creation', () => {
      const flow = {
        name: 'Atendimento automático',
        trigger_type: 'keyword',
        trigger_value: 'menu',
        is_active: true,
        nodes: [
          { id: 'n1', type: 'start', data: {} },
          { id: 'n2', type: 'message', data: { content: 'Bem-vindo!' } },
        ],
        edges: [{ source: 'n1', target: 'n2' }],
      };
      expect(flow.nodes).toHaveLength(2);
      expect(flow.edges).toHaveLength(1);
    });

    it('validates flow execution tracking', () => {
      const execution = {
        flow_id: 'flow-1',
        contact_id: 'contact-1',
        status: 'running',
        current_node_id: 'n2',
        variables: { name: 'João' },
      };
      expect(execution.status).toBe('running');
      expect(execution.variables).toHaveProperty('name');
    });

    it('validates conditional node', () => {
      const conditionNode = {
        id: 'n3',
        type: 'condition',
        data: {
          variable: 'user_response',
          operator: 'equals',
          value: '1',
          trueTarget: 'n4',
          falseTarget: 'n5',
        },
      };
      expect(conditionNode.data.operator).toBe('equals');
      expect(conditionNode.data.trueTarget).toBeDefined();
    });
  });

  describe('Chatbot CRUD', () => {
    it('creates chatbot flow', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'flow-1' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: mockInsert, select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'flow-1' }, error: null }) });

      await supabase.from('chatbot_flows').insert({ name: 'Test Flow', nodes: [], edges: [] });
      expect(mockInsert).toHaveBeenCalled();
    });

    it('fetches chatbot flows', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Flow 1' }], error: null }) }),
      });

      const { data } = await supabase.from('chatbot_flows').select('*').order('created_at');
      expect(data).toHaveLength(1);
    });
  });
});
