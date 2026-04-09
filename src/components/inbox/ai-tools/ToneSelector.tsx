import { memo } from 'react';

export const TONE_OPTIONS = [
  { key: 'professional', label: '💼 Formal', prompt: 'Use tom formal, profissional e corporativo.' },
  { key: 'friendly', label: '😊 Amigável', prompt: 'Use tom amigável, acolhedor e empático.' },
  { key: 'casual', label: '🤙 Descontraído', prompt: 'Use tom descontraído, leve e informal.' },
  { key: 'persuasive', label: '🎯 Persuasivo', prompt: 'Use tom persuasivo, confiante e orientado a resultados.' },
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
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Tom da resposta">
      {TONE_OPTIONS.map(t => (
        <button
          key={t.key}
          type="button"
          role="radio"
          aria-checked={selected === t.key}
          onClick={() => onChange(t.key)}
          disabled={disabled}
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
            selected === t.key
              ? 'bg-primary/20 border-primary/40 text-primary shadow-sm shadow-primary/10'
              : 'bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50 hover:border-border/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
});
