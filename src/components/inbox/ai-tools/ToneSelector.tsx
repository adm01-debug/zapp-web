import { memo } from 'react';
import { motion } from 'framer-motion';

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
            className={`relative px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors border ${
              isActive
                ? 'border-primary/50 text-primary'
                : 'bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50 hover:border-border/50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isActive && (
              <motion.span
                layoutId="tone-active-bg"
                className="absolute inset-0 rounded-full bg-primary/15 shadow-sm shadow-primary/10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-1">
              <span className="text-xs">{t.emoji}</span>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
});
