import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { log } from '@/lib/logger';
import { PeriodFilterSelector, usePeriodFilter } from './ai-tools/PeriodFilterSelector';
import { playTtsAudio, type TtsPlayback, type PlayTtsOptions } from '@/hooks/voice/playTtsAudio';
import { 
  FileText, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  Headphones,
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

const statusConfig = {
  resolvido: { label: 'Resolvido', icon: CheckCircle2, className: 'text-success border-success/30 bg-success/10' },
  pendente: { label: 'Pendente', icon: Clock, className: 'text-warning border-warning/30 bg-warning/10' },
  aguardando_cliente: { label: 'Aguardando Cliente', icon: Clock, className: 'text-info border-info/30 bg-info/10' },
  aguardando_atendente: { label: 'Aguardando Atendente', icon: AlertCircle, className: 'text-warning border-warning/30 bg-warning/10' },
};

const sentimentConfig = {
  positivo: { icon: ThumbsUp, className: 'text-success' },
  neutro: { icon: Minus, className: 'text-muted-foreground' },
  negativo: { icon: ThumbsDown, className: 'text-destructive' },
};

export function ConversationSummary({ messages, contactName, contactId, initialSummary, onClose }: ConversationSummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>((initialSummary as unknown as SummaryData) ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!!initialSummary);

  // TTS state
  const ttsRef = useRef<TtsPlayback | null>(null);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [lastTtsText, setLastTtsText] = useState<string | null>(null);

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

  const canGenerateSummary = filteredMessages.length >= 10;

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      if (ttsRef.current) {
        ttsRef.current.stop();
        ttsRef.current = null;
      }
    };
  }, []);

  // Reset on contact change
  useEffect(() => {
    setSummary(null);
    setHasGenerated(false);
    if (ttsRef.current) { ttsRef.current.stop(); ttsRef.current = null; }
    setIsTtsPlaying(false);
    setIsTtsLoading(false);
    setAutoplayBlocked(false);
  }, [contactId]);

  // Reset summary when period changes
  useEffect(() => {
    if (hasGenerated) {
      setSummary(null);
      setHasGenerated(false);
    }
  }, [analysisPeriod, customDateFrom, customDateTo]);

  useEffect(() => {
    if (initialSummary) {
      setSummary(initialSummary as unknown as SummaryData);
      setHasGenerated(true);
    }
  }, [initialSummary]);

  // ── TTS ──
  const startTtsPlayback = useCallback((text: string) => {
    if (isTtsPlaying) {
      ttsRef.current?.stop();
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

  const buildFullNarrationText = useCallback(() => {
    if (!summary) return '';
    const parts: string[] = [];
    if (summary.summary) parts.push(summary.summary);
    if (summary.keyPoints?.length) {
      parts.push('Pontos-chave: ' + summary.keyPoints.join('. '));
    }
    if (summary.nextSteps?.length) {
      parts.push('Próximos passos: ' + summary.nextSteps.join('. '));
    }
    return parts.join('. ');
  }, [summary]);

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

  // Inline TTS button helper
  const TtsButton = ({ text, label }: { text: string; label: string }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => startTtsPlayback(text)}
            disabled={isTtsLoading}
          >
            {isTtsPlaying && lastTtsText === text ? (
              <VolumeX className="h-3.5 w-3.5 text-primary" />
            ) : isTtsLoading && lastTtsText === text ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-4">
      {/* Status badges */}
      {summary && (
        <div className="flex items-center gap-2">
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
        </div>
      )}
          {/* Period Selector — premium layout */}
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

          {/* Loading skeleton */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-2 px-1">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-[11px] font-medium text-muted-foreground">Gerando resumo de {filteredMessages.length} mensagens...</span>
              </div>
              <div className="h-16 rounded-xl bg-muted/40 border border-border/20" />
              <div className="space-y-1.5">
                <div className="h-3 bg-muted/30 rounded w-full" />
                <div className="h-3 bg-muted/30 rounded w-4/5" />
                <div className="h-3 bg-muted/30 rounded w-3/5" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 bg-muted/30 rounded w-2/3" />
                <div className="h-3 bg-muted/30 rounded w-1/2" />
              </div>
            </motion.div>
          )}

          {/* Autoplay blocked warning */}
          {autoplayBlocked && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">Áudio bloqueado pelo navegador</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={handleRetryAutoplay}>
                <RefreshCcw className="h-3 w-3" /> Tentar
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismissAutoplayWarning}>
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          )}

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
                {/* Listen All button */}
                <div className="flex justify-end">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-[11px]"
                          onClick={() => startTtsPlayback(buildFullNarrationText())}
                          disabled={isTtsLoading}
                        >
                          {isTtsPlaying ? (
                            <>
                              <VolumeX className="h-3.5 w-3.5" />
                              Parar
                            </>
                          ) : (
                            <>
                              <Headphones className="h-3.5 w-3.5" />
                              Ouvir Tudo
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Ouvir resumo completo em áudio</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Summary text */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-medium text-muted-foreground">Resumo</h4>
                    <TtsButton text={summary.summary} label="Ouvir resumo" />
                  </div>
                  <p className="text-sm">{summary.summary}</p>
                </div>

                {/* Key Points */}
                {summary.keyPoints.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Pontos-chave</h4>
                      <TtsButton text={'Pontos-chave: ' + summary.keyPoints.join('. ')} label="Ouvir pontos-chave" />
                    </div>
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
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Próximos passos</h4>
                      <TtsButton text={'Próximos passos: ' + summary.nextSteps.join('. ')} label="Ouvir próximos passos" />
                    </div>
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
    </div>
  );
}
