import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { HighlightedText } from './HighlightedText';
import { format } from 'date-fns';
import { useChatSearch, SearchFilter } from '@/hooks/useChatSearch';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  FileText,
  Image,
  Video,
  Music,
  File,
  Link2,
} from 'lucide-react';

interface ChatSearchBarProps {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
  onHighlightChange: (messageIds: Set<string>, activeId: string | null) => void;
  onSearchQueryChange?: (query: string) => void;
}

const FILTERS: { key: SearchFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'Todos', icon: <Search className="w-3.5 h-3.5" /> },
  { key: 'text', label: 'Textos', icon: <FileText className="w-3.5 h-3.5" /> },
  { key: 'image', label: 'Imagens', icon: <Image className="w-3.5 h-3.5" /> },
  { key: 'video', label: 'Vídeos', icon: <Video className="w-3.5 h-3.5" /> },
  { key: 'audio', label: 'Áudios', icon: <Music className="w-3.5 h-3.5" /> },
  { key: 'document', label: 'Documentos', icon: <File className="w-3.5 h-3.5" /> },
  { key: 'link', label: 'Links', icon: <Link2 className="w-3.5 h-3.5" /> },
];

const TYPE_ICON_MAP: Record<string, typeof FileText> = {
  image: Image,
  video: Video,
  audio: Music,
  document: File,
};

export function ChatSearchBar({
  messages,
  isOpen,
  onClose,
  onNavigateToMessage,
  onHighlightChange,
  onSearchQueryChange,
}: ChatSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewListRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    filter,
    setFilter,
    activeIndex,
    setActiveIndex,
    debouncedQuery,
    results,
    filterCounts,
    navigateUp,
    navigateDown,
  } = useChatSearch({
    messages,
    isOpen,
    onHighlightChange,
    onNavigateToMessage,
    onSearchQueryChange,
  });

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!previewListRef.current || results.length === 0) return;
    const clampedIdx = Math.min(activeIndex, Math.min(results.length, 5) - 1);
    if (clampedIdx < 0) return;
    const activeEl = previewListRef.current.children[clampedIdx] as HTMLElement | undefined;
    activeEl?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex, results.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) { e.preventDefault(); navigateUp(); }
    if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); navigateDown(); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden border-b border-border/50 bg-background shrink-0"
        >
          <div className="px-3 md:px-4 py-3 space-y-2.5" role="search" aria-label="Buscar na conversa">
            {/* Search input row */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0 flex items-center gap-2.5 bg-muted rounded-xl px-3.5 h-10 border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar na conversa..."
                  aria-label="Buscar mensagens"
                  aria-describedby="search-result-count"
                  className="h-full text-sm border-none bg-transparent shadow-none focus-visible:ring-0 px-0 min-w-0 placeholder:text-muted-foreground/60"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 rounded-full hover:bg-background transition-colors shrink-0"
                    aria-label="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {(debouncedQuery.trim() || filter !== 'all') && (
                  <span
                    id="search-result-count"
                    className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 tabular-nums font-medium"
                    aria-live="polite"
                  >
                    {results.length > 0 ? `${activeIndex + 1}/${results.length}` : '0'}
                  </span>
                )}
              </div>

              {/* Navigate arrows */}
              <div className="flex items-center shrink-0 bg-muted rounded-xl border border-border" role="group" aria-label="Navegar entre resultados">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-10 rounded-l-xl rounded-r-none hover:bg-accent touch-manipulation"
                  onClick={navigateUp}
                  disabled={results.length === 0}
                  aria-label="Resultado anterior"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <div className="w-px h-5 bg-border" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-10 rounded-r-xl rounded-l-none hover:bg-accent touch-manipulation"
                  onClick={navigateDown}
                  disabled={results.length === 0}
                  aria-label="Próximo resultado"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-10 rounded-xl shrink-0 touch-manipulation hover:bg-destructive/10 hover:text-destructive"
                onClick={onClose}
                aria-label="Fechar busca"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1" role="tablist" aria-label="Filtros de tipo de mensagem">
              {FILTERS.map((f) => {
                const isActive = filter === f.key;
                const count = filterCounts[f.key];
                const showCount = (debouncedQuery.trim() || f.key !== 'all') && count > 0;

                return (
                  <button
                    key={f.key}
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={0}
                    className={cn(
                      'inline-flex items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 shrink-0 select-none',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                        : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => setFilter(f.key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilter(f.key); } }}
                  >
                    {f.icon}
                    <span>{f.label}</span>
                    {showCount && (
                      <span className={cn(
                        "min-w-[18px] h-[18px] flex items-center justify-center rounded-md text-[10px] font-bold leading-none",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background text-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Empty state */}
            {(debouncedQuery.trim() || filter !== 'all') && results.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-3 py-2 text-muted-foreground bg-muted/50 rounded-lg"
              >
                <Search className="w-4 h-4 opacity-40" />
                <span className="text-xs">
                  {debouncedQuery.trim()
                    ? `Nenhum resultado para "${debouncedQuery.trim().slice(0, 30)}${debouncedQuery.trim().length > 30 ? '…' : ''}"`
                    : `Nenhuma mensagem do tipo "${FILTERS.find(f => f.key === filter)?.label}"`}
                </span>
              </motion.div>
            )}

            {/* Results preview */}
            {debouncedQuery.trim() && results.length > 0 && (
              <div ref={previewListRef} className="max-h-[140px] overflow-y-auto scrollbar-thin space-y-0.5 rounded-lg bg-muted/30 p-1">
                {results.slice(0, 5).map((msg, idx) => {
                  const snippet = (msg.content || msg.transcription || msg.mediaUrl || '').slice(0, 80);
                  const TypeIcon = TYPE_ICON_MAP[msg.type] || FileText;
                  const isActive = activeIndex === idx;
                  return (
                    <motion.button
                      key={msg.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => {
                        setActiveIndex(idx);
                        onNavigateToMessage(msg.id);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all duration-150 text-xs',
                        isActive
                          ? 'bg-primary/15 text-foreground ring-1 ring-primary/20'
                          : 'hover:bg-muted text-muted-foreground'
                      )}
                    >
                      <TypeIcon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "opacity-50")} />
                      <span className="text-[10px] text-muted-foreground shrink-0 w-10 tabular-nums">
                        {format(msg.timestamp, 'HH:mm')}
                      </span>
                      <span className="truncate flex-1">
                        <HighlightedText text={snippet} query={debouncedQuery} />
                        {(msg.content || '').length > 80 && '…'}
                      </span>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-md shrink-0 font-medium",
                        msg.sender === 'agent'
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {msg.sender === 'agent' ? 'Você' : 'Contato'}
                      </span>
                    </motion.button>
                  );
                })}
                {results.length > 5 && (
                  <span className="text-[10px] text-muted-foreground px-2.5 py-1 block">
                    +{results.length - 5} resultados — use ↑↓ para navegar
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
