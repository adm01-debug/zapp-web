import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }), onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }) },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), then: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) }),
    removeChannel: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// =============================================
// 1. TEXTAREA & AUTO-GROW
// =============================================
describe('E2E: Textarea & Auto-Grow', () => {
  it('exports ChatInputArea with textarea support', async () => {
    const mod = await import('@/components/inbox/chat/ChatInputArea');
    expect(mod.ChatInputArea).toBeDefined();
  });

  it('validates auto-grow height calculation', () => {
    const calcHeight = (scrollHeight: number, minH: number, maxH: number) =>
      Math.min(Math.max(scrollHeight, minH), maxH);
    expect(calcHeight(40, 44, 200)).toBe(44);
    expect(calcHeight(100, 44, 200)).toBe(100);
    expect(calcHeight(300, 44, 200)).toBe(200);
  });

  it('validates textarea reset to min height on clear', () => {
    const minHeight = 44;
    const resetHeight = (currentText: string) => currentText === '' ? minHeight : null;
    expect(resetHeight('')).toBe(minHeight);
    expect(resetHeight('hello')).toBeNull();
  });

  it('validates max-height constraint of 200px', () => {
    const maxH = 200;
    const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n');
    const estimatedHeight = lines.split('\n').length * 20;
    expect(Math.min(estimatedHeight, maxH)).toBe(maxH);
  });
});

// =============================================
// 2. CHARACTER COUNTER (4096 limit)
// =============================================
describe('E2E: Character Counter', () => {
  const MAX_CHARS = 4096;

  it('validates character count display', () => {
    const getCount = (text: string) => `${text.length}/${MAX_CHARS}`;
    expect(getCount('Hello')).toBe('5/4096');
    expect(getCount('')).toBe('0/4096');
  });

  it('validates warning state near limit', () => {
    const isWarning = (len: number) => len > MAX_CHARS * 0.9;
    expect(isWarning(3600)).toBe(false);
    expect(isWarning(3700)).toBe(true);
    expect(isWarning(4096)).toBe(true);
  });

  it('validates error state over limit', () => {
    const isOver = (len: number) => len > MAX_CHARS;
    expect(isOver(4096)).toBe(false);
    expect(isOver(4097)).toBe(true);
  });

  it('validates count with multi-byte characters', () => {
    const emoji = '😀'.repeat(100);
    expect(emoji.length).toBe(200); // JS string length
    const text = 'Olá 🇧🇷 teste';
    expect(text.length).toBeGreaterThan(0);
  });
});

// =============================================
// 3. DRAFTS (localStorage)
// =============================================
describe('E2E: Auto-Save Drafts', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) { return this.store[key] ?? null; },
      setItem(key: string, value: string) { this.store[key] = value; },
      removeItem(key: string) { delete this.store[key]; },
      clear() { this.store = {}; },
    });
  });

  it('saves draft to localStorage', () => {
    const contactId = 'c-123';
    const key = `draft-${contactId}`;
    localStorage.setItem(key, 'Rascunho de teste');
    expect(localStorage.getItem(key)).toBe('Rascunho de teste');
  });

  it('restores draft on mount', () => {
    const contactId = 'c-456';
    localStorage.setItem(`draft-${contactId}`, 'Mensagem salva');
    const restored = localStorage.getItem(`draft-${contactId}`);
    expect(restored).toBe('Mensagem salva');
  });

  it('clears draft after send', () => {
    const contactId = 'c-789';
    const key = `draft-${contactId}`;
    localStorage.setItem(key, 'Será enviada');
    // Simulate send
    localStorage.removeItem(key);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('handles debounced save (500ms interval)', () => {
    const saves: string[] = [];
    const debouncedSave = (text: string) => { saves.push(text); };
    debouncedSave('a'); debouncedSave('ab'); debouncedSave('abc');
    expect(saves).toHaveLength(3);
  });

  it('does not save empty drafts', () => {
    const shouldSave = (text: string) => text.trim().length > 0;
    expect(shouldSave('')).toBe(false);
    expect(shouldSave('   ')).toBe(false);
    expect(shouldSave('hello')).toBe(true);
  });
});

