import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, ThumbsUp, MessageCircle, Calendar, Clock, Check, HelpCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface SmartReply {
  id: string;
  text: string;
  category: 'positive' | 'neutral' | 'action' | 'question' | 'custom';
  icon?: typeof ThumbsUp;
  confidence?: number;
}

interface SmartReplyChipsProps {
  lastMessage?: string;
  onSelect: (reply: string) => void;
  customReplies?: SmartReply[];
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  maxReplies?: number;
  showConfidence?: boolean;
}

// Simple sentiment/intent analysis for generating replies
const analyzeMessage = (message: string): SmartReply[] => {
  const lowerMessage = message.toLowerCase();
  const replies: SmartReply[] = [];

  // Greeting responses
  if (/\b(olá|oi|bom dia|boa tarde|boa noite|hey|hi|hello)\b/.test(lowerMessage)) {
    replies.push(
      { id: 'greet-1', text: 'Olá! Como posso ajudar?', category: 'positive', icon: MessageCircle, confidence: 0.95 },
      { id: 'greet-2', text: 'Oi! Em que posso ajudar?', category: 'positive', icon: MessageCircle, confidence: 0.9 }
    );
  }

  // Question responses
  if (/\?$|\b(como|quando|onde|qual|quem|por que|quanto)\b/.test(lowerMessage)) {
    replies.push(
      { id: 'question-1', text: 'Deixa eu verificar isso pra você', category: 'action', icon: HelpCircle, confidence: 0.85 },
      { id: 'question-2', text: 'Vou consultar e já retorno', category: 'action', icon: Clock, confidence: 0.8 }
    );
  }

  // Thanks responses
  if (/\b(obrigad[oa]|valeu|agradeço|thanks|thank you)\b/.test(lowerMessage)) {
    replies.push(
      { id: 'thanks-1', text: 'Por nada! Precisa de mais algo?', category: 'positive', icon: ThumbsUp, confidence: 0.95 },
      { id: 'thanks-2', text: 'Disponha! Qualquer dúvida é só chamar', category: 'positive', icon: Check, confidence: 0.9 }
    );
  }

  // Problem/complaint responses
  if (/\b(problema|erro|não funciona|bug|reclamação|defeito|quebr|fail)\b/.test(lowerMessage)) {
    replies.push(
      { id: 'problem-1', text: 'Sinto muito pelo inconveniente. Vou resolver isso agora', category: 'action', icon: Sparkles, confidence: 0.9 },
      { id: 'problem-2', text: 'Entendo a frustração. Me conta mais detalhes?', category: 'question', icon: MessageCircle, confidence: 0.85 }
    );
  }

  // Urgency responses
  if (/\b(urgente|urgência|pressa|agora|imediato|rápido)\b/.test(lowerMessage)) {
    replies.push(
      { id: 'urgent-1', text: 'Entendido! Priorizando seu caso agora', category: 'action', icon: Clock, confidence: 0.95 },
      { id: 'urgent-2', text: 'Vou agilizar isso pra você', category: 'action', icon: Sparkles, confidence: 0.9 }
    );
  }

  // Schedule/appointment responses
  if (/\b(agendar|agendamento|marcar|horário|disponível|agenda)\b/.test(lowerMessage)) {
    replies.push(
      { id: 'schedule-1', text: 'Claro! Qual horário prefere?', category: 'question', icon: Calendar, confidence: 0.9 },
      { id: 'schedule-2', text: 'Vou verificar nossa disponibilidade', category: 'action', icon: Calendar, confidence: 0.85 }
    );
  }

  // Price/value responses
  if (/\b(preço|valor|quanto custa|custo|orçamento|pagar)\b/.test(lowerMessage)) {
    replies.push(
      { id: 'price-1', text: 'Vou enviar nossa tabela de preços', category: 'action', icon: Send, confidence: 0.9 },
      { id: 'price-2', text: 'Posso fazer um orçamento personalizado', category: 'action', icon: Sparkles, confidence: 0.85 }
    );
  }

  // Confirmation responses
  if (/\b(sim|ok|pode ser|beleza|combinado|fechado|confirmo)\b/.test(lowerMessage)) {
    replies.push(
      { id: 'confirm-1', text: 'Perfeito! Está confirmado', category: 'positive', icon: Check, confidence: 0.95 },
      { id: 'confirm-2', text: 'Ótimo! Vou dar andamento', category: 'action', icon: ThumbsUp, confidence: 0.9 }
    );
  }

  // Default fallback responses
  if (replies.length === 0) {
    replies.push(
      { id: 'default-1', text: 'Entendi! Me conta mais', category: 'neutral', icon: MessageCircle, confidence: 0.7 },
      { id: 'default-2', text: 'Vou verificar isso', category: 'action', icon: Clock, confidence: 0.65 },
      { id: 'default-3', text: 'Como posso ajudar?', category: 'question', icon: HelpCircle, confidence: 0.6 }
    );
  }

  return replies;
};

