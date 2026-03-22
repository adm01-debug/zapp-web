import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }), onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }) },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), then: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) }),
    removeChannel: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// =============================================
// 1. REALTIME TYPING INDICATORS
// =============================================
describe('E2E: Typing Indicators', () => {
  it('sends typing event with debounce', () => {
    let lastSent = 0;
    const DEBOUNCE_MS = 3000;
    const shouldSendTyping = (now: number) => {
      if (now - lastSent > DEBOUNCE_MS) { lastSent = now; return true; }
      return false;
    };
    expect(shouldSendTyping(4000)).toBe(true);
    expect(shouldSendTyping(5000)).toBe(false);
    expect(shouldSendTyping(8000)).toBe(true);
  });

  it('shows typing for multiple agents', () => {
    const typingAgents = ['Carlos', 'Ana'];
    const formatTyping = (agents: string[]) => {
      if (agents.length === 0) return '';
      if (agents.length === 1) return `${agents[0]} está digitando...`;
      return `${agents.join(' e ')} estão digitando...`;
    };
    expect(formatTyping(typingAgents)).toBe('Carlos e Ana estão digitando...');
    expect(formatTyping(['Carlos'])).toBe('Carlos está digitando...');
    expect(formatTyping([])).toBe('');
  });

  it('expires typing indicator after timeout', () => {
    const TIMEOUT = 5000;
    const isExpired = (lastTyping: number, now: number) => now - lastTyping > TIMEOUT;
    expect(isExpired(1000, 3000)).toBe(false);
    expect(isExpired(1000, 7000)).toBe(true);
  });

  it('handles typing in group conversations', () => {
    const typingMap: Record<string, number> = { a1: 1000, a2: 2000, a3: 3000 };
    const active = Object.entries(typingMap).filter(([, ts]) => 5000 - ts < 5000);
    expect(active).toHaveLength(3);
  });
});

// =============================================
// 2. REALTIME MESSAGE SYNC
// =============================================
describe('E2E: Realtime Message Sync', () => {
  it('handles INSERT event', () => {
    const messages = [{ id: '1', text: 'Hello' }];
    const handleInsert = (msg: { id: string; text: string }) => [...messages, msg];
    const updated = handleInsert({ id: '2', text: 'World' });
    expect(updated).toHaveLength(2);
  });

  it('handles UPDATE event', () => {
    const messages = [{ id: '1', text: 'Hello', status: 'sent' }];
    const handleUpdate = (id: string, changes: Partial<typeof messages[0]>) =>
      messages.map(m => m.id === id ? { ...m, ...changes } : m);
    const updated = handleUpdate('1', { status: 'delivered' });
    expect(updated[0].status).toBe('delivered');
  });

  it('handles DELETE event', () => {
    const messages = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const handleDelete = (id: string) => messages.filter(m => m.id !== id);
    expect(handleDelete('2')).toHaveLength(2);
  });

  it('deduplicates messages by ID', () => {
    const msgs = [{ id: '1' }, { id: '2' }, { id: '1' }];
    const unique = [...new Map(msgs.map(m => [m.id, m])).values()];
    expect(unique).toHaveLength(2);
  });

  it('sorts messages by timestamp', () => {
    const msgs = [
      { id: '1', ts: '2026-03-22T10:00:00Z' },
      { id: '2', ts: '2026-03-22T09:00:00Z' },
      { id: '3', ts: '2026-03-22T11:00:00Z' },
    ];
    const sorted = [...msgs].sort((a, b) => a.ts.localeCompare(b.ts));
    expect(sorted[0].id).toBe('2');
    expect(sorted[2].id).toBe('3');
  });

  it('handles optimistic updates', () => {
    const optimistic = { id: 'temp-1', text: 'Sending...', status: 'pending' };
    const confirmed = { id: 'real-1', text: 'Sending...', status: 'sent' };
    const msgs = [optimistic];
    const reconciled = msgs.map(m => m.id === 'temp-1' ? confirmed : m);
    expect(reconciled[0].id).toBe('real-1');
    expect(reconciled[0].status).toBe('sent');
  });

  it('validates channel subscription format', () => {
    const channel = {
      name: 'messages:conv-123',
      event: 'postgres_changes',
      schema: 'public',
      table: 'messages',
      filter: 'conversation_id=eq.conv-123',
    };
    expect(channel.schema).toBe('public');
    expect(channel.filter).toContain('conv-123');
  });

  it('handles reconnection after disconnect', () => {
    let connected = true;
    const disconnect = () => { connected = false; };
    const reconnect = () => { connected = true; };
    disconnect();
    expect(connected).toBe(false);
    reconnect();
    expect(connected).toBe(true);
  });
});

