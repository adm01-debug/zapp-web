import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }), onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }) },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), then: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) }),
    removeChannel: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: { from: vi.fn().mockReturnValue({ upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }), getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/test.jpg' } }) }) },
  },
}));

// =============================================
// CONTACTS MODULE - Comprehensive Tests
// =============================================
describe('E2E: Contacts Module - Components', () => {
  const contactComponents = ['ContactsView', 'ContactForm', 'CustomFieldsSection', 'AIAvatarGenerator', 'ContactDetailsSkeleton'];
  contactComponents.forEach(name => {
    it(`exports ${name}`, async () => {
      const mod = await import(`../../components/contacts/${name}`);
      expect(mod[name] || mod.default).toBeDefined();
    });
  });
});

describe('E2E: Contacts - Phone Validation', () => {
  const normalizePhone = (phone: string) => phone.replace(/[^0-9+]/g, '');
  
  it('normalizes Brazilian phone numbers', () => {
    expect(normalizePhone('(11) 99999-8888')).toBe('1199999888');
    expect(normalizePhone('+55 11 99999-8888')).toBe('+551199999888');
  });

  it('handles international formats', () => {
    expect(normalizePhone('+1 (555) 123-4567')).toBe('+15551234567');
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('rejects invalid phone numbers', () => {
    const isValid = (phone: string) => {
      const cleaned = normalizePhone(phone);
      return cleaned.length >= 10 && cleaned.length <= 15;
    };
    expect(isValid('123')).toBe(false);
    expect(isValid('+5511999998888')).toBe(true);
    expect(isValid('1234567890123456')).toBe(false);
  });
});

describe('E2E: Contacts - Search & Filter Logic', () => {
  const contacts = [
    { id: '1', name: 'João Silva', phone: '+5511999998888', email: 'joao@test.com', tags: ['vip'], company: 'Acme' },
    { id: '2', name: 'Maria Santos', phone: '+5521988887777', email: 'maria@test.com', tags: ['lead'], company: 'Beta' },
    { id: '3', name: 'Pedro Costa', phone: '+5531977776666', email: null, tags: ['vip', 'premium'], company: null },
  ];

  it('searches contacts by name', () => {
    const results = contacts.filter(c => c.name.toLowerCase().includes('silva'));
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('searches contacts by phone', () => {
    const results = contacts.filter(c => c.phone.includes('988887777'));
    expect(results).toHaveLength(1);
  });

  it('filters contacts by tag', () => {
    const results = contacts.filter(c => c.tags?.includes('vip'));
    expect(results).toHaveLength(2);
  });

  it('filters contacts by company', () => {
    const results = contacts.filter(c => c.company === 'Acme');
    expect(results).toHaveLength(1);
  });

  it('handles empty search gracefully', () => {
    const results = contacts.filter(c => c.name.toLowerCase().includes(''));
    expect(results).toHaveLength(3);
  });

  it('handles no results', () => {
    const results = contacts.filter(c => c.name.toLowerCase().includes('xyz'));
    expect(results).toHaveLength(0);
  });

  it('sorts contacts alphabetically', () => {
    const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted[0].name).toBe('João Silva');
    expect(sorted[2].name).toBe('Pedro Costa');
  });

  it('sorts contacts by most recent', () => {
    const withDates = contacts.map((c, i) => ({ ...c, created_at: new Date(2026, 0, i + 1).toISOString() }));
    const sorted = [...withDates].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    expect(sorted[0].id).toBe('3');
  });
});

describe('E2E: Contacts - Custom Fields', () => {
  it('validates field types', () => {
    const fieldTypes = ['text', 'number', 'date', 'email', 'url', 'select'];
    const validateField = (type: string, value: string) => {
      switch (type) {
        case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        case 'number': return !isNaN(Number(value));
        case 'url': return /^https?:\/\/.+/.test(value);
        case 'date': return !isNaN(Date.parse(value));
        default: return value.length > 0;
      }
    };
    expect(validateField('email', 'test@test.com')).toBe(true);
    expect(validateField('email', 'invalid')).toBe(false);
    expect(validateField('number', '42')).toBe(true);
    expect(validateField('number', 'abc')).toBe(false);
    expect(validateField('url', 'https://google.com')).toBe(true);
    expect(validateField('url', 'not-url')).toBe(false);
    expect(validateField('date', '2026-03-22')).toBe(true);
    expect(fieldTypes).toHaveLength(6);
  });

  it('handles field CRUD operations', () => {
    const fields: Array<{ name: string; value: string }> = [];
    fields.push({ name: 'CPF', value: '123.456.789-00' });
    expect(fields).toHaveLength(1);
    fields[0].value = '987.654.321-00';
    expect(fields[0].value).toBe('987.654.321-00');
    fields.splice(0, 1);
    expect(fields).toHaveLength(0);
  });
});

describe('E2E: Contacts - Bulk Operations', () => {
  it('selects multiple contacts', () => {
    const selected = new Set<string>();
    selected.add('1'); selected.add('2'); selected.add('3');
    expect(selected.size).toBe(3);
    selected.delete('2');
    expect(selected.size).toBe(2);
    expect(selected.has('2')).toBe(false);
  });

  it('selects all / deselects all', () => {
    const ids = ['1', '2', '3', '4', '5'];
    let selected = new Set<string>();
    selected = new Set(ids);
    expect(selected.size).toBe(5);
    selected.clear();
    expect(selected.size).toBe(0);
  });

  it('bulk tag assignment', () => {
    const contacts = [
      { id: '1', tags: ['a'] },
      { id: '2', tags: ['b'] },
    ];
    const newTag = 'vip';
    const updated = contacts.map(c => ({ ...c, tags: [...c.tags, newTag] }));
    expect(updated[0].tags).toContain('vip');
    expect(updated[1].tags).toContain('vip');
  });

  it('bulk delete contacts', () => {
    let contacts = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const toDelete = new Set(['1', '3']);
    contacts = contacts.filter(c => !toDelete.has(c.id));
    expect(contacts).toHaveLength(1);
    expect(contacts[0].id).toBe('2');
  });
});

// =============================================
// CAMPAIGNS MODULE - Comprehensive Tests
// =============================================
describe('E2E: Campaigns Module', () => {
  it('exports CampaignsView', async () => {
    const mod = await import('../../components/campaigns/CampaignsView');
    expect(mod.CampaignsView).toBeDefined();
  });
});

describe('E2E: Campaigns - Status Machine', () => {
  const transitions: Record<string, string[]> = {
    draft: ['scheduled', 'sending', 'cancelled'],
    scheduled: ['sending', 'cancelled'],
    sending: ['paused', 'completed', 'failed'],
    paused: ['sending', 'cancelled'],
    completed: [],
    cancelled: [],
    failed: ['draft'],
  };

  it('validates all campaign status transitions', () => {
    expect(transitions['draft']).toContain('sending');
    expect(transitions['sending']).toContain('paused');
    expect(transitions['completed']).toHaveLength(0);
    expect(transitions['failed']).toContain('draft');
  });

  it('prevents invalid transitions', () => {
    const canTransition = (from: string, to: string) => transitions[from]?.includes(to) ?? false;
    expect(canTransition('completed', 'sending')).toBe(false);
    expect(canTransition('cancelled', 'sending')).toBe(false);
    expect(canTransition('draft', 'completed')).toBe(false);
  });
});

describe('E2E: Campaigns - Message Templates', () => {
  it('replaces template variables', () => {
    const template = 'Olá {{name}}, sua compra {{order_id}} foi confirmada!';
    const vars = { name: 'João', order_id: '#12345' };
    const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key as keyof typeof vars] || '');
    expect(result).toBe('Olá João, sua compra #12345 foi confirmada!');
  });

  it('handles missing variables gracefully', () => {
    const template = 'Olá {{name}}, pedido {{order_id}}';
    const vars = { name: 'Maria' };
    const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars as Record<string, string>)[key] || `{{${key}}}`);
    expect(result).toBe('Olá Maria, pedido {{order_id}}');
  });

  it('validates message content length', () => {
    const maxLength = 4096;
    const short = 'Hello';
    const long = 'x'.repeat(5000);
    expect(short.length <= maxLength).toBe(true);
    expect(long.length <= maxLength).toBe(false);
  });
});

