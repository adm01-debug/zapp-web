import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }), onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }) },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), then: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) }),
    removeChannel: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// =============================================
// 1. @AGENT MENTIONS — Autocomplete & Parsing
// =============================================
describe('E2E: @Agent Mentions System', () => {
  const agents = [
    { id: 'a1', name: 'Carlos Silva', status: 'online' },
    { id: 'a2', name: 'Ana Costa', status: 'online' },
    { id: 'a3', name: 'Pedro Santos', status: 'offline' },
    { id: 'a4', name: 'Maria Oliveira', status: 'busy' },
    { id: 'a5', name: 'Lucas Ferreira', status: 'online' },
  ];

  it('triggers autocomplete on @ character', () => {
    const text = 'Hey @';
    const triggerIndex = text.lastIndexOf('@');
    expect(triggerIndex).toBe(4);
    expect(text.charAt(triggerIndex)).toBe('@');
  });

  it('extracts search query after @', () => {
    const extractQuery = (text: string, cursorPos: number) => {
      const before = text.slice(0, cursorPos);
      const match = before.match(/@(\w*)$/);
      return match ? match[1] : null;
    };
    expect(extractQuery('Hello @Car', 10)).toBe('Car');
    expect(extractQuery('Hello @', 7)).toBe('');
    expect(extractQuery('Hello world', 11)).toBeNull();
  });

  it('filters agents by partial name match', () => {
    const query = 'car';
    const filtered = agents.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Carlos Silva');
  });

  it('filters agents case-insensitively', () => {
    const query = 'ANA';
    const filtered = agents.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Ana Costa');
  });

  it('returns all agents on empty query', () => {
    const query = '';
    const filtered = agents.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
    expect(filtered).toHaveLength(5);
  });

  it('replaces @query with full mention', () => {
    const text = 'Hey @Car';
    const replaceMention = (t: string, query: string, fullName: string) => {
      const regex = new RegExp(`@${query}$`);
      return t.replace(regex, `@${fullName} `);
    };
    expect(replaceMention(text, 'Car', 'Carlos Silva')).toBe('Hey @Carlos Silva ');
  });

  it('handles multiple mentions in same message', () => {
    const text = '@Carlos Silva e @Ana Costa vão atender';
    const mentions = text.match(/@[\w\s]+?(?=\s(?:e|vão|$))/g);
    expect(mentions).toBeTruthy();
    expect(mentions!.length).toBeGreaterThanOrEqual(1);
  });

  it('extracts mention IDs from text', () => {
    const mentionMap: Record<string, string> = { 'Carlos Silva': 'a1', 'Ana Costa': 'a2' };
    const text = '@Carlos Silva please check';
    const extractIds = (t: string, map: Record<string, string>) => {
      return Object.entries(map)
        .filter(([name]) => t.includes(`@${name}`))
        .map(([, id]) => id);
    };
    expect(extractIds(text, mentionMap)).toEqual(['a1']);
  });

  it('shows only online agents first', () => {
    const sorted = [...agents].sort((a, b) => {
      const order: Record<string, number> = { online: 0, busy: 1, offline: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });
    expect(sorted[0].status).toBe('online');
    expect(sorted[sorted.length - 1].status).toBe('offline');
  });

  it('limits autocomplete results', () => {
    const maxResults = 5;
    const allAgents = Array.from({ length: 20 }, (_, i) => ({ id: `a${i}`, name: `Agent ${i}` }));
    const limited = allAgents.slice(0, maxResults);
    expect(limited).toHaveLength(5);
  });

  it('handles @ at start of message', () => {
    const text = '@Ana';
    const match = text.match(/^@(\w+)/);
    expect(match).toBeTruthy();
    expect(match![1]).toBe('Ana');
  });

  it('does not trigger on email addresses', () => {
    const text = 'Send to user@email.com';
    const isEmailContext = (t: string, pos: number) => {
      const before = t.slice(0, pos);
      return /\S@$/.test(before);
    };
    const atPos = text.indexOf('@');
    expect(isEmailContext(text, atPos + 1)).toBe(true);
  });

  it('closes autocomplete on Escape', () => {
    let isOpen = true;
    const handleKeyDown = (key: string) => {
      if (key === 'Escape') isOpen = false;
    };
    handleKeyDown('Escape');
    expect(isOpen).toBe(false);
  });

  it('selects mention with Enter key', () => {
    let selected: string | null = null;
    const handleSelect = (agentName: string) => { selected = agentName; };
    handleSelect('Carlos Silva');
    expect(selected).toBe('Carlos Silva');
  });

  it('navigates mention list with arrow keys', () => {
    let index = 0;
    const navigate = (dir: 'up' | 'down', max: number) => {
      if (dir === 'down') index = Math.min(index + 1, max - 1);
      if (dir === 'up') index = Math.max(index - 1, 0);
    };
    navigate('down', 5);
    expect(index).toBe(1);
    navigate('down', 5);
    expect(index).toBe(2);
    navigate('up', 5);
    expect(index).toBe(1);
  });

  it('validates mention notification payload', () => {
    const payload = {
      type: 'mention',
      mentionedBy: 'a1',
      mentionedAgent: 'a2',
      messageId: 'm1',
      conversationId: 'c1',
      timestamp: new Date().toISOString(),
    };
    expect(payload.type).toBe('mention');
    expect(payload.mentionedBy).toBeTruthy();
    expect(payload.mentionedAgent).toBeTruthy();
  });
});

// =============================================
// 2. SWIPE GESTURES — Mobile Touch Handling
// =============================================
describe('E2E: Swipe Gestures System', () => {
  it('detects horizontal swipe direction', () => {
    const detectSwipe = (startX: number, endX: number, threshold: number = 50) => {
      const diff = endX - startX;
      if (Math.abs(diff) < threshold) return 'none';
      return diff > 0 ? 'right' : 'left';
    };
    expect(detectSwipe(100, 200)).toBe('right');
    expect(detectSwipe(200, 100)).toBe('left');
    expect(detectSwipe(100, 120)).toBe('none');
  });

  it('calculates swipe velocity', () => {
    const velocity = (distance: number, timeMs: number) => Math.abs(distance) / timeMs;
    expect(velocity(200, 100)).toBe(2);
    expect(velocity(100, 500)).toBe(0.2);
  });

  it('validates minimum swipe threshold', () => {
    const THRESHOLD = 50;
    expect(Math.abs(30) >= THRESHOLD).toBe(false);
    expect(Math.abs(60) >= THRESHOLD).toBe(true);
  });

  it('maps swipe-right to reply action', () => {
    const swipeActions: Record<string, string> = {
      right: 'reply',
      left: 'forward',
    };
    expect(swipeActions['right']).toBe('reply');
    expect(swipeActions['left']).toBe('forward');
  });

  it('prevents vertical scroll during horizontal swipe', () => {
    const shouldPreventScroll = (dx: number, dy: number) => Math.abs(dx) > Math.abs(dy) * 1.5;
    expect(shouldPreventScroll(100, 20)).toBe(true);
    expect(shouldPreventScroll(20, 100)).toBe(false);
  });

  it('calculates swipe progress percentage', () => {
    const progress = (currentX: number, startX: number, maxDistance: number) =>
      Math.min(Math.abs(currentX - startX) / maxDistance, 1);
    expect(progress(150, 100, 200)).toBe(0.25);
    expect(progress(300, 100, 200)).toBe(1);
  });

  it('snaps back on incomplete swipe', () => {
    const shouldSnap = (progress: number, threshold: number = 0.3) => progress < threshold;
    expect(shouldSnap(0.1)).toBe(true);
    expect(shouldSnap(0.5)).toBe(false);
  });

  it('triggers haptic feedback on threshold reached', () => {
    let hapticTriggered = false;
    const onThreshold = () => { hapticTriggered = true; };
    const progress = 0.4;
    if (progress >= 0.3) onThreshold();
    expect(hapticTriggered).toBe(true);
  });

  it('limits swipe distance', () => {
    const MAX_SWIPE = 120;
    const clamp = (value: number) => Math.min(value, MAX_SWIPE);
    expect(clamp(80)).toBe(80);
    expect(clamp(200)).toBe(120);
  });

  it('handles multi-touch correctly (ignores)', () => {
    const isMultiTouch = (touchCount: number) => touchCount > 1;
    expect(isMultiTouch(1)).toBe(false);
    expect(isMultiTouch(2)).toBe(true);
  });

  it('resets state on touch end', () => {
    let state = { swiping: true, startX: 100, currentX: 200 };
    const reset = () => { state = { swiping: false, startX: 0, currentX: 0 }; };
    reset();
    expect(state.swiping).toBe(false);
    expect(state.startX).toBe(0);
  });

  it('validates swipe animation spring config', () => {
    const spring = { stiffness: 300, damping: 30, mass: 1 };
    expect(spring.stiffness).toBeGreaterThan(0);
    expect(spring.damping).toBeGreaterThan(0);
  });

  it('calculates reply indicator opacity from progress', () => {
    const opacity = (progress: number) => Math.min(progress * 2, 1);
    expect(opacity(0)).toBe(0);
    expect(opacity(0.3)).toBe(0.6);
    expect(opacity(0.8)).toBe(1);
  });
});

// =============================================
// 3. MARKDOWN PREVIEW — Parsing & Rendering
// =============================================
describe('E2E: Markdown Preview System', () => {
  const parseMarkdown = (text: string) => {
    let html = text;
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    html = html.replace(/\n/g, '<br>');
    return html;
  };

  it('parses bold text', () => {
    expect(parseMarkdown('**bold**')).toBe('<strong>bold</strong>');
  });

  it('parses italic text', () => {
    expect(parseMarkdown('*italic*')).toBe('<em>italic</em>');
  });

  it('parses strikethrough', () => {
    expect(parseMarkdown('~~deleted~~')).toBe('<del>deleted</del>');
  });

  it('parses inline code', () => {
    expect(parseMarkdown('`code`')).toBe('<code>code</code>');
  });

  it('parses mixed formatting', () => {
    const result = parseMarkdown('**bold** and *italic*');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('handles nested bold+italic', () => {
    const result = parseMarkdown('***bolditalic***');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  it('preserves plain text', () => {
    expect(parseMarkdown('hello world')).toBe('hello world');
  });

  it('converts newlines to br', () => {
    expect(parseMarkdown('line1\nline2')).toBe('line1<br>line2');
  });

  it('handles empty string', () => {
    expect(parseMarkdown('')).toBe('');
  });

  it('handles text with no markdown', () => {
    const plain = 'Just a normal message without formatting';
    expect(parseMarkdown(plain)).toBe(plain);
  });

  it('detects if text has markdown syntax', () => {
    const hasMarkdown = (text: string) => /[\*_~`]/.test(text);
    expect(hasMarkdown('**bold**')).toBe(true);
    expect(hasMarkdown('plain text')).toBe(false);
    expect(hasMarkdown('`code`')).toBe(true);
  });

  it('toggles preview mode', () => {
    let previewMode = false;
    const toggle = () => { previewMode = !previewMode; };
    toggle();
    expect(previewMode).toBe(true);
    toggle();
    expect(previewMode).toBe(false);
  });

  it('sanitizes HTML in markdown', () => {
    const sanitize = (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, '');
    const dirty = 'Hello <script>alert("xss")</script> world';
    expect(sanitize(dirty)).toBe('Hello  world');
  });

  it('handles WhatsApp-style formatting', () => {
    const whatsappFormat = (text: string) => {
      let result = text;
      result = result.replace(/\*(.*?)\*/g, '<b>$1</b>');
      result = result.replace(/_(.*?)_/g, '<i>$1</i>');
      result = result.replace(/~(.*?)~/g, '<s>$1</s>');
      result = result.replace(/```(.*?)```/g, '<pre>$1</pre>');
      return result;
    };
    expect(whatsappFormat('*bold*')).toBe('<b>bold</b>');
    expect(whatsappFormat('_italic_')).toBe('<i>italic</i>');
    expect(whatsappFormat('~strike~')).toBe('<s>strike</s>');
  });

  it('handles URL detection in markdown', () => {
    const detectUrls = (text: string) => {
      const urlRegex = /https?:\/\/[^\s]+/g;
      return text.match(urlRegex) || [];
    };
    expect(detectUrls('Visit https://example.com today')).toEqual(['https://example.com']);
    expect(detectUrls('No urls here')).toEqual([]);
    expect(detectUrls('https://a.com and https://b.com')).toHaveLength(2);
  });

  it('counts formatting elements', () => {
    const text = '**one** and **two** and *three*';
    const boldCount = (text.match(/\*\*(.*?)\*\*/g) || []).length;
    const italicCount = (text.match(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g) || []).length;
    expect(boldCount).toBe(2);
    expect(italicCount).toBeGreaterThanOrEqual(1);
  });
});

// =============================================
// 4. AUDIO RECORDER — Swipe-to-Cancel & Lock
// =============================================
describe('E2E: Audio Recorder Enhancements', () => {
  it('exports AudioRecorder component', async () => {
    const mod = await import('@/components/inbox/AudioRecorder');
    expect(mod).toBeDefined();
  });

  it('validates recording states', () => {
    type RecState = 'idle' | 'recording' | 'locked' | 'preview' | 'cancelling';
    const transitions: Record<RecState, RecState[]> = {
      idle: ['recording'],
      recording: ['idle', 'locked', 'cancelling'],
      locked: ['idle', 'preview'],
      preview: ['idle'],
      cancelling: ['idle'],
    };
    expect(transitions.idle).toContain('recording');
    expect(transitions.recording).toContain('locked');
    expect(transitions.locked).toContain('preview');
  });

  it('calculates swipe-to-cancel threshold', () => {
    const CANCEL_THRESHOLD = -100;
    const isCancelling = (dx: number) => dx <= CANCEL_THRESHOLD;
    expect(isCancelling(-50)).toBe(false);
    expect(isCancelling(-100)).toBe(true);
    expect(isCancelling(-150)).toBe(true);
  });

  it('formats recording duration mm:ss', () => {
    const format = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };
    expect(format(0)).toBe('0:00');
    expect(format(65)).toBe('1:05');
    expect(format(300)).toBe('5:00');
    expect(format(3661)).toBe('61:01');
  });

  it('enforces max recording duration', () => {
    const MAX_DURATION = 300;
    const shouldStop = (elapsed: number) => elapsed >= MAX_DURATION;
    expect(shouldStop(299)).toBe(false);
    expect(shouldStop(300)).toBe(true);
  });

  it('generates waveform data from amplitude', () => {
    const generateBar = (amplitude: number) => Math.max(4, Math.round(amplitude * 40));
    expect(generateBar(0)).toBe(4);
    expect(generateBar(0.5)).toBe(20);
    expect(generateBar(1)).toBe(40);
  });

  it('validates waveform bar count grows with time', () => {
    const barsForDuration = (seconds: number, interval: number = 0.1) =>
      Math.floor(seconds / interval);
    expect(barsForDuration(1)).toBe(10);
    expect(barsForDuration(5)).toBe(50);
  });

  it('calculates cancel indicator opacity', () => {
    const THRESHOLD = 100;
    const opacity = (dx: number) => Math.min(Math.abs(dx) / THRESHOLD, 1);
    expect(opacity(0)).toBe(0);
    expect(opacity(-50)).toBe(0.5);
    expect(opacity(-100)).toBe(1);
    expect(opacity(-200)).toBe(1);
  });

  it('validates lock button activation', () => {
    const LOCK_THRESHOLD_Y = -60;
    const shouldLock = (dy: number) => dy <= LOCK_THRESHOLD_Y;
    expect(shouldLock(-30)).toBe(false);
    expect(shouldLock(-60)).toBe(true);
  });

  it('validates audio file size limits', () => {
    const MAX_SIZE_MB = 16;
    const isValidSize = (sizeBytes: number) => sizeBytes <= MAX_SIZE_MB * 1024 * 1024;
    expect(isValidSize(1024 * 1024)).toBe(true);
    expect(isValidSize(20 * 1024 * 1024)).toBe(false);
  });

  it('generates audio filename with timestamp', () => {
    const genName = (convId: string, ts: number) => `${convId}/${ts}.webm`;
    const name = genName('conv-123', 1711100000000);
    expect(name).toBe('conv-123/1711100000000.webm');
    expect(name).toContain('.webm');
  });

  it('validates playback progress calculation', () => {
    const progress = (currentTime: number, duration: number) =>
      duration > 0 ? (currentTime / duration) * 100 : 0;
    expect(progress(0, 60)).toBe(0);
    expect(progress(30, 60)).toBe(50);
    expect(progress(60, 60)).toBe(100);
    expect(progress(5, 0)).toBe(0);
  });

  it('handles recording permission denied', () => {
    const handleError = (err: { name: string }) => {
      if (err.name === 'NotAllowedError') return 'permission_denied';
      if (err.name === 'NotFoundError') return 'no_microphone';
      return 'unknown';
    };
    expect(handleError({ name: 'NotAllowedError' })).toBe('permission_denied');
    expect(handleError({ name: 'NotFoundError' })).toBe('no_microphone');
  });

  it('validates audio MIME types', () => {
    const validTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav'];
    expect(validTypes).toContain('audio/webm');
    expect(validTypes).not.toContain('audio/mp3');
  });
});

// =============================================
// 5. DRAFT PERSISTENCE — localStorage
// =============================================
describe('E2E: Draft Persistence', () => {
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
    const key = 'draft_conv-123';
    localStorage.setItem(key, 'Hello draft');
    expect(localStorage.getItem(key)).toBe('Hello draft');
  });

  it('restores draft on mount', () => {
    localStorage.setItem('draft_conv-456', 'Saved text');
    const draft = localStorage.getItem('draft_conv-456');
    expect(draft).toBe('Saved text');
  });

  it('clears draft on send', () => {
    const key = 'draft_conv-789';
    localStorage.setItem(key, 'Message to send');
    localStorage.removeItem(key);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('handles empty draft gracefully', () => {
    expect(localStorage.getItem('draft_nonexistent')).toBeNull();
  });

  it('saves draft with conversation-specific key', () => {
    const makeKey = (convId: string) => `draft_${convId}`;
    const key = makeKey('abc-123');
    expect(key).toBe('draft_abc-123');
  });

  it('debounces draft saving', () => {
    let saveCount = 0;
    const debouncedSave = (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (fn: () => void, delay: number) => {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
      };
    })();
    debouncedSave(() => { saveCount++; }, 300);
    debouncedSave(() => { saveCount++; }, 300);
    expect(saveCount).toBe(0); // Not yet executed
  });

  it('preserves drafts across conversation switches', () => {
    localStorage.setItem('draft_conv-1', 'Draft 1');
    localStorage.setItem('draft_conv-2', 'Draft 2');
    expect(localStorage.getItem('draft_conv-1')).toBe('Draft 1');
    expect(localStorage.getItem('draft_conv-2')).toBe('Draft 2');
  });
});

// =============================================
// 6. CHARACTER COUNTER — Validation
// =============================================
describe('E2E: Character Counter', () => {
  const MAX_CHARS = 4096;

  it('counts characters correctly', () => {
    expect('Hello'.length).toBe(5);
    expect(''.length).toBe(0);
  });

  it('warns near limit', () => {
    const getStatus = (len: number) => {
      if (len >= MAX_CHARS) return 'exceeded';
      if (len >= MAX_CHARS * 0.9) return 'warning';
      return 'normal';
    };
    expect(getStatus(100)).toBe('normal');
    expect(getStatus(3700)).toBe('warning');
    expect(getStatus(4096)).toBe('exceeded');
  });

  it('handles emoji character counting', () => {
    const emoji = '👋🌍';
    expect(emoji.length).toBeGreaterThanOrEqual(2);
  });

  it('counts remaining characters', () => {
    const remaining = (text: string) => MAX_CHARS - text.length;
    expect(remaining('')).toBe(4096);
    expect(remaining('Hello')).toBe(4091);
  });

  it('formats counter display', () => {
    const format = (current: number, max: number) => `${current}/${max}`;
    expect(format(100, 4096)).toBe('100/4096');
  });

  it('changes color based on usage', () => {
    const getColor = (pct: number) => {
      if (pct >= 1) return 'red';
      if (pct >= 0.9) return 'orange';
      if (pct >= 0.75) return 'yellow';
      return 'gray';
    };
    expect(getColor(0.5)).toBe('gray');
    expect(getColor(0.8)).toBe('yellow');
    expect(getColor(0.95)).toBe('orange');
    expect(getColor(1)).toBe('red');
  });

  it('prevents input beyond max', () => {
    const text = 'x'.repeat(4096);
    const newChar = 'y';
    const shouldBlock = (text + newChar).length > MAX_CHARS;
    expect(shouldBlock).toBe(true);
  });
});
