import { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, AlertTriangle, Loader2, MessageCircle } from 'lucide-react';
import type { VoiceAgentPhase } from '@/hooks/voice/types';
import { VoiceOrb } from './VoiceOrb';
import { FloatingParticles } from './FloatingParticles';
import { SpectrumWaveform } from './VoiceVisualEffects';
import { usePhaseColors } from './usePhaseColors';

interface VoiceSearchOverlayProps {
  isOpen: boolean;
  phase: VoiceAgentPhase;
  partialTranscript: string;
  finalTranscript: string;
  agentResponse: string;
  error: string;
  onClose: () => void;
  onStartListening: () => Promise<void>;
  onStopListening: () => void;
  onStopSpeaking: () => void;
}

const PHASE_META: Record<VoiceAgentPhase, { title: string; subtitle: string }> = {
  idle: { title: 'Assistente de Voz', subtitle: 'Toque no orbe ou fale um comando' },
  booting: { title: 'Ativando Microfone', subtitle: 'Conectando ao reconhecimento de voz...' },
  listening: { title: 'Ouvindo...', subtitle: 'Fale seu comando agora' },
  processing: { title: 'Processando...', subtitle: 'Analisando seu comando com IA' },
  speaking: { title: 'Respondendo', subtitle: 'Toque no orbe para interromper' },
  error: { title: 'Erro', subtitle: 'Tentando novamente em instantes...' },
};

const SUGGESTION_COMMANDS = [
  { icon: '💬', text: 'Abrir a inbox' },
  { icon: '📊', text: 'Mostrar o dashboard' },
  { icon: '🔍', text: 'Buscar contato João' },
  { icon: '👥', text: 'Ir para equipe' },
  { icon: '📈', text: 'Alertas de sentimento' },
  { icon: '🤖', text: 'Abrir chatbot builder' },
  { icon: '📞', text: 'Central de chamadas' },
  { icon: '🏷️', text: 'Gerenciar tags' },
];

