import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playTtsAudio, type TtsPlayback, type PlayTtsOptions } from '@/hooks/voice/playTtsAudio';
import { VisionIcon } from './ai-tools/VisionIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { log } from '@/lib/logger';
import { PeriodFilterSelector, usePeriodFilter, getPeriodDays } from './ai-tools/PeriodFilterSelector';
import {
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
  ShieldAlert,
  DollarSign,
  Users,
  Zap,
  Heart,
  Eye,
  BookOpen,
  AlertTriangle,
  Star,
  Volume2,
  VolumeX,
  Headphones,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

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
  department?: string;
  relationshipType?: string;
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

const departmentConfig: Record<string, { label: string; emoji: string; color: string }> = {
  vendas: { label: 'Vendas', emoji: '🛒', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  compras: { label: 'Compras', emoji: '📦', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  logistica: { label: 'Logística', emoji: '🚛', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  rh: { label: 'RH', emoji: '👥', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  financeiro: { label: 'Financeiro', emoji: '💰', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  sac: { label: 'SAC', emoji: '🎧', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  outros: { label: 'Outros', emoji: '📋', color: 'bg-muted/40 text-muted-foreground border-border' },
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
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [lastTtsText, setLastTtsText] = useState<string | null>(null);
  const ttsRef = useRef<TtsPlayback | null>(null);

  const {
    analysisPeriod,
    setAnalysisPeriod,
    customDateFrom,
    customDateTo,
    setCustomDateFrom,
    setCustomDateTo,
    clearCustomDates,
    filteredMessages,
  } = usePeriodFilter(messages, '7d');

  const { analyses, refetch, getSentimentTrend, loading: historyLoading } = useConversationAnalyses(contactId);
  const { checkAndTriggerAlert, threshold: SENTIMENT_THRESHOLD } = useSentimentAlerts();

  const canAnalyze = filteredMessages.length >= 5;

  useEffect(() => {
    setAnalysis(null);
    setActiveTab('resumo');
    // Stop TTS on context change
    if (ttsRef.current) {
      ttsRef.current.stop();
      ttsRef.current = null;
      setIsTtsPlaying(false);
      setIsTtsLoading(false);
    }
  }, [analysisPeriod, customDateFrom, customDateTo, contactId]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      ttsRef.current?.stop();
    };
  }, []);

  const startTtsPlayback = useCallback((text: string) => {
    if (isTtsPlaying && ttsRef.current) {
      ttsRef.current.stop();
      ttsRef.current = null;
      setIsTtsPlaying(false);
      setIsTtsLoading(false);
      return;
    }
    if (!text.trim()) return;

    setAutoplayBlocked(false);
    setLastTtsText(text);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const ttsOptions: PlayTtsOptions = {
      onLoadingChange: setIsTtsLoading,
      onError: (err) => {
        if (err.message === 'AUTOPLAY_BLOCKED') return;
        toast.error('Erro ao gerar áudio: ' + err.message);
      },
      onAutoplayBlocked: () => {
        setAutoplayBlocked(true);
        setIsTtsPlaying(false);
        setIsTtsLoading(false);
      },
    };

    const playback = playTtsAudio(text, supabaseUrl, supabaseKey, ttsOptions);
    ttsRef.current = playback;
    setIsTtsPlaying(true);

    playback.promise
      .then(() => setIsTtsPlaying(false))
      .catch(() => setIsTtsPlaying(false));
  }, [isTtsPlaying]);

  const handlePlaySummary = useCallback(() => {
    if (!analysis?.summary) return;
    startTtsPlayback(analysis.summary);
  }, [analysis?.summary, startTtsPlayback]);

  const handlePlayText = useCallback((text: string) => {
    startTtsPlayback(text);
  }, [startTtsPlayback]);

  const handleRetryAutoplay = useCallback(() => {
    if (lastTtsText) {
      setAutoplayBlocked(false);
      startTtsPlayback(lastTtsText);
    }
  }, [lastTtsText, startTtsPlayback]);

  const handleDismissAutoplayWarning = useCallback(() => {
    setAutoplayBlocked(false);
    setLastTtsText(null);
  }, []);

  const buildFullNarrationText = useCallback(() => {
    if (!analysis) return '';
    const parts: string[] = [];
    if (analysis.summary) parts.push(analysis.summary);
    if (analysis.keyPoints?.length) {
      parts.push('Pontos-chave: ' + analysis.keyPoints.join('. '));
    }
    if (analysis.nextSteps?.length) {
      parts.push('Próximos passos: ' + analysis.nextSteps.join('. '));
    }
    return parts.join('. ');
  }, [analysis]);

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
    <div className="space-y-4">
            <PeriodFilterSelector
              period={analysisPeriod}
              onPeriodChange={setAnalysisPeriod}
              customFrom={customDateFrom}
              customTo={customDateTo}
              onCustomFromChange={setCustomDateFrom}
              onCustomToChange={setCustomDateTo}
              onClearCustom={clearCustomDates}
              filteredCount={filteredMessages.length}
              totalCount={messages.length}
            />

            <div className="flex flex-col items-center gap-1.5">
              <Button
                size="sm"
                onClick={analyzeConversation}
                disabled={isLoading || !canAnalyze}
                className="gap-2 rounded-xl bg-primary px-6 text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isLoading ? 'Analisando...' : `Analisar (${filteredMessages.length} msgs)`}
              </Button>
              {canAnalyze && !isLoading && !analysis && (
                <p className="text-[9px] text-muted-foreground">Resumo · Sentimento · Pontos-chave · Histórico</p>
              )}
            </div>

            {autoplayBlocked && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3"
              >
                <VolumeX className="h-4 w-4 shrink-0 text-warning" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-warning">Áudio bloqueado pelo navegador</p>
                  <p className="text-[10px] text-warning/70">Clique abaixo para tentar novamente</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 rounded-lg border-warning/30 px-2 text-[10px] text-warning hover:bg-warning/20"
                    onClick={handleRetryAutoplay}
                  >
                    <RefreshCcw className="h-3 w-3" />
                    Tentar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-lg px-1.5 text-[10px] text-muted-foreground"
                    onClick={handleDismissAutoplayWarning}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            )}

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
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-xs font-medium text-muted-foreground">Analisando {filteredMessages.length} mensagens...</span>
                </div>
                <div className="space-y-3 animate-pulse">
                  <div className="h-24 rounded-xl bg-muted/40 border border-border/20" />
                  <div className="flex gap-2">
                    <div className="h-6 w-24 rounded-full bg-muted/40" />
                    <div className="h-6 w-20 rounded-full bg-muted/40" />
                    <div className="h-6 w-16 rounded-full bg-muted/40" />
                  </div>
                  <div className="h-20 rounded-xl bg-muted/40 border border-border/20" />
                  <div className="space-y-2">
                    <div className="h-12 rounded-lg bg-muted/30" />
                    <div className="h-12 rounded-lg bg-muted/30" />
                    <div className="h-12 rounded-lg bg-muted/30" />
                  </div>
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
                      {analysis.department && departmentConfig[analysis.department] && (
                        <Badge variant="outline" className={`${departmentConfig[analysis.department].color} text-[10px] font-semibold`}>
                          <span className="mr-1">{departmentConfig[analysis.department].emoji}</span>
                          {departmentConfig[analysis.department].label}
                        </Badge>
                      )}
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

                    {analysis.relationshipType && (
                      <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-3 py-1.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{analysis.relationshipType}</span>
                      </div>
                    )}

                    <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                          <VisionIcon className="h-3 w-3" />
                          Resumo
                        </h4>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-6 w-6 ${isTtsLoading ? 'text-warning animate-spin' : isTtsPlaying ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
                              onClick={handlePlaySummary}
                              disabled={isTtsLoading}
                              aria-label={isTtsPlaying ? 'Parar áudio' : 'Ouvir resumo'}
                            >
                              {isTtsLoading ? <Loader2 className="h-3.5 w-3.5" /> : isTtsPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>{isTtsLoading ? 'Carregando áudio...' : isTtsPlaying ? 'Parar áudio' : 'Ouvir resumo'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <ListChecks className="h-3 w-3" />
                            Pontos-chave
                          </h4>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 ${isTtsLoading ? 'text-warning animate-spin' : isTtsPlaying ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => handlePlayText(analysis.keyPoints.join('. '))}
                                disabled={isTtsLoading}
                                aria-label="Ouvir pontos-chave"
                              >
                                {isTtsLoading ? <Loader2 className="h-3.5 w-3.5" /> : isTtsPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>{isTtsLoading ? 'Carregando...' : isTtsPlaying ? 'Parar' : 'Ouvir pontos-chave'}</p></TooltipContent>
                          </Tooltip>
                        </div>
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
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <ArrowRight className="h-3 w-3" />
                            Próximos Passos
                          </h4>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 ${isTtsLoading ? 'text-warning animate-spin' : isTtsPlaying ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => handlePlayText(analysis.nextSteps!.join('. '))}
                                disabled={isTtsLoading}
                                aria-label="Ouvir próximos passos"
                              >
                                {isTtsLoading ? <Loader2 className="h-3.5 w-3.5" /> : isTtsPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>{isTtsLoading ? 'Carregando...' : isTtsPlaying ? 'Parar' : 'Ouvir próximos passos'}</p></TooltipContent>
                          </Tooltip>
                        </div>
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
                              department: (item as any).department ?? undefined,
                              relationshipType: (item as any).relationship_type ?? undefined,
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
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                              </span>
                              {(item as any).department && departmentConfig[(item as any).department] && (
                                <Badge variant="outline" className={`${departmentConfig[(item as any).department].color} text-[9px] px-1.5 py-0`}>
                                  <span className="mr-0.5">{departmentConfig[(item as any).department].emoji}</span>
                                  {departmentConfig[(item as any).department].label}
                                </Badge>
                              )}
                            </div>
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
                  <VisionIcon className="h-8 w-8 text-primary/60" />
                </div>
                <p className="mb-1 text-sm font-medium text-foreground">Analise esta conversa</p>
                <p className="text-xs leading-relaxed text-muted-foreground">Resumo, sentimento, pontos-chave, desempenho e oportunidades</p>
              </motion.div>
            )}
          </div>

          {analysis && !isLoading && (
            <div className="border-t border-border pt-3 mt-3">
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
    </div>
  );
}
