import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { Skeleton } from "./skeleton";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2 
      className={cn("animate-spin text-primary", sizeClasses[size], className)} 
      aria-hidden="true"
    />
  );
}

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn("flex gap-1.5 justify-center", className)} role="status" aria-label="Carregando">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

interface FullPageLoadingProps {
  message?: string;
  submessage?: string;
}

export function FullPageLoading({ 
  message = "Carregando", 
  submessage = "Preparando sua experiência..." 
}: FullPageLoadingProps) {
  return (
    <div 
      className="flex items-center justify-center h-screen bg-background relative overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Background gradient effects */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/10 rounded-full blur-3xl animate-pulse" 
          style={{ animationDelay: '1s' }} 
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center relative z-10"
      >
        <motion.div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
          style={{ background: 'var(--gradient-primary)' }}
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-8 h-8 text-primary-foreground" />
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ background: 'var(--gradient-primary)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">
            {message}
          </h2>
          <p className="text-muted-foreground text-sm">{submessage}</p>
        </motion.div>

        <LoadingDots className="mt-6" />
      </motion.div>
    </div>
  );
}

interface InlineLoadingProps {
  message?: string;
  className?: string;
}

export function InlineLoading({ message = "Carregando...", className }: InlineLoadingProps) {
  return (
    <div 
      className={cn("flex items-center justify-center gap-2 p-4", className)}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="sm" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

interface CardLoadingProps {
  rows?: number;
  className?: string;
}

export function CardLoading({ rows = 3, className }: CardLoadingProps) {
  return (
    <div className={cn("space-y-4 p-4", className)} role="status" aria-label="Carregando conteúdo">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

interface TableLoadingProps {
  rows?: number;
  columns?: number;
}

export function TableLoading({ rows = 5, columns = 4 }: TableLoadingProps) {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando tabela">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton 
              key={colIdx} 
              className="h-4 flex-1" 
              style={{ opacity: 1 - (rowIdx * 0.1) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function ButtonLoading({ isLoading, children, loadingText = "Processando..." }: ButtonLoadingProps) {
  if (isLoading) {
    return (
      <span className="flex items-center gap-2">
        <LoadingSpinner size="sm" />
        <span>{loadingText}</span>
      </span>
    );
  }
  return <>{children}</>;
}

// Export all components
export const LoadingStates = {
  Spinner: LoadingSpinner,
  Dots: LoadingDots,
  FullPage: FullPageLoading,
  Inline: InlineLoading,
  Card: CardLoading,
  Table: TableLoading,
  Button: ButtonLoading,
};
