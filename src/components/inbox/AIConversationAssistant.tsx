import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { log } from '@/lib/logger';
import { 
  Brain, Loader2, CheckCircle2, Clock, AlertCircle, ThumbsUp, ThumbsDown, Minus,
  MessageSquareText, BarChart3, ListChecks, RefreshCw, X, Sparkles, History,
  TrendingUp, TrendingDown, ArrowRight, Calendar, ShieldAlert, DollarSign,
  Users, Zap, Heart, Eye, BookOpen, AlertTriangle, Star
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

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  resolvido: { label: 'Resolvido', icon: CheckCircle2, className: 'bg-success/20 text-success border-success/30' },
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/20 text-warning border-yellow-500/30' },
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

export function AIConversationAssistant({ messages, contactId, contactName, isOpen, onClose }: AIConversationAssistantProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('resumo');
  const [analysisPeriod, setAnalysisPeriod] = useState<string>('7');

  const { analyses, saveAnalysis, getSentimentTrend, loading: historyLoading } = useConversationAnalyses(contactId);
  const { checkAndTriggerAlert, threshold: SENTIMENT_THRESHOLD } = useSentimentAlerts();

  const filteredMessages = useMemo(() => {
    if (analysisPeriod === 'all') return messages;
    const days = parseInt(analysisPeriod);
    const cutoff = subDays(new Date(), days);
    return messages.filter(m => new Date(m.created_at) >= cutoff);
  }, [messages, analysisPeriod]);

  const canAnalyze = filteredMessages.length >= 5;

  // Load latest analysis on mount
  useEffect(() => {
    if (analyses.length > 0 && !analysis) {
      const latest = analyses[0];
      setAnalysis({
        summary: latest.summary,
        status: latest.status,
        keyPoints: latest.key_points,
        nextSteps: latest.next_steps,
        sentiment: latest.sentiment,
        sentimentScore: latest.sentiment_score,
        topics: latest.topics,
        urgency: latest.urgency ?? undefined,
        customerSatisfaction: latest.customer_satisfaction ?? undefined,
      });
    }
  }, [analyses, analysis]);

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
              messages: filteredMessages.map(m => ({
                id: m.id,
                sender: m.sender,
                content: m.content,
                type: m.type || 'text',
                created_at: m.created_at,
              })),
              contactName,
              contactId,
              periodDays: analysisPeriod === 'all' ? null : parseInt(analysisPeriod),
            },
          });
          if (error) throw error;
          return data;
        },
        {
          maxRetries: 2,
          shouldRetry: (err) => {
            if (err instanceof Error) {
              const msg = err.message.toLowerCase();
              return msg.includes('fetch') || msg.includes('network') || msg.includes('timeout');
            }
            return false;
          },
        }
      );

      setAnalysis(result);

      // Save to history
      const savedAnalysis = await saveAnalysis({
        contact_id: contactId,
        summary: result.summary,
        status: result.status,
        key_points: result.keyPoints || [],
        next_steps: result.nextSteps || [],
        sentiment: result.sentiment,
        sentiment_score: result.sentimentScore || 50,
        topics: result.topics || [],
        urgency: result.urgency || 'media',
        customer_satisfaction: result.customerSatisfaction || 3,
        message_count: filteredMessages.length,
      });

      // Check for sentiment alert
      const sentimentScore = result.sentimentScore || 50;
      if (sentimentScore < SENTIMENT_THRESHOLD && savedAnalysis) {
        const previousAnalysis = analyses[0];
        await checkAndTriggerAlert({
          contactId,
          contactName,
          sentimentScore,
          previousScore: previousAnalysis?.sentiment_score,
          analysisId: savedAnalysis.id,
        });
      }

      toast.success('Análise completa!');
    } catch (error) {
      log.error('Error analyzing conversation:', error);
      toast.error('Erro ao analisar conversa. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [canAnalyze, filteredMessages, contactName, contactId, analysisPeriod, saveAnalysis, analyses, checkAndTriggerAlert, SENTIMENT_THRESHOLD]);

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
        className="w-80 border-l border-border bg-card flex flex-col h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
              <Brain className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Assistente IA</h3>
              <p className="text-[10px] text-muted-foreground">Análise Profunda</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={analysisPeriod} onValueChange={setAnalysisPeriod}>
                <SelectTrigger className="h-9 text-xs flex-1 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Últimos 3 dias</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="all">Toda a conversa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message count */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{filteredMessages.length}</span> mensagens no período
                {messages.length !== filteredMessages.length && (
                  <span className="text-muted-foreground/60"> (de {messages.length} total)</span>
                )}
              </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button
                size="sm"
                onClick={analyzeConversation}
                disabled={isLoading || !canAnalyze}
                className="gap-2 rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isLoading ? 'Analisando...' : `Analisar (${filteredMessages.length} msgs)`}
              </Button>
            </div>

            {!canAnalyze && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20"
              >
                <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                <p className="text-xs text-warning">
                  Mínimo de 5 mensagens necessárias ({filteredMessages.length}/5)
                </p>
              </motion.div>
            )}

            {/* Loading Skeleton */}
            {isLoading && (
              <div className="space-y-3 animate-pulse">
                <div className="h-20 bg-muted/40 rounded-xl" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-muted/40 rounded-full" />
                  <div className="h-6 w-16 bg-muted/40 rounded-full" />
                </div>
                <div className="h-16 bg-muted/40 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-10 bg-muted/40 rounded-lg" />
                  <div className="h-10 bg-muted/40 rounded-lg" />
                  <div className="h-10 bg-muted/40 rounded-lg" />
                </div>
              </div>
            )}

            {/* Sentiment Trend */}
            {sentimentTrend && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium ${
                  sentimentTrend === 'improving' ? 'bg-success/10 text-success border border-success/20' :
                  sentimentTrend === 'declining' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                  'bg-muted/50 text-muted-foreground border border-border'
                }`}
              >
                {sentimentTrend === 'improving' && <TrendingUp className="h-4 w-4" />}
                {sentimentTrend === 'declining' && <TrendingDown className="h-4 w-4" />}
                {sentimentTrend === 'stable' && <ArrowRight className="h-4 w-4" />}
                <span>
                  Tendência: {sentimentTrend === 'improving' ? 'Melhorando ↑' :
                             sentimentTrend === 'declining' ? 'Piorando ↓' : 'Estável →'}
                </span>
              </motion.div>
            )}

            {/* Analysis Results */}
            {analysis && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 rounded-xl h-9">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger value="resumo" className="text-xs px-2 rounded-lg">
                            <MessageSquareText className="h-3.5 w-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Resumo</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger value="sentimento" className="text-xs px-2 rounded-lg">
                            <BarChart3 className="h-3.5 w-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Sentimento</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger value="pontos" className="text-xs px-2 rounded-lg">
                            <ListChecks className="h-3.5 w-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Pontos-chave</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TabsTrigger value="historico" className="text-xs px-2 rounded-lg">
                            <History className="h-3.5 w-3.5" />
                          </TabsTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Histórico</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TabsList>

                  {/* ===== RESUMO ===== */}
                  <TabsContent value="resumo" className="mt-4 space-y-4">
                    {/* Status & Urgency */}
                    <div className="flex flex-wrap gap-2">
                      {statusConfig[analysis.status] && (
                        <Badge variant="outline" className={`${statusConfig[analysis.status].className} text-[10px]`}>
                          {React.createElement(statusConfig[analysis.status].icon, { className: "h-3 w-3 mr-1" })}
                          {statusConfig[analysis.status].label}
                        </Badge>
                      )}
                      {analysis.urgency && urgencyConfig[analysis.urgency] && (
                        <Badge variant="outline" className={`${urgencyConfig[analysis.urgency].className} text-[10px]`}>
                          {urgencyConfig[analysis.urgency].label}
                        </Badge>
                      )}
                      {analysis.churnRisk && analysis.churnRisk !== 'low' && (
                        <Badge variant="outline" className={`${churnConfig[analysis.churnRisk]?.color || ''} text-[10px] border-current/30`}>
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          Churn: {churnConfig[analysis.churnRisk]?.label}
                        </Badge>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        Resumo
                      </h4>
                      <p className="text-sm leading-relaxed">{analysis.summary}</p>
                    </div>

                    {/* Satisfaction Stars */}
                    {analysis.customerSatisfaction !== undefined && (
                      <div className="flex items-center justify-between bg-muted/20 rounded-xl p-3 border border-border/50">
                        <span className="text-xs text-muted-foreground font-medium">Satisfação</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${star <= (analysis.customerSatisfaction || 0)
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-muted'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-bold ml-1.5 text-foreground">
                            {analysis.customerSatisfaction}/5
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Sales Opportunity */}
                    {analysis.salesOpportunity && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-primary/10 rounded-xl p-3 border border-primary/20"
                      >
                        <h4 className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Oportunidade de Venda
                        </h4>
                        <p className="text-xs leading-relaxed">{analysis.salesOpportunity}</p>
                      </motion.div>
                    )}

                    {/* Topics */}
                    {analysis.topics && analysis.topics.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Tópicos</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.topics.map((topic, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] rounded-lg">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ===== SENTIMENTO ===== */}
                  <TabsContent value="sentimento" className="mt-4 space-y-4">
                    <Card className="border-border/50 rounded-xl overflow-hidden">
                      <CardContent className="pt-4 space-y-4">
                        {/* Score */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <SentimentIcon className={`h-5 w-5 ${sentimentConfig[currentSentiment]?.color}`} />
                            <span className="font-semibold text-sm">{sentimentConfig[currentSentiment]?.label}</span>
                          </div>
                          <span className={`text-3xl font-black tabular-nums ${sentimentConfig[currentSentiment]?.color}`}>
                            {sentimentScore}%
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Negativo</span>
                            <span>Positivo</span>
                          </div>
                          <Progress 
                            value={sentimentScore} 
                            className="h-2.5 rounded-full" 
                          />
                        </div>

                        {/* CSAT */}
                        {analysis.customerSatisfaction !== undefined && (
                          <div className="pt-3 border-t border-border">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">CSAT Estimado</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={`h-3.5 w-3.5 ${star <= (analysis.customerSatisfaction || 0)
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-muted'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Agent Performance */}
                    {analysis.agentPerformance && (
                      <Card className="border-border/50 rounded-xl">
                        <CardContent className="pt-4">
                          <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
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

                    {/* Churn Risk */}
                    {analysis.churnRisk && (
                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                        analysis.churnRisk === 'high' ? 'bg-destructive/10 border-destructive/20' :
                        analysis.churnRisk === 'medium' ? 'bg-warning/10 border-warning/20' :
                        'bg-success/10 border-success/20'
                      }`}>
                        {React.createElement(churnConfig[analysis.churnRisk]?.icon || CheckCircle2, {
                          className: `h-5 w-5 ${churnConfig[analysis.churnRisk]?.color}`
                        })}
                        <div>
                          <p className="text-xs font-semibold">Risco de Churn</p>
                          <p className={`text-sm font-bold ${churnConfig[analysis.churnRisk]?.color}`}>
                            {churnConfig[analysis.churnRisk]?.label || analysis.churnRisk}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Sentiment History */}
                    {analyses.length > 1 && (
                      <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-3">Evolução</h4>
                        <div className="flex items-end justify-between gap-1 h-16">
                          {analyses.slice(0, 10).reverse().map((a) => (
                            <TooltipProvider key={a.id} delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="flex-1 rounded-t-sm transition-all cursor-pointer hover:opacity-80"
                                    style={{
                                      height: `${Math.max(a.sentiment_score, 5)}%`,
                                      backgroundColor: a.sentiment === 'positivo' ? 'rgb(34 197 94 / 0.6)' :
                                        a.sentiment === 'negativo' || a.sentiment === 'critico' ? 'rgb(239 68 68 / 0.6)' :
                                        'rgb(156 163 175 / 0.4)'
                                    }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <p>{format(new Date(a.created_at), 'dd/MM HH:mm')}: {a.sentiment_score}%</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>Antiga</span>
                          <span>Recente</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ===== PONTOS-CHAVE ===== */}
                  <TabsContent value="pontos" className="mt-4 space-y-4">
                    {analysis.keyPoints.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
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
                              className="text-sm flex items-start gap-2 bg-muted/30 rounded-xl p-2.5 border border-border/50"
                            >
                              <span className="text-primary font-bold text-xs mt-0.5 shrink-0">{index + 1}.</span>
                              <span className="leading-relaxed">{point}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.nextSteps && analysis.nextSteps.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
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
                              className="text-sm flex items-start gap-2 bg-primary/5 rounded-xl p-2.5 border border-primary/10"
                            >
                              <span className="text-primary shrink-0 mt-0.5">→</span>
                              <span className="leading-relaxed">{step}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </TabsContent>

                  {/* ===== HISTÓRICO ===== */}
                  <TabsContent value="historico" className="mt-4 space-y-3">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : analyses.length > 0 ? (
                      analyses.map((a) => (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-muted/30 rounded-xl p-3 cursor-pointer hover:bg-muted/50 transition-colors border border-border/50"
                          onClick={() => setAnalysis({
                            summary: a.summary,
                            status: a.status,
                            keyPoints: a.key_points,
                            nextSteps: a.next_steps,
                            sentiment: a.sentiment,
                            sentimentScore: a.sentiment_score,
                            topics: a.topics,
                            urgency: a.urgency ?? undefined,
                            customerSatisfaction: a.customer_satisfaction ?? undefined,
                          })}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(a.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${sentimentConfig[a.sentiment]?.color || ''}`}
                            >
                              {a.sentiment_score}%
                            </Badge>
                          </div>
                          <p className="text-xs line-clamp-2 leading-relaxed">{a.summary}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {a.message_count} msgs
                            </Badge>
                            {statusConfig[a.status] && (
                              <Badge variant="outline" className={`text-[10px] ${statusConfig[a.status].className}`}>
                                {statusConfig[a.status].label}
                              </Badge>
                            )}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma análise anterior</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Clique em &quot;Analisar&quot; para criar a primeira
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}

            {/* Empty state */}
            {!analysis && !isLoading && canAnalyze && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-primary/60" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Analise esta conversa</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Resumo, sentimento, pontos-chave,<br/>desempenho e oportunidades
                </p>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {analysis && !isLoading && (
          <div className="p-3 border-t border-border">
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
