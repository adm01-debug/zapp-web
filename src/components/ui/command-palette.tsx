import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command as CommandPrimitive } from 'cmdk';
import {
  Search,
  Command,
  ArrowRight,
  Hash,
  Clock,
  Star,
  X,
  Loader2,
  MessageSquare,
  Users,
  LayoutDashboard,
  Settings,
  Zap,
  Plus,
  Inbox,
  Phone,
  Tag,
  FileText,
  Mic,
  Shield,
  BarChart3,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from './dialog';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { useDebounce } from '@/hooks/useDebounce';

// Types
type CommandCategory = 'navigation' | 'action' | 'search' | 'recent';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  category: CommandCategory;
  keywords?: string[];
  shortcut?: string[];
  action?: () => void;
  href?: string;
  badge?: string;
  disabled?: boolean;
}

interface CommandGroup {
  title: string;
  items: CommandItem[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (view: string) => void;
  onSearch?: (query: string) => Promise<CommandItem[]>;
  placeholder?: string;
  recentSearches?: string[];
  onRecentSearchSelect?: (query: string) => void;
  onClearRecent?: () => void;
  customCommands?: CommandItem[];
}

// Fuzzy search helper
function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let queryIndex = 0;
  
  for (let i = 0; i < text.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      if (i > lastIndex) {
        result.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, i)}</span>);
      }
      result.push(
        <span key={`match-${i}`} className="text-primary font-semibold">
          {text[i]}
        </span>
      );
      lastIndex = i + 1;
      queryIndex++;
    }
  }
  
  if (lastIndex < text.length) {
    result.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }
  
  return result;
}

// Default navigation commands
const defaultNavigationCommands: CommandItem[] = [
  {
    id: 'nav-inbox',
    title: 'Inbox',
    description: 'Ver caixa de entrada',
    icon: <Inbox className="h-4 w-4" />,
    category: 'navigation',
    keywords: ['caixa', 'entrada', 'mensagens', 'chat'],
    shortcut: ['g', 'i'],
  },
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    description: 'Ver métricas e estatísticas',
    icon: <LayoutDashboard className="h-4 w-4" />,
    category: 'navigation',
    keywords: ['métricas', 'estatísticas', 'gráficos', 'painel'],
    shortcut: ['g', 'd'],
  },
  {
    id: 'nav-contacts',
    title: 'Contatos',
    description: 'Gerenciar contatos',
    icon: <Users className="h-4 w-4" />,
    category: 'navigation',
    keywords: ['clientes', 'pessoas', 'leads'],
    shortcut: ['g', 'c'],
  },
  {
    id: 'nav-agents',
    title: 'Atendentes',
    description: 'Ver equipe de atendimento',
    icon: <Phone className="h-4 w-4" />,
    category: 'navigation',
    keywords: ['equipe', 'time', 'operadores'],
    shortcut: ['g', 'a'],
  },
  {
    id: 'nav-queues',
    title: 'Filas',
    description: 'Gerenciar filas de atendimento',
    icon: <Zap className="h-4 w-4" />,
    category: 'navigation',
    keywords: ['queue', 'fila', 'distribuição'],
    shortcut: ['g', 'q'],
  },
  {
    id: 'nav-tags',
    title: 'Etiquetas',
    description: 'Gerenciar tags',
    icon: <Tag className="h-4 w-4" />,
    category: 'navigation',
    keywords: ['labels', 'categorias'],
  },
  {
    id: 'nav-reports',
    title: 'Relatórios',
    description: 'Ver relatórios avançados',
    icon: <BarChart3 className="h-4 w-4" />,
    category: 'navigation',
    keywords: ['analytics', 'dados', 'exportar'],
    shortcut: ['g', 'r'],
  },
  {
    id: 'nav-security',
    title: 'Segurança',
    description: 'Configurações de segurança',
    icon: <Shield className="h-4 w-4" />,
    category: 'navigation',
    keywords: ['senha', 'mfa', '2fa', 'proteção'],
  },
  {
    id: 'nav-settings',
    title: 'Configurações',
    description: 'Ajustar preferências',
    icon: <Settings className="h-4 w-4" />,
    category: 'navigation',
    keywords: ['preferências', 'ajustes', 'config'],
    shortcut: ['g', 's'],
  },
];

