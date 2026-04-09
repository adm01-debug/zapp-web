import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldQuestion, Lightbulb, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TONE_OPTIONS = [
  { key: 'professional', label: '💼 Formal', prompt: 'Use tom formal, profissional e corporativo.' },
  { key: 'friendly', label: '😊 Amigável', prompt: 'Use tom amigável, acolhedor e empático.' },
  { key: 'casual', label: '🤙 Descontraído', prompt: 'Use tom descontraído, leve e informal.' },
  { key: 'persuasive', label: '🎯 Persuasivo', prompt: 'Use tom persuasivo, confiante e orientado a resultados.' },
] as const;

type ToneKey = typeof TONE_OPTIONS[number]['key'];

interface Objection {
  objection: string;
  counterArgument: string;
  confidence: number;
}

interface ObjectionDetectorProps {
  contactId: string;
  lastMessages: string[];
  onSelectSuggestion?: (text: string) => void;
}

export function ObjectionDetector({ contactId, lastMessages, onSelectSuggestion }: ObjectionDetectorProps) {
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [selectedTone, setSelectedTone] = useState<ToneKey>('friendly');
  const [rewritingIdx, setRewritingIdx] = useState<number | null>(null);

  const tonePrompt = TONE_OPTIONS.find(t => t.key === selectedTone)!.prompt;

  const analyze = async (tone?: ToneKey) => {
    if (lastMessages.length === 0) return;
    setLoading(true);
    const activeTone = tone ?? selectedTone;
    const activePrompt = TONE_OPTIONS.find(t => t.key === activeTone)!.prompt;

    try {
      const response = await supabase.functions.invoke('ai-proxy', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em vendas e atendimento. Analise as mensagens do cliente e identifique objeções. Para cada objeção, sugira um contra-argumento persuasivo.
${activePrompt}
Responda APENAS em JSON válido com este formato:
[{"objection":"texto da objeção","counterArgument":"sugestão de resposta","confidence":0.85}]
Se não houver objeções, retorne []`,
            },
            {
              role: 'user',
              content: `Mensagens do cliente:\n${lastMessages.join('\n')}`,
            },
          ],
          model: 'google/gemini-2.5-flash',
        },
      });

      const content = response.data?.content || response.data?.choices?.[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setObjections(JSON.parse(jsonMatch[0]));
      }
    } catch {
      setObjections([]);
    }

    setAnalyzed(true);
    setLoading(false);
  };

  const rewriteSingle = async (idx: number, tone: ToneKey) => {
    setRewritingIdx(idx);
    const activePrompt = TONE_OPTIONS.find(t => t.key === tone)!.prompt;

    try {
      const response = await supabase.functions.invoke('ai-proxy', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Reescreva o contra-argumento abaixo mantendo o mesmo significado mas mudando o tom. ${activePrompt} Responda APENAS com o texto reescrito, sem aspas ou explicações.`,
            },
            {
              role: 'user',
              content: objections[idx].counterArgument,
            },
          ],
          model: 'google/gemini-2.5-flash',
        },
      });

      const content = response.data?.content || response.data?.choices?.[0]?.message?.content;
      if (content) {
        setObjections(prev => prev.map((o, i) => i === idx ? { ...o, counterArgument: content.trim() } : o));
      }
    } catch { /* ignore */ }

    setRewritingIdx(null);
  };

  const handleToneChange = (tone: ToneKey) => {
    setSelectedTone(tone);
    if (analyzed && objections.length > 0) {
      analyze(tone);
    }
  };

  if (!analyzed) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {TONE_OPTIONS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSelectedTone(t.key)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border ${
                selectedTone === t.key
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs text-muted-foreground hover:text-primary"
          onClick={() => analyze()}
          disabled={loading || lastMessages.length === 0}
        >
          {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ShieldQuestion className="w-3 h-3 mr-1" />}
          Detectar objeções
        </Button>
      </div>
    );
  }

  if (objections.length === 0) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-muted-foreground">Nenhuma objeção detectada</p>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] mt-1" onClick={() => analyze()}>
          Reanalisar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldQuestion className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-medium">Objeções detectadas</span>
          <Badge variant="outline" className="text-[10px]">{objections.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => analyze()} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        </Button>
      </div>

      {/* Tone selector */}
      <div className="flex flex-wrap gap-1">
        {TONE_OPTIONS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleToneChange(t.key)}
            disabled={loading}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border ${
              selectedTone === t.key
                ? 'bg-primary/20 border-primary/40 text-primary'
                : 'bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {objections.map((obj, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="space-y-1.5 p-2.5 rounded-lg bg-muted/20 border border-border/30"
          >
            <div className="flex items-start gap-1.5">
              <ShieldQuestion className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">{obj.objection}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectSuggestion?.(obj.counterArgument)}
              disabled={rewritingIdx === idx}
              className="flex items-start gap-1.5 pl-5 w-full text-left group cursor-pointer hover:bg-primary/10 rounded-md p-1 -m-1 transition-colors"
              title="Clique para usar esta resposta"
            >
              <Lightbulb className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              {rewritingIdx === idx ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Reescrevendo...
                </span>
              ) : (
                <p className="text-xs text-foreground group-hover:text-primary transition-colors">{obj.counterArgument}</p>
              )}
              <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary whitespace-nowrap">Usar ↵</span>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
