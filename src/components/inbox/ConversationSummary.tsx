import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { log } from '@/lib/logger';
import { PeriodFilterSelector, usePeriodFilter } from './ai-tools/PeriodFilterSelector';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Reset on contact change
  useEffect(() => {
    setSummary(null);
    setHasGenerated(false);
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
