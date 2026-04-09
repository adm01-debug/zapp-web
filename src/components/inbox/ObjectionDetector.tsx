import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldQuestion, Lightbulb, Loader2, Sparkles, RefreshCw, AlertTriangle, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const lastCallRef = useRef(0);

  const analyze = useCallback(async (tone?: ToneKey) => {
    if (lastMessages.length === 0) {
      toast.warning('Nenhuma mensagem do cliente para analisar.');
      return;
    }

    // Rate limit: min 3s between calls
    const now = Date.now();
    if (now - lastCallRef.current < 3000) {
      toast.warning('Aguarde alguns segundos antes de tentar novamente.');
      return;
    }
    lastCallRef.current = now;

    setLoading(true);
    setError(null);
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

      if (response.error) throw new Error(response.error.message || 'Erro na API');

      const content = response.data?.content || response.data?.choices?.[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) throw new Error('Resposta inválida da IA');
        // Validate structure
        const valid = parsed.filter((o: unknown) => {
          if (typeof o !== 'object' || o === null) return false;
          const obj = o as Record<string, unknown>;
          return typeof obj.objection === 'string' && typeof obj.counterArgument === 'string';
        }).map((o: Record<string, unknown>) => ({
          objection: String(o.objection),
          counterArgument: String(o.counterArgument),
          confidence: typeof o.confidence === 'number' ? Math.min(1, Math.max(0, o.confidence)) : 0.5,
        }));
        setObjections(valid);
        if (valid.length > 0) {
          toast.success(`${valid.length} objeção(ões) detectada(s)!`);
        }
      } else {
        setObjections([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      setObjections([]);
      toast.error('Falha ao analisar objeções. Tente novamente.');
    }

    setAnalyzed(true);
    setLoading(false);
  }, [lastMessages, selectedTone]);

  const rewriteSingle = async (idx: number) => {
    setRewritingIdx(idx);
    const activePrompt = TONE_OPTIONS.find(t => t.key === selectedTone)!.prompt;

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
        toast.success('Resposta reescrita!');
      }
    } catch {
      toast.error('Erro ao reescrever. Tente novamente.');
    }

    setRewritingIdx(null);
  };

  const handleToneChange = (tone: ToneKey) => {
    setSelectedTone(tone);
    // Don't auto-reanalyze on tone change - user can use rewrite per item or re-analyze manually
  };

  const handleSelect = (text: string) => {
    onSelectSuggestion?.(text);
    toast.success('Resposta inserida no chat!');
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success('Copiado!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return 'bg-destructive/60';
    if (c >= 0.5) return 'bg-warning/60';
    return 'bg-muted-foreground/30';
  };

  const confidenceLabel = (c: number) => {
    if (c >= 0.8) return 'Alta';
    if (c >= 0.5) return 'Média';
    return 'Baixa';
  };

  // Initial state — not yet analyzed
  if (!analyzed) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <ShieldQuestion className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-medium">Detector de Objeções</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Analisa as últimas mensagens do cliente para identificar resistências e sugerir contra-argumentos.
        </p>
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
          variant="default"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => analyze()}
          disabled={loading || lastMessages.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <ShieldQuestion className="w-3 h-3 mr-1.5" />
              Detectar objeções ({lastMessages.length} msgs)
            </>
          )}
        </Button>
        {lastMessages.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center">Nenhuma mensagem do cliente encontrada</p>
        )}
      </div>
    );
  }

  // Loading skeleton
  if (loading && objections.length === 0) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          <span className="text-xs font-medium">Analisando mensagens...</span>
        </div>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="p-2.5 rounded-lg bg-muted/20 border border-border/30 animate-pulse">
              <div className="h-3 bg-muted/40 rounded w-3/4 mb-2" />
              <div className="h-2 bg-muted/30 rounded w-full mb-1" />
              <div className="h-3 bg-muted/40 rounded w-5/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No objections found
  if (objections.length === 0) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          <ShieldQuestion className="w-3.5 h-3.5 text-success" />
          <span className="text-xs font-medium">Nenhuma objeção detectada</span>
        </div>
        {error ? (
          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] text-destructive font-medium mb-0.5">Erro na análise</p>
              <p className="text-[10px] text-destructive/80">{error}</p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">O cliente não apresentou resistências nas últimas mensagens. Bom sinal! 🎉</p>
        )}
        <Button variant="outline" size="sm" className="w-full h-7 text-[11px]" onClick={() => { setAnalyzed(false); setError(null); }}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Nova análise
        </Button>
      </div>
    );
  }

  // Objections found
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldQuestion className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-medium">Objeções detectadas</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">{objections.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => analyze()} disabled={loading} title="Reanalisar">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
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

      <ScrollArea className="max-h-64">
        <AnimatePresence mode="popLayout">
          <div className="space-y-2 pr-1">
            {objections.map((obj, idx) => (
              <motion.div
                key={`${idx}-${obj.objection.slice(0, 20)}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.08 }}
                className="space-y-1.5 p-2.5 rounded-lg bg-muted/20 border border-border/30"
              >
                {/* Objection */}
                <div className="flex items-start gap-1.5">
                  <ShieldQuestion className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-warning leading-snug">{obj.objection}</p>
                    <div className="flex items-center gap-1.5 mt-1" role="meter" aria-label={`Confiança: ${confidenceLabel(obj.confidence)}`} aria-valuenow={Math.round(obj.confidence * 100)} aria-valuemin={0} aria-valuemax={100}>
                      <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${confidenceColor(obj.confidence)}`} style={{ width: `${obj.confidence * 100}%` }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground shrink-0">{confidenceLabel(obj.confidence)} {Math.round(obj.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* Counter-argument */}
                <div className="flex items-start gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelect(obj.counterArgument)}
                    disabled={rewritingIdx === idx}
                    className="flex items-start gap-1.5 pl-5 w-full text-left group cursor-pointer hover:bg-primary/10 rounded-md p-1.5 -mx-1 transition-colors"
                    title="Clique para usar esta resposta"
                    aria-label={`Usar resposta: ${obj.counterArgument.slice(0, 50)}...`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                    {rewritingIdx === idx ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Reescrevendo...
                      </span>
                    ) : (
                      <p className="text-xs text-foreground group-hover:text-primary transition-colors leading-snug">{obj.counterArgument}</p>
                    )}
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary whitespace-nowrap font-medium">Usar ↵</span>
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-primary"
                    onClick={() => handleCopy(obj.counterArgument, idx)}
                    disabled={rewritingIdx !== null}
                    title="Copiar"
                  >
                    {copiedIdx === idx ? <Check className="w-2.5 h-2.5 mr-0.5 text-success" /> : <Copy className="w-2.5 h-2.5 mr-0.5" />}
                    {copiedIdx === idx ? 'Copiado' : 'Copiar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-primary"
                    onClick={() => rewriteSingle(idx)}
                    disabled={rewritingIdx !== null}
                    title="Reescrever com o tom selecionado"
                  >
                    <RefreshCw className="w-2.5 h-2.5 mr-0.5" />
                    Reescrever
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
