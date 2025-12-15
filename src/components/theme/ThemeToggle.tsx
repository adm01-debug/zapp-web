import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  collapsed?: boolean;
  variant?: 'icon' | 'full' | 'slider';
}

export function ThemeToggle({ collapsed = false, variant = 'full' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (newTheme: Theme) => {
      root.classList.remove('light', 'dark');
      
      if (newTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(newTheme);
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const cycleTheme = () => {
    setTheme((current) => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'system':
        return Monitor;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Claro';
      case 'dark':
        return 'Escuro';
      case 'system':
        return 'Sistema';
    }
  };

  const Icon = getIcon();

  if (variant === 'slider') {
    return (
      <div className="flex items-center gap-2 p-1 glass-soft rounded-xl">
        {(['light', 'dark', 'system'] as Theme[]).map((t) => {
          const ItemIcon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
          const isActive = theme === t;
          
          return (
            <motion.button
              key={t}
              onClick={() => setTheme(t)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'relative p-2 rounded-lg transition-colors',
                isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="themeSlider"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'var(--gradient-primary)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <ItemIcon className="w-4 h-4 relative z-10" />
            </motion.button>
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
              className="relative w-9 h-9 rounded-xl glass-soft hover:bg-accent/50 overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ y: 20, opacity: 0, rotate: -90 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: -20, opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Icon className="w-4 h-4 text-foreground" />
                </motion.div>
              </AnimatePresence>
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right" className="glass border-border/50">
          <p>Tema: {getLabel()}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

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
          className="text-xs px-2 py-1 rounded-lg glass-soft text-foreground font-medium capitalize"
        >
          {getLabel()}
        </motion.span>
      </div>
    </motion.button>
  );
}

// Compact version for headers
export function ThemeToggleCompact() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <motion.div 
      className="flex items-center gap-1 p-1 glass-soft rounded-full"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {(['light', 'dark'] as Theme[]).map((t) => {
        const ItemIcon = t === 'light' ? Sun : Moon;
        const isActive = theme === t;

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
                className="absolute inset-0 rounded-full shadow-lg"
                style={{ background: 'var(--gradient-primary)' }}
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