const categoryColors: Record<SmartReply['category'], string> = {
  positive: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
  neutral: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
  action: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
  question: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
  custom: 'bg-secondary/50 text-secondary-foreground border-secondary hover:bg-secondary/70',
};

export function SmartReplyChips({
  lastMessage = '',
  onSelect,
  customReplies,
  isLoading = false,
  disabled = false,
  className,
  maxReplies = 4,
  showConfidence = false,
}: SmartReplyChipsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Generate smart replies based on last message
  const smartReplies = useMemo(() => {
    if (customReplies?.length) return customReplies.slice(0, maxReplies);
    if (!lastMessage.trim()) return [];
    return analyzeMessage(lastMessage).slice(0, maxReplies);
  }, [lastMessage, customReplies, maxReplies]);

  // Reset visibility when message changes
  useEffect(() => {
    setIsVisible(true);
    setSelectedId(null);
  }, [lastMessage]);

  const handleSelect = (reply: SmartReply) => {
    if (disabled) return;
    setSelectedId(reply.id);
    
    // Animate out and trigger callback
    setTimeout(() => {
      onSelect(reply.text);
      setIsVisible(false);
    }, 200);
  };

  if (!smartReplies.length || !isVisible) return null;

  return (
    <div className={cn("py-2", className)}>
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span className="text-xs font-medium text-muted-foreground">Sugestões inteligentes</span>
      </div>

      {/* Reply chips */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analisando contexto...</span>
            </motion.div>
          ) : (
            smartReplies.map((reply, index) => {
              const Icon = reply.icon;
              const isSelected = selectedId === reply.id;

              return (
                <motion.div
                  key={reply.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ 
                    opacity: isSelected ? 0.5 : 1, 
                    scale: isSelected ? 0.95 : 1,
                    y: 0 
                  }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ 
                    duration: 0.2,
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 400,
                    damping: 25
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled || isSelected}
                    onClick={() => handleSelect(reply)}
                    className={cn(
                      "relative h-auto py-1.5 px-3 text-sm font-normal rounded-full transition-all duration-200",
                      "border shadow-sm",
                      categoryColors[reply.category],
                      isSelected && "ring-2 ring-primary ring-offset-1"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      <span>{reply.text}</span>
                      {showConfidence && reply.confidence && (
                        <span className="ml-1 text-[10px] opacity-50">
                          {Math.round(reply.confidence * 100)}%
                        </span>
                      )}
                    </span>

                    {/* Selection ripple effect */}
                    {isSelected && (
                      <motion.div
                        className="absolute inset-0 bg-primary/20 rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                  </Button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Standalone hook for getting smart replies
export function useSmartReplies(lastMessage: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [replies, setReplies] = useState<SmartReply[]>([]);

  useEffect(() => {
    if (!lastMessage.trim()) {
      setReplies([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate async processing (could be replaced with actual AI call)
    const timer = setTimeout(() => {
      setReplies(analyzeMessage(lastMessage));
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [lastMessage]);

  return { replies, isLoading };
}
