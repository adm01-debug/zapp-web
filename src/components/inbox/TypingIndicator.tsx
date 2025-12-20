import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  isVisible?: boolean;
  userName?: string;
  className?: string;
}

export function TypingIndicator({ 
  isVisible = true, 
  userName = 'Contato',
  className 
}: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 bg-card border border-border/30 rounded-2xl rounded-bl-md w-fit shadow-sm",
            className
          )}
        >
          {/* Typing dots */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 bg-primary rounded-full"
                animate={{
                  y: [0, -5, 0],
                  opacity: [0.4, 1, 0.4],
                  scale: [0.9, 1.1, 0.9],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          
          {/* User name with typing text */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground font-medium"
          >
            {userName} está digitando
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact version for header
export function TypingIndicatorCompact({ 
  isVisible = true,
  className 
}: { 
  isVisible?: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn("flex items-center gap-1", className)}
        >
          <motion.span className="text-success font-medium">digitando</motion.span>
          <div className="flex items-center gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1 h-1 bg-success rounded-full"
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
