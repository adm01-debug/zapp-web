import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfDay as fnsStartOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { log } from '@/lib/logger';
import { 
  FileText, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Calendar,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: 'agent' | 'contact';
  content: string;
  created_at: string;
}

interface SummaryData {
  summary: string;
  status: 'resolvido' | 'pendente' | 'aguardando_cliente' | 'aguardando_atendente';
  keyPoints: string[];
  nextSteps?: string[];
  sentiment: 'positivo' | 'neutro' | 'negativo';
}

interface ConversationSummaryProps {
  messages: Message[];
  contactName: string;
  contactId?: string;
  initialSummary?: Record<string, unknown> | null;
  onClose?: () => void;
}

type AnalysisPeriod = 'all' | 'last_interaction' | 'today' | '3d' | '7d' | '14d' | '30d' | '90d' | 'custom';

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_GAP_MS = 4 * 60 * 60 * 1000;

const PERIOD_OPTIONS: { value: AnalysisPeriod; label: string }[] = [
  { value: 'last_interaction', label: 'Última conversa' },
  { value: 'today', label: 'Hoje' },
  { value: '3d', label: 'Últimos 3 dias' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '14d', label: 'Últimos 14 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Toda a conversa' },
  { value: 'custom', label: 'Período personalizado' },
];

function startOfDay(date: Date): Date {
  return fnsStartOfDay(date);
}

function getLastConversationStart(messages: Message[]): Date | null {
  if (messages.length === 0) return null;
  const sorted = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  let sessionStart = new Date(sorted[0].created_at);
  for (let i = 1; i < sorted.length; i++) {
    const newer = new Date(sorted[i - 1].created_at).getTime();
    const older = new Date(sorted[i].created_at).getTime();
    if (newer - older > SESSION_GAP_MS) break;
    sessionStart = new Date(sorted[i].created_at);
  }
  return sessionStart;
}

