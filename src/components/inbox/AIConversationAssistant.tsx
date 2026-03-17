import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Mic,
  BarChart3,
  ListChecks,
  RefreshCw,
  X,
  Sparkles,
  History,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useConversationAnalyses, ConversationAnalysis } from '@/hooks/useConversationAnalyses';
import { useSentimentAlerts } from '@/hooks/useSentimentAlerts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  sender: 'agent' | 'contact';
  content: string;
  type?: string;
  mediaUrl?: string;
  created_at: string;
}

interface AnalysisData {
  summary: string;
  status: 'resolvido' | 'pendente' | 'aguardando_cliente' | 'aguardando_atendente';
  keyPoints: string[];
  nextSteps?: string[];
  sentiment: 'positivo' | 'neutro' | 'negativo';
  sentimentScore?: number;
  topics?: string[];
  urgency?: 'baixa' | 'media' | 'alta';
  customerSatisfaction?: number;
  transcriptions?: { messageId: string; text: string }[];
}

interface AIConversationAssistantProps {
  messages: Message[];
  contactId: string;
  contactName: string;
  isOpen: boolean;
  onClose: () => void;
}

const statusConfig = {
  resolvido: { label: 'Resolvido', icon: CheckCircle2, className: 'bg-success/20 text-success border-green-500/30' },
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/20 text-warning border-yellow-500/30' },
  aguardando_cliente: { label: 'Aguardando Cliente', icon: AlertCircle, className: 'bg-warning/20 text-warning border-orange-500/30' },
  aguardando_atendente: { label: 'Aguardando Atendente', icon: AlertCircle, className: 'bg-info/20 text-info border-blue-500/30' },
};