export function VoiceSearchOverlay({
  isOpen,
  phase,
  partialTranscript,
  finalTranscript,
  agentResponse,
  error,
  onClose,
  onStartListening,
  onStopListening,
  onStopSpeaking,
}: VoiceSearchOverlayProps) {
  const colors = usePhaseColors(phase);
  const meta = PHASE_META[phase];
  const prefersReduced = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Focus trap: focus close button when overlay opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC to close, Space on orb
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Auto-start listening when overlay opens
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (isOpen && phase === 'idle' && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      setShowSuggestions(false);
      const timer = setTimeout(() => onStartListening(), 80);
      return () => clearTimeout(timer);
    }
    // Show suggestions only after returning to idle (not initial boot)
    if (isOpen && phase === 'idle' && hasAutoStarted.current) {
      const timer = setTimeout(() => setShowSuggestions(true), 600);
      return () => clearTimeout(timer);
    }
    if (phase !== 'idle') setShowSuggestions(false);
    if (!isOpen) {
      hasAutoStarted.current = false;
      setShowSuggestions(false);
    }
  }, [isOpen, phase, onStartListening]);

  const handleOrbClick = useCallback(() => {
    if (phase === 'idle') onStartListening();
    else if (phase === 'listening') onStopListening();
    else if (phase === 'speaking') onStopSpeaking();
    if (navigator.vibrate) navigator.vibrate(30);
  }, [phase, onStartListening, onStopListening, onStopSpeaking]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const motionProps = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.1 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 } };

  const cardMotion = prefersReduced
    ? {}
    : { initial: { scale: 0.9, y: 20 }, animate: { scale: 1, y: 0 }, transition: { duration: 0.4, ease: 'easeOut' as const } };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        {...motionProps}
        role="dialog"
        aria-modal="true"
        aria-label="Assistente de voz"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(8, 8, 18, 0.95)', backdropFilter: 'blur(24px)' }}
          animate={prefersReduced ? {} : { opacity: [0.92, 0.97, 0.92] }}
          transition={prefersReduced ? {} : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          onClick={onClose}
        />

        {/* Particles — skip if reduced motion */}
        {!prefersReduced && <FloatingParticles phase={phase} />}

        {/* Main card */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-3xl max-w-xs w-full mx-4"
          style={{
            background: 'rgba(15, 15, 25, 0.8)',
            backdropFilter: 'blur(40px)',
            border: `1px solid ${colors.primary}30`,
            boxShadow: prefersReduced ? 'none' : `0 0 40px ${colors.glow1}20, 0 0 80px ${colors.glow2}10`,
          }}
          {...cardMotion}
        >
          {/* Title */}
          <div className="text-center">
            <motion.h2
              className="text-lg font-bold text-white/90"
              key={meta.title}
              initial={{ opacity: 0, y: prefersReduced ? 0 : -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {meta.title}
            </motion.h2>
            <motion.p
              className="text-xs text-white/40 mt-1"
              key={meta.subtitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {meta.subtitle}
            </motion.p>
          </div>

          {/* Orb */}
          <button
            onClick={handleOrbClick}
            className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-full"
            aria-label={
              phase === 'listening'
                ? 'Parar de ouvir'
                : phase === 'speaking'
                ? 'Interromper resposta'
                : 'Começar a ouvir'
            }
          >
            <VoiceOrb phase={phase} size={180} />
          </button>

          {/* Spectrum waveform */}
          <SpectrumWaveform phase={phase} />

          {/* Transcript area */}
          <div className="w-full min-h-[60px] space-y-2" aria-live="polite" aria-atomic="true">
            <AnimatePresence mode="wait">
              {partialTranscript && (
                <motion.div
                  key="partial"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-sm text-white/50 italic"
                >
                  "{partialTranscript}"
                </motion.div>
              )}

              {finalTranscript && !partialTranscript && (
                <motion.div
                  key="final"
                  initial={{ opacity: 0, y: prefersReduced ? 0 : 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm text-white/80 font-medium"
                >
                  🎤 "{finalTranscript}"
                </motion.div>
              )}

              {agentResponse && (
                <motion.div
                  key="response"
                  initial={{ opacity: 0, y: prefersReduced ? 0 : 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm font-medium px-3 py-2 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                    border: `1px solid ${colors.primary}25`,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  <MessageCircle className="w-3 h-3 inline-block mr-1.5 opacity-60" />
                  {agentResponse}
                </motion.div>
              )}

              {phase === 'processing' && !agentResponse && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2 text-white/40 text-xs"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processando com IA...
                </motion.div>
              )}

              {phase === 'booting' && (
                <motion.div
                  key="booting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2 text-white/40 text-xs"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Conectando microfone...
                </motion.div>
              )}

              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2 text-red-400/80 text-xs px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
                  role="alert"
                >
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Suggestions — only after returning to idle, not during boot */}
          <AnimatePresence>
            {showSuggestions && phase === 'idle' && !agentResponse && (
              <motion.div
                initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: prefersReduced ? 0 : -8 }}
                transition={{ duration: 0.3 }}
                className="w-full space-y-1"
              >
                <p className="text-[10px] text-white/25 text-center uppercase tracking-wider mb-2">
                  Sugestões de comandos
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SUGGESTION_COMMANDS.map((cmd, i) => (
                    <motion.div
                      key={cmd.text}
                      initial={{ opacity: 0, y: prefersReduced ? 0 : 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: prefersReduced ? 0 : i * 0.04 }}
                      className="text-[10px] text-white/30 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center hover:bg-white/[0.06] hover:text-white/40 transition-colors cursor-default select-none"
                    >
                      <span className="mr-1">{cmd.icon}</span>
                      <span>"{cmd.text}"</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close & ESC hint */}
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-white/20">
              <kbd className="px-1 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[9px] font-mono">ESC</kbd>
              {' '}para fechar
            </span>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
              aria-label="Fechar assistente de voz"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
