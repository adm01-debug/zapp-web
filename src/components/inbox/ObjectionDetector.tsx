import { useState, useMemo, useRef, useCallback, useEffect, memo, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldQuestion, Lightbulb, Loader2, RefreshCw, AlertTriangle, Copy, Check, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ToneSelector, type ToneKey, getTonePrompt } from './ai-tools/ToneSelector';
import { PeriodFilterSelector, usePeriodFilter } from './ai-tools/PeriodFilterSelector';

interface Objection {
  objection: string;
  counterArgument: string;
  confidence: number;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  created_at?: string;
}

interface ObjectionDetectorProps {
  contactId: string;
  lastMessages: string[];
  allMessages?: ChatMessage[];
  onSelectSuggestion?: (text: string) => void;
}

const ConfidenceMeter = memo(function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.8 ? 'bg-destructive' : confidence >= 0.5 ? 'bg-warning' : 'bg-muted-foreground/50';
  const textColor = confidence >= 0.8 ? 'text-destructive' : confidence >= 0.5 ? 'text-warning' : 'text-muted-foreground';
  const label = confidence >= 0.8 ? 'Alta' : confidence >= 0.5 ? 'Média' : 'Baixa';

  return (
    <div className="flex items-center gap-2 mt-1.5" role="meter" aria-label={`Confiança: ${label}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className={`text-[9px] font-medium shrink-0 ${textColor}`}>{label} {pct}%</span>
    </div>
  );
});

const ObjectionCard = memo(function ObjectionCard({
  obj,
  idx,
  isRewriting,
  rewritingAny,
  copiedIdx,
  onSelect,
  onCopy,
  onRewrite,
}: {
  obj: Objection;
  idx: number;
  isRewriting: boolean;
  rewritingAny: boolean;
  copiedIdx: number | null;
  onSelect: (text: string) => void;
  onCopy: (text: string, idx: number) => void;
  onRewrite: (idx: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: idx * 0.08 }}
      className="rounded-xl bg-muted/20 border border-border/30 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-start gap-2 w-full text-left p-3 hover:bg-muted/30 transition-colors"
        aria-expanded={expanded}
      >
        <ShieldQuestion className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground font-medium leading-snug">{obj.objection}</p>
          <ConfidenceMeter confidence={obj.confidence} />
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-success/5 border border-success/10">
                <Lightbulb className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                {isRewriting ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Reescrevendo...
                  </span>
                ) : (
                  <p className="text-xs text-foreground leading-relaxed">{obj.counterArgument}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary rounded-full"
                    onClick={() => onCopy(obj.counterArgument, idx)}
                    disabled={rewritingAny}
                  >
                    {copiedIdx === idx ? <Check className="w-3 h-3 mr-1 text-success" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copiedIdx === idx ? 'Copiado' : 'Copiar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary rounded-full"
                    onClick={() => onRewrite(idx)}
                    disabled={rewritingAny}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reescrever
                  </Button>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="h-6 px-3 text-[10px] font-medium gap-1 rounded-full"
                  onClick={() => onSelect(obj.counterArgument)}
                  disabled={rewritingAny}
                >
                  <Send className="w-3 h-3" />
                  Usar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export function ObjectionDetector({ contactId, lastMessages, allMessages = [], onSelectSuggestion }: ObjectionDetectorProps) {
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [selectedTone, setSelectedTone] = useState<ToneKey>('friendly');
  const [rewritingIdx, setRewritingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const lastCallRef = useRef(0);

  // Normalize messages for period filter
  const normalized = useMemo(() => 
    allMessages.map(m => ({ ...m, created_at: m.created_at || m.timestamp })),
    [allMessages]
  );

  const hasPeriodMessages = normalized.length > 0;

  const {
    analysisPeriod,
    setAnalysisPeriod,
    customDateFrom,
    customDateTo,
    setCustomDateFrom,
    setCustomDateTo,
    clearCustomDates,
    filteredMessages: periodFiltered,
  } = usePeriodFilter(normalized, 'all');

  // Extract client messages from period-filtered messages
  const clientMessages = useMemo(() => {
    if (!hasPeriodMessages) return lastMessages;
    return periodFiltered
      .filter(m => m.sender !== 'agent' && m.content && m.content.trim().length > 0)
      .map(m => m.content);
  }, [hasPeriodMessages, periodFiltered, lastMessages]);

  // Reset analysis on period change
  useEffect(() => {
    setAnalyzed(false);
    setObjections([]);
    setError(null);
  }, [analysisPeriod, customDateFrom, customDateTo]);

  const analyze = useCallback(async (tone?: ToneKey) => {
    if (clientMessages.length === 0) {
      toast.warning('Nenhuma mensagem do cliente para analisar.');
      return;
    }

    const now = Date.now();
    if (now - lastCallRef.current < 3000) {
      toast.warning('Aguarde alguns segundos antes de tentar novamente.');
      return;
    }
    lastCallRef.current = now;

    setLoading(true);
    setError(null);
    const activeTone = tone ?? selectedTone;
    const activePrompt = getTonePrompt(activeTone);

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
              content: `Mensagens do cliente:\n${clientMessages.join('\n')}`,
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
  }, [clientMessages, selectedTone]);

  const rewriteSingle = useCallback(async (idx: number) => {
    setRewritingIdx(idx);
    const activePrompt = getTonePrompt(selectedTone);

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
  }, [objections, selectedTone]);

  const handleSelect = useCallback((text: string) => {
    onSelectSuggestion?.(text);
    toast.success('Resposta inserida no chat!');
  }, [onSelectSuggestion]);

  const handleCopy = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success('Copiado!');
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

  // Initial state
  if (!analyzed) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
            <ShieldQuestion className="w-4 h-4 text-warning" />
          </div>
          <div>
            <span className="text-xs font-semibold">Detector de Objeções</span>
            <p className="text-[10px] text-muted-foreground">Identifica resistências e sugere contra-argumentos</p>
          </div>
        </div>

        {/* Period Filter */}
        {hasPeriodMessages && (
          <PeriodFilterSelector
            period={analysisPeriod}
            onPeriodChange={setAnalysisPeriod}
            customFrom={customDateFrom}
            customTo={customDateTo}
            onCustomFromChange={setCustomDateFrom}
            onCustomToChange={setCustomDateTo}
            onClearCustom={clearCustomDates}
            filteredCount={periodFiltered.length}
            totalCount={allMessages.length}
          />
        )}

        <ToneSelector selected={selectedTone} onChange={setSelectedTone} />

        <Button
          variant="default"
          size="sm"
          className="w-full h-9 text-xs font-medium"
          onClick={() => analyze()}
          disabled={loading || clientMessages.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <ShieldQuestion className="w-3.5 h-3.5 mr-1.5" />
              Detectar objeções ({clientMessages.length} msgs)
            </>
          )}
        </Button>
        {clientMessages.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center italic">Nenhuma mensagem do cliente encontrada</p>
        )}
      </div>
    );
  }

  // Loading skeleton
  if (loading && objections.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-xs font-medium">Analisando mensagens...</span>
        </div>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="p-3 rounded-xl bg-muted/20 border border-border/30 animate-pulse space-y-2">
              <div className="h-3 bg-muted/40 rounded w-3/4" />
              <div className="h-1.5 bg-muted/30 rounded w-1/2" />
              <div className="h-10 bg-muted/20 rounded-lg w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No objections found
  if (objections.length === 0) {
    return (
      <div className="space-y-3">
        {error ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-destructive font-semibold mb-0.5">Erro na análise</p>
              <p className="text-[11px] text-destructive/80">{error}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 gap-2">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <ShieldQuestion className="w-5 h-5 text-success" />
            </div>
            <p className="text-xs font-medium text-success">Nenhuma objeção detectada</p>
            <p className="text-[11px] text-muted-foreground text-center">O cliente não apresentou resistências. Bom sinal! 🎉</p>
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => { setAnalyzed(false); setError(null); }}>
          <RefreshCw className="w-3 h-3 mr-1.5" />
          Nova análise
        </Button>
      </div>
    );
  }

  // Objections found
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-warning/10 flex items-center justify-center">
            <ShieldQuestion className="w-3.5 h-3.5 text-warning" />
          </div>
          <span className="text-xs font-semibold">Objeções detectadas</span>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-semibold">{objections.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => analyze()}
          disabled={loading}
          title="Reanalisar"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <ToneSelector selected={selectedTone} onChange={setSelectedTone} disabled={loading} />

      <ScrollArea className="max-h-72">
        <div className="space-y-2 pr-1">
          <AnimatePresence mode="popLayout">
            {objections.map((obj, idx) => (
              <ObjectionCard
                key={`${idx}-${obj.objection.slice(0, 20)}`}
                obj={obj}
                idx={idx}
                isRewriting={rewritingIdx === idx}
                rewritingAny={rewritingIdx !== null}
                copiedIdx={copiedIdx}
                onSelect={handleSelect}
                onCopy={handleCopy}
                onRewrite={rewriteSingle}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