const sentimentConfig = {
  positivo: { label: 'Positivo', icon: ThumbsUp, color: 'text-success', bg: 'bg-success' },
  neutro: { label: 'Neutro', icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' },
  negativo: { label: 'Negativo', icon: ThumbsDown, color: 'text-destructive', bg: 'bg-destructive' },
};

const urgencyConfig = {
  baixa: { label: 'Baixa', className: 'bg-success/20 text-success' },
  media: { label: 'Média', className: 'bg-warning/20 text-warning' },
  alta: { label: 'Alta', className: 'bg-destructive/20 text-destructive' },
};

export function AIConversationAssistant({ messages, contactId, contactName, isOpen, onClose }: AIConversationAssistantProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('resumo');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const { analyses, saveAnalysis, getSentimentTrend, loading: historyLoading } = useConversationAnalyses(contactId);
  const { checkAndTriggerAlert, threshold: SENTIMENT_THRESHOLD } = useSentimentAlerts();

  const audioMessages = messages.filter(m => m.type === 'audio' && m.mediaUrl);
  const canAnalyze = messages.length >= 5;

  // Load latest analysis on mount
  useEffect(() => {
    if (analyses.length > 0 && !analysis) {
      const latest = analyses[0];
      setAnalysis({
        summary: latest.summary,
        status: latest.status as AnalysisData['status'],
        keyPoints: latest.key_points,
        nextSteps: latest.next_steps,
        sentiment: latest.sentiment,
        sentimentScore: latest.sentiment_score,
        topics: latest.topics,
        urgency: latest.urgency as AnalysisData['urgency'],
        customerSatisfaction: latest.customer_satisfaction
      });
    }
  }, [analyses, analysis]);

  const analyzeConversation = async () => {
    if (!canAnalyze) {
      toast.error('A conversa precisa ter pelo menos 5 mensagens para análise.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-conversation-analysis', {
        body: { 
          messages: messages.map(m => ({
            id: m.id,
            sender: m.sender,
            content: m.content,
            type: m.type || 'text',
            created_at: m.created_at
          })),
          contactName 
        }
      });

      if (error) throw error;

      setAnalysis(data);

      // Save to history
      const savedAnalysis = await saveAnalysis({
        contact_id: contactId,
        summary: data.summary,
        status: data.status,
        key_points: data.keyPoints || [],
        next_steps: data.nextSteps || [],
        sentiment: data.sentiment,
        sentiment_score: data.sentimentScore || 50,
        topics: data.topics || [],
        urgency: data.urgency || 'media',
        customer_satisfaction: data.customerSatisfaction || 3,
        message_count: messages.length
      });

      // Check for sentiment alert
      const sentimentScore = data.sentimentScore || 50;
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

      toast.success('Análise completa e salva!');
    } catch (error) {
      log.error('Error analyzing conversation:', error);
      toast.error('Erro ao analisar conversa. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const transcribeAudios = async () => {
    if (audioMessages.length === 0) {
      toast.info('Não há mensagens de áudio para transcrever.');
      return;
    }

    setIsTranscribing(true);
    try {
      const transcriptions: { messageId: string; text: string }[] = [];
      
      for (const msg of audioMessages) {
        const { data, error } = await supabase.functions.invoke('ai-transcribe-audio', {
          body: { audioUrl: msg.mediaUrl, messageId: msg.id }
        });
        
        if (!error && data?.transcription) {
          transcriptions.push({ messageId: msg.id, text: data.transcription });
        }
      }

      setAnalysis(prev => prev ? { ...prev, transcriptions } : null);
      toast.success(`${transcriptions.length} áudio(s) transcrito(s)!`);
    } catch (error) {
      log.error('Error transcribing audios:', error);
      toast.error('Erro ao transcrever áudios.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const sentimentTrend = getSentimentTrend();
  const SentimentIcon = analysis ? sentimentConfig[analysis.sentiment].icon : Minus;
  const sentimentScore = analysis?.sentimentScore ?? 50;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="w-80 border-l border-border bg-card/95 backdrop-blur-sm flex flex-col h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Assistente IA</h3>
              <p className="text-[10px] text-muted-foreground">Análise de Conversa</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={analyzeConversation}
                disabled={isLoading || !canAnalyze}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Analisar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={transcribeAudios}
                disabled={isTranscribing || audioMessages.length === 0}
                className="gap-2"
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                Transcrever
              </Button>
            </div>

            {!canAnalyze && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Mínimo de 5 mensagens necessárias ({messages.length}/5)
              </p>
            )}

            {/* Sentiment Trend Indicator */}
            {sentimentTrend && (
              <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                sentimentTrend === 'improving' ? 'bg-success/10 text-success' :
                sentimentTrend === 'declining' ? 'bg-destructive/10 text-destructive' :
                'bg-muted/50 text-muted-foreground'
              }`}>
                {sentimentTrend === 'improving' && <TrendingUp className="h-4 w-4" />}
                {sentimentTrend === 'declining' && <TrendingDown className="h-4 w-4" />}
                {sentimentTrend === 'stable' && <ArrowRight className="h-4 w-4" />}
                <span>
                  Tendência: {sentimentTrend === 'improving' ? 'Melhorando' :
                             sentimentTrend === 'declining' ? 'Piorando' : 'Estável'}
                </span>
              </div>
            )}

            {analysis && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="resumo" className="text-xs px-2">
                    <MessageSquareText className="h-3 w-3" />
                  </TabsTrigger>
                  <TabsTrigger value="sentimento" className="text-xs px-2">
                    <BarChart3 className="h-3 w-3" />
                  </TabsTrigger>
                  <TabsTrigger value="pontos" className="text-xs px-2">
                    <ListChecks className="h-3 w-3" />
                  </TabsTrigger>
                  <TabsTrigger value="transcricao" className="text-xs px-2">
                    <Mic className="h-3 w-3" />
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="text-xs px-2">
                    <History className="h-3 w-3" />
                  </TabsTrigger>
                </TabsList>

                {/* Resumo Tab */}
                <TabsContent value="resumo" className="mt-4 space-y-4">
                  {/* Status & Urgency */}
                  <div className="flex gap-2">
                    <Badge variant="outline" className={statusConfig[analysis.status].className}>
                      {React.createElement(statusConfig[analysis.status].icon, { className: "h-3 w-3 mr-1" })}
                      {statusConfig[analysis.status].label}
                    </Badge>
                    {analysis.urgency && (
                      <Badge variant="outline" className={urgencyConfig[analysis.urgency].className}>
                        {urgencyConfig[analysis.urgency].label}
                      </Badge>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Resumo</h4>
                    <p className="text-sm leading-relaxed">{analysis.summary}</p>
                  </div>

                  {/* Topics */}
                  {analysis.topics && analysis.topics.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Tópicos</h4>
                      <div className="flex flex-wrap gap-1">
                        {analysis.topics.map((topic, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Sentimento Tab */}
                <TabsContent value="sentimento" className="mt-4 space-y-4">
                  <Card className="border-border/50">
                    <CardContent className="pt-4">
                      {/* Sentiment Indicator */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <SentimentIcon className={`h-5 w-5 ${sentimentConfig[analysis.sentiment].color}`} />
                          <span className="font-medium">{sentimentConfig[analysis.sentiment].label}</span>
                        </div>
                        <span className="text-2xl font-bold text-primary">{sentimentScore}%</span>
                      </div>

                      {/* Sentiment Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Negativo</span>
                          <span>Positivo</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${sentimentConfig[analysis.sentiment].bg}`}
                            style={{ width: `${sentimentScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Customer Satisfaction */}
                      {analysis.customerSatisfaction !== undefined && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Satisfação estimada</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <div 
                                  key={star}
                                  className={`h-4 w-4 rounded-full ${
                                    star <= (analysis.customerSatisfaction || 0) 
                                      ? 'bg-primary' 
                                      : 'bg-muted'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Sentiment History Mini Chart */}
                  {analyses.length > 1 && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <h4 className="text-xs font-medium text-muted-foreground mb-3">Evolução do Sentimento</h4>
                      <div className="flex items-end justify-between gap-1 h-16">
                        {analyses.slice(0, 10).reverse().map((a, i) => (
                          <div 
                            key={a.id}
                            className="flex-1 rounded-t transition-all"
                            style={{ 
                              height: `${a.sentiment_score}%`,
                              backgroundColor: a.sentiment === 'positivo' ? 'rgb(34 197 94 / 0.6)' :
                                             a.sentiment === 'negativo' ? 'rgb(239 68 68 / 0.6)' :
                                             'rgb(156 163 175 / 0.6)'
                            }}
                            title={`${format(new Date(a.created_at), 'dd/MM HH:mm')}: ${a.sentiment_score}%`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Antiga</span>
                        <span>Recente</span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Pontos-chave Tab */}
                <TabsContent value="pontos" className="mt-4 space-y-4">
                  {analysis.keyPoints.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <ListChecks className="h-3 w-3" />
                        Pontos-chave
                      </h4>
                      <ul className="space-y-2">
                        {analysis.keyPoints.map((point, index) => (
                          <li key={index} className="text-sm flex items-start gap-2 bg-muted/30 rounded-lg p-2">
                            <span className="text-primary font-bold">{index + 1}.</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.nextSteps && analysis.nextSteps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Próximos passos sugeridos</h4>
                      <ul className="space-y-2">
                        {analysis.nextSteps.map((step, index) => (
                          <li key={index} className="text-sm flex items-start gap-2 bg-primary/10 rounded-lg p-2">
                            <span className="text-primary">→</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>

                {/* Transcrição Tab */}
                <TabsContent value="transcricao" className="mt-4 space-y-4">
                  {analysis.transcriptions && analysis.transcriptions.length > 0 ? (
                    <div className="space-y-3">
                      {analysis.transcriptions.map((t, index) => (
                        <div key={t.messageId} className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Mic className="h-3 w-3 text-primary" />
                            <span className="text-xs text-muted-foreground">Áudio {index + 1}</span>
                          </div>
                          <p className="text-sm">{t.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Mic className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {audioMessages.length > 0 
                          ? 'Clique em "Transcrever" para converter áudios em texto'
                          : 'Não há mensagens de áudio nesta conversa'
                        }
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Histórico Tab */}
                <TabsContent value="historico" className="mt-4 space-y-4">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : analyses.length > 0 ? (
                    <div className="space-y-3">
                      {analyses.map((a) => (
                        <motion.div 
                          key={a.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-muted/30 rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setAnalysis({
                            summary: a.summary,
                            status: a.status as AnalysisData['status'],
                            keyPoints: a.key_points,
                            nextSteps: a.next_steps,
                            sentiment: a.sentiment,
                            sentimentScore: a.sentiment_score,
                            topics: a.topics,
                            urgency: a.urgency as AnalysisData['urgency'],
                            customerSatisfaction: a.customer_satisfaction
                          })}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(a.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] ${sentimentConfig[a.sentiment].color}`}
                            >
                              {a.sentiment_score}%
                            </Badge>
                          </div>
                          <p className="text-xs line-clamp-2">{a.summary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {a.message_count} msgs
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${
                              statusConfig[a.status as keyof typeof statusConfig]?.className || ''
                            }`}>
                              {statusConfig[a.status as keyof typeof statusConfig]?.label || a.status}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma análise anterior encontrada
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clique em "Analisar" para criar a primeira
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {!analysis && !isLoading && canAnalyze && (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Analise esta conversa com IA
                </p>
                <p className="text-xs text-muted-foreground">
                  Obtenha resumo, sentimento, pontos-chave e transcrições
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {analysis && (
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={analyzeConversation}
              disabled={isLoading}
              className="w-full gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Reanalisar
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
