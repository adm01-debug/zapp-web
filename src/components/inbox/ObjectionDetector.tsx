import { useState, useMemo, useRef, useCallback, useEffect, memo, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldQuestion, Lightbulb, Loader2, RefreshCw, AlertTriangle, Copy, Check, Send, ChevronUp, ChevronDown, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
  contactName?: string;
  lastMessages: string[];
  allMessages?: ChatMessage[];
  onSelectSuggestion?: (text: string) => void;
}

/* ─── Confidence Badge ─────────────────────────────────────────── */
const ConfidenceBadge = memo(function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary">
      <Zap className="w-2.5 h-2.5" />
      {pct}%
    </span>
  );
});

/* ─── Action Bar (Copy + Refresh + Usar resposta) ──────────────── */
interface ActionBarProps {
  text: string;
  idx: number;
  copiedIdx: number | null;
  isRewriting: boolean;
  rewritingAny: boolean;
  onCopy: (text: string, idx: number) => void;
  onRewrite: (idx: number) => void;
  onSelect: (text: string) => void;
}

const ActionBar = memo(function ActionBar({ text, idx, copiedIdx, isRewriting, rewritingAny, onCopy, onRewrite, onSelect }: ActionBarProps) {
  return (
    <div className="flex items-center justify-between pt-2">
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30"
              onClick={() => onCopy(text, idx)}
              disabled={rewritingAny}
            >
              {copiedIdx === idx ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">{copiedIdx === idx ? 'Copiado!' : 'Copiar'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30"
              onClick={() => onRewrite(idx)}
              disabled={rewritingAny}
            >
              <RefreshCw className={cn('w-4 h-4', isRewriting && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">Reescrever</TooltipContent>
        </Tooltip>
      </div>

      <Button
        size="sm"
        className="h-9 px-5 text-[12px] font-bold gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
        onClick={() => onSelect(text)}
        disabled={rewritingAny}
      >
        <Send className="w-3.5 h-3.5" />
        Usar resposta
      </Button>
    </div>
  );
});

/* ─── Objection Card ───────────────────────────────────────────── */
interface ObjectionCardProps {
  obj: Objection;
  idx: number;
  isRewriting: boolean;
  rewritingAny: boolean;
  copiedIdx: number | null;
  onSelect: (text: string) => void;
  onCopy: (text: string, idx: number) => void;
  onRewrite: (idx: number) => void;
}

const ObjectionCard = memo(forwardRef<HTMLDivElement, ObjectionCardProps>(function ObjectionCard({
  obj, idx, isRewriting, rewritingAny, copiedIdx, onSelect, onCopy, onRewrite,
}, ref) {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 30 }}
      className="rounded-2xl bg-muted/8 border border-border/30 overflow-hidden"
    >
      {/* Objection header */}
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-start gap-3 w-full text-left p-4"
        aria-expanded={expanded}
      >
        <div className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldQuestion className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-[13px] text-foreground font-medium leading-snug pr-4">{obj.objection}</p>
          <ConfidenceBadge confidence={obj.confidence} />
        </div>
        <div className="shrink-0 mt-1 text-muted-foreground/60">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Counter-argument body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {/* Counter-argument card */}
              <div className="p-4 rounded-xl bg-muted/15 border border-border/20">
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Lightbulb className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isRewriting ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Reescrevendo...</span>
                      </div>
                    ) : (
                      <p className="text-[12.5px] text-foreground/90 leading-relaxed">{obj.counterArgument}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <ActionBar
                text={obj.counterArgument}
                idx={idx}
                copiedIdx={copiedIdx}
                isRewriting={isRewriting}
                rewritingAny={rewritingAny}
                onCopy={onCopy}
                onRewrite={onRewrite}
                onSelect={onSelect}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}));

/* ─── Shimmer Skeleton ─────────────────────────────────────────── */
function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg bg-muted/20 overflow-hidden relative', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-muted/30 to-transparent" />
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────── */
export function ObjectionDetector({ contactId, contactName, lastMessages, allMessages = [], onSelectSuggestion }: ObjectionDetectorProps) {
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [selectedTone, setSelectedTone] = useState<ToneKey>('friendly');
  const [rewritingIdx, setRewritingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const lastCallRef = useRef(0);

  const normalized = useMemo(() =>
    allMessages.map(m => ({ ...m, created_at: m.created_at || m.timestamp })),
    [allMessages]
  );

  const hasPeriodMessages = normalized.length > 0;

  const {
    analysisPeriod, setAnalysisPeriod,
    customDateFrom, customDateTo, setCustomDateFrom, setCustomDateTo, clearCustomDates,
    filteredMessages: periodFiltered,
  } = usePeriodFilter(normalized, 'all');

  const clientMessages = useMemo(() => {
    if (!hasPeriodMessages) return lastMessages;
    return periodFiltered
      .filter(m => m.sender !== 'agent' && m.content && m.content.trim().length > 0)
      .map(m => m.content);
  }, [hasPeriodMessages, periodFiltered, lastMessages]);

  useEffect(() => {
    setAnalyzed(false); setObjections([]); setError(null); setRewritingIdx(null); setCopiedIdx(null); setSelectedTone('friendly');
  }, [contactId]);

  useEffect(() => {
    setAnalyzed(false); setObjections([]); setError(null);
  }, [analysisPeriod, customDateFrom, customDateTo]);

  const analyze = useCallback(async (tone?: ToneKey) => {
    if (clientMessages.length === 0) { toast.warning('Nenhuma mensagem do cliente para analisar.'); return; }
    const now = Date.now();
    if (now - lastCallRef.current < 3000) { toast.warning('Aguarde alguns segundos antes de tentar novamente.'); return; }
    lastCallRef.current = now;
    setLoading(true); setError(null);
    const activeTone = tone ?? selectedTone;
    const activePrompt = getTonePrompt(activeTone);

    try {
      const response = await supabase.functions.invoke('ai-proxy', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em inteligência comercial e negociação de uma empresa distribuidora/comercial.

CONTEXTO DO NEGÓCIO — Identifique o tipo de conversa:
• VENDAS: Vendedor ↔ cliente — objeções de preço, prazo, quantidade, condições.
• COMPRAS: Comprador ↔ fornecedor — resistências em negociação de custos, prazos de entrega, MOQ.
• LOGÍSTICA: Logística ↔ transportadora — objeções sobre frete, prazo de coleta, restrições.
• RH: RH ↔ colaborador — resistências sobre políticas, benefícios, procedimentos.
• FINANCEIRO: Cobranças — objeções de pagamento, contestações, renegociações.
• SAC: Reclamações — insatisfação, devoluções, garantia.

Analise as mensagens e identifique objeções/resistências do interlocutor. Para cada uma, sugira um contra-argumento persuasivo e adequado ao contexto do departamento.
${contactName ? `IMPORTANTE: O nome do contato é "${contactName.split(' ')[0]}". TODA resposta (counterArgument) DEVE começar mencionando o nome do contato de forma natural (ex: "${contactName.split(' ')[0]}, entendo sua preocupação..." ou "${contactName.split(' ')[0]}, compreendo perfeitamente..."). Isso é OBRIGATÓRIO para humanizar o atendimento.` : ''}
${activePrompt}
Responda APENAS em JSON válido com este formato:
[{"objection":"texto da objeção","counterArgument":"sugestão de resposta","confidence":0.85}]
Se não houver objeções, retorne []`,
            },
            { role: 'user', content: `Mensagens do cliente:\n${clientMessages.join('\n')}` },
          ],
          model: 'google/gemini-3-flash-preview',
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
        if (valid.length > 0) toast.success(`${valid.length} objeção(ões) detectada(s)!`);
      } else {
        setObjections([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg); setObjections([]);
      toast.error('Falha ao analisar objeções. Tente novamente.');
    }
    setAnalyzed(true); setLoading(false);
  }, [clientMessages, selectedTone]);

  const rewriteSingle = useCallback(async (idx: number) => {
    setRewritingIdx(idx);
    const activePrompt = getTonePrompt(selectedTone);
    try {
      const response = await supabase.functions.invoke('ai-proxy', {
        body: {
          messages: [
            { role: 'system', content: `Reescreva o contra-argumento abaixo mantendo o mesmo significado mas mudando o tom. ${activePrompt}${contactName ? ` IMPORTANTE: A resposta DEVE começar com o nome "${contactName.split(' ')[0]}" de forma natural e humana.` : ''} Responda APENAS com o texto reescrito, sem aspas ou explicações.` },
            { role: 'user', content: objections[idx].counterArgument },
          ],
          model: 'google/gemini-3-flash-preview',
        },
      });
      const content = response.data?.content || response.data?.choices?.[0]?.message?.content;
      if (content) {
        setObjections(prev => prev.map((o, i) => i === idx ? { ...o, counterArgument: content.trim() } : o));
        toast.success('Resposta reescrita!');
      }
    } catch { toast.error('Erro ao reescrever. Tente novamente.'); }
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

  /* ── Estado Inicial (antes da análise) ─────────────────────────── */
  if (!analyzed) {
    return (
      <div className="space-y-5">
        {/* Hero */}
        <div className="flex flex-col items-center text-center pt-3 pb-1">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative mb-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/15">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-2xl border border-primary/20"
            />
          </motion.div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Radar de Objeções</h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[280px]">
            A IA analisa as mensagens do cliente e gera contra-argumentos personalizados.
          </p>
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

        {/* CTA Button */}
        <Button
          className="w-full h-12 text-[13px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
          onClick={() => analyze()}
          disabled={loading || clientMessages.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analisando objeções...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Detectar objeções
              {clientMessages.length > 0 && (
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-primary-foreground/20 text-[10px] font-bold tabular-nums">
                  {clientMessages.length} msgs
                </span>
              )}
            </>
          )}
        </Button>

        {clientMessages.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center italic">Nenhuma mensagem do cliente encontrada no período</p>
        )}
      </div>
    );
  }

  /* ── Loading Skeleton ──────────────────────────────────────────── */
  if (loading && objections.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div>
            <p className="text-xs font-semibold text-foreground">Analisando mensagens...</p>
            <p className="text-[10px] text-muted-foreground">{clientMessages.length} mensagens em análise</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-border/20 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShimmerBlock className="h-8 w-8 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <ShimmerBlock className="h-3.5 w-4/5" />
                  <ShimmerBlock className="h-5 w-16 rounded-full" />
                </div>
              </div>
              <ShimmerBlock className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty State ────────────────────────────────────────────────── */
  if (objections.length === 0) {
    return (
      <div className="space-y-4">
        {error ? (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/8 border border-destructive/15">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-destructive font-semibold mb-1">Erro na análise</p>
              <p className="text-[11px] text-destructive/80 leading-relaxed">{error}</p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center py-8 gap-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/15"
            >
              <Check className="w-7 h-7 text-primary" />
            </motion.div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">Nenhuma objeção!</p>
              <p className="text-[11px] text-muted-foreground max-w-[260px]">
                O cliente não apresentou resistências. Conversa fluindo bem 🎉
              </p>
            </div>
          </motion.div>
        )}
        <Button
          variant="outline"
          className="w-full h-10 text-xs font-medium rounded-2xl border-border/30"
          onClick={() => { setAnalyzed(false); setError(null); }}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Nova análise
        </Button>
      </div>
    );
  }

  /* ── Resultados ────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 border border-primary/15">
            <span className="text-sm font-bold text-primary">{objections.length}</span>
          </div>
          <div>
            <p className="text-[13px] font-bold text-foreground leading-none">
              {objections.length === 1 ? 'Objeção detectada' : 'Objeções detectadas'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Contra-argumentos prontos</p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-muted/30"
              onClick={() => analyze()}
              disabled={loading}
            >
              <motion.div animate={loading ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: 'linear' }}>
                <RefreshCw className="w-4 h-4" />
              </motion.div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-[10px]">Reanalisar</TooltipContent>
        </Tooltip>
      </div>

      {/* Tone selector */}
      <ToneSelector selected={selectedTone} onChange={(tone) => { setSelectedTone(tone); analyze(tone); }} disabled={loading} />

      {/* Cards list */}
      <div className="relative">
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-2xl"
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-muted/80 border border-border/50 shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-medium text-foreground">Ajustando tom...</span>
            </div>
          </motion.div>
        )}
        <ScrollArea className="h-72 [&>[data-radix-scroll-area-viewport]]:max-h-72">
          <div className="space-y-3 pr-3">
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
    </div>
  );
}