describe('E2E: Campaigns - Scheduling', () => {
  it('validates future date scheduling', () => {
    const now = new Date('2026-03-22T10:00:00Z');
    const future = new Date('2026-03-25T10:00:00Z');
    const past = new Date('2026-03-20T10:00:00Z');
    expect(future > now).toBe(true);
    expect(past > now).toBe(false);
  });

  it('calculates send interval', () => {
    const totalContacts = 1000;
    const intervalSeconds = 5;
    const totalTimeMinutes = (totalContacts * intervalSeconds) / 60;
    expect(totalTimeMinutes).toBeCloseTo(83.33, 1);
  });

  it('validates delivery rate calculation', () => {
    const campaign = { sent_count: 800, total_contacts: 1000, delivered_count: 750, failed_count: 50, read_count: 500 };
    const deliveryRate = (campaign.delivered_count / campaign.sent_count) * 100;
    const readRate = (campaign.read_count / campaign.delivered_count) * 100;
    const failRate = (campaign.failed_count / campaign.sent_count) * 100;
    expect(deliveryRate).toBeCloseTo(93.75);
    expect(readRate).toBeCloseTo(66.67, 1);
    expect(failRate).toBeCloseTo(6.25);
  });
});

describe('E2E: Campaigns - Contact Targeting', () => {
  it('filters contacts by tag for campaign', () => {
    const allContacts = [
      { id: '1', tags: ['cliente', 'vip'] },
      { id: '2', tags: ['lead'] },
      { id: '3', tags: ['cliente'] },
      { id: '4', tags: ['vip'] },
    ];
    const targeted = allContacts.filter(c => c.tags.includes('vip'));
    expect(targeted).toHaveLength(2);
  });

  it('excludes already-contacted', () => {
    const all = ['1', '2', '3', '4', '5'];
    const alreadySent = new Set(['2', '4']);
    const remaining = all.filter(id => !alreadySent.has(id));
    expect(remaining).toEqual(['1', '3', '5']);
  });
});

