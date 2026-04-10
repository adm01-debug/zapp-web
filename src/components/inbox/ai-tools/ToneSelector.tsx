import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const TONE_OPTIONS = [
  { key: 'professional', label: 'Formal', emoji: '💼', prompt: 'Use tom formal, profissional e corporativo.' },
  { key: 'friendly', label: 'Amigável', emoji: '😊', prompt: 'Use tom amigável, acolhedor e empático.' },
  { key: 'objective', label: 'Objetivo', emoji: '🎯', prompt: 'Use tom amigável e direto ao ponto, sem rodeios mas mantendo empatia. Seja claro, objetivo e eficiente na comunicação.' },
  { key: 'casual', label: 'Descontraído', emoji: '🤙', prompt: 'Use tom descontraído, leve e informal.' },
  { key: 'persuasive', label: 'Persuasivo', emoji: '🔥', prompt: 'Use tom persuasivo, confiante e orientado a resultados.' },
] as const;

export type ToneKey = typeof TONE_OPTIONS[number]['key'];

export function getTonePrompt(tone: ToneKey): string {
  return TONE_OPTIONS.find(t => t.key === tone)!.prompt;
}

interface ToneSelectorProps {
  selected: ToneKey;
  onChange: (tone: ToneKey) => void;
  disabled?: boolean;
}

export const ToneSelector = memo(function ToneSelector({ selected, onChange, disabled }: ToneSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tom da resposta">
      {TONE_OPTIONS.map(t => {
        const isActive = selected === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(t.key)}
            disabled={disabled}
            className={cn(
              'relative px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 border',
              isActive
                ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                : 'bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40 hover:border-border/50 hover:text-foreground',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {isActive && (
              <motion.span
                layoutId="tone-active-bg"
                className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/20"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <span className="text-sm leading-none">{t.emoji}</span>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
});