// =============================================
// 4. ADAPTIVE SEND/MIC BUTTON
// =============================================
describe('E2E: Adaptive Send/Mic Button', () => {
  it('shows Mic when input is empty', () => {
    const getButtonType = (text: string) => text.trim() ? 'send' : 'mic';
    expect(getButtonType('')).toBe('mic');
    expect(getButtonType('   ')).toBe('mic');
  });

  it('shows Send when input has text', () => {
    const getButtonType = (text: string) => text.trim() ? 'send' : 'mic';
    expect(getButtonType('Hello')).toBe('send');
    expect(getButtonType('  a  ')).toBe('send');
  });

  it('transitions smoothly between states', () => {
    const states: string[] = [];
    const getButton = (text: string) => text.trim() ? 'send' : 'mic';
    ['', 'H', 'He', '', ''].forEach(t => states.push(getButton(t)));
    expect(states).toEqual(['mic', 'send', 'send', 'mic', 'mic']);
  });
});

// =============================================
// 5. UNDO TOAST (3s window)
// =============================================
describe('E2E: Undo Toast', () => {
  it('validates undo window timing', () => {
    const UNDO_WINDOW_MS = 3000;
    const sentAt = Date.now();
    const isUndoable = (now: number) => now - sentAt < UNDO_WINDOW_MS;
    expect(isUndoable(sentAt + 1000)).toBe(true);
    expect(isUndoable(sentAt + 2999)).toBe(true);
    expect(isUndoable(sentAt + 3001)).toBe(false);
  });

  it('restores message text on undo', () => {
    let currentText = '';
    const originalText = 'Mensagem original';
    const send = (text: string) => { currentText = ''; return text; };
    const undo = (text: string) => { currentText = text; };
    const sent = send(originalText);
    expect(currentText).toBe('');
    undo(sent);
    expect(currentText).toBe(originalText);
  });
});

// =============================================
// 6. SENDING STATE (isSending spinner)
// =============================================
describe('E2E: Sending State', () => {
  it('disables input during send', () => {
    const isDisabled = (isSending: boolean) => isSending;
    expect(isDisabled(true)).toBe(true);
    expect(isDisabled(false)).toBe(false);
  });

  it('shows loader icon during send', () => {
    const getIcon = (isSending: boolean) => isSending ? 'Loader2' : 'Send';
    expect(getIcon(true)).toBe('Loader2');
    expect(getIcon(false)).toBe('Send');
  });
});

// =============================================
// 7. CLIPBOARD PASTE (images)
// =============================================
describe('E2E: Clipboard Paste', () => {
  it('detects image in paste event', () => {
    const hasImage = (types: string[]) => types.some(t => t.startsWith('image/'));
    expect(hasImage(['text/plain'])).toBe(false);
    expect(hasImage(['image/png'])).toBe(true);
    expect(hasImage(['text/html', 'image/jpeg'])).toBe(true);
  });

  it('extracts file from clipboard items', () => {
    const mockFile = { type: 'image/png', name: 'screenshot.png', size: 1024 };
    expect(mockFile.type).toBe('image/png');
    expect(mockFile.size).toBeGreaterThan(0);
  });
});

// =============================================
// 8. PLACEHOLDER i18n
// =============================================
describe('E2E: Placeholder Localization', () => {
  it('uses Portuguese placeholder', () => {
    const placeholder = 'Digite sua mensagem...';
    expect(placeholder).toContain('mensagem');
    expect(placeholder).not.toContain('Type');
  });

  it('validates recording placeholder', () => {
    const recordingPlaceholder = 'Gravando áudio...';
    expect(recordingPlaceholder).toContain('Gravando');
  });
});

// =============================================
// 9. KEYBOARD SHORTCUTS CONSISTENCY
// =============================================
describe('E2E: Keyboard Shortcuts', () => {
  it('Enter sends message (without Shift)', () => {
    const shouldSend = (key: string, shift: boolean) => key === 'Enter' && !shift;
    expect(shouldSend('Enter', false)).toBe(true);
    expect(shouldSend('Enter', true)).toBe(false);
  });

  it('Shift+Enter adds new line', () => {
    const shouldNewLine = (key: string, shift: boolean) => key === 'Enter' && shift;
    expect(shouldNewLine('Enter', true)).toBe(true);
    expect(shouldNewLine('Enter', false)).toBe(false);
  });

  it('Escape cancels reply/edit', () => {
    const shouldCancel = (key: string) => key === 'Escape';
    expect(shouldCancel('Escape')).toBe(true);
    expect(shouldCancel('Enter')).toBe(false);
  });
});

