import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Motion Preferences Context
interface MotionPreferencesContextType {
  prefersReducedMotion: boolean;
  enableAnimations: boolean;
  setEnableAnimations: (enabled: boolean) => void;
}

const MotionPreferencesContext = createContext<MotionPreferencesContextType>({
  prefersReducedMotion: false,
  enableAnimations: true,
  setEnableAnimations: () => {},
});

export function MotionPreferencesProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [enableAnimations, setEnableAnimations] = useState(!prefersReducedMotion);
  
  useEffect(() => {
    // Sync with system preference
    setEnableAnimations(!prefersReducedMotion);
  }, [prefersReducedMotion]);
  
  return (
    <MotionPreferencesContext.Provider value={{
      prefersReducedMotion,
      enableAnimations,
      setEnableAnimations,
    }}>
      {children}
    </MotionPreferencesContext.Provider>
  );
}

export function useMotionPreferences() {
  return useContext(MotionPreferencesContext);
}

// Safe Animation Wrapper
interface SafeAnimationProps {
  children: ReactNode;
  animate?: object;
  initial?: object;
  exit?: object;
  transition?: object;
  className?: string;
  fallback?: 'fade' | 'none';
}

export function SafeAnimation({
  children,
  animate,
  initial,
  exit,
  transition,
  className,
  fallback = 'fade',
}: SafeAnimationProps) {
  const { enableAnimations } = useMotionPreferences();
  
  if (!enableAnimations) {
    if (fallback === 'none') {
      return <div className={className}>{children}</div>;
    }
    
    // Simple fade as safe fallback
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={initial as Record<string, number | string>}
      animate={animate as Record<string, number | string>}
      exit={exit as Record<string, number | string>}
      transition={transition as Record<string, number | string>}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Reduced Motion Variants
export const safeVariants = {
  // Fade only - always safe
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  // Slide with reduced motion fallback
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  
  // Scale with reduced motion fallback
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  
  // Pop with reduced motion fallback
  pop: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    reduced: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
};

// Hook to get safe animation variants
export function useSafeVariants(variant: keyof typeof safeVariants) {
  const { enableAnimations } = useMotionPreferences();
  const variantConfig = safeVariants[variant];
  
  if (!enableAnimations && 'reduced' in variantConfig) {
    return variantConfig.reduced;
  }
  
  return {
    initial: variantConfig.initial,
    animate: variantConfig.animate,
    exit: variantConfig.exit,
  };
}

// Safe Transition Presets
export function useSafeTransition() {
  const { enableAnimations } = useMotionPreferences();
  
  return {
    fast: enableAnimations
      ? { duration: 0.15, ease: 'easeOut' }
      : { duration: 0.1, ease: 'linear' },
    
    normal: enableAnimations
      ? { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
      : { duration: 0.15, ease: 'linear' },
    
    slow: enableAnimations
      ? { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
      : { duration: 0.2, ease: 'linear' },
    
    spring: enableAnimations
      ? { type: 'spring', stiffness: 300, damping: 25 }
      : { duration: 0.15, ease: 'linear' },
  };
}

// Motion Settings Panel
export function MotionSettingsPanel({ className }: { className?: string }) {
  const { prefersReducedMotion, enableAnimations, setEnableAnimations } = useMotionPreferences();
  
  return (
    <div className={cn("space-y-4 p-4 rounded-lg border border-border", className)}>
      <div>
        <h3 className="font-medium mb-2">Configurações de Movimento</h3>
        <p className="text-sm text-muted-foreground">
          Controle como as animações são exibidas na interface.
        </p>
      </div>
      
      {prefersReducedMotion && (
        <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <span className="text-warning text-lg">⚠️</span>
          <div className="text-sm">
            <p className="font-medium text-warning">Movimento reduzido detectado</p>
            <p className="text-muted-foreground">
              Seu sistema está configurado para preferir movimento reduzido.
            </p>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <button
          onClick={() => setEnableAnimations(!enableAnimations)}
          className={cn(
            "flex items-center justify-between w-full p-3 rounded-lg transition-colors",
            "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary"
          )}
        >
          <div>
            <div className="font-medium text-sm">Animações</div>
            <div className="text-xs text-muted-foreground">
              {enableAnimations ? 'Animações ativadas' : 'Animações desativadas'}
            </div>
          </div>
          
          <div className={cn(
            "relative w-11 h-6 rounded-full transition-colors",
            enableAnimations ? "bg-primary" : "bg-muted"
          )}>
            <motion.div
              animate={{ x: enableAnimations ? 20 : 2 }}
              transition={{ duration: 0.2 }}
              className="absolute top-1 w-4 h-4 bg-background rounded-full shadow-sm"
            />
          </div>
        </button>
        
        <div className="grid grid-cols-3 gap-2">
          <PreviewAnimation type="fade" enabled={enableAnimations} />
          <PreviewAnimation type="slide" enabled={enableAnimations} />
          <PreviewAnimation type="scale" enabled={enableAnimations} />
        </div>
      </div>
    </div>
  );
}

// Animation Preview
function PreviewAnimation({ type, enabled }: { type: string; enabled: boolean }) {
  const [key, setKey] = useState(0);
  
  return (
    <button
      onClick={() => setKey(k => k + 1)}
      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50"
    >
      <motion.div
        key={key}
        initial={enabled ? { opacity: 0, scale: type === 'scale' ? 0.8 : 1, x: type === 'slide' ? 10 : 0 } : { opacity: 0 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: enabled ? 0.3 : 0.1 }}
        className="w-8 h-8 bg-primary rounded-lg"
      />
      <span className="text-xs text-muted-foreground capitalize">{type}</span>
    </button>
  );
}

// Pause All Animations Button
export function PauseAnimationsButton({ className }: { className?: string }) {
  const { enableAnimations, setEnableAnimations } = useMotionPreferences();
  
  return (
    <button
      onClick={() => setEnableAnimations(!enableAnimations)}
      className={cn(
        "px-3 py-1.5 text-sm rounded-lg border border-border",
        "hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
      aria-pressed={!enableAnimations}
    >
      {enableAnimations ? '⏸️ Pausar animações' : '▶️ Retomar animações'}
    </button>
  );
}
