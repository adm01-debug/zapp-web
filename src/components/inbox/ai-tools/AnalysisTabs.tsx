import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MessageSquareText,
  BarChart3,
  ListChecks,
  History,
  ArrowRight,
  DollarSign,
  Users,
  ShieldAlert,
  Star,
  Volume2,
  VolumeX,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { VisionIcon } from './VisionIcon';
import {
  type AnalysisData,
  statusConfig,
  sentimentConfig,
  urgencyConfig,
  departmentConfig,
  churnConfig,
  performanceLabels,
} from './analysisConfigs';

interface AnalysisTabsProps {
  analysis: AnalysisData;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sentimentScore: number;
  currentSentiment: string;
  analyses: Array<{
    id: string;
    summary: string;
    status: string;
    key_points: string[];
    next_steps: string[];
    sentiment: string;
    sentiment_score: number;
    topics: string[];
    urgency: string | null;
    customer_satisfaction: number | null;
    message_count: number | null;
    created_at: string;
    department?: string;
    relationship_type?: string;
  }>;
  historyLoading: boolean;
  isTtsPlaying: boolean;
  isTtsLoading: boolean;
  onPlaySummary: () => void;
  onPlayText: (text: string) => void;
  onLoadHistory: (item: AnalysisData) => void;
}

export function AnalysisTabs({
  analysis,
  activeTab,
  setActiveTab,
  sentimentScore,
  currentSentiment,
  analyses,
  historyLoading,
  isTtsPlaying,
  isTtsLoading,
  onPlaySummary,
  onPlayText,
  onLoadHistory,
}: AnalysisTabsProps) {
  const SentimentIcon = sentimentConfig[currentSentiment]?.icon || BarChart3;

  const ttsButtonClass = `h-6 w-6 ${isTtsLoading ? 'text-warning animate-spin' : isTtsPlaying ? 'text-primary animate-pulse' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-9 w-full grid-cols-4 rounded-xl">
          <TooltipProvider delayDuration={300}>
            {[
              { value: 'resumo', icon: MessageSquareText, label: 'Resumo' },
              { value: 'sentimento', icon: BarChart3, label: 'Sentimento' },
              { value: 'pontos', icon: ListChecks, label: 'Pontos-chave' },
              { value: 'historico', icon: History, label: 'Histórico' },
            ].map(({ value, icon: Icon, label }) => (
              <Tooltip key={value}>
                <TooltipTrigger asChild>
                  <TabsTrigger value={value} className="rounded-lg px-2 text-xs">
                    <Icon className="h-3.5 w-3.5" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>{label}</p></TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </TabsList>

        {/* Resumo Tab */}
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
                  <Button variant="ghost" size="icon" className={ttsButtonClass} onClick={onPlaySummary} disabled={isTtsLoading} aria-label={isTtsPlaying ? 'Parar áudio' : 'Ouvir resumo'}>
                    {isTtsLoading ? <Loader2 className="h-3.5 w-3.5" /> : isTtsPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>{isTtsLoading ? 'Carregando áudio...' : isTtsPlaying ? 'Parar áudio' : 'Ouvir resumo'}</p></TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm leading-relaxed">{analysis.summary}</p>
          </div>

          {analysis.customerSatisfaction !== undefined && (
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3">
              <span className="text-xs font-medium text-muted-foreground">Satisfação</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-4 w-4 ${star <= (analysis.customerSatisfaction || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-muted'}`} />
                ))}
                <span className="ml-1.5 text-xs font-bold text-foreground">{analysis.customerSatisfaction}/5</span>
              </div>
            </div>
          )}

          {analysis.salesOpportunity && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-primary/20 bg-primary/10 p-3">
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
                  <Badge key={index} variant="secondary" className="rounded-lg text-[10px]">{topic}</Badge>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Sentimento Tab */}
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
                  <span>Negativo</span><span>Positivo</span>
                </div>
                <Progress value={sentimentScore} className="h-2.5 rounded-full" />
              </div>
              {analysis.customerSatisfaction !== undefined && (
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">CSAT Estimado</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`h-3.5 w-3.5 ${star <= (analysis.customerSatisfaction || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-muted'}`} />
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
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3 w-3" />{config.label}</span>
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
            <div className={`flex items-center gap-3 rounded-xl border p-3 ${
              analysis.churnRisk === 'high' ? 'border-destructive/20 bg-destructive/10'
                : analysis.churnRisk === 'medium' ? 'border-warning/20 bg-warning/10'
                  : 'border-success/20 bg-success/10'
            }`}>
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
                              item.sentiment === 'positivo' ? 'rgb(34 197 94 / 0.6)'
                                : item.sentiment === 'negativo' || item.sentiment === 'critico' ? 'rgb(239 68 68 / 0.6)'
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
                <span>Antiga</span><span>Recente</span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Pontos-chave Tab */}
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
                    <Button variant="ghost" size="icon" className={ttsButtonClass} onClick={() => onPlayText(analysis.keyPoints.join('. '))} disabled={isTtsLoading} aria-label="Ouvir pontos-chave">
                      {isTtsLoading ? <Loader2 className="h-3.5 w-3.5" /> : isTtsPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>{isTtsLoading ? 'Carregando...' : isTtsPlaying ? 'Parar' : 'Ouvir pontos-chave'}</p></TooltipContent>
                </Tooltip>
              </div>
              <ul className="space-y-2">
                {analysis.keyPoints.map((point, index) => (
                  <motion.li key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/30 p-2.5 text-sm">
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
                    <Button variant="ghost" size="icon" className={ttsButtonClass} onClick={() => onPlayText(analysis.nextSteps!.join('. '))} disabled={isTtsLoading} aria-label="Ouvir próximos passos">
                      {isTtsLoading ? <Loader2 className="h-3.5 w-3.5" /> : isTtsPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>{isTtsLoading ? 'Carregando...' : isTtsPlaying ? 'Parar' : 'Ouvir próximos passos'}</p></TooltipContent>
                </Tooltip>
              </div>
              <ul className="space-y-2">
                {analysis.nextSteps.map((step, index) => (
                  <motion.li key={index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 p-2.5 text-sm">
                    <span className="mt-0.5 shrink-0 text-primary">→</span>
                    <span className="leading-relaxed">{step}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* Histórico Tab */}
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
                  onLoadHistory({
                    department: (item as Record<string, unknown>).department as string | undefined,
                    relationshipType: (item as Record<string, unknown>).relationship_type as string | undefined,
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
                    {(item as Record<string, unknown>).department && departmentConfig[(item as Record<string, unknown>).department as string] && (
                      <Badge variant="outline" className={`${departmentConfig[(item as Record<string, unknown>).department as string].color} text-[9px] px-1.5 py-0`}>
                        <span className="mr-0.5">{departmentConfig[(item as Record<string, unknown>).department as string].emoji}</span>
                        {departmentConfig[(item as Record<string, unknown>).department as string].label}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${sentimentConfig[item.sentiment]?.color || ''}`}>
                    {item.sentiment_score}%
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed">{item.summary}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">{item.message_count} msgs</Badge>
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
  );
}
