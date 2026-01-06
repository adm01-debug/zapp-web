import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  Clock,
  MessageSquare,
  Users,
  Tag,
  FileText,
  Zap,
  ArrowRight,
  Command,
  Hash,
  Star,
  Sparkles,
  Filter,
  Calendar,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import {
  Dialog,
  DialogContent,
} from './dialog';

// =============================================================================
// TIPOS
// =============================================================================

type SearchResultType = 'conversation' | 'contact' | 'message' | 'tag' | 'action' | 'file';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  timestamp?: Date;
  highlight?: string;
  metadata?: Record<string, any>;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
}

interface SearchCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

// =============================================================================
// UNIFIED COMMAND SEARCH
// =============================================================================

interface UnifiedSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string) => Promise<SearchResult[]>;
  onSelect?: (result: SearchResult) => void;
  quickActions?: QuickAction[];
  recentSearches?: string[];
  placeholder?: string;
  className?: string;
}

export function UnifiedSearch({
  isOpen,
  onClose,
  onSearch,
  onSelect,
  quickActions = [],
  recentSearches = [],
  placeholder = 'Buscar conversas, contatos, mensagens...',
  className,
}: UnifiedSearchProps) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input on open
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search debounce
  React.useEffect(() => {
    if (!query || !onSearch) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await onSearch(query);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const totalItems = results.length || quickActions.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case 'Enter':
          e.preventDefault();
          if (results.length > 0 && results[selectedIndex]) {
            onSelect?.(results[selectedIndex]);
            onClose();
          } else if (quickActions.length > 0 && quickActions[selectedIndex]) {
            quickActions[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, quickActions, selectedIndex, onSelect, onClose]);

  const typeIcons: Record<SearchResultType, React.ElementType> = {
    conversation: MessageSquare,
    contact: Users,
    message: MessageSquare,
    tag: Tag,
    action: Zap,
    file: FileText,
  };

  const typeColors: Record<SearchResultType, string> = {
    conversation: 'bg-secondary/10 text-secondary',
    contact: 'bg-primary/10 text-primary',
    message: 'bg-muted text-muted-foreground',
    tag: 'bg-yellow-500/10 text-yellow-500',
    action: 'bg-green-500/10 text-green-500',
    file: 'bg-blue-500/10 text-blue-500',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-2xl p-0 overflow-hidden', className)}>
        {/* Search header */}
        <div className="border-b border-border">
          {/* Shortcuts hint */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Command className="w-3 h-3" />
              <span>Dica:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">#</kbd>
              <span>para tags</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">@</kbd>
              <span>para contatos</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">↑↓</kbd>
              <span>navegar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Enter</kbd>
              <span>selecionar</span>
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className={cn(
                'w-full h-14 pl-12 pr-20 text-lg bg-transparent',
                'border-none outline-none focus:ring-0',
                'placeholder:text-muted-foreground/60'
              )}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-2">
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <motion.div
                  className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            )}

            {/* No query state */}
            {!query && !isLoading && (
              <>
                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Buscas recentes
                    </div>
                    <div className="space-y-1">
                      {recentSearches.slice(0, 5).map((search, i) => (
                        <motion.button
                          key={search}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setQuery(search)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{search}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                {quickActions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                      <Zap className="w-3 h-3" />
                      Ações rápidas
                    </div>
                    <div className="space-y-1">
                      {quickActions.map((action, i) => (
                        <motion.button
                          key={action.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => {
                            action.action();
                            onClose();
                          }}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left',
                            selectedIndex === i ? 'bg-primary/10' : 'hover:bg-muted'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md bg-primary/10">
                              <action.icon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-sm">{action.label}</span>
                          </div>
                          {action.shortcut && (
                            <kbd className="px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground">
                              {action.shortcut}
                            </kbd>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Search results */}
            {query && !isLoading && results.length > 0 && (
              <div className="space-y-1">
                {results.map((result, i) => {
                  const Icon = result.icon || typeIcons[result.type];
                  return (
                    <motion.button
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => {
                        onSelect?.(result);
                        onClose();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                        selectedIndex === i ? 'bg-primary/10' : 'hover:bg-muted'
                      )}
                    >
                      <div className={cn('p-2 rounded-lg', typeColors[result.type])}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {result.title}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {result.type}
                          </Badge>
                        </div>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {query && !isLoading && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground mb-1">
                  Nenhum resultado para "{query}"
                </p>
                <p className="text-sm text-muted-foreground">
                  Tente termos diferentes ou verifique a ortografia
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by IA
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <kbd className="mr-2 px-1.5 py-0.5 rounded bg-muted text-[10px]">Esc</kbd>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// SEARCH INPUT INLINE (para uso em páginas)
// =============================================================================

interface SearchInputInlineProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: () => void;
  onClear?: () => void;
  isLoading?: boolean;
  suggestions?: string[];
  className?: string;
}

export function SearchInputInline({
  value,
  onChange,
  placeholder = 'Buscar...',
  onSearch,
  onClear,
  isLoading,
  suggestions = [],
  className,
}: SearchInputInlineProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
          className="pl-10 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <motion.div
              className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                onChange('');
                onClear?.();
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 p-1 bg-card border border-border rounded-lg shadow-lg z-50"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  onChange(suggestion);
                  onSearch?.();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md hover:bg-muted transition-colors"
              >
                <Search className="w-3 h-3 text-muted-foreground" />
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export const SearchComponents = {
  Unified: UnifiedSearch,
  Inline: SearchInputInline,
};