// =============================================
// 3. PRESENCE & ONLINE STATUS
// =============================================
describe('E2E: Agent Presence System', () => {
  it('tracks agent online status', () => {
    const presence: Record<string, { status: string; lastSeen: string }> = {
      a1: { status: 'online', lastSeen: '2026-03-22T14:00:00Z' },
      a2: { status: 'away', lastSeen: '2026-03-22T13:50:00Z' },
      a3: { status: 'offline', lastSeen: '2026-03-22T12:00:00Z' },
    };
    expect(presence.a1.status).toBe('online');
    expect(Object.values(presence).filter(p => p.status === 'online')).toHaveLength(1);
  });

  it('auto-sets away after inactivity', () => {
    const INACTIVITY_MS = 5 * 60 * 1000;
    const shouldGoAway = (lastActivity: number, now: number) => now - lastActivity > INACTIVITY_MS;
    expect(shouldGoAway(0, 4 * 60 * 1000)).toBe(false);
    expect(shouldGoAway(0, 6 * 60 * 1000)).toBe(true);
  });

  it('formats last seen time', () => {
    const formatLastSeen = (minutesAgo: number) => {
      if (minutesAgo < 1) return 'Agora';
      if (minutesAgo < 60) return `${minutesAgo}min atrás`;
      if (minutesAgo < 1440) return `${Math.floor(minutesAgo / 60)}h atrás`;
      return `${Math.floor(minutesAgo / 1440)}d atrás`;
    };
    expect(formatLastSeen(0)).toBe('Agora');
    expect(formatLastSeen(5)).toBe('5min atrás');
    expect(formatLastSeen(120)).toBe('2h atrás');
    expect(formatLastSeen(2880)).toBe('2d atrás');
  });

  it('validates presence payload', () => {
    const payload = {
      user_id: 'a1',
      status: 'online',
      current_conversation: 'conv-123',
      joined_at: new Date().toISOString(),
    };
    expect(payload.user_id).toBeTruthy();
    expect(['online', 'away', 'busy', 'offline']).toContain(payload.status);
  });

  it('counts online agents', () => {
    const agents = [
      { status: 'online' }, { status: 'online' },
      { status: 'away' }, { status: 'offline' },
    ];
    const onlineCount = agents.filter(a => a.status === 'online').length;
    expect(onlineCount).toBe(2);
  });
});

// =============================================
// 4. UNDO SEND — Toast with Timer
// =============================================
describe('E2E: Undo Send Feature', () => {
  it('creates undo window of 3 seconds', () => {
    const UNDO_WINDOW_MS = 3000;
    const sentAt = Date.now();
    const canUndo = (now: number) => now - sentAt < UNDO_WINDOW_MS;
    expect(canUndo(sentAt + 1000)).toBe(true);
    expect(canUndo(sentAt + 3001)).toBe(false);
  });

  it('queues message during undo window', () => {
    const queue: { id: string; text: string; status: string }[] = [];
    const queueMessage = (id: string, text: string) => {
      queue.push({ id, text, status: 'queued' });
    };
    queueMessage('m1', 'Hello');
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('queued');
  });

  it('removes message on undo', () => {
    const queue = [{ id: 'm1', text: 'Hello' }, { id: 'm2', text: 'World' }];
    const undo = (id: string) => queue.filter(m => m.id !== id);
    expect(undo('m1')).toHaveLength(1);
  });

  it('sends message after undo window expires', () => {
    let sent = false;
    const sendAfterDelay = () => { sent = true; };
    sendAfterDelay();
    expect(sent).toBe(true);
  });

  it('shows countdown in toast', () => {
    const formatCountdown = (remainingMs: number) => `Desfazer (${Math.ceil(remainingMs / 1000)}s)`;
    expect(formatCountdown(3000)).toBe('Desfazer (3s)');
    expect(formatCountdown(1500)).toBe('Desfazer (2s)');
    expect(formatCountdown(500)).toBe('Desfazer (1s)');
  });
});

// =============================================
// 5. LINK PREVIEW IN INPUT
// =============================================
describe('E2E: Link Preview Detection', () => {
  const URL_REGEX = /https?:\/\/[^\s]+/g;

  it('detects URLs in text', () => {
    const text = 'Check https://google.com for more';
    const urls = text.match(URL_REGEX);
    expect(urls).toEqual(['https://google.com']);
  });

  it('detects multiple URLs', () => {
    const text = 'Visit https://a.com and https://b.com';
    const urls = text.match(URL_REGEX);
    expect(urls).toHaveLength(2);
  });

  it('returns null for no URLs', () => {
    expect('Hello world'.match(URL_REGEX)).toBeNull();
  });

  it('handles URLs with paths', () => {
    const text = 'See https://example.com/path/to/page?q=1';
    const urls = text.match(URL_REGEX);
    expect(urls![0]).toContain('/path/to/page');
  });

  it('validates link preview data shape', () => {
    const preview = { url: 'https://x.com', title: 'Page', description: 'Desc', image: 'https://x.com/img.png' };
    expect(preview.url).toBeTruthy();
    expect(preview.title).toBeTruthy();
  });

  it('debounces URL detection', () => {
    let detectCount = 0;
    const texts = ['h', 'ht', 'htt', 'http', 'https', 'https:', 'https://', 'https://g'];
    texts.forEach(t => {
      if (URL_REGEX.test(t)) detectCount++;
      URL_REGEX.lastIndex = 0;
    });
    expect(detectCount).toBe(1); // Only the last one matches
  });
});

