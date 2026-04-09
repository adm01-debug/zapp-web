import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfDay as fnsStartOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { log } from '@/lib/logger';
import {
  Brain,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  MessageSquareText,
  BarChart3,
  ListChecks,
  RefreshCw,
  X,
  Sparkles,
  History,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  ShieldAlert,
  DollarSign,
  Users,
  Zap,
  Heart,
  Eye,
  BookOpen,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useConversationAnalyses } from '@/hooks/useConversationAnalyses';
import { useSentimentAlerts } from '@/hooks/useSentimentAlerts';
import { withRetry } from '@/lib/retry';

interface Message {
  id: string;
  sender: 'agent' | 'contact';
  content: string;
  type?: string;
  mediaUrl?: string;
  created_at: string;
}

interface AgentPerformance {
  empathy: number;
  clarity: number;
  efficiency: number;
  knowledge: number;
}

interface AnalysisData {
  analysisId?: string | null;
  summary: string;
  status: string;
  keyPoints: string[];
  nextSteps?: string[];
  sentiment: string;
  sentimentScore?: number;
  topics?: string[];
  urgency?: string;
  customerSatisfaction?: number;
  agentPerformance?: AgentPerformance | null;
  churnRisk?: string;
  salesOpportunity?: string | null;
}

interface AIConversationAssistantProps {
  messages: Message[];
  contactId: string;
  contactName: string;
  isOpen: boolean;
  onClose: () => void;
}

type AnalysisPeriod = 'all' | 'last_interaction' | 'today' | '3d' | '7d' | '14d' | '30d' | '90d' | 'custom';

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_GAP_MS = 4 * 60 * 60 * 1000;