// Default action commands
const defaultActionCommands: CommandItem[] = [
  {
    id: 'action-new-chat',
    title: 'Nova conversa',
    description: 'Iniciar uma nova conversa',
    icon: <Plus className="h-4 w-4" />,
    category: 'action',
    keywords: ['criar', 'iniciar', 'novo'],
    shortcut: ['n'],
  },
  {
    id: 'action-quick-reply',
    title: 'Respostas rápidas',
    description: 'Acessar templates de resposta',
    icon: <Zap className="h-4 w-4" />,
    category: 'action',
    keywords: ['template', 'atalho', 'rápida'],
  },
  {
    id: 'action-keyboard',
    title: 'Atalhos de teclado',
    description: 'Ver todos os atalhos',
    icon: <Keyboard className="h-4 w-4" />,
    category: 'action',
    keywords: ['shortcuts', 'teclas'],
    shortcut: ['?'],
  },
];

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onSearch,
  placeholder = 'Buscar ou digitar comando...',
  recentSearches = [],
  onRecentSearchSelect,
  onClearRecent,
  customCommands = [],
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // All commands combined
  const allCommands = React.useMemo(() => [
    ...defaultNavigationCommands,
    ...defaultActionCommands,
    ...customCommands,
  ], [customCommands]);

  // Filter commands based on query
  const filteredCommands = React.useMemo(() => {
    if (!query) return [];
    
    return allCommands.filter((cmd) => {
      const searchText = `${cmd.title} ${cmd.description || ''} ${cmd.keywords?.join(' ') || ''}`;
      return fuzzyMatch(searchText, query);
    }).slice(0, 10);
  }, [query, allCommands]);

  // Group commands
  const groupedCommands = React.useMemo((): CommandGroup[] => {
    const groups: Record<string, CommandItem[]> = {};
    
    const itemsToGroup = query ? [...filteredCommands, ...searchResults] : [];
    
    itemsToGroup.forEach((item) => {
      const category = item.category;
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });

    const result: CommandGroup[] = [];
    
    if (groups.action?.length) {
      result.push({ title: 'Ações', items: groups.action });
    }
    if (groups.navigation?.length) {
      result.push({ title: 'Navegação', items: groups.navigation });
    }
    if (groups.search?.length) {
      result.push({ title: 'Resultados', items: groups.search });
    }

    return result;
  }, [query, filteredCommands, searchResults]);

  // Total items for keyboard navigation
  const allItems = React.useMemo(() => 
    groupedCommands.flatMap(g => g.items),
    [groupedCommands]
  );

  // Debounced search
  const debouncedSearch = useDebounce(async (searchQuery: string) => {
    if (!onSearch || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  // Handle query change
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);
    debouncedSearch(value);
  };

  // Execute command
  const executeCommand = (item: CommandItem) => {
    if (item.disabled) return;

    if (item.action) {
      item.action();
    } else if (item.href) {
      window.location.href = item.href;
    } else if (item.id.startsWith('nav-')) {
      const view = item.id.replace('nav-', '');
      onNavigate?.(view);
    }

    onOpenChange(false);
    setQuery('');
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(allItems.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(allItems.length, 1));
      } else if (e.key === 'Enter' && allItems[selectedIndex]) {
        e.preventDefault();
        executeCommand(allItems[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, allItems, selectedIndex]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setSearchResults([]);
      setSelectedIndex(0);
    } else {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const categoryIcons: Record<CommandCategory, React.ReactNode> = {
    navigation: <ArrowRight className="h-3 w-3" />,
    action: <Zap className="h-3 w-3" />,
    search: <Search className="h-3 w-3" />,
    recent: <Clock className="h-3 w-3" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-4 text-base bg-transparent border-0 outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => handleQueryChange('')}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {isSearching && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin ml-2" />
          )}
        </div>

        {/* Keyboard Hint */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 text-xs text-muted-foreground border-b border-border">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Enter</kbd>
              selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Esc</kbd>
              fechar
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">K</kbd>
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          {/* Empty State - Show default commands */}
          {!query && (
            <div className="p-2">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Buscas recentes
                    </span>
                    {onClearRecent && (
                      <button
                        onClick={onClearRecent}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.slice(0, 5).map((search, idx) => (
                      <button
                        key={search}
                        onClick={() => {
                          onRecentSearchSelect?.(search);
                          handleQueryChange(search);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Navigation */}
              <div>
                <div className="px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Star className="h-3 w-3" />
                    Acesso rápido
                  </span>
                </div>
                <div className="space-y-0.5">
                  {defaultNavigationCommands.slice(0, 5).map((cmd, idx) => (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left group',
                        idx === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                          {cmd.icon}
                        </span>
                        <div>
                          <span className="text-sm font-medium">{cmd.title}</span>
                          {cmd.description && (
                            <p className="text-xs text-muted-foreground">{cmd.description}</p>
                          )}
                        </div>
                      </div>
                      {cmd.shortcut && (
                        <div className="flex gap-1">
                          {cmd.shortcut.map((key, i) => (
                            <kbd
                              key={i}
                              className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono text-muted-foreground"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && (
            <div className="p-2">
              {groupedCommands.length === 0 && !isSearching && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum resultado para "{query}"</p>
                  <p className="text-xs mt-1">Tente outros termos</p>
                </div>
              )}

              {groupedCommands.map((group) => (
                <div key={group.title} className="mb-2">
                  <div className="px-2 py-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {group.title}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item, idx) => {
                      const globalIndex = groupedCommands
                        .slice(0, groupedCommands.indexOf(group))
                        .reduce((acc, g) => acc + g.items.length, 0) + idx;

                      return (
                        <motion.button
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          onClick={() => executeCommand(item)}
                          disabled={item.disabled}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left group',
                            globalIndex === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50',
                            item.disabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'transition-colors',
                              item.category === 'action' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                            )}>
                              {item.icon || categoryIcons[item.category]}
                            </span>
                            <div>
                              <span className="text-sm font-medium">
                                {highlightMatch(item.title, query)}
                              </span>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.badge && (
                              <Badge variant="secondary" className="text-[10px]">
                                {item.badge}
                              </Badge>
                            )}
                            {item.shortcut && (
                              <div className="flex gap-1">
                                {item.shortcut.map((key, i) => (
                                  <kbd
                                    key={i}
                                    className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono text-muted-foreground"
                                  >
                                    {key}
                                  </kbd>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Hook for global command palette shortcut
export function useCommandPalette() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen };
}
