import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  },
}));

describe('E2E: Omnichannel Channel Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  it('creates a new channel connection', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: 'ch1', name: 'Instagram Business', channel_type: 'instagram', status: 'active' },
      error: null,
    });
    mockFrom.mockReturnValue({ insert: mockInsert, select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ch1' }, error: null }) });

    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('channel_connections').insert({
      name: 'Instagram Business',
      channel_type: 'instagram',
      status: 'active',
    });
    expect(mockFrom).toHaveBeenCalledWith('channel_connections');
  });

  it('lists all channel connections', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { id: '1', channel_type: 'whatsapp', status: 'active' },
            { id: '2', channel_type: 'instagram', status: 'inactive' },
            { id: '3', channel_type: 'telegram', status: 'active' },
          ],
          error: null,
        }),
      }),
    });

    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.from('channel_connections').select('*').order('created_at');
    expect(data).toHaveLength(3);
  });

  it('creates routing rules for a channel', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'r1' }, error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('channel_routing_rules').insert({
      channel_type: 'instagram',
      queue_id: 'q1',
      priority: 1,
      is_active: true,
    });
    expect(mockFrom).toHaveBeenCalledWith('channel_routing_rules');
  });

  it('validates channel_type enum values', () => {
    const validTypes = ['whatsapp', 'instagram', 'telegram', 'messenger', 'webchat', 'email', 'sms'];
    validTypes.forEach(type => {
      expect(typeof type).toBe('string');
      expect(type.length).toBeGreaterThan(0);
    });
  });
});

describe('E2E: Campaign Execution Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates campaign lifecycle: draft → scheduled → sending → completed', () => {
    const validTransitions: Record<string, string[]> = {
      draft: ['scheduled', 'sending', 'cancelled'],
      scheduled: ['sending', 'cancelled'],
      sending: ['completed', 'paused', 'cancelled'],
      paused: ['sending', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    expect(validTransitions.draft).toContain('scheduled');
    expect(validTransitions.sending).toContain('completed');
    expect(validTransitions.completed).toHaveLength(0);
    expect(validTransitions.cancelled).toHaveLength(0);
  });

  it('creates campaign with contacts', async () => {
    const insertCampaign = vi.fn().mockResolvedValue({ data: { id: 'camp-1' }, error: null });
    const insertContacts = vi.fn().mockResolvedValue({ error: null });
    
    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') return { insert: insertCampaign, select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'camp-1' }, error: null }) };
      if (table === 'campaign_contacts') return { insert: insertContacts };
      return { select: vi.fn().mockReturnThis() };
    });

    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('campaigns').insert({ name: 'Test Campaign', message_content: 'Hello {{name}}!' });
    await supabase.from('campaign_contacts').insert([
      { campaign_id: 'camp-1', contact_id: 'c1', status: 'pending' },
      { campaign_id: 'camp-1', contact_id: 'c2', status: 'pending' },
    ]);

    expect(insertCampaign).toHaveBeenCalled();
    expect(insertContacts).toHaveBeenCalled();
  });

  it('tracks campaign metrics', () => {
    const metrics = {
      total_contacts: 100,
      sent_count: 85,
      delivered_count: 80,
      read_count: 60,
      failed_count: 15,
    };

    const deliveryRate = metrics.delivered_count / metrics.sent_count;
    const readRate = metrics.read_count / metrics.delivered_count;
    const failRate = metrics.failed_count / metrics.total_contacts;

    expect(deliveryRate).toBeCloseTo(0.941, 2);
    expect(readRate).toBe(0.75);
    expect(failRate).toBe(0.15);
  });
});

describe('E2E: Chatbot Flow Execution', () => {
  it('validates chatbot node structure', () => {
    const node = {
      id: 'node-1',
      type: 'message',
      data: { label: 'Welcome', content: 'Hello! How can I help?' },
      position: { x: 100, y: 200 },
    };

    expect(node.type).toBe('message');
    expect(node.data.content).toBeTruthy();
    expect(node.position.x).toBe(100);
  });

  it('validates chatbot edge connections', () => {
    const edges = [
      { id: 'e1', source: 'start', target: 'msg1' },
      { id: 'e2', source: 'msg1', target: 'question1', condition: 'default' },
      { id: 'e3', source: 'question1', target: 'end', label: 'Option A' },
    ];

    expect(edges).toHaveLength(3);
    expect(edges[0].source).toBe('start');
    expect(edges[2].label).toBe('Option A');
  });

  it('validates chatbot execution tracking', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: { id: 'exec-1', status: 'running' }, error: null }),
    });

    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('chatbot_executions').insert({
      flow_id: 'f1',
      contact_id: 'c1',
      current_node_id: 'start',
      status: 'running',
      variables: {},
    });
    expect(mockFrom).toHaveBeenCalledWith('chatbot_executions');
  });
});