const ANALYSIS_PERIOD_OPTIONS: { value: AnalysisPeriod; label: string }[] = [
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

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  resolvido: { label: 'Resolvido', icon: CheckCircle2, className: 'bg-success/20 text-success border-success/30' },
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/20 text-warning border-warning/30' },
  aguardando_cliente: { label: 'Aguardando Cliente', icon: AlertCircle, className: 'bg-warning/20 text-warning border-warning/30' },
  aguardando_atendente: { label: 'Aguardando Atendente', icon: AlertCircle, className: 'bg-info/20 text-info border-info/30' },
  escalado: { label: 'Escalado', icon: AlertTriangle, className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

const sentimentConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  positivo: { label: 'Positivo', icon: ThumbsUp, color: 'text-success', bg: 'bg-success' },
  neutro: { label: 'Neutro', icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' },
  negativo: { label: 'Negativo', icon: ThumbsDown, color: 'text-destructive', bg: 'bg-destructive' },
  critico: { label: 'Crítico', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive' },
};

const urgencyConfig: Record<string, { label: string; className: string }> = {
  baixa: { label: 'Baixa', className: 'bg-success/20 text-success' },
  media: { label: 'Média', className: 'bg-warning/20 text-warning' },
  alta: { label: 'Alta', className: 'bg-destructive/20 text-destructive' },
  critica: { label: 'Crítica', className: 'bg-destructive/30 text-destructive animate-pulse' },
};

const churnConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  low: { label: 'Baixo', color: 'text-success', icon: CheckCircle2 },
  medium: { label: 'Médio', color: 'text-warning', icon: AlertCircle },
  high: { label: 'Alto', color: 'text-destructive', icon: ShieldAlert },
};

const performanceLabels: Record<string, { label: string; icon: React.ElementType }> = {
  empathy: { label: 'Empatia', icon: Heart },
  clarity: { label: 'Clareza', icon: Eye },
  efficiency: { label: 'Eficiência', icon: Zap },
  knowledge: { label: 'Conhecimento', icon: BookOpen },
};

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getLastConversationStart(messages: Message[]): Date | null {
  if (messages.length === 0) return null;

  const sorted = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  let sessionStart = new Date(sorted[0].created_at);

  for (let index = 1; index < sorted.length; index += 1) {
    const newerMessageTime = new Date(sorted[index - 1].created_at).getTime();
    const olderMessageTime = new Date(sorted[index].created_at).getTime();

    if (newerMessageTime - olderMessageTime > SESSION_GAP_MS) {
      break;
    }

    sessionStart = new Date(sorted[index].created_at);
  }

  return sessionStart;
}

function filterMessagesByPeriod(messages: Message[], period: AnalysisPeriod, customFrom?: Date | null, customTo?: Date | null): Message[] {
  if (period === 'all') return messages;

  if (period === 'custom') {
    return messages.filter((message) => {
      const msgDate = new Date(message.created_at);
      if (customFrom && msgDate < fnsStartOfDay(customFrom)) return false;
      if (customTo) {
        const endOfTo = new Date(customTo);
        endOfTo.setHours(23, 59, 59, 999);
        if (msgDate > endOfTo) return false;
      }
      return Boolean(customFrom || customTo);
    });
  }

  if (period === 'last_interaction') {
    const sessionStart = getLastConversationStart(messages);
    if (!sessionStart) return [];
    return messages.filter((message) => new Date(message.created_at) >= sessionStart);
  }

  const now = new Date();
  const cutoffMap: Record<string, Date> = {
    today: startOfDay(now),
    '3d': startOfDay(new Date(now.getTime() - 3 * DAY_MS)),
    '7d': startOfDay(new Date(now.getTime() - 7 * DAY_MS)),
    '14d': startOfDay(new Date(now.getTime() - 14 * DAY_MS)),
    '30d': startOfDay(new Date(now.getTime() - 30 * DAY_MS)),
    '90d': startOfDay(new Date(now.getTime() - 90 * DAY_MS)),
  };

  const cutoff = cutoffMap[period];
  if (!cutoff) return messages;
  return messages.filter((message) => new Date(message.created_at) >= cutoff);
}

function getPeriodDays(period: AnalysisPeriod): number | null {
  switch (period) {
    case 'today':
      return 1;
    case '3d':
      return 3;
    case '7d':
      return 7;
    case '14d':
      return 14;
    case '30d':
      return 30;
    case '90d':
      return 90;
    default:
      return null;
  }
}

export function AIConversationAssistant({ messages, contactId, contactName, isOpen, onClose }: AIConversationAssistantProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('resumo');
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>('7d');

  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  const { analyses, refetch, getSentimentTrend, loading: historyLoading } = useConversationAnalyses(contactId);
  const { checkAndTriggerAlert, threshold: SENTIMENT_THRESHOLD } = useSentimentAlerts();

  const filteredMessages = useMemo(
    () => filterMessagesByPeriod(messages, analysisPeriod, customDateFrom, customDateTo),
    [messages, analysisPeriod, customDateFrom, customDateTo]
  );

  const canAnalyze = filteredMessages.length >= 5;

  useEffect(() => {
    setAnalysis(null);
    setActiveTab('resumo');
  }, [analysisPeriod, customDateFrom, customDateTo, contactId]);

  const analyzeConversation = useCallback(async () => {
    if (!canAnalyze) {
      toast.error('Mínimo de 5 mensagens necessárias para análise.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await withRetry(
        async () => {
          const { data, error } = await supabase.functions.invoke('ai-conversation-analysis', {
            body: {
              messages: filteredMessages.map((message) => ({
                id: message.id,
                sender: message.sender,
                content: message.content,
                type: message.type || 'text',
                created_at: message.created_at,
              })),
              contactName,
              contactId,
              periodDays: getPeriodDays(analysisPeriod),
            },
          });

          if (error) throw error;
          return data as AnalysisData;
        },
        {
          maxRetries: 2,
          shouldRetry: (error) => {
            if (error instanceof Error) {
              const message = error.message.toLowerCase();
              return message.includes('fetch') || message.includes('network') || message.includes('timeout');
            }
            return false;
          },
        }
      );

      setAnalysis(result);
      setActiveTab('resumo');
      await refetch();

      const sentimentScore = result.sentimentScore || 50;
      if (sentimentScore < SENTIMENT_THRESHOLD && result.analysisId) {
        const previousAnalysis = analyses[0];
        await checkAndTriggerAlert({
          contactId,
          contactName,
          sentimentScore,
          previousScore: previousAnalysis?.sentiment_score,
          analysisId: result.analysisId,
        });
      }

      toast.success('Análise completa!');
    } catch (error) {
      log.error('Error analyzing conversation:', error);
      toast.error('Erro ao analisar conversa. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [analysisPeriod, analyses, canAnalyze, checkAndTriggerAlert, contactId, contactName, filteredMessages, refetch, SENTIMENT_THRESHOLD]);

  const sentimentTrend = getSentimentTrend();
  const currentSentiment = analysis?.sentiment || 'neutro';
  const SentimentIcon = sentimentConfig[currentSentiment]?.icon || Minus;
  const sentimentScore = analysis?.sentimentScore ?? 50;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="flex h-full w-80 flex-col border-l border-border bg-card"
      >
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/5 to-transparent p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
              <Brain className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Assistente IA</h3>
              <p className="text-[10px] text-muted-foreground">Análise Profunda</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select value={analysisPeriod} onValueChange={(value) => setAnalysisPeriod(value as AnalysisPeriod)}>
                <SelectTrigger className="h-9 flex-1 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYSIS_PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {analysisPeriod === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">De</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start rounded-lg text-xs font-normal">
                        <Calendar className="mr-1.5 h-3 w-3" />
                        {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'Selecionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customDateFrom}
                        onSelect={setCustomDateFrom}
                        locale={ptBR}
                        disabled={(date) => date > new Date() || (customDateTo ? date > customDateTo : false)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Até</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start rounded-lg text-xs font-normal">
                        <Calendar className="mr-1.5 h-3 w-3" />
                        {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'Selecionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={customDateTo}
                        onSelect={setCustomDateTo}
                        locale={ptBR}
                        disabled={(date) => date > new Date() || (customDateFrom ? date < customDateFrom : false)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-xs tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredMessages.length}</span> mensagens no período
                {messages.length !== filteredMessages.length && (
                  <span className="text-muted-foreground/60"> (de {messages.length} total)</span>
                )}
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                size="sm"
                onClick={analyzeConversation}
                disabled={isLoading || !canAnalyze}
                className="gap-2 rounded-xl bg-primary px-6 text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isLoading ? 'Analisando...' : `Analisar (${filteredMessages.length} msgs)`}
              </Button>
            </div>

            {!canAnalyze && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                <p className="text-xs text-warning">Mínimo de 5 mensagens necessárias ({filteredMessages.length}/5)</p>
              </motion.div>
            )}

            {isLoading && (
              <div className="space-y-3 animate-pulse">
                <div className="h-20 rounded-xl bg-muted/40" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-muted/40" />
                  <div className="h-6 w-16 rounded-full bg-muted/40" />
                </div>
                <div className="h-16 rounded-xl bg-muted/40" />
                <div className="space-y-2">
                  <div className="h-10 rounded-lg bg-muted/40" />
                  <div className="h-10 rounded-lg bg-muted/40" />
                  <div className="h-10 rounded-lg bg-muted/40" />
                </div>
              </div>
            )}

            {sentimentTrend && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium ${
                  sentimentTrend === 'improving'
                    ? 'border-success/20 bg-success/10 text-success'
                    : sentimentTrend === 'declining'
                      ? 'border-destructive/20 bg-destructive/10 text-destructive'
                      : 'border-border bg-muted/50 text-muted-foreground'
                }`}
              >
                {sentimentTrend === 'improving' && <TrendingUp className="h-4 w-4" />}
                {sentimentTrend === 'declining' && <TrendingDown className="h-4 w-4" />}
                {sentimentTrend === 'stable' && <ArrowRight className="h-4 w-4" />}
                <span>
                  Tendência: {sentimentTrend === 'improving' ? 'Melhorando ↑' : sentimentTrend === 'declining' ? 'Piorando ↓' : 'Estável →'}
                </span>
              </motion.div>
            )}

            {analysis && !isLoading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid h-9 w-full grid-cols-4 rounded-xl">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger value="resumo" className="rounded-lg px-2 text-xs">
                            <MessageSquareText className="h-3.5 w-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Resumo</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger value="sentimento" className="rounded-lg px-2 text-xs">
                            <BarChart3 className="h-3.5 w-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Sentimento</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger value="pontos" className="rounded-lg px-2 text-xs">
                            <ListChecks className="h-3.5 w-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Pontos-chave</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger value="historico" className="rounded-lg px-2 text-xs">
                            <History className="h-3.5 w-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Histórico</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TabsList>

                  <TabsContent value="resumo" className="mt-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {statusConfig[analysis.status] && (
                        <Badge variant="outline" className={`${statusConfig[analysis.status].className} text-[10px]`}>
                          {React.createElement(statusConfig[analysis.status].icon, { className: 'mr-1 h-3 w-3' })}
                          {statusConfig[analysis.status].label}
                        </Badge>
                      )}
                      {analysis.urgency && urgencyConfig[analysis.urgency] && (
                        <Badge variant="outline" className={`${urgencyConfig[analysis.urgency].className} text-[10px]`}>
                          {urgencyConfig[analysis.urgency].label}
                        </Badge>
                      )}
                      {analysis.churnRisk && analysis.churnRisk !== 'low' && (
                        <Badge variant="outline" className={`${churnConfig[analysis.churnRisk]?.color || ''} border-current/30 text-[10px]`}>
                          <ShieldAlert className="mr-1 h-3 w-3" />
                          Churn: {churnConfig[analysis.churnRisk]?.label}
                        </Badge>
                      )}
                    </div>

                    <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                      <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <Brain className="h-3 w-3" />
                        Resumo
                      </h4>
                      <p className="text-sm leading-relaxed">{analysis.summary}</p>
                    </div>

                    {analysis.customerSatisfaction !== undefined && (
                      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3">
                        <span className="text-xs font-medium text-muted-foreground">Satisfação</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${star <= (analysis.customerSatisfaction || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-muted'}`}
                            />
                          ))}
                          <span className="ml-1.5 text-xs font-bold text-foreground">{analysis.customerSatisfaction}/5</span>
                        </div>
                      </div>
                    )}

                    {analysis.salesOpportunity && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-xl border border-primary/20 bg-primary/10 p-3"
                      >
                        <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold text-primary">
                          <DollarSign className="h-3 w-3" />
                          Oportunidade de Venda
                        </h4>
                        <p className="text-xs leading-relaxed">{analysis.salesOpportunity}</p>
                      </motion.div>
                    )}

                    {analysis.topics && analysis.topics.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Tópicos</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.topics.map((topic, index) => (
                            <Badge key={index} variant="secondary" className="rounded-lg text-[10px]">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="sentimento" className="mt-4 space-y-4">
                    <Card className="overflow-hidden rounded-xl border-border/50">
                      <CardContent className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <SentimentIcon className={`h-5 w-5 ${sentimentConfig[currentSentiment]?.color}`} />
                            <span className="text-sm font-semibold">{sentimentConfig[currentSentiment]?.label}</span>
                          </div>
                          <span className={`text-3xl font-black tabular-nums ${sentimentConfig[currentSentiment]?.color}`}>{sentimentScore}%</span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Negativo</span>
                            <span>Positivo</span>
                          </div>
                          <Progress value={sentimentScore} className="h-2.5 rounded-full" />
                        </div>

                        {analysis.customerSatisfaction !== undefined && (
                          <div className="border-t border-border pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">CSAT Estimado</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3.5 w-3.5 ${star <= (analysis.customerSatisfaction || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-muted'}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {analysis.agentPerformance && (
                      <Card className="rounded-xl border-border/50">
                        <CardContent className="pt-4">
                          <h4 className="mb-3 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <Users className="h-3 w-3" />
                            Desempenho do Atendente
                          </h4>
                          <div className="space-y-3">
                            {(Object.entries(analysis.agentPerformance) as [string, number][]).map(([key, value]) => {
                              const config = performanceLabels[key];
                              if (!config) return null;
                              const Icon = config.icon;
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                      <Icon className="h-3 w-3" />
                                      {config.label}
                                    </span>
                                    <span className="font-bold tabular-nums">{value}/10</span>
                                  </div>
                                  <Progress value={value * 10} className="h-1.5 rounded-full" />
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {analysis.churnRisk && (
                      <div
                        className={`flex items-center gap-3 rounded-xl border p-3 ${
                          analysis.churnRisk === 'high'
                            ? 'border-destructive/20 bg-destructive/10'
                            : analysis.churnRisk === 'medium'
                              ? 'border-warning/20 bg-warning/10'
                              : 'border-success/20 bg-success/10'
                        }`}
                      >
                        {React.createElement(churnConfig[analysis.churnRisk]?.icon || CheckCircle2, {
                          className: `h-5 w-5 ${churnConfig[analysis.churnRisk]?.color}`,
                        })}
                        <div>
                          <p className="text-xs font-semibold">Risco de Churn</p>
                          <p className={`text-sm font-bold ${churnConfig[analysis.churnRisk]?.color}`}>
                            {churnConfig[analysis.churnRisk]?.label || analysis.churnRisk}
                          </p>
                        </div>
                      </div>
                    )}

                    {analyses.length > 1 && (
                      <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                        <h4 className="mb-3 text-xs font-semibold text-muted-foreground">Evolução</h4>
                        <div className="flex h-16 items-end justify-between gap-1">
                          {analyses.slice(0, 10).reverse().map((item) => (
                            <TooltipProvider key={item.id} delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="flex-1 cursor-pointer rounded-t-sm transition-all hover:opacity-80"
                                    style={{
                                      height: `${Math.max(item.sentiment_score, 5)}%`,
                                      backgroundColor:
                                        item.sentiment === 'positivo'
                                          ? 'rgb(34 197 94 / 0.6)'
                                          : item.sentiment === 'negativo' || item.sentiment === 'critico'
                                            ? 'rgb(239 68 68 / 0.6)'
                                            : 'rgb(156 163 175 / 0.4)',
                                    }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <p>{format(new Date(item.created_at), 'dd/MM HH:mm')}: {item.sentiment_score}%</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                          <span>Antiga</span>
                          <span>Recente</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="pontos" className="mt-4 space-y-4">
                    {analysis.keyPoints.length > 0 && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                          <ListChecks className="h-3 w-3" />
                          Pontos-chave
                        </h4>
                        <ul className="space-y-2">
                          {analysis.keyPoints.map((point, index) => (
                            <motion.li
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/30 p-2.5 text-sm"
                            >
                              <span className="mt-0.5 shrink-0 text-xs font-bold text-primary">{index + 1}.</span>
                              <span className="leading-relaxed">{point}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.nextSteps && analysis.nextSteps.length > 0 && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                          <ArrowRight className="h-3 w-3" />
                          Próximos Passos
                        </h4>
                        <ul className="space-y-2">
                          {analysis.nextSteps.map((step, index) => (
                            <motion.li
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 p-2.5 text-sm"
                            >
                              <span className="mt-0.5 shrink-0 text-primary">→</span>
                              <span className="leading-relaxed">{step}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="historico" className="mt-4 space-y-3">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : analyses.length > 0 ? (
                      analyses.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="cursor-pointer rounded-xl border border-border/50 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                          onClick={() =>
                            setAnalysis({
                              summary: item.summary,
                              status: item.status,
                              keyPoints: item.key_points,
                              nextSteps: item.next_steps,
                              sentiment: item.sentiment,
                              sentimentScore: item.sentiment_score,
                              topics: item.topics,
                              urgency: item.urgency ?? undefined,
                              customerSatisfaction: item.customer_satisfaction ?? undefined,
                            })
                          }
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                            </span>
                            <Badge variant="outline" className={`text-[10px] ${sentimentConfig[item.sentiment]?.color || ''}`}>
                              {item.sentiment_score}%
                            </Badge>
                          </div>
                          <p className="line-clamp-2 text-xs leading-relaxed">{item.summary}</p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {item.message_count} msgs
                            </Badge>
                            {statusConfig[item.status] && (
                              <Badge variant="outline" className={`text-[10px] ${statusConfig[item.status].className}`}>
                                {statusConfig[item.status].label}
                              </Badge>
                            )}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="py-8 text-center">
                        <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Nenhuma análise anterior</p>
                        <p className="mt-1 text-xs text-muted-foreground">Clique em &quot;Analisar&quot; para criar a primeira</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}

            {!analysis && !isLoading && canAnalyze && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Brain className="h-8 w-8 text-primary/60" />
                </div>
                <p className="mb-1 text-sm font-medium text-foreground">Analise esta conversa</p>
                <p className="text-xs leading-relaxed text-muted-foreground">Resumo, sentimento, pontos-chave, desempenho e oportunidades</p>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {analysis && !isLoading && (
          <div className="border-t border-border p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={analyzeConversation}
              disabled={isLoading}
              className="w-full gap-2 rounded-xl text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Reanalisar conversa
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