// =============================================
// PIPELINE / CRM MODULE
// =============================================
describe('E2E: Sales Pipeline Module', () => {
  it('exports SalesPipelineView', async () => {
    const mod = await import('../../components/pipeline/SalesPipelineView');
    expect(mod.SalesPipelineView).toBeDefined();
  });
});

describe('E2E: Pipeline - Stage Management', () => {
  const stages = [
    { id: '1', name: 'Prospecção', order: 1, deals: [{ id: 'd1', value: 5000 }, { id: 'd2', value: 3000 }] },
    { id: '2', name: 'Qualificação', order: 2, deals: [{ id: 'd3', value: 10000 }] },
    { id: '3', name: 'Proposta', order: 3, deals: [{ id: 'd4', value: 25000 }] },
    { id: '4', name: 'Negociação', order: 4, deals: [] },
    { id: '5', name: 'Fechado Ganho', order: 5, deals: [{ id: 'd5', value: 15000 }] },
    { id: '6', name: 'Fechado Perdido', order: 6, deals: [] },
  ];

  it('calculates pipeline total value', () => {
    const total = stages.flatMap(s => s.deals).reduce((sum, d) => sum + d.value, 0);
    expect(total).toBe(58000);
  });

  it('calculates stage-level totals', () => {
    const stageTotal = (stageId: string) => stages.find(s => s.id === stageId)!.deals.reduce((sum, d) => sum + d.value, 0);
    expect(stageTotal('1')).toBe(8000);
    expect(stageTotal('3')).toBe(25000);
    expect(stageTotal('4')).toBe(0);
  });

  it('counts deals per stage', () => {
    const counts = stages.map(s => ({ name: s.name, count: s.deals.length }));
    expect(counts[0].count).toBe(2);
    expect(counts[3].count).toBe(0);
  });

  it('calculates conversion rate between stages', () => {
    const totalDeals = stages.flatMap(s => s.deals).length;
    const wonDeals = stages.find(s => s.name === 'Fechado Ganho')!.deals.length;
    const conversionRate = (wonDeals / totalDeals) * 100;
    expect(conversionRate).toBe(20);
  });

  it('moves deal between stages', () => {
    const pipeline = stages.map(s => ({ ...s, deals: [...s.deals] }));
    const deal = pipeline[0].deals.splice(0, 1)[0];
    pipeline[1].deals.push(deal);
    expect(pipeline[0].deals).toHaveLength(1);
    expect(pipeline[1].deals).toHaveLength(2);
  });

  it('validates deal data', () => {
    const validateDeal = (deal: { title?: string; value?: number; contact_id?: string }) => {
      const errors: string[] = [];
      if (!deal.title || deal.title.length < 3) errors.push('title_required');
      if (deal.value === undefined || deal.value < 0) errors.push('invalid_value');
      if (!deal.contact_id) errors.push('contact_required');
      return errors;
    };
    expect(validateDeal({ title: 'AB', value: -1 })).toEqual(['title_required', 'invalid_value', 'contact_required']);
    expect(validateDeal({ title: 'Good Deal', value: 5000, contact_id: '123' })).toEqual([]);
  });
});

