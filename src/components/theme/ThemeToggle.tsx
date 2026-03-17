import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Monitor, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTheme, type Theme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  collapsed?: boolean;
  variant?: 'icon' | 'full' | 'slider' | 'dropdown';
}

const themeConfig = {
  light: { icon: Sun, label: 'Claro', description: 'Tema claro' },
  dark: { icon: Moon, label: 'Escuro', description: 'Tema escuro' },
  system: { icon: Monitor, label: 'Sistema', description: 'Seguir sistema' },
};

export const ThemeToggle = forwardRef<HTMLDivElement, ThemeToggleProps>(({ collapsed = false, variant = 'full' }, ref) => {
  const { theme, setTheme, cycleTheme, resolvedTheme } = useTheme();

  const Icon = themeConfig[theme].icon;
  const label = themeConfig[theme].label;

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative w-9 h-9 rounded-xl">
            <span className="sr-only">Alterar tema</span>
            <Icon className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {(['light', 'dark', 'system'] as Theme[]).map((t) => {
            const config = themeConfig[t];
            const ItemIcon = config.icon;
            const isActive = theme === t;

            return (
              <DropdownMenuItem
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  isActive && "bg-primary/10 text-primary"
                )}
              >
                <ItemIcon className="w-4 h-4" />
                <span>{config.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTheme"
                    className="ml-auto w-2 h-2 rounded-full bg-primary"
                  />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'slider') {
    return (
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/50">
        {(['light', 'dark', 'system'] as Theme[]).map((t) => {
          const config = themeConfig[t];
          const ItemIcon = config.icon;
          const isActive = theme === t;
          
          return (
            <Tooltip key={t}>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => setTheme(t)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'relative p-2.5 rounded-lg transition-colors',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="themeSlider"
                      className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-lg"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <ItemIcon className="w-4 h-4 relative z-10" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {config.description}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  if (variant === 'icon' || collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleTheme}
              className="relative w-9 h-9 rounded-xl bg-muted/50 hover:bg-muted overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ y: 20, opacity: 0, rotate: -90 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: -20, opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Icon className="w-4 h-4 text-foreground" />
                </motion.div>
              </AnimatePresence>
              
              {/* Ambient glow on theme change */}
              <motion.div
                key={`glow-${theme}`}
                initial={{ opacity: 0.8, scale: 1.5 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{ duration: 0.5 }}
                className={cn(
                  "absolute inset-0 rounded-xl",
                  resolvedTheme === 'dark' ? 'bg-info/20' : 'bg-warning/20'
                )}
              />
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right" className="border-border/50">
          <p>Tema: {label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full variant
  return (
    <motion.button
      onClick={cycleTheme}
      whileHover={{ x: 4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group text-muted-foreground hover:text-foreground hover:bg-accent/50"
    >
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), transparent)',
        }}
      />

      <div className="relative w-5 h-5 flex-shrink-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Icon className="w-5 h-5" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center flex-1 overflow-hidden relative z-10">
        <span className="flex-1 text-left text-sm font-medium whitespace-nowrap">
          Tema
        </span>
        <motion.span
          key={theme}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs px-2 py-1 rounded-lg bg-muted/50 text-foreground font-medium capitalize"
        >
          {label}
        </motion.span>
      </div>
    </motion.button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

// Compact animated toggle
export function ThemeToggleCompact() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <motion.div 
      className="flex items-center gap-1 p-1 bg-muted/50 rounded-full border border-border/50"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {(['light', 'dark'] as Theme[]).map((t) => {
        const ItemIcon = t === 'light' ? Sun : Moon;
        const isActive = theme === t || (theme === 'system' && resolvedTheme === t);

        return (
          <motion.button
            key={t}
            onClick={() => setTheme(t)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'relative p-2 rounded-full transition-all duration-300',
              isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="themeToggleCompact"
                className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <ItemIcon className="w-4 h-4 relative z-10" />
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// Floating theme indicator for feedback
export function ThemeChangeIndicator() {
  const { theme, resolvedTheme } = useTheme();
  const [showIndicator, setShowIndicator] = useState(false);
  const [prevTheme, setPrevTheme] = useState(theme);

  useEffect(() => {
    if (theme !== prevTheme) {
      setShowIndicator(true);
      setPrevTheme(theme);
      
      const timeout = setTimeout(() => {
        setShowIndicator(false);
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [theme, prevTheme]);

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full shadow-xl backdrop-blur-xl border",
            resolvedTheme === 'dark' 
              ? 'bg-card/90 border-slate-700 text-primary-foreground' 
              : 'bg-background/90 border-slate-200 text-slate-900'
          )}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              {resolvedTheme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </motion.div>
            <span className="text-sm font-medium">
              Tema {themeConfig[theme].label}
            </span>
            <Sparkles className="w-3 h-3 text-primary" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}