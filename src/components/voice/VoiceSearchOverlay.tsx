import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  '💬 "Abrir a inbox"',
  '📊 "Mostrar o dashboard"',
  '🔍 "Buscar contato João"',
  '👥 "Ir para equipe"',
  '📈 "Alertas de sentimento"',
  '🤖 "Abrir chatbot builder"',
  '📞 "Central de chamadas"',
  '🏷️ "Gerenciar tags"',
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

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Auto-start listening when overlay opens (skip showing idle suggestions)
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (isOpen && phase === 'idle' && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      const timer = setTimeout(() => onStartListening(), 80);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      hasAutoStarted.current = false;
    }
  }, [isOpen, phase, onStartListening]);

  const handleOrbClick = useCallback(() => {
    if (phase === 'idle') onStartListening();
    else if (phase === 'listening') onStopListening();
    else if (phase === 'speaking') onStopSpeaking();
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);
  }, [phase, onStartListening, onStopListening, onStopSpeaking]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-label="Assistente de voz"
      >
        {/* Backdrop with breathing effect */}
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(8, 8, 18, 0.95)', backdropFilter: 'blur(24px)' }}
          animate={{ opacity: [0.92, 0.97, 0.92] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          onClick={onClose}
        />

        {/* Particles */}
        <FloatingParticles phase={phase} />

        {/* Main card */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-3xl max-w-xs w-full mx-4"
          style={{
            background: 'rgba(15, 15, 25, 0.8)',
            backdropFilter: 'blur(40px)',
          }}
          initial={{ scale: 0.9, y: 20 }}
          animate={{
            scale: 1,
            y: 0,
            border: `1px solid ${colors.primary}30`,
            boxShadow: `0 0 40px ${colors.glow1}20, 0 0 80px ${colors.glow2}10`,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Title */}
          <div className="text-center">
            <motion.h2
              className="text-lg font-bold text-white/90"
              key={meta.title}
              initial={{ opacity: 0, y: -5 }}
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
              {/* Partial transcript */}
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

              {/* Final transcript */}
              {finalTranscript && !partialTranscript && (
                <motion.div
                  key="final"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm text-white/80 font-medium"
                >
                  🎤 "{finalTranscript}"
                </motion.div>
              )}

              {/* Agent response */}
              {agentResponse && (
                <motion.div
                  key="response"
                  initial={{ opacity: 0, y: 5 }}
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

              {/* Processing indicator */}
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

              {/* Booting indicator */}
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

              {/* Error */}
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

          {/* Suggestions (idle, not booting) */}
          <AnimatePresence>
            {phase === 'idle' && !agentResponse && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full space-y-1"
              >
                <p className="text-[10px] text-white/25 text-center uppercase tracking-wider mb-2">
                  Sugestões
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SUGGESTION_COMMANDS.map((cmd, i) => (
                    <motion.div
                      key={cmd}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="text-[10px] text-white/30 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center hover:bg-white/[0.06] hover:text-white/40 transition-colors cursor-default"
                    >
                      {cmd}
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
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/30"
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