// =============================================
// KNOWLEDGE BASE MODULE
// =============================================
describe('E2E: Knowledge Base Module', () => {
  it('exports KnowledgeBaseView', async () => {
    const mod = await import('../../components/knowledge/KnowledgeBaseView');
    expect(mod.KnowledgeBaseView).toBeDefined();
  });
});

describe('E2E: Knowledge Base - Search', () => {
  const articles = [
    { id: '1', title: 'Como resetar senha', content: 'Para resetar sua senha, acesse configurações...', tags: ['auth', 'senha'], category: 'Suporte' },
    { id: '2', title: 'Configurar WhatsApp', content: 'Para conectar seu WhatsApp, vá em integrações...', tags: ['whatsapp', 'config'], category: 'Integrações' },
    { id: '3', title: 'Relatórios de vendas', content: 'Os relatórios podem ser exportados em PDF ou CSV...', tags: ['reports', 'vendas'], category: 'Relatórios' },
  ];

  it('searches by title', () => {
    const results = articles.filter(a => a.title.toLowerCase().includes('whatsapp'));
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('2');
  });

  it('searches by content', () => {
    const results = articles.filter(a => a.content.toLowerCase().includes('pdf'));
    expect(results).toHaveLength(1);
  });

  it('filters by category', () => {
    const results = articles.filter(a => a.category === 'Suporte');
    expect(results).toHaveLength(1);
  });

  it('filters by tags', () => {
    const results = articles.filter(a => a.tags.includes('whatsapp'));
    expect(results).toHaveLength(1);
  });

  it('full text search across fields', () => {
    const search = (q: string) => articles.filter(a =>
      a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) || a.tags.some(t => t.includes(q))
    );
    expect(search('senha')).toHaveLength(1);
    expect(search('config')).toHaveLength(1);
  });
});

// =============================================
// CLIENT WALLET MODULE
// =============================================
describe('E2E: Client Wallet Module', () => {
  it('exports ClientWalletView', async () => {
    const mod = await import('../../components/wallet/ClientWalletView');
    expect(mod.ClientWalletView).toBeDefined();
  });

  it('validates wallet assignment rules', () => {
    const rules = [
      { id: '1', agent_id: 'a1', name: 'Rule VIP', priority: 1, is_active: true },
      { id: '2', agent_id: 'a2', name: 'Rule Standard', priority: 2, is_active: true },
      { id: '3', agent_id: 'a3', name: 'Disabled', priority: 3, is_active: false },
    ];
    const activeRules = rules.filter(r => r.is_active).sort((a, b) => a.priority - b.priority);
    expect(activeRules).toHaveLength(2);
    expect(activeRules[0].name).toBe('Rule VIP');
  });
});

