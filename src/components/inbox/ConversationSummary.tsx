import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Minus
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
}

const statusConfig = {
  resolvido: { label: 'Resolvido', icon: CheckCircle2, className: 'bg-success/20 text-success border-green-500/30' },
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-warning/20 text-warning border-yellow-500/30' },
  aguardando_cliente: { label: 'Aguardando Cliente', icon: AlertCircle, className: 'bg-warning/20 text-warning border-orange-500/30' },
  aguardando_atendente: { label: 'Aguardando Atendente', icon: AlertCircle, className: 'bg-info/20 text-info border-blue-500/30' },
};

const sentimentConfig = {
  positivo: { label: 'Positivo', icon: ThumbsUp, className: 'text-success' },
  neutro: { label: 'Neutro', icon: Minus, className: 'text-muted-foreground' },
  negativo: { label: 'Negativo', icon: ThumbsDown, className: 'text-destructive' },
};

export function ConversationSummary({ messages, contactName }: ConversationSummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const canGenerateSummary = messages.length >= 10;

  const generateSummary = async () => {
    if (!canGenerateSummary) {
      toast.error('A conversa precisa ter pelo menos 10 mensagens para gerar um resumo.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-conversation-summary', {
        body: { 
          messages: messages.map(m => ({
            sender: m.sender,
            content: m.content,
            created_at: m.created_at
          })),
          contactName 
        }
      });

      if (error) throw error;

      setSummary(data);
      setHasGenerated(true);
      setIsExpanded(true);
      toast.success('Resumo gerado com sucesso!');
    } catch (error) {
      log.error('Error generating summary:', error);
      toast.error('Erro ao gerar resumo. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canGenerateSummary && !hasGenerated) {
    return null;
  }

  const StatusIcon = summary ? statusConfig[summary.status].icon : Clock;
  const SentimentIcon = summary ? sentimentConfig[summary.sentiment].icon : Minus;

  return (
    <div className="px-4 py-2">
      {!hasGenerated ? (
        <Button
          variant="outline"
          size="sm"
          onClick={generateSummary}
          disabled={isLoading}
          className="w-full gap-2 border-primary/30 hover:border-primary/50 hover:bg-primary/10"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {isLoading ? 'Gerando resumo...' : 'Gerar resumo da conversa'}
        </Button>
      ) : (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader 
            className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
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
                      className={`text-[10px] ${statusConfig[summary.status].className}`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig[summary.status].label}
                    </Badge>
                    <span className={sentimentConfig[summary.sentiment].className}>
                      <SentimentIcon className="h-4 w-4" />
                    </span>
                  </>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>

          <AnimatePresence>
            {isExpanded && summary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 px-4 pb-4 space-y-4">
                  {/* Summary */}
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

                  {/* Regenerate button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateSummary}
                    disabled={isLoading}
                    className="w-full gap-2 text-xs"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    Regenerar resumo
                  </Button>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}
    </div>
  );
}
