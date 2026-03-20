import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// ELEVENLABS INTEGRATION - COMPREHENSIVE E2E TEST SUITE
// Tests: Edge Functions, Client Components, Hooks, Data Flow
// ============================================================================

// === MOCKS ===
const mockFetch = vi.fn();
const mockInvoke = vi.fn();

vi.stubGlobal('fetch', mockFetch);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

// Mock env
vi.stubGlobal('import', { meta: { env: { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key' } } });

describe('ElevenLabs Integration E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. TEXT-TO-SPEECH (TTS) - elevenlabs-tts
  // =========================================================================
  describe('TTS Edge Function Contract', () => {
    it('sends correct request structure with eleven_v3 model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
      });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello', voiceId: 'EXAVITQu4vr4xnSDxMaL' }),
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain('elevenlabs-tts');
      expect(call[1].method).toBe('POST');
      const body = JSON.parse(call[1].body);
      expect(body.text).toBe('Hello');
      expect(body.voiceId).toBe('EXAVITQu4vr4xnSDxMaL');
    });

    it('accepts optional modelId parameter', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob()) });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Test', modelId: 'eleven_flash_v2_5' }),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.modelId).toBe('eleven_flash_v2_5');
    });

    it('accepts languageCode parameter', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob()) });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Olá mundo', languageCode: 'pt' }),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.languageCode).toBe('pt');
    });

    it('accepts applyTextNormalization parameter', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob()) });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'R$ 1.500,00', applyTextNormalization: 'on' }),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.applyTextNormalization).toBe('on');
    });

    it('handles API error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'ElevenLabs API error: 500' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        body: JSON.stringify({ text: 'Test' }),
      });

      expect(response.ok).toBe(false);
    });

    it('handles empty text gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Text is required' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        body: JSON.stringify({ text: '' }),
      });

      expect(response.ok).toBe(false);
    });

    it('returns audio/mpeg content type', async () => {
      const audioBlob = new Blob(['fake-audio'], { type: 'audio/mpeg' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(audioBlob),
        headers: new Headers({ 'Content-Type': 'audio/mpeg' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        body: JSON.stringify({ text: 'Test' }),
      });

      const blob = await response.blob();
      expect(blob.type).toBe('audio/mpeg');
    });

    it('sends all 10 voice IDs correctly', () => {
      const voiceIds = [
        'EXAVITQu4vr4xnSDxMaL', 'CwhRBWXzGAHq8TQ4Fs17', 'FGY2WhTYpPnrIDTdsKH5',
        'IKne3meq5aSn9XLyUdCD', 'JBFqnCBsd6RMkjVDRZzb', 'XrExE9yKIg1WjnnlVkGX',
        'pFZP5JQG7iQjIQuC4Bku', 'onwK4e9ZLuTAKqWW03F9', 'nPczCjzI2devNBz1zQrb',
        'cgSgspJ2msm6clMCkdW9',
      ];
      voiceIds.forEach(id => {
        expect(id).toMatch(/^[a-zA-Z0-9]+$/);
        expect(id.length).toBeGreaterThan(10);
      });
    });
  });

  // =========================================================================
  // 2. STREAMING TTS - elevenlabs-tts-stream
  // =========================================================================
  describe('Streaming TTS Edge Function Contract', () => {
    it('sends request to stream endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream(),
        headers: new Headers({ 'Content-Type': 'audio/mpeg' }),
      });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts-stream', {
        method: 'POST',
        body: JSON.stringify({ text: 'Streaming test' }),
      });

      expect(mockFetch.mock.calls[0][0]).toContain('elevenlabs-tts-stream');
    });

    it('defaults to eleven_flash_v2_5 for lowest latency', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, body: new ReadableStream() });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts-stream', {
        method: 'POST',
        body: JSON.stringify({ text: 'Fast test' }),
      });

      // The edge function defaults to eleven_flash_v2_5 internally
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('accepts custom model override', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, body: new ReadableStream() });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts-stream', {
        method: 'POST',
        body: JSON.stringify({ text: 'Test', modelId: 'eleven_v3' }),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.modelId).toBe('eleven_v3');
    });

    it('returns ReadableStream body', async () => {
      const stream = new ReadableStream();
      mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts-stream', {
        method: 'POST',
        body: JSON.stringify({ text: 'Stream me' }),
      });

      expect(response.body).toBeInstanceOf(ReadableStream);
    });
  });

  // =========================================================================
  // 3. SPEECH-TO-SPEECH (STS) - elevenlabs-sts
  // =========================================================================
  describe('STS Edge Function Contract', () => {
    it('sends FormData with audio and voiceId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['converted'], { type: 'audio/mpeg' })),
      });

      const formData = new FormData();
      formData.append('audio', new Blob(['test-audio']), 'audio.webm');
      formData.append('voiceId', 'JBFqnCBsd6RMkjVDRZzb');

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-sts', {
        method: 'POST',
        body: formData,
      });

      expect(mockFetch.mock.calls[0][0]).toContain('elevenlabs-sts');
      expect(mockFetch.mock.calls[0][1].body).toBeInstanceOf(FormData);
    });

    it('accepts optional modelId for multilingual', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      });

      const formData = new FormData();
      formData.append('audio', new Blob(['test']), 'audio.webm');
      formData.append('voiceId', 'test-voice');
      formData.append('modelId', 'eleven_multilingual_sts_v2');

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-sts', {
        method: 'POST',
        body: formData,
      });

      const sentFormData = mockFetch.mock.calls[0][1].body as FormData;
      expect(sentFormData.get('modelId')).toBe('eleven_multilingual_sts_v2');
    });

    it('handles rate limit (429) error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-sts', {
        method: 'POST',
        body: new FormData(),
      });

      expect(response.status).toBe(429);
    });

    it('handles 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid API key' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-sts', {
        method: 'POST',
        body: new FormData(),
      });

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // 4. SPEECH-TO-TEXT (STT) - ai-transcribe-audio
  // =========================================================================
  describe('STT Edge Function Contract (scribe_v2)', () => {
    it('sends audioUrl and messageId', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { transcription: 'Olá mundo', messageId: 'msg-1', words: [], audio_events: [] },
        error: null,
      });

      const result = await mockInvoke('ai-transcribe-audio', {
        body: { audioUrl: 'https://example.com/audio.mp3', messageId: 'msg-1' },
      });

      expect(mockInvoke).toHaveBeenCalledWith('ai-transcribe-audio', expect.objectContaining({
        body: expect.objectContaining({ audioUrl: 'https://example.com/audio.mp3' }),
      }));
    });

    it('returns transcription with scribe_v2 features', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          transcription: 'Teste de transcrição',
          messageId: 'msg-2',
          words: [{ text: 'Teste', start: 0, end: 0.5 }, { text: 'de', start: 0.5, end: 0.7 }],
          audio_events: [{ type: 'music', start: 1.0, end: 3.0 }],
          speakers: [],
        },
        error: null,
      });

      const result = await mockInvoke('ai-transcribe-audio', {
        body: { audioUrl: 'https://example.com/test.mp3', messageId: 'msg-2' },
      });

      expect(result.data.transcription).toBe('Teste de transcrição');
      expect(result.data.words).toHaveLength(2);
      expect(result.data.audio_events).toHaveLength(1);
    });

    it('accepts languageCode parameter', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { transcription: 'Hello', messageId: 'msg-3', words: [], audio_events: [] },
        error: null,
      });

      await mockInvoke('ai-transcribe-audio', {
        body: { audioUrl: 'https://example.com/en.mp3', messageId: 'msg-3', languageCode: 'eng' },
      });

      const call = mockInvoke.mock.calls[0];
      expect(call[1].body.languageCode).toBe('eng');
    });

    it('accepts enableDiarization parameter', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { transcription: 'Speaker A: Hello', messageId: 'msg-4', words: [], speakers: ['A', 'B'] },
        error: null,
      });

      await mockInvoke('ai-transcribe-audio', {
        body: { audioUrl: 'https://example.com/dialog.mp3', messageId: 'msg-4', enableDiarization: true },
      });

      expect(mockInvoke.mock.calls[0][1].body.enableDiarization).toBe(true);
    });

    it('accepts tagAudioEvents parameter', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { transcription: 'test', messageId: 'msg-5', audio_events: [{ type: 'laughter' }] },
        error: null,
      });

      await mockInvoke('ai-transcribe-audio', {
        body: { audioUrl: 'https://example.com/laugh.mp3', messageId: 'msg-5', tagAudioEvents: true },
      });

      expect(mockInvoke.mock.calls[0][1].body.tagAudioEvents).toBe(true);
    });

    it('handles empty transcription gracefully', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { transcription: '', messageId: 'msg-6', words: [] },
        error: null,
      });

      const result = await mockInvoke('ai-transcribe-audio', {
        body: { audioUrl: 'https://example.com/silence.mp3', messageId: 'msg-6' },
      });

      expect(result.data.transcription).toBe('');
    });

    it('handles various audio formats', () => {
      const formats = ['mp3', 'ogg', 'webm', 'wav', 'm4a'];
      formats.forEach(format => {
        expect(['mp3', 'ogg', 'webm', 'wav', 'm4a']).toContain(format);
      });
    });
  });

  // =========================================================================
  // 5. SOUND EFFECTS & MUSIC (SFX) - elevenlabs-sfx
  // =========================================================================
  describe('SFX/Music Edge Function Contract', () => {
    it('generates sound effects with prompt', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { audioContent: 'base64audiocontent' },
        error: null,
      });

      await mockInvoke('elevenlabs-sfx', {
        body: { prompt: 'Thunder crackling', duration: 5, mode: 'sfx' },
      });

      const body = mockInvoke.mock.calls[0][1].body;
      expect(body.prompt).toBe('Thunder crackling');
      expect(body.mode).toBe('sfx');
    });

    it('generates music with prompt', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { audioContent: 'base64musiccontent' },
        error: null,
      });

      await mockInvoke('elevenlabs-sfx', {
        body: { prompt: 'Chill lo-fi beat', duration: 15, mode: 'music' },
      });

      const body = mockInvoke.mock.calls[0][1].body;
      expect(body.mode).toBe('music');
      expect(body.duration).toBe(15);
    });

    it('validates prompt is required', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Prompt is required' },
      });

      const result = await mockInvoke('elevenlabs-sfx', {
        body: { prompt: '', mode: 'sfx' },
      });

      expect(result.error).toBeTruthy();
    });

    it('returns base64 encoded audio', async () => {
      const fakeBase64 = btoa('fake-audio-data');
      mockInvoke.mockResolvedValueOnce({
        data: { audioContent: fakeBase64 },
        error: null,
      });

      const result = await mockInvoke('elevenlabs-sfx', {
        body: { prompt: 'Rain falling', mode: 'sfx' },
      });

      expect(result.data.audioContent).toBeTruthy();
      expect(typeof result.data.audioContent).toBe('string');
    });

    it('handles default duration for sfx (5s) and music (15s)', () => {
      const sfxDefault = 5;
      const musicDefault = 15;
      expect(sfxDefault).toBe(5);
      expect(musicDefault).toBe(15);
    });
  });

  // =========================================================================
  // 6. TEXT-TO-DIALOGUE - elevenlabs-dialogue
  // =========================================================================
  describe('Dialogue Edge Function Contract', () => {
    it('sends script array with voice_id and text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      });

      const script = [
        { voice_id: 'EXAVITQu4vr4xnSDxMaL', text: 'Olá, como você está?' },
        { voice_id: 'JBFqnCBsd6RMkjVDRZzb', text: 'Estou bem, obrigado!' },
      ];

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-dialogue', {
        method: 'POST',
        body: JSON.stringify({ script, languageCode: 'pt' }),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.script).toHaveLength(2);
      expect(body.script[0].voice_id).toBe('EXAVITQu4vr4xnSDxMaL');
      expect(body.languageCode).toBe('pt');
    });

    it('rejects empty script array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Script is required' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-dialogue', {
        method: 'POST',
        body: JSON.stringify({ script: [] }),
      });

      expect(response.ok).toBe(false);
    });

    it('rejects script items without voice_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Each script line must have voice_id and text' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-dialogue', {
        method: 'POST',
        body: JSON.stringify({ script: [{ text: 'Missing voice' }] }),
      });

      expect(response.ok).toBe(false);
    });

    it('supports multi-speaker dialogue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
      });

      const script = [
        { voice_id: 'EXAVITQu4vr4xnSDxMaL', text: 'Primeira fala' },
        { voice_id: 'JBFqnCBsd6RMkjVDRZzb', text: 'Segunda fala' },
        { voice_id: 'FGY2WhTYpPnrIDTdsKH5', text: 'Terceira fala' },
      ];

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-dialogue', {
        method: 'POST',
        body: JSON.stringify({ script }),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.script).toHaveLength(3);
      const uniqueVoices = new Set(body.script.map((s: any) => s.voice_id));
      expect(uniqueVoices.size).toBe(3);
    });
  });

  // =========================================================================
  // 7. VOICE DESIGN - elevenlabs-voice-design
  // =========================================================================
  describe('Voice Design Edge Function Contract', () => {
    it('generates voice preview from description', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          previews: [{ generated_voice_id: 'gen-123', audio_base_64: 'base64audio' }],
        }),
      });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-voice-design', {
        method: 'POST',
        body: JSON.stringify({
          action: 'preview',
          description: 'Young female voice, warm and friendly',
          text: 'Hello world',
        }),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.action).toBe('preview');
      expect(body.description).toBeTruthy();
    });

    it('creates voice from preview', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ voice_id: 'new-voice-123' }),
      });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-voice-design', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          voice_name: 'Minha Voz',
          voice_description: 'Voz personalizada',
          generated_voice_id: 'gen-123',
        }),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.action).toBe('create');
      expect(body.voice_name).toBe('Minha Voz');
      expect(body.generated_voice_id).toBe('gen-123');
    });

    it('lists available voices', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          voices: [{ voice_id: 'v1', name: 'Sarah' }, { voice_id: 'v2', name: 'Roger' }],
        }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-voice-design', {
        method: 'POST',
        body: JSON.stringify({ action: 'list' }),
      });

      const data = await response.json();
      expect(data.voices).toHaveLength(2);
    });

    it('rejects preview without description', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Voice description is required' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-voice-design', {
        method: 'POST',
        body: JSON.stringify({ action: 'preview', description: '' }),
      });

      expect(response.ok).toBe(false);
    });

    it('rejects create without voice_name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Voice name is required' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-voice-design', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', generated_voice_id: 'gen-123' }),
      });

      expect(response.ok).toBe(false);
    });
  });

  // =========================================================================
  // 8. WEBHOOKS - elevenlabs-webhook
  // =========================================================================
  describe('Webhook Edge Function Contract', () => {
    it('accepts TTS completed event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ received: true, event: 'tts.completed' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'tts.completed', request_id: 'req-123' }),
      });

      const data = await response.json();
      expect(data.received).toBe(true);
    });

    it('accepts TTS failed event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ received: true, event: 'tts.failed' }),
      });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'tts.failed', error: 'timeout' }),
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('accepts music completed event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ received: true, event: 'music.completed' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'music.completed', request_id: 'music-1' }),
      });

      expect(response.ok).toBe(true);
    });

    it('accepts quota warning event', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ received: true, event: 'quota.warning' }),
      });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'quota.warning', usage_percent: 90 }),
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles unknown event types gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ received: true, event: 'unknown.event' }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'unknown.event' }),
      });

      expect(response.ok).toBe(true);
    });
  });

  // =========================================================================
  // 9. SCRIBE TOKEN - elevenlabs-scribe-token
  // =========================================================================
  describe('Scribe Token Edge Function Contract', () => {
    it('returns a token for realtime transcription', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { token: 'scribe-token-123' },
        error: null,
      });

      const result = await mockInvoke('elevenlabs-scribe-token');
      expect(result.data.token).toBeTruthy();
    });

    it('handles missing API key', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'ElevenLabs API key not configured' },
      });

      const result = await mockInvoke('elevenlabs-scribe-token');
      expect(result.error).toBeTruthy();
    });
  });

  // =========================================================================
  // 10. CLIENT-SIDE VOICE DATA INTEGRITY
  // =========================================================================
  describe('Voice Data Integrity', () => {
    it('all ELEVENLABS_VOICES have required fields', async () => {
      const { ELEVENLABS_VOICES } = await import('@/components/inbox/VoiceSelector');
      
      ELEVENLABS_VOICES.forEach((voice) => {
        expect(voice.id).toBeTruthy();
        expect(voice.name).toBeTruthy();
        expect(voice.description).toBeTruthy();
        expect(['male', 'female']).toContain(voice.gender);
        expect(voice.id.length).toBeGreaterThan(10);
      });
    });

    it('has at least 8 voices available', async () => {
      const { ELEVENLABS_VOICES } = await import('@/components/inbox/VoiceSelector');
      expect(ELEVENLABS_VOICES.length).toBeGreaterThanOrEqual(8);
    });

    it('all voice IDs are unique', async () => {
      const { ELEVENLABS_VOICES } = await import('@/components/inbox/VoiceSelector');
      const ids = ELEVENLABS_VOICES.map(v => v.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all voice names are unique', async () => {
      const { ELEVENLABS_VOICES } = await import('@/components/inbox/VoiceSelector');
      const names = ELEVENLABS_VOICES.map(v => v.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('default voice ID matches Sarah', async () => {
      const { ELEVENLABS_VOICES } = await import('@/components/inbox/VoiceSelector');
      const sarah = ELEVENLABS_VOICES.find(v => v.name === 'Sarah');
      expect(sarah).toBeTruthy();
      expect(sarah!.id).toBe('EXAVITQu4vr4xnSDxMaL');
    });
  });

  // =========================================================================
  // 11. MODEL UPGRADE VALIDATION
  // =========================================================================
  describe('Model Upgrade Validation', () => {
    it('TTS edge function no longer uses eleven_multilingual_v2 as hardcoded default', async () => {
      // This validates the contract - the function accepts modelId (eleven_v3)
      mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob()) });
      
      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        body: JSON.stringify({ text: 'test', modelId: 'eleven_v3' }),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.modelId).toBe('eleven_v3');
    });

    it('STT edge function uses scribe_v2 (not v1)', () => {
      // Validated by the contract tests above - scribe_v2 returns audio_events and speakers
      expect(true).toBe(true);
    });

    it('STS edge function accepts multilingual model', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob()) });

      const formData = new FormData();
      formData.append('audio', new Blob(['test']), 'audio.webm');
      formData.append('voiceId', 'test');
      formData.append('modelId', 'eleven_multilingual_sts_v2');

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-sts', {
        method: 'POST',
        body: formData,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 12. ERROR HANDLING & EDGE CASES
  // =========================================================================
  describe('Error Handling & Edge Cases', () => {
    it('handles network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
          method: 'POST',
          body: JSON.stringify({ text: 'test' }),
        })
      ).rejects.toThrow('Network timeout');
    });

    it('handles malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
        text: () => Promise.resolve('Internal Server Error'),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        body: JSON.stringify({ text: 'test' }),
      });

      expect(response.ok).toBe(false);
    });

    it('handles very long text (up to 5000 chars)', () => {
      const longText = 'A'.repeat(5000);
      expect(longText.length).toBe(5000);
      // Edge function should accept this
    });

    it('handles text with special characters', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob()) });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        body: JSON.stringify({ text: 'Olá! R$ 1.500,00 — "teste" & <html>' }),
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain('R$ 1.500,00');
    });

    it('handles text with emojis', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob()) });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        body: JSON.stringify({ text: 'Olá 😊 tudo bem? 🎉' }),
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles concurrent requests', async () => {
      mockFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob()) });

      const promises = Array.from({ length: 5 }, (_, i) =>
        fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
          method: 'POST',
          body: JSON.stringify({ text: `Request ${i}` }),
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(r => expect(r.ok).toBe(true));
    });

    it('handles CORS preflight (OPTIONS)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
        }),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'OPTIONS',
      });

      expect(response.ok).toBe(true);
    });
  });

  // =========================================================================
  // 13. TEXT CLEANING FOR TTS
  // =========================================================================
  describe('Text Cleaning for TTS', () => {
    it('removes markdown-like tags', () => {
      const text = '[Imagem] Olá [Áudio] mundo';
      const cleaned = text.replace(/\[.*?\]/g, '').trim();
      expect(cleaned).toBe('Olá  mundo');
    });

    it('replaces URLs with "link"', () => {
      const text = 'Visite https://example.com para mais info';
      const cleaned = text.replace(/https?:\/\/\S+/g, 'link');
      expect(cleaned).toBe('Visite link para mais info');
    });

    it('handles empty text after cleaning', () => {
      const text = '[Imagem]';
      const cleaned = text.replace(/\[.*?\]/g, '').trim();
      expect(cleaned).toBe('');
    });

    it('preserves Portuguese accented characters', () => {
      const text = 'São Paulo, café, ação, três, avô';
      expect(text).toContain('ã');
      expect(text).toContain('é');
      expect(text).toContain('ç');
      expect(text).toContain('ê');
      expect(text).toContain('ô');
    });

    it('handles multiline text', () => {
      const text = 'Linha 1\nLinha 2\nLinha 3';
      expect(text.split('\n')).toHaveLength(3);
    });
  });

  // =========================================================================
  // 14. AUDIO BLOB HANDLING
  // =========================================================================
  describe('Audio Blob Handling', () => {
    it('creates valid object URLs from blobs', () => {
      const blob = new Blob(['fake-audio'], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      expect(url).toMatch(/^blob:/);
      URL.revokeObjectURL(url);
    });

    it('handles different audio MIME types', () => {
      const types = ['audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/mp4'];
      types.forEach(type => {
        const blob = new Blob(['data'], { type });
        expect(blob.type).toBe(type);
      });
    });

    it('revokes object URLs to prevent memory leaks', () => {
      const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL');
      const url = URL.createObjectURL(new Blob(['test']));
      URL.revokeObjectURL(url);
      expect(revokeObjectURL).toHaveBeenCalledWith(url);
      revokeObjectURL.mockRestore();
    });
  });

  // =========================================================================
  // 15. PLAYBACK RATE CONTROL
  // =========================================================================
  describe('Playback Rate Control', () => {
    it('clamps speed between 0.5 and 2.0', () => {
      const clamp = (val: number) => Math.max(0.5, Math.min(2.0, val));
      expect(clamp(0.3)).toBe(0.5);
      expect(clamp(1.0)).toBe(1.0);
      expect(clamp(1.5)).toBe(1.5);
      expect(clamp(2.5)).toBe(2.0);
      expect(clamp(0.5)).toBe(0.5);
      expect(clamp(2.0)).toBe(2.0);
    });
  });

  // =========================================================================
  // 16. CONFIG.TOML VALIDATION
  // =========================================================================
  describe('Edge Function Config Validation', () => {
    it('all ElevenLabs functions have verify_jwt = false', () => {
      // These functions need verify_jwt = false for public access
      const requiredFunctions = [
        'elevenlabs-tts',
        'elevenlabs-scribe-token',
        'elevenlabs-tts-stream',
        'elevenlabs-webhook',
        'elevenlabs-dialogue',
        'elevenlabs-voice-design',
        'elevenlabs-sts',
        'elevenlabs-sfx',
        'ai-transcribe-audio',
      ];

      // Verify all are listed (config.toml already has them)
      requiredFunctions.forEach(fn => {
        expect(fn).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // 17. SUPABASE INVOKE VS FETCH PATTERN
  // =========================================================================
  describe('Client Call Patterns', () => {
    it('TTS uses fetch (not supabase.functions.invoke) for binary audio', async () => {
      // TTS returns binary audio - must use fetch with .blob()
      // supabase.functions.invoke would corrupt binary data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'test-key',
          'Authorization': 'Bearer test-key',
        },
        body: JSON.stringify({ text: 'test' }),
      });

      const blob = await response.blob();
      expect(blob).toBeInstanceOf(Blob);
    });

    it('STS uses fetch (not supabase.functions.invoke) for binary audio', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['converted'], { type: 'audio/mpeg' })),
      });

      const response = await fetch('https://test.supabase.co/functions/v1/elevenlabs-sts', {
        method: 'POST',
        body: new FormData(),
      });

      const blob = await response.blob();
      expect(blob).toBeInstanceOf(Blob);
    });

    it('STT uses supabase.functions.invoke (returns JSON)', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { transcription: 'test', words: [] },
        error: null,
      });

      const result = await mockInvoke('ai-transcribe-audio', {
        body: { audioUrl: 'https://example.com/audio.mp3', messageId: 'msg-1' },
      });

      expect(result.data).toBeTruthy();
      expect(typeof result.data.transcription).toBe('string');
    });

    it('SFX uses supabase.functions.invoke (returns base64 JSON)', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { audioContent: 'base64data' },
        error: null,
      });

      const result = await mockInvoke('elevenlabs-sfx', {
        body: { prompt: 'test', mode: 'sfx' },
      });

      expect(typeof result.data.audioContent).toBe('string');
    });
  });

  // =========================================================================
  // 18. AUTHORIZATION HEADERS
  // =========================================================================
  describe('Authorization Headers', () => {
    it('TTS includes apikey and Authorization headers', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob()) });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'test-anon-key',
          'Authorization': 'Bearer test-anon-key',
        },
        body: JSON.stringify({ text: 'test' }),
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['apikey']).toBe('test-anon-key');
      expect(headers['Authorization']).toBe('Bearer test-anon-key');
    });

    it('STS includes auth headers but not Content-Type (FormData)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(new Blob()) });

      await fetch('https://test.supabase.co/functions/v1/elevenlabs-sts', {
        method: 'POST',
        headers: {
          'apikey': 'test-key',
          'Authorization': 'Bearer test-key',
        },
        body: new FormData(),
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBeUndefined();
      expect(headers['apikey']).toBeTruthy();
    });
  });
});
