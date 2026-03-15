import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, MessageSquareHeart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCSAT } from '@/hooks/useCSAT';

interface CSATSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  agentId?: string;
  contactName: string;
}

const ratingLabels: Record<number, string> = {
  1: 'Muito insatisfeito',
  2: 'Insatisfeito',
  3: 'Neutro',
  4: 'Satisfeito',
  5: 'Muito satisfeito',
};

const ratingEmojis: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '😊',
  5: '🤩',
};

export function CSATSurveyDialog({ open, onOpenChange, contactId, agentId, contactName }: CSATSurveyDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { submitSurvey } = useCSAT();

  const handleSubmit = async () => {
    if (rating === 0) return;
    await submitSurvey.mutateAsync({ contact_id: contactId, agent_id: agentId, rating, feedback });
    setSubmitted(true);
    setTimeout(() => {
      onOpenChange(false);
      setRating(0);
      setFeedback('');
      setSubmitted(false);
    }, 2000);
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareHeart className="w-5 h-5 text-primary" />
            Pesquisa de Satisfação
          </DialogTitle>
          <DialogDescription>
            Como você avalia o atendimento de {contactName}?
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <span className="text-5xl">🎉</span>
              <p className="text-lg font-semibold text-foreground">Obrigado!</p>
              <p className="text-sm text-muted-foreground">Sua avaliação foi registrada.</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 py-4">
              {/* Star Rating */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none"
                    >
                      <Star
                        className={cn(
                          'w-8 h-8 transition-colors',
                          star <= displayRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30'
                        )}
                      />
                    </motion.button>
                  ))}
                </div>
                {displayRating > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="text-xl">{ratingEmojis[displayRating]}</span>
                    <span>{ratingLabels[displayRating]}</span>
                  </motion.div>
                )}
              </div>

              {/* Feedback */}
              <Textarea
                placeholder="Deixe um comentário (opcional)..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="resize-none"
              />

              <Button
                onClick={handleSubmit}
                disabled={rating === 0 || submitSurvey.isPending}
                className="w-full gap-2"
              >
                <Send className="w-4 h-4" />
                {submitSurvey.isPending ? 'Enviando...' : 'Enviar Avaliação'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