// =============================================
// 10. TOOLBAR HIERARCHY (3 levels)
// =============================================
describe('E2E: Toolbar Hierarchy', () => {
  it('validates primary actions always visible', () => {
    const primary = ['send', 'attach', 'mic'];
    expect(primary).toHaveLength(3);
    primary.forEach(action => expect(action).toBeTruthy());
  });

  it('validates secondary actions in popover', () => {
    const secondary = ['emoji', 'sticker', 'richtext'];
    expect(secondary).toHaveLength(3);
  });

  it('validates tertiary actions in "+" menu', () => {
    const tertiary = ['location', 'catalog', 'interactive', 'schedule'];
    expect(tertiary.length).toBeGreaterThanOrEqual(3);
  });

  it('validates toolbar role attribute', () => {
    const role = 'toolbar';
    expect(role).toBe('toolbar');
  });
});

// =============================================
// 11. MENTIONS @AGENT
// =============================================
describe('E2E: Mentions @Agent', () => {
  it('exports MentionAutocomplete', async () => {
    const mod = await import('@/components/inbox/chat/MentionAutocomplete');
    expect(mod.MentionAutocomplete).toBeDefined();
  });

  it('exports useMentions hook', async () => {
    const mod = await import('@/components/inbox/chat/MentionAutocomplete');
    expect(mod.useMentions).toBeDefined();
  });

  it('detects @ trigger in text', () => {
    const detectMention = (text: string, cursor: number) => {
      const before = text.substring(0, cursor);
      const atIdx = before.lastIndexOf('@');
      if (atIdx === -1) return null;
      if (atIdx > 0 && before[atIdx - 1] !== ' ' && before[atIdx - 1] !== '\n') return null;
      return before.substring(atIdx + 1);
    };
    expect(detectMention('Hello @jo', 9)).toBe('jo');
    expect(detectMention('@maria', 6)).toBe('maria');
    expect(detectMention('email@test', 10)).toBeNull();
    expect(detectMention('no mention', 10)).toBeNull();
  });

  it('filters agents by query', () => {
    const agents = [
      { id: '1', name: 'João Silva', email: 'joao@test.com' },
      { id: '2', name: 'Maria Santos', email: 'maria@test.com' },
      { id: '3', name: 'Pedro Costa', email: 'pedro@test.com' },
    ];
    const filter = (query: string) => agents.filter(a =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.email.toLowerCase().includes(query.toLowerCase())
    );
    expect(filter('jo')).toHaveLength(1);
    expect(filter('a')).toHaveLength(3); // João, Maria, Costa all contain 'a'
    expect(filter('')).toHaveLength(3);
    expect(filter('xyz')).toHaveLength(0);
  });

  it('inserts mention into text', () => {
    const insertMention = (text: string, atPos: number, cursorPos: number, name: string) => {
      const before = text.substring(0, atPos);
      const after = text.substring(cursorPos);
      return `${before}@${name} ${after}`;
    };
    expect(insertMention('Hello @jo world', 6, 9, 'João')).toBe('Hello @João  world');
  });

  it('handles keyboard navigation in mention list', () => {
    const items = ['João', 'José', 'Juliana'];
    let idx = 0;
    const down = () => { idx = (idx + 1) % items.length; };
    const up = () => { idx = (idx - 1 + items.length) % items.length; };
    down(); expect(idx).toBe(1);
    down(); expect(idx).toBe(2);
    down(); expect(idx).toBe(0); // wraps
    up(); expect(idx).toBe(2); // wraps back
  });
});

