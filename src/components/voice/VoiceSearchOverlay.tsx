import { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, AlertTriangle, Loader2, MessageCircle } from 'lucide-react';
import type { VoiceAgentPhase } from '@/hooks/voice/types';
import { VoiceOrb } from './VoiceOrb';
import { FloatingParticles } from './FloatingParticles';
import { AudioFrequencyVisualizer } from './AudioFrequencyVisualizer';
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
  idle: { title: 'Assistente de Voz', subtitle: 'Toque no orbe para começar' },
  booting: { title: 'Ativando microfone...', subtitle: 'Preparando sua conversa por voz' },
  listening: { title: 'Ouvindo...', subtitle: 'Fale seu comando agora' },
  processing: { title: 'Processando...', subtitle: 'Analisando seu comando com IA' },
  speaking: { title: 'Respondendo', subtitle: 'Toque no orbe para interromper' },
  error: { title: 'Erro', subtitle: 'Toque para tentar novamente' },
};

const SUGGESTION_COMMANDS = [
  '"Abrir a inbox"',
  '"Mostrar o dashboard"',
  '"Buscar contato João"',
  '"Ir para equipe"',
  '"Alertas de sentimento"',
  '"Abrir chatbot builder"',
  '"Central de chamadas"',
  '"Gerenciar tags"',
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

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Auto-start listening
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (isOpen && phase === 'idle' && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      setShowSuggestions(false);
      const timer = setTimeout(() => onStartListening(), 80);
      return () => clearTimeout(timer);
    }
    if (isOpen && phase === 'idle' && hasAutoStarted.current) {
      const timer = setTimeout(() => setShowSuggestions(true), 600);
      return () => clearTimeout(timer);
    }
    if (phase !== 'idle') setShowSuggestions(false);
    if (!isOpen) { hasAutoStarted.current = false; setShowSuggestions(false); }
  }, [isOpen, phase, onStartListening]);

  const handleOrbClick = useCallback(() => {
    if (phase === 'idle' || phase === 'error') onStartListening();
    else if (phase === 'listening') onStopListening();
    else if (phase === 'speaking') onStopSpeaking();
    if (navigator.vibrate) navigator.vibrate(30);
  }, [phase, onStartListening, onStopListening, onStopSpeaking]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isActive = phase === 'listening' || phase === 'speaking' || phase === 'processing';

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: prefersReduced ? 0.1 : 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-label="Assistente de voz"
      >
        {/* ============ BREATHING BACKDROP ============ */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(15, 15, 30, 0.88) 0%, rgba(5, 5, 12, 0.96) 100%)',
            backdropFilter: 'blur(32px)',
          }}
          animate={prefersReduced ? {} : {
            opacity: [0.88, 0.95, 0.88],
          }}
          transition={prefersReduced ? {} : {
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          onClick={onClose}
        />

        {/* Subtle color wash on backdrop matching phase */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: `radial-gradient(ellipse 60% 50% at 50% 45%, ${colors.glow1}12 0%, transparent 70%)`,
            opacity: isActive ? [0.4, 0.7, 0.4] : 0.2,
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Particles */}
        {!prefersReduced && <FloatingParticles phase={phase} />}

        {/* ============ MAIN CARD with GLOWING BORDER ============ */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-5 p-8 rounded-3xl max-w-xs w-full mx-4"
          style={{
            background: 'rgba(12, 12, 22, 0.85)',
            backdropFilter: 'blur(40px)',
          }}
          initial={prefersReduced ? {} : { scale: 0.9, y: 20 }}
          animate={prefersReduced ? {} : { scale: 1, y: 0 }}
          transition={prefersReduced ? {} : { duration: 0.4, ease: 'easeOut' }}
        >
          {/* ---- Animated glowing border (behind card) ---- */}
          <motion.div
            className="absolute -inset-[1px] rounded-3xl pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}50, ${colors.secondary}30, ${colors.accent}50, ${colors.primary}30)`,
              backgroundSize: '300% 300%',
            }}
            animate={prefersReduced ? {} : {
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={prefersReduced ? {} : {
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Inner background to mask the border gradient */}
          <div
            className="absolute inset-[1px] rounded-[22px] pointer-events-none"
            style={{ background: 'rgba(12, 12, 22, 0.92)' }}
          />

          {/* ---- Outer glow shadow ---- */}
          <motion.div
            className="absolute -inset-4 rounded-[32px] pointer-events-none"
            style={{ filter: 'blur(20px)' }}
            animate={{
              background: `radial-gradient(ellipse at center, ${colors.glow1}20, transparent 70%)`,
              opacity: isActive ? [0.3, 0.6, 0.3] : [0.15, 0.25, 0.15],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* ---- Card Content (z-10 to be above border layers) ---- */}
          <div className="relative z-10 flex flex-col items-center gap-5 w-full">
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
                phase === 'listening' ? 'Parar de ouvir'
                  : phase === 'speaking' ? 'Interromper resposta'
                  : 'Começar a ouvir'
              }
            >
              <VoiceOrb phase={phase} size={180} />
            </button>

            {/* ============ AUDIO FREQUENCY VISUALIZER ============ */}
            <AudioFrequencyVisualizer phase={phase} />

            {/* Transcript area */}
            <div className="w-full min-h-[56px] space-y-2" aria-live="polite" aria-atomic="true">
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
                    className="flex flex-col gap-1.5 items-center text-center px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20"
                    role="alert"
                  >
                    <div className="flex items-center gap-2 text-red-400/90 text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      {error}
                    </div>
                    <span className="text-[10px] text-white/30">Toque no orbe para tentar novamente</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Suggestions */}
            <AnimatePresence>
              {showSuggestions && phase === 'idle' && !agentResponse && (
                <motion.div
                  initial={{ opacity: 0, y: prefersReduced ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: prefersReduced ? 0 : -8 }}
                  transition={{ duration: 0.3 }}
                  className="w-full space-y-2"
                >
                  <p className="text-[10px] text-white/25 text-center uppercase tracking-widest font-semibold">
                    Experimente dizer
                  </p>
                  <div className="flex flex-col items-center gap-1.5">
                    {SUGGESTION_COMMANDS.slice(0, 4).map((cmd, i) => (
                      <motion.div
                        key={cmd}
                        initial={{ opacity: 0, y: prefersReduced ? 0 : 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReduced ? 0 : i * 0.06 }}
                        className="text-xs text-white/35 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:text-white/50 transition-colors cursor-default select-none"
                      >
                        {cmd}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Close & ESC hint */}
            <div className="flex items-center justify-between w-full pt-1">
              <span className="text-[10px] text-white/20">
                <kbd className="px-1 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[9px] font-mono">ESC</kbd>
                {' '}para fechar
              </span>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent border border-white/10"
                aria-label="Fechar assistente de voz"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