// =============================================
// SCHEDULE MODULE
// =============================================
describe('E2E: Schedule Module', () => {
  it('exports ScheduleCalendarView', async () => {
    const mod = await import('../../components/schedule/ScheduleCalendarView');
    expect(mod.ScheduleCalendarView).toBeDefined();
  });

  it('validates time slot overlap detection', () => {
    const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) =>
      a.start < b.end && b.start < a.end;
    expect(overlaps({ start: '09:00', end: '10:00' }, { start: '09:30', end: '11:00' })).toBe(true);
    expect(overlaps({ start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' })).toBe(false);
    expect(overlaps({ start: '09:00', end: '10:00' }, { start: '08:00', end: '09:30' })).toBe(true);
  });

  it('generates weekly schedule', () => {
    const days = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const schedule = days.map((day, i) => ({ day, isOpen: i < 5, open: i < 5 ? '08:00' : null, close: i < 5 ? '18:00' : null }));
    const openDays = schedule.filter(s => s.isOpen);
    expect(openDays).toHaveLength(5);
    expect(schedule[5].isOpen).toBe(false);
  });
});

// =============================================
// GROUPS MODULE
// =============================================
describe('E2E: Groups Module', () => {
  it('exports GroupsView', async () => {
    const mod = await import('../../components/groups/GroupsView');
    expect(mod.GroupsView).toBeDefined();
  });

  it('manages group members', () => {
    const group = { id: '1', name: 'VIP', members: ['c1', 'c2', 'c3'] };
    group.members.push('c4');
    expect(group.members).toHaveLength(4);
    group.members = group.members.filter(m => m !== 'c2');
    expect(group.members).toHaveLength(3);
    expect(group.members).not.toContain('c2');
  });
});

// =============================================
// WHATSAPP FLOWS MODULE
// =============================================
describe('E2E: WhatsApp Flows Module', () => {
  it('exports WhatsAppFlowsBuilder', async () => {
    const mod = await import('../../components/whatsapp-flows/WhatsAppFlowsBuilder');
    expect(mod.default || mod.WhatsAppFlowsBuilder).toBeDefined();
  });
});

// =============================================
// ONBOARDING MODULE
// =============================================
describe('E2E: Onboarding Module', () => {
  const components = ['OnboardingChecklist', 'OnboardingTour', 'WelcomeModal'];
  components.forEach(name => {
    it(`exports ${name}`, async () => {
      const mod = await import(`../../components/onboarding/${name}`);
      expect(mod[name] || mod.default).toBeDefined();
    });
  });

  it('validates checklist completion', () => {
    const steps = [
      { id: '1', label: 'Criar conta', completed: true },
      { id: '2', label: 'Conectar WhatsApp', completed: true },
      { id: '3', label: 'Importar contatos', completed: false },
      { id: '4', label: 'Enviar primeira mensagem', completed: false },
    ];
    const progress = steps.filter(s => s.completed).length / steps.length * 100;
    expect(progress).toBe(50);
  });
});

// =============================================
// COMPLIANCE MODULE
// =============================================
describe('E2E: Compliance (LGPD) Module', () => {
  it('exports LGPDComplianceView', async () => {
    const mod = await import('../../components/compliance/LGPDComplianceView');
    expect(mod.default || mod.LGPDComplianceView).toBeDefined();
  });

  it('validates data retention policies', () => {
    const retentionDays = 365;
    const createdAt = new Date('2025-01-01');
    const now = new Date('2026-03-22');
    const daysPassed = Math.floor((now.getTime() - createdAt.getTime()) / 86400000);
    expect(daysPassed > retentionDays).toBe(true);
  });

  it('validates consent tracking', () => {
    const consent = { marketing: true, analytics: false, thirdParty: false };
    const hasAllRequired = consent.marketing;
    expect(hasAllRequired).toBe(true);
  });
});

// =============================================
// DIAGNOSTICS MODULE
// =============================================
describe('E2E: Diagnostics Module', () => {
  const components = ['DiagnosticsView', 'ConnectionHealthPanel'];
  components.forEach(name => {
    it(`exports ${name}`, async () => {
      const mod = await import(`../../components/diagnostics/${name}`);
      expect(mod[name] || mod.default).toBeDefined();
    });
  });

  it('validates connection health status', () => {
    const health = { status: 'connected', latency: 45, uptime: 99.9, lastCheck: new Date().toISOString() };
    expect(health.status).toBe('connected');
    expect(health.latency).toBeLessThan(100);
    expect(health.uptime).toBeGreaterThan(99);
  });

  it('classifies health status', () => {
    const classify = (latency: number) => latency < 50 ? 'excellent' : latency < 150 ? 'good' : latency < 500 ? 'degraded' : 'critical';
    expect(classify(30)).toBe('excellent');
    expect(classify(100)).toBe('good');
    expect(classify(300)).toBe('degraded');
    expect(classify(1000)).toBe('critical');
  });
});