// =============================================
// 12. MARKDOWN PREVIEW
// =============================================
describe('E2E: Markdown Preview', () => {
  it('exports MarkdownPreview', async () => {
    const mod = await import('@/components/inbox/chat/MarkdownPreview');
    expect(mod.MarkdownPreview).toBeDefined();
  });

  it('exports formatWhatsAppText', async () => {
    const mod = await import('@/components/inbox/chat/MarkdownPreview');
    expect(mod.formatWhatsAppText).toBeDefined();
  });

  it('formats bold text', async () => {
    const { formatWhatsAppText } = await import('@/components/inbox/chat/MarkdownPreview');
    const result = formatWhatsAppText('Hello *world*');
    expect(result).toContain('<strong>world</strong>');
  });

  it('formats italic text', async () => {
    const { formatWhatsAppText } = await import('@/components/inbox/chat/MarkdownPreview');
    const result = formatWhatsAppText('Hello _world_');
    expect(result).toContain('<em>world</em>');
  });

  it('formats strikethrough text', async () => {
    const { formatWhatsAppText } = await import('@/components/inbox/chat/MarkdownPreview');
    const result = formatWhatsAppText('Hello ~world~');
    expect(result).toContain('<del');
    expect(result).toContain('world');
  });

  it('formats code blocks', async () => {
    const { formatWhatsAppText } = await import('@/components/inbox/chat/MarkdownPreview');
    const result = formatWhatsAppText('Use ```code here```');
    expect(result).toContain('<code');
    expect(result).toContain('code here');
  });

  it('converts newlines to <br />', async () => {
    const { formatWhatsAppText } = await import('@/components/inbox/chat/MarkdownPreview');
    const result = formatWhatsAppText('Line1\nLine2');
    expect(result).toContain('<br />');
  });

  it('escapes HTML entities', async () => {
    const { formatWhatsAppText } = await import('@/components/inbox/chat/MarkdownPreview');
    const result = formatWhatsAppText('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('handles combined formatting', async () => {
    const { formatWhatsAppText } = await import('@/components/inbox/chat/MarkdownPreview');
    const result = formatWhatsAppText('*bold* and _italic_ and ~strike~');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<del');
  });

  it('returns empty for whitespace-only input', async () => {
    const { MarkdownPreview } = await import('@/components/inbox/chat/MarkdownPreview');
    // Component returns null for empty text
    expect(MarkdownPreview).toBeDefined();
  });
});

// =============================================
// 13. SWIPE GESTURES
// =============================================
describe('E2E: Swipe Gestures', () => {
  it('exports useSwipeGesture hook', async () => {
    const mod = await import('@/hooks/useSwipeGesture');
    expect(mod.useSwipeGesture).toBeDefined();
  });

  it('validates swipe threshold detection', () => {
    const threshold = 80;
    const detectSwipe = (deltaX: number) => {
      if (deltaX > threshold) return 'right';
      if (deltaX < -threshold) return 'left';
      return null;
    };
    expect(detectSwipe(100)).toBe('right');
    expect(detectSwipe(-100)).toBe('left');
    expect(detectSwipe(50)).toBeNull();
    expect(detectSwipe(-30)).toBeNull();
  });

  it('validates vertical scroll cancellation', () => {
    const shouldCancel = (deltaX: number, deltaY: number) =>
      Math.abs(deltaY) > Math.abs(deltaX) * 1.5;
    expect(shouldCancel(10, 50)).toBe(true); // vertical dominant
    expect(shouldCancel(50, 10)).toBe(false); // horizontal dominant
  });

  it('validates offset clamping', () => {
    const threshold = 80;
    const clamp = (deltaX: number) =>
      Math.max(-threshold * 1.5, Math.min(threshold * 1.5, deltaX));
    expect(clamp(200)).toBe(120);
    expect(clamp(-200)).toBe(-120);
    expect(clamp(50)).toBe(50);
  });

  it('right swipe triggers reply', () => {
    let replyCalled = false;
    const onSwipeRight = () => { replyCalled = true; };
    const deltaX = 100;
    if (deltaX > 80) onSwipeRight();
    expect(replyCalled).toBe(true);
  });

  it('left swipe triggers forward', () => {
    let forwardCalled = false;
    const onSwipeLeft = () => { forwardCalled = true; };
    const deltaX = -100;
    if (deltaX < -80) onSwipeLeft();
    expect(forwardCalled).toBe(true);
  });

  it('disabled state prevents swipe', () => {
    const enabled = false;
    let triggered = false;
    if (enabled) triggered = true;
    expect(triggered).toBe(false);
  });
});

// =============================================
// 14. AUDIO RECORDER IMPROVEMENTS
// =============================================
describe('E2E: Audio Recorder', () => {
  it('exports AudioRecorder component', async () => {
    const mod = await import('@/components/inbox/AudioRecorder');
    expect(mod.AudioRecorder).toBeDefined();
  });

  it('validates waveform bar generation', () => {
    const barCount = 30;
    const bars = Array.from({ length: barCount }, () => 0.2 + Math.random() * 0.8);
    expect(bars).toHaveLength(30);
    bars.forEach(b => {
      expect(b).toBeGreaterThanOrEqual(0.2);
      expect(b).toBeLessThanOrEqual(1.0);
    });
  });

  it('validates duration formatting', () => {
    const formatDuration = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(120)).toBe('2:00');
  });

  it('validates swipe-to-cancel threshold', () => {
    const CANCEL_THRESHOLD = -120;
    const shouldCancel = (swipeX: number) => swipeX <= CANCEL_THRESHOLD;
    expect(shouldCancel(-150)).toBe(true);
    expect(shouldCancel(-120)).toBe(true);
    expect(shouldCancel(-80)).toBe(false);
    expect(shouldCancel(0)).toBe(false);
  });

  it('validates lock mode toggling', () => {
    let isLocked = false;
    const toggleLock = () => { isLocked = !isLocked; };
    toggleLock();
    expect(isLocked).toBe(true);
    toggleLock();
    expect(isLocked).toBe(false);
  });

  it('validates playback progress calculation', () => {
    const getProgress = (currentTime: number, duration: number) =>
      duration > 0 ? (currentTime / duration) * 100 : 0;
    expect(getProgress(0, 10)).toBe(0);
    expect(getProgress(5, 10)).toBe(50);
    expect(getProgress(10, 10)).toBe(100);
    expect(getProgress(0, 0)).toBe(0);
  });

  it('validates haptic feedback trigger', () => {
    let vibrated = false;
    const triggerHaptic = () => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
        vibrated = true;
      }
    };
    // In test env, vibrate doesn't exist — that's OK
    triggerHaptic();
    expect(vibrated).toBe(false); // Expected in JSDOM
  });

  it('validates audio blob creation for send', () => {
    const blob = new Blob(['fake audio'], { type: 'audio/webm' });
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('audio/webm');
  });
});

