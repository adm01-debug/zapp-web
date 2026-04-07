import { useState, useCallback, useRef, useEffect } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';
import type { VoiceAgentPhase, VoiceAgentAction, UseVoiceAgentOptions, UseVoiceAgentReturn } from './voice/types';
import { processVoiceTranscript } from './voice/processTranscript';
import { playTtsAudio, type TtsPlayback } from './voice/playTtsAudio';
import { logVoiceCommand } from './voice/logVoiceCommand';
import { withRetry, friendlyErrorMessage } from './voice/retry';

const SESSION_START_TIMEOUT_MS = 8000;
const ERROR_RESET_DELAY_MS = 5000;
const AUTO_RESTART_DELAY_MS = 800;

export type { VoiceAgentAction, VoiceAgentPhase };

export function useVoiceAgent(options?: UseVoiceAgentOptions): UseVoiceAgentReturn {
  const [phase, setPhase] = useState<VoiceAgentPhase>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [error, setError] = useState('');

  // Stabilize callbacks via refs to avoid dependency churn
  const onActionRef = useRef(options?.onAction);
  const onErrorRef = useRef(options?.onError);
  const ttsRef = useRef<TtsPlayback | null>(null);
  const phaseRef = useRef<VoiceAgentPhase>('idle');
  const bootTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const autoRestartRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    onActionRef.current = options?.onAction;
    onErrorRef.current = options?.onError;
  }, [options?.onAction, options?.onError]);

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Process committed transcript — extracted to stable ref to avoid stale closures
  const handleTranscript = useCallback(async (text: string) => {
    const startTime = Date.now();
    setPhase('processing');
    setAgentResponse('');

    try {
      const result = await withRetry(() => processVoiceTranscript(text, supabaseUrl, supabaseKey));
      setAgentResponse(result.response);

      // Play TTS
      setPhase('speaking');
      try {
        const tts = playTtsAudio(result.response, supabaseUrl, supabaseKey);
        ttsRef.current = tts;
        await tts.promise;
      } catch (ttsErr) {
        log.warn('TTS playback failed, continuing silently', ttsErr);
      }

      // Log telemetry (fire-and-forget)
      logVoiceCommand({
        transcript: text,
        action: result.action,
        response: result.response,
        data: result.data as Record<string, unknown>,
        durationMs: Date.now() - startTime,
        success: true,
      });

      // Trigger action callback
      onActionRef.current?.(result);

      // Return to listening after speaking
      setPhase('idle');
      autoRestartRef.current = setTimeout(() => {
        if (scribe.isConnected) {
          setPhase('listening');
        }
      }, AUTO_RESTART_DELAY_MS);
    } catch (err) {
      const msg = friendlyErrorMessage(err);
      log.error('Voice processing error:', err);
      setError(msg);
      setPhase('error');
      onErrorRef.current?.(msg);

      logVoiceCommand({
        transcript: text,
        action: 'error',
        response: msg,
        durationMs: Date.now() - startTime,
        success: false,
      });

      setTimeout(() => {
        setError('');
        setPhase(scribe.isConnected ? 'listening' : 'idle');
      }, ERROR_RESET_DELAY_MS);
    }
  }, [supabaseUrl, supabaseKey]);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      setPartialTranscript(data.text);
    },
    onCommittedTranscript: (data) => {
      if (data.text.trim()) {
        setFinalTranscript(data.text);
        setPartialTranscript('');
        handleTranscript(data.text);
      }
    },
  });

  const startListening = useCallback(async () => {
    // Use ref to avoid stale closure on phase
    if (phaseRef.current === 'booting') return;

    setPhase('booting');
    setPartialTranscript('');
    setFinalTranscript('');
    setAgentResponse('');
    setError('');

    try {
      const { data, error: tokenError } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (tokenError || !data?.token) {
        throw new Error(tokenError?.message || 'Failed to get STT token');
      }

      // Set timeout for connection
      bootTimeoutRef.current = setTimeout(() => {
        if (phaseRef.current === 'booting') {
          setError('Conexão com microfone demorou demais.');
          setPhase('error');
          setTimeout(() => {
            setError('');
            setPhase('idle');
          }, ERROR_RESET_DELAY_MS);
        }
      }, SESSION_START_TIMEOUT_MS);

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      clearTimeout(bootTimeoutRef.current);
      setPhase('listening');

      // Haptic feedback on mobile
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
      clearTimeout(bootTimeoutRef.current);
      const msg = friendlyErrorMessage(err);
      setError(msg);
      setPhase('error');
      onErrorRef.current?.(msg);

      setTimeout(() => {
        setError('');
        setPhase('idle');
      }, ERROR_RESET_DELAY_MS);
    }
  }, [scribe]);

  const stopListening = useCallback(() => {
    scribe.disconnect();
    setPhase('idle');
    setPartialTranscript('');
    clearTimeout(autoRestartRef.current);
  }, [scribe]);

  const stopSpeaking = useCallback(() => {
    ttsRef.current?.stop();
    ttsRef.current = null;
    setPhase(scribe.isConnected ? 'listening' : 'idle');
  }, [scribe]);

  const reset = useCallback(() => {
    scribe.disconnect();
    ttsRef.current?.stop();
    ttsRef.current = null;
    clearTimeout(bootTimeoutRef.current);
    clearTimeout(autoRestartRef.current);
    setPhase('idle');
    setPartialTranscript('');
    setFinalTranscript('');
    setAgentResponse('');
    setError('');
  }, [scribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scribe.disconnect();
      ttsRef.current?.stop();
      clearTimeout(bootTimeoutRef.current);
      clearTimeout(autoRestartRef.current);
    };
  }, [scribe]);

  return {
    phase,
    partialTranscript,
    finalTranscript,
    agentResponse,
    error,
    startListening,
    stopListening,
    stopSpeaking,
    reset,
  };
}
