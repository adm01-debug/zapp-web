import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { log } from '@/lib/logger';

// Default voice: Sarah
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

interface UseTextToSpeechOptions {
  initialVoiceId?: string;
  initialSpeed?: number;
  onVoiceChange?: (voiceId: string) => void;
  onSpeedChange?: (speed: number) => void;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [voiceId, setVoiceIdState] = useState(options.initialVoiceId || DEFAULT_VOICE_ID);
  const [speed, setSpeedState] = useState(options.initialSpeed || 1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Stable refs for callbacks to avoid stale closures
  const onVoiceChangeRef = useRef(options.onVoiceChange);
  onVoiceChangeRef.current = options.onVoiceChange;
  const onSpeedChangeRef = useRef(options.onSpeedChange);
  onSpeedChangeRef.current = options.onSpeedChange;

  // Sync with external voice ID changes
  useEffect(() => {
    if (options.initialVoiceId && options.initialVoiceId !== voiceId) {
      setVoiceIdState(options.initialVoiceId);
    }
  }, [options.initialVoiceId, voiceId]);

  // Sync with external speed changes
  useEffect(() => {
    if (options.initialSpeed !== undefined && options.initialSpeed !== speed) {
      setSpeedState(options.initialSpeed);
      if (audioRef.current) {
        audioRef.current.playbackRate = options.initialSpeed;
      }
    }
  }, [options.initialSpeed, speed]);

  const setVoiceId = useCallback((newVoiceId: string) => {
    setVoiceIdState(newVoiceId);
    onVoiceChangeRef.current?.(newVoiceId);
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    const clampedSpeed = Math.max(0.5, Math.min(2.0, newSpeed));
    setSpeedState(clampedSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = clampedSpeed;
    }
    onSpeedChangeRef.current?.(clampedSpeed);
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
    setCurrentMessageId(null);
  }, []);

  const speak = useCallback(async (text: string, messageId?: string) => {
    stop();

    if (!text || text.trim() === '') {
      toast.error('Texto vazio para reproduzir');
      return;
    }

    const cleanText = text
      .replace(/\[.*?\]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .trim();

    if (!cleanText) {
      toast.error('Nenhum texto para reproduzir');
      return;
    }

    setIsLoading(true);
    setCurrentMessageId(messageId || null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: cleanText,
            voiceId
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao gerar áudio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.playbackRate = speed;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentMessageId(null);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentMessageId(null);
        toast.error('Erro ao reproduzir áudio');
      };

      await audio.play();
    } catch (error) {
      log.error('TTS error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar áudio';
      toast.error(errorMessage);
      setCurrentMessageId(null);
    } finally {
      setIsLoading(false);
    }
  }, [voiceId, speed, stop]);

  return {
    speak,
    stop,
    isLoading,
    isPlaying,
    currentMessageId,
    voiceId,
    setVoiceId,
    speed,
    setSpeed,
  };
}