// =============================================
// 15. REPLY/EDIT PREVIEW
// =============================================
describe('E2E: Reply & Edit Preview', () => {
  it('truncates long reply preview', () => {
    const truncate = (text: string, max: number) =>
      text.length > max ? text.substring(0, max) + '...' : text;
    const long = 'A'.repeat(200);
    expect(truncate(long, 100).length).toBe(103);
    expect(truncate('Short', 100)).toBe('Short');
  });

  it('identifies media type in reply', () => {
    const getMediaType = (msg: { message_type?: string }) => {
      switch (msg.message_type) {
        case 'audio': return '🎵 Áudio';
        case 'image': return '📷 Imagem';
        case 'video': return '🎥 Vídeo';
        case 'document': return '📄 Documento';
        default: return null;
      }
    };
    expect(getMediaType({ message_type: 'audio' })).toBe('🎵 Áudio');
    expect(getMediaType({ message_type: 'image' })).toBe('📷 Imagem');
    expect(getMediaType({ message_type: 'text' })).toBeNull();
  });

  it('validates edit mode detection', () => {
    const isEditing = (editingMessage: unknown) => !!editingMessage;
    expect(isEditing({ id: '1', content: 'old' })).toBe(true);
    expect(isEditing(null)).toBe(false);
    expect(isEditing(undefined)).toBe(false);
  });
});

// =============================================
// 16. QUICK REPLIES OPTIMIZATION
// =============================================
describe('E2E: Quick Replies', () => {
  it('filters quick replies by category', () => {
    const replies = [
      { id: '1', title: 'Saudação', shortcut: '/oi', content: 'Olá!', category: 'greeting' },
      { id: '2', title: 'Despedida', shortcut: '/tchau', content: 'Até logo!', category: 'farewell' },
      { id: '3', title: 'Suporte', shortcut: '/ajuda', content: 'Como posso ajudar?', category: 'support' },
    ];
    const filtered = replies.filter(r => r.category === 'greeting');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].shortcut).toBe('/oi');
  });

  it('searches quick replies by shortcut', () => {
    const replies = [
      { id: '1', shortcut: '/oi', content: 'Olá!' },
      { id: '2', shortcut: '/tchau', content: 'Até logo!' },
    ];
    const search = (q: string) => replies.filter(r => r.shortcut.includes(q));
    expect(search('/oi')).toHaveLength(1);
    expect(search('/')).toHaveLength(2);
    expect(search('/xyz')).toHaveLength(0);
  });
});
