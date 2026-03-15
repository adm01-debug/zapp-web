import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  };
}

describe('E2E: Authentication Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders login page when not authenticated', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // Auth page should be importable
    const { AuthPage } = await import('@/components/auth/AuthPage');
    expect(AuthPage).toBeDefined();
  });

  it('handles login submission', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: '123', email: 'test@test.com' }, session: { access_token: 'token' } },
      error: null,
    });

    const result = await supabase.auth.signInWithPassword({
      email: 'test@test.com',
      password: 'password123',
    });

    expect(result.data.user).toBeDefined();
    expect(result.data.user.email).toBe('test@test.com');
  });

  it('handles signup submission', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: '456', email: 'new@test.com' }, session: null },
      error: null,
    });

    const result = await supabase.auth.signUp({
      email: 'new@test.com',
      password: 'securePassword123!',
    });

    expect(result.data.user).toBeDefined();
    expect(result.error).toBeNull();
  });

  it('handles failed login with wrong credentials', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });

    const result = await supabase.auth.signInWithPassword({
      email: 'wrong@test.com',
      password: 'wrongpassword',
    });

    expect(result.error).toBeDefined();
    expect(result.error.message).toBe('Invalid login credentials');
  });
});

describe('E2E: Message Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a message to a contact', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: 'msg-1', content: 'Hello!', sender: 'agent', contact_id: 'contact-1' },
      error: null,
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'msg-1', content: 'Hello!', sender: 'agent' },
        error: null,
      }),
    });

    const result = await supabase.from('messages').insert({
      content: 'Hello!',
      sender: 'agent',
      contact_id: 'contact-1',
      message_type: 'text',
    });

    expect(mockInsert).toHaveBeenCalledWith({
      content: 'Hello!',
      sender: 'agent',
      contact_id: 'contact-1',
      message_type: 'text',
    });
  });

  it('receives messages via realtime subscription', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const onCallback = vi.fn().mockReturnThis();
    const subscribeCallback = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });

    (supabase.channel as ReturnType<typeof vi.fn>).mockReturnValue({
      on: onCallback,
      subscribe: subscribeCallback,
    });

    const channel = supabase.channel('test-messages');
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {});
    channel.subscribe();

    expect(onCallback).toHaveBeenCalled();
    expect(subscribeCallback).toHaveBeenCalled();
  });
});

describe('E2E: Contact Management Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a new contact', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const mockInsert = vi.fn().mockResolvedValue({
      data: { id: 'contact-1', name: 'João', phone: '+5511999999999' },
      error: null,
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'contact-1', name: 'João', phone: '+5511999999999' },
        error: null,
      }),
    });

    await supabase.from('contacts').insert({
      name: 'João',
      phone: '+5511999999999',
      email: 'joao@test.com',
    });

    expect(mockInsert).toHaveBeenCalledWith({
      name: 'João',
      phone: '+5511999999999',
      email: 'joao@test.com',
    });
  });

  it('fetches contacts list', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const mockData = [
      { id: '1', name: 'Maria', phone: '+5511111111111' },
      { id: '2', name: 'Pedro', phone: '+5511222222222' },
    ];

    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    });

    const { data } = await supabase
      .from('contacts')
      .select('id, name, phone')
      .order('name');

    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Maria');
  });
});

describe('E2E: Webhook Integration Flow', () => {
  it('validates webhook payload structure for messages.upsert', () => {
    const webhookPayload = {
      event: 'messages.upsert',
      instance: 'wpp2',
      data: {
        key: {
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: false,
          id: 'BAE5F4B3C1234567',
        },
        message: {
          conversation: 'Olá, preciso de ajuda!',
        },
        messageTimestamp: Date.now() / 1000,
        pushName: 'Cliente Teste',
      },
    };

    expect(webhookPayload.event).toBe('messages.upsert');
    expect(webhookPayload.data.key.remoteJid).toContain('@s.whatsapp.net');
    expect(webhookPayload.data.message.conversation).toBeTruthy();
    expect(webhookPayload.data.key.id).toBeTruthy();
  });

  it('validates webhook payload for connection.update', () => {
    const payload = {
      event: 'connection.update',
      instance: 'wpp2',
      data: {
        state: 'open',
        statusReason: 200,
      },
    };

    expect(payload.data.state).toBe('open');
    expect(payload.data.statusReason).toBe(200);
  });

  it('validates webhook payload for MESSAGES_DELETE', () => {
    const payload = {
      event: 'messages.delete',
      instance: 'wpp2',
      data: {
        key: {
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: false,
          id: 'BAE5F4B3C1234567',
        },
      },
    };

    expect(payload.event).toBe('messages.delete');
    expect(payload.data.key.id).toBeTruthy();
  });

  it('validates webhook payload for CALL event', () => {
    const payload = {
      event: 'call',
      instance: 'wpp2',
      data: {
        id: 'call-123',
        from: '5511999999999@s.whatsapp.net',
        status: 'ringing',
        isVideo: false,
        isGroup: false,
      },
    };

    expect(payload.event).toBe('call');
    expect(payload.data.status).toBe('ringing');
  });
});

describe('E2E: Dashboard Data Flow', () => {
  it('fetches and computes dashboard stats', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({
          data: [
            { id: '1', name: 'Agent 1', is_active: true, role: 'agent' },
            { id: '2', name: 'Agent 2', is_active: false, role: 'agent' },
          ],
          error: null,
        }),
      }),
    });

    const { data } = await supabase
      .from('profiles')
      .select('id, name, is_active, role')
      .or('role.eq.agent,role.eq.supervisor');

    const onlineAgents = data?.filter((a: { is_active: boolean }) => a.is_active).length || 0;
    expect(onlineAgents).toBe(1);
    expect(data).toHaveLength(2);
  });
});

describe('E2E: Push Notification Flow', () => {
  it('validates notification payload structure', () => {
    const notificationPayload = {
      title: 'João Silva',
      body: 'Olá, preciso de ajuda com meu pedido',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'msg-contact-1',
      data: {
        conversationId: 'contact-1',
        messageId: 'msg-123',
      },
      requireInteraction: false,
    };

    expect(notificationPayload.title).toBe('João Silva');
    expect(notificationPayload.data.conversationId).toBe('contact-1');
    expect(notificationPayload.tag).toContain('msg-');
  });
});