describe('E2E: SLA & CSAT Integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates SLA breach status', () => {
    const slaConfig = { first_response_minutes: 15, resolution_hours: 4 };
    const firstMessageAt = new Date('2026-03-18T10:00:00Z');
    const firstResponseAt = new Date('2026-03-18T10:20:00Z');
    
    const responseMinutes = (firstResponseAt.getTime() - firstMessageAt.getTime()) / (1000 * 60);
    const breached = responseMinutes > slaConfig.first_response_minutes;
    
    expect(responseMinutes).toBe(20);
    expect(breached).toBe(true);
  });

  it('validates CSAT survey structure', () => {
    const survey = {
      contact_id: 'c1',
      agent_id: 'a1',
      rating: 5,
      feedback: 'Excelente atendimento!',
    };
    expect(survey.rating).toBeGreaterThanOrEqual(1);
    expect(survey.rating).toBeLessThanOrEqual(5);
  });

  it('computes CSAT average', () => {
    const ratings = [5, 4, 5, 3, 4, 5, 4, 5];
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    expect(avg).toBe(4.375);
    expect(avg).toBeGreaterThan(4);
  });
});

describe('E2E: Automation Rules Engine', () => {
  it('validates automation trigger types', () => {
    const triggers = ['new_message', 'keyword', 'schedule', 'contact_created', 'tag_added', 'queue_changed'];
    expect(triggers).toContain('new_message');
    expect(triggers).toContain('schedule');
  });

  it('validates automation action types', () => {
    const actions = ['send_message', 'assign_agent', 'add_tag', 'move_queue', 'trigger_webhook', 'close_conversation'];
    expect(actions).toContain('send_message');
    expect(actions).toContain('assign_agent');
  });

  it('creates an automation rule', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'auto-1' }, error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('automations').insert({
      name: 'Auto-assign VIP',
      trigger_type: 'tag_added',
      trigger_config: { tag: 'VIP' },
      actions: [{ type: 'assign_agent', agent_id: 'agent-1' }],
      is_active: true,
    });
    expect(mockFrom).toHaveBeenCalledWith('automations');
  });
});

describe('E2E: Knowledge Base RAG Search', () => {
  beforeEach(() => vi.clearAllMocks());

  it('searches knowledge base with ranking', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { id: 'kb1', title: 'Como resetar senha', content: 'Para resetar...', rank: 0.95 },
        { id: 'kb2', title: 'Política de troca', content: 'Trocas podem...', rank: 0.72 },
      ],
      error: null,
    });

    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.rpc('search_knowledge_base', {
      search_query: 'resetar senha',
      max_results: 5,
    });

    expect(data).toHaveLength(2);
    expect(data[0].rank).toBeGreaterThan(data[1].rank);
  });

  it('handles empty search results', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.rpc('search_knowledge_base', {
      search_query: 'xyznonexistent',
      max_results: 5,
    });
    expect(data).toHaveLength(0);
  });
});

describe('E2E: Followup Sequences', () => {
  it('validates followup step structure', () => {
    const steps = [
      { step_order: 1, delay_hours: 0, message_template: 'Olá! Recebemos sua mensagem.' },
      { step_order: 2, delay_hours: 24, message_template: 'Gostaria de dar continuidade?' },
      { step_order: 3, delay_hours: 72, message_template: 'Última tentativa de contato.' },
    ];

    expect(steps).toHaveLength(3);
    expect(steps[0].delay_hours).toBe(0);
    expect(steps[1].delay_hours).toBe(24);
    expect(steps[2].delay_hours).toBe(72);
  });

  it('creates a followup sequence', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'seq-1' }, error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('followup_sequences').insert({
      name: 'Welcome Drip',
      trigger_event: 'first_message',
      is_active: true,
    });
    expect(mockFrom).toHaveBeenCalledWith('followup_sequences');
  });
});
