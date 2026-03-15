import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CarouselCard {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  buttons?: { id: string; title: string; url?: string }[];
}

interface CarouselMessageProps {
  cards: CarouselCard[];
  sender: 'contact' | 'agent';
  onButtonClick?: (cardId: string, buttonId: string) => void;
}

export function CarouselMessage({ cards, sender, onButtonClick }: CarouselMessageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isAgent = sender === 'agent';

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(cards.length - 1, index)));
  };

  if (cards.length === 0) return null;

  return (
    <div className={cn("max-w-[340px]", isAgent ? "ml-auto" : "")}>
      <div className="relative rounded-xl overflow-hidden border border-border/30 bg-card/80">
        {/* Card Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {cards[currentIndex]?.imageUrl && (
              <div className="w-full h-40 bg-muted/30">
                <img
                  src={cards[currentIndex].imageUrl}
                  alt={cards[currentIndex].title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-3">
              <h4 className="font-semibold text-sm text-foreground">{cards[currentIndex]?.title}</h4>
              {cards[currentIndex]?.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cards[currentIndex].description}</p>
              )}
              {cards[currentIndex]?.price != null && (
                <p className="text-sm font-bold text-green-400 mt-1">
                  {(cards[currentIndex].currency || 'BRL') === 'BRL' ? 'R$' : '$'}{' '}
                  {cards[currentIndex].price!.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}

              {/* Buttons */}
              {cards[currentIndex]?.buttons && cards[currentIndex].buttons!.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-3">
                  {cards[currentIndex].buttons!.map((btn) => (
                    <Button
                      key={btn.id}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8 gap-1.5"
                      onClick={() => {
                        if (btn.url) window.open(btn.url, '_blank');
                        onButtonClick?.(cards[currentIndex].id, btn.id);
                      }}
                    >
                      {btn.url ? <ExternalLink className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
                      {btn.title}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {cards.length > 1 && (
          <>
            <button
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center disabled:opacity-30 hover:bg-background transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex === cards.length - 1}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center disabled:opacity-30 hover:bg-background transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dots */}
            <div className="flex items-center justify-center gap-1 pb-2">
              {cards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === currentIndex ? "bg-primary w-3" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
