import { useState, useCallback, useRef, useEffect } from 'react';
import { getLogger } from '@/lib/logger';

const log = getLogger('SpeechToText');

interface UseSpeechToTextOptions {
  language?: string;
  continuous?: boolean;
  onResult?: (text: string) => void;
  onEnd?: () => void;
}

interface SpeechToTextReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): SpeechToTextReturn {
  const { language = 'pt-BR', continuous = true, onResult, onEnd } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);

  // Keep refs in sync to avoid stale closures
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  const SpeechRecognitionCtor = typeof window !== 'undefined'
    ? (window as unknown as Record<string, unknown>).SpeechRecognition as typeof globalThis.SpeechRecognition | undefined
      ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition as typeof globalThis.SpeechRecognition | undefined
    : null;

  const isSupported = !!SpeechRecognition;

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const combined = finalTranscript || interimTranscript;
      setTranscript(combined);

      if (finalTranscript && onResultRef.current) {
        onResultRef.current(finalTranscript);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      onEndRef.current?.();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      log.warn('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript('');

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(15);
  }, [SpeechRecognition, language, continuous]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
  };
}