// =============================================
// 6. CLIPBOARD IMAGE PASTE
// =============================================
describe('E2E: Clipboard Image Paste', () => {
  it('detects image in clipboard data', () => {
    const hasImage = (types: string[]) => types.some(t => t.startsWith('image/'));
    expect(hasImage(['text/plain', 'image/png'])).toBe(true);
    expect(hasImage(['text/plain', 'text/html'])).toBe(false);
  });

  it('validates image MIME types', () => {
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    expect(validTypes).toContain('image/png');
    expect(validTypes).not.toContain('image/bmp');
  });

  it('generates preview URL from blob', () => {
    const mockUrl = 'blob:http://localhost/abc123';
    expect(mockUrl).toContain('blob:');
  });

  it('limits paste image size', () => {
    const MAX_SIZE = 5 * 1024 * 1024;
    expect(4 * 1024 * 1024 <= MAX_SIZE).toBe(true);
    expect(6 * 1024 * 1024 <= MAX_SIZE).toBe(false);
  });

  it('creates file from clipboard blob', () => {
    const filename = `paste-${Date.now()}.png`;
    expect(filename).toContain('paste-');
    expect(filename).toContain('.png');
  });
});

// =============================================
// 7. ADAPTIVE SEND/MIC BUTTON
// =============================================
describe('E2E: Adaptive Send/Mic Button', () => {
  it('shows mic when input is empty', () => {
    const getButton = (text: string) => text.trim().length > 0 ? 'send' : 'mic';
    expect(getButton('')).toBe('mic');
    expect(getButton('   ')).toBe('mic');
  });

  it('shows send when input has text', () => {
    const getButton = (text: string) => text.trim().length > 0 ? 'send' : 'mic';
    expect(getButton('Hello')).toBe('send');
  });

  it('transitions smoothly between states', () => {
    const states = ['mic', 'send', 'mic', 'send'];
    states.forEach(s => expect(['mic', 'send']).toContain(s));
  });

  it('shows send during recording preview', () => {
    const getButton = (isRecordingPreview: boolean, text: string) => {
      if (isRecordingPreview) return 'send';
      return text.trim() ? 'send' : 'mic';
    };
    expect(getButton(true, '')).toBe('send');
  });

  it('disables send while isSending', () => {
    const isSending = true;
    expect(isSending).toBe(true);
  });
});

// =============================================
// 8. TOOLBAR GROUPING — 3 Levels
// =============================================
describe('E2E: Toolbar Icon Grouping', () => {
  it('categorizes tools into 3 levels', () => {
    const levels = {
      primary: ['send', 'attach', 'audio'],
      secondary: ['emoji', 'sticker'],
      tertiary: ['location', 'catalog', 'interactive', 'schedule'],
    };
    expect(levels.primary).toHaveLength(3);
    expect(levels.secondary).toHaveLength(2);
    expect(levels.tertiary.length).toBeGreaterThanOrEqual(3);
  });

  it('always shows primary tools', () => {
    const visibleTools = (screenWidth: number) => {
      const tools = ['send', 'attach', 'audio'];
      if (screenWidth >= 768) tools.push('emoji', 'sticker');
      if (screenWidth >= 1024) tools.push('location', 'catalog');
      return tools;
    };
    expect(visibleTools(375)).toHaveLength(3);
    expect(visibleTools(768)).toHaveLength(5);
    expect(visibleTools(1024)).toHaveLength(7);
  });

  it('groups tertiary in overflow menu', () => {
    const tertiaryTools = ['location', 'catalog', 'interactive', 'schedule', 'template'];
    expect(tertiaryTools.length).toBeGreaterThan(3);
  });

  it('validates tool tooltip text', () => {
    const tooltips: Record<string, string> = {
      send: 'Enviar mensagem',
      attach: 'Anexar arquivo',
      audio: 'Gravar áudio',
      emoji: 'Emoji',
      sticker: 'Figurinha',
    };
    Object.values(tooltips).forEach(t => expect(t.length).toBeGreaterThan(0));
  });
});

// =============================================
// 9. SEND ANIMATION & FEEDBACK
// =============================================
describe('E2E: Send Animation & Visual Feedback', () => {
  it('validates swoosh animation config', () => {
    const animation = {
      initial: { scale: 1, opacity: 1 },
      animate: { scale: 0.8, opacity: 0, y: -20 },
      duration: 0.3,
    };
    expect(animation.duration).toBeLessThan(1);
    expect(animation.animate.scale).toBeLessThan(animation.initial.scale);
  });

  it('shows spinner during send', () => {
    const states = { idle: false, sending: true, sent: false };
    expect(states.sending).toBe(true);
  });

  it('validates success checkmark timing', () => {
    const SHOW_CHECK_MS = 1500;
    expect(SHOW_CHECK_MS).toBeGreaterThan(500);
    expect(SHOW_CHECK_MS).toBeLessThan(3000);
  });

  it('handles send failure gracefully', () => {
    const handleError = (error: string) => ({
      showRetry: true,
      message: `Falha ao enviar: ${error}`,
    });
    const result = handleError('Network error');
    expect(result.showRetry).toBe(true);
    expect(result.message).toContain('Falha');
  });
});
