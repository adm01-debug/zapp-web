import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { VoiceAgentPhase } from '@/hooks/voice/types';
import { usePhaseColors } from './usePhaseColors';

interface SpectrumWaveformProps {
  phase: VoiceAgentPhase;
}

export function SpectrumWaveform({ phase }: SpectrumWaveformProps) {
  const colors = usePhaseColors(phase);
  const isActive = phase === 'listening' || phase === 'speaking' || phase === 'processing';
  const barCount = 15;

  // Pre-compute random factors once so they don't jitter on re-render
  const barFactors = useMemo(
    () => Array.from({ length: barCount }, () => 0.5 + Math.random() * 0.5),
    // Recalculate only when phase changes to get a fresh pattern per phase
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase]
  );

  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: barCount }).map((_, i) => {
        const distFromCenter = Math.abs(i - (barCount - 1) / 2);
        const maxHeight = Math.max(4, 24 - distFromCenter * 3);
        const colorIndex = i % 3;
        const color = colorIndex === 0 ? colors.primary : colorIndex === 1 ? colors.secondary : colors.accent;

        return (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: 3,
              background: `linear-gradient(to top, ${color}, ${color}80)`,
            }}
            animate={{
              height: isActive
                ? [4, maxHeight * barFactors[i], 4]
                : [4, maxHeight * 0.3, 4],
            }}
            transition={{
              duration: isActive ? 0.35 + i * 0.02 : 1 + i * 0.05,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.03,
            }}
          />
        );
      })}
    </div>
  );
}