function filterMessagesByPeriod(
  messages: Message[],
  period: AnalysisPeriod,
  customFrom?: Date,
  customTo?: Date
): Message[] {
  if (period === 'all') return messages;

  const now = new Date();

  if (period === 'custom') {
    if (!customFrom && !customTo) return messages;
    return messages.filter((m) => {
      const d = new Date(m.created_at);
      const from = customFrom ? startOfDay(customFrom) : null;
      const to = customTo ? new Date(startOfDay(customTo).getTime() + DAY_MS - 1) : null;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }

  if (period === 'last_interaction') {
    const start = getLastConversationStart(messages);
    if (!start) return messages;
    return messages.filter((m) => new Date(m.created_at) >= start);
  }

  if (period === 'today') {
    const todayStart = startOfDay(now);
    return messages.filter((m) => new Date(m.created_at) >= todayStart);
  }

  const dayMap: Record<string, number> = { '3d': 3, '7d': 7, '14d': 14, '30d': 30, '90d': 90 };
  const days = dayMap[period];
  if (days) {
    const cutoff = new Date(now.getTime() - days * DAY_MS);
    return messages.filter((m) => new Date(m.created_at) >= cutoff);
  }

  return messages;
}

const statusConfig = {
  resolvido: { label: 'Resolvido', icon: CheckCircle2, className: 'text-emerald-600 border-emerald-600/30' },
  pendente: { label: 'Pendente', icon: Clock, className: 'text-amber-600 border-amber-600/30' },
  aguardando_cliente: { label: 'Aguardando Cliente', icon: Clock, className: 'text-blue-600 border-blue-600/30' },
  aguardando_atendente: { label: 'Aguardando Atendente', icon: AlertCircle, className: 'text-orange-600 border-orange-600/30' },
};

const sentimentConfig = {
  positivo: { icon: ThumbsUp, className: 'text-emerald-500' },
  neutro: { icon: Minus, className: 'text-muted-foreground' },
  negativo: { icon: ThumbsDown, className: 'text-red-500' },
};

export function ConversationSummary({ messages, contactName, contactId, initialSummary, onClose }: ConversationSummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>((initialSummary as unknown as SummaryData) ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!!initialSummary);

  // Period filter state
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>('7d');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  const customDateRange = useMemo<DateRange | undefined>(() => {
    if (!customDateFrom && !customDateTo) return undefined;
    return { from: customDateFrom, to: customDateTo };
  }, [customDateFrom, customDateTo]);

  const handleCustomRangeSelect = useCallback((range: DateRange | undefined) => {
    setCustomDateFrom(range?.from);
    setCustomDateTo(range?.to);
  }, []);

  const filteredMessages = useMemo(
    () => filterMessagesByPeriod(messages, analysisPeriod, customDateFrom, customDateTo),
    [messages, analysisPeriod, customDateFrom, customDateTo]
  );

  const canGenerateSummary = filteredMessages.length >= 10;

  useEffect(() => {
    if (initialSummary) {
      setSummary(initialSummary as unknown as SummaryData);
      setHasGenerated(true);
    }
  }, [initialSummary]);

  const generateSummary = async () => {
    if (!canGenerateSummary) {
      toast.error('O período selecionado precisa ter pelo menos 10 mensagens para gerar um resumo.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-conversation-summary', {
        body: { 
          messages: filteredMessages.map(m => ({
            sender: m.sender,
            content: m.content,
            created_at: m.created_at
          })),
          contactName,
          contactId,
        }
      });

      if (error) throw error;

      setSummary(data);
      setHasGenerated(true);
      toast.success('Resumo gerado com sucesso!');
    } catch (error) {
      log.error('Error generating summary:', error);
      toast.error('Erro ao gerar resumo. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = summary ? statusConfig[summary.status]?.icon || Clock : Clock;
  const SentimentIcon = summary ? sentimentConfig[summary.sentiment]?.icon || Minus : Minus;

  return (
    <div className="px-4 py-2">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        {/* Header */}
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Resumo da Conversa
            </CardTitle>
            <div className="flex items-center gap-2">
              {summary && (
                <>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] ${statusConfig[summary.status]?.className || ''}`}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig[summary.status]?.label || summary.status}
                  </Badge>
                  <span className={sentimentConfig[summary.sentiment]?.className || ''}>
                    <SentimentIcon className="h-4 w-4" />
                  </span>
                </>
              )}
              {onClose && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-4 pb-4 space-y-4">
          {/* Period Selector — always visible */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select value={analysisPeriod} onValueChange={(v) => setAnalysisPeriod(v as AnalysisPeriod)}>
                <SelectTrigger className="h-8 flex-1 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {analysisPeriod === 'custom' && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-foreground">Período personalizado</p>
                    <p className="text-[10px] text-muted-foreground">Selecione a data inicial e final.</p>
                  </div>
                  {(customDateFrom || customDateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg px-2 text-[10px]"
                      onClick={() => { setCustomDateFrom(undefined); setCustomDateTo(undefined); }}
                    >
                      Limpar
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-background px-2.5 py-2">
                    <p className="text-[10px] font-medium text-muted-foreground">De</p>
                    <p className="mt-1 text-xs font-medium text-foreground">
                      {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'Selecione'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-2.5 py-2">
                    <p className="text-[10px] font-medium text-muted-foreground">Até</p>
                    <p className="mt-1 text-xs font-medium text-foreground">
                      {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'Selecione'}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
                  <CalendarComponent
                    mode="range"
                    selected={customDateRange}
                    onSelect={handleCustomRangeSelect}
                    locale={ptBR}
                    numberOfMonths={1}
                    disabled={(date) => date > new Date()}
                    defaultMonth={customDateFrom || customDateTo || new Date()}
                    className="w-full p-3 pointer-events-auto"
                  />
                </div>
              </div>
            )}

            <p className="text-center text-xs tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredMessages.length}</span> mensagens no período
              {messages.length !== filteredMessages.length && (
                <span className="text-muted-foreground/60"> (de {messages.length} total)</span>
              )}
            </p>
          </div>

          {/* Generate / Regenerate button */}
          <Button
            onClick={generateSummary}
            disabled={isLoading || !canGenerateSummary}
            className="w-full gap-2 text-xs"
            variant={hasGenerated ? 'ghost' : 'default'}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : hasGenerated ? (
              <FileText className="h-3 w-3" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {!canGenerateSummary 
              ? `Mín. 10 mensagens (${filteredMessages.length} no período)`
              : hasGenerated 
                ? 'Regenerar resumo'
                : `Gerar resumo (${filteredMessages.length} msgs)`}
          </Button>

          {/* Summary result */}
          <AnimatePresence>
            {hasGenerated && summary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Summary text */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Resumo</h4>
                  <p className="text-sm">{summary.summary}</p>
                </div>

                {/* Key Points */}
                {summary.keyPoints.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Pontos-chave</h4>
                    <ul className="space-y-1">
                      {summary.keyPoints.map((point, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Steps */}
                {summary.nextSteps && summary.nextSteps.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Próximos passos</h4>
                    <ul className="space-y-1">
                      {summary.nextSteps.map((step, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-secondary mt-1">→</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
