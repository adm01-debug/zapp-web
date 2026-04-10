import { memo } from 'react';
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
    <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-muted/30 border border-border/20" role="radiogroup" aria-label="Tom da resposta">
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
              'flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-[10px] font-medium transition-all duration-200',
              isActive
                ? 'bg-primary/15 text-primary shadow-sm border border-primary/30'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            <span className="text-base leading-none">{t.emoji}</span>
            <span className="truncate w-full text-center">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
});
