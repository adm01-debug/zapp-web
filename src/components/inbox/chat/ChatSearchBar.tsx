import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  { key: 'all', label: 'Todos', icon: <Search className="w-3 h-3" /> },
  { key: 'text', label: 'Textos', icon: <FileText className="w-3 h-3" /> },
  { key: 'image', label: 'Imagens', icon: <Image className="w-3 h-3" /> },
  { key: 'video', label: 'Vídeos', icon: <Video className="w-3 h-3" /> },
  { key: 'audio', label: 'Áudios', icon: <Music className="w-3 h-3" /> },
  { key: 'document', label: 'Documentos', icon: <File className="w-3 h-3" /> },
  { key: 'link', label: 'Links', icon: <Link2 className="w-3 h-3" /> },
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

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-scroll preview list to active item
  useEffect(() => {
    if (!previewListRef.current || activeIndex < 0 || activeIndex >= 5) return;
    const activeEl = previewListRef.current.children[activeIndex] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

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
          className="overflow-hidden border-b border-border bg-card shrink-0"
        >
          <div className="px-2 md:px-3 py-2 space-y-1.5 md:space-y-2" role="search" aria-label="Buscar na conversa">
            {/* Search input row */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar na conversa..."
                aria-label="Buscar mensagens"
                aria-describedby="search-result-count"
                className="h-8 text-sm border-none bg-transparent shadow-none focus-visible:ring-0 px-0 min-w-0"
              />

              {/* Result counter */}
              {(debouncedQuery.trim() || filter !== 'all') && (
                <span id="search-result-count" className="text-xs text-muted-foreground whitespace-nowrap" aria-live="polite">
                  {results.length > 0
                    ? `${activeIndex + 1} de ${results.length}`
                    : 'Nenhum resultado'}
                </span>
              )}

              {/* Navigate arrows */}
              <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Navegar entre resultados">
                <Button variant="ghost" size="icon" className="w-8 h-8 md:w-7 md:h-7 touch-manipulation" onClick={navigateUp} disabled={results.length === 0} aria-label="Resultado anterior">
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 md:w-7 md:h-7 touch-manipulation" onClick={navigateDown} disabled={results.length === 0} aria-label="Próximo resultado">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              <Button variant="ghost" size="icon" className="w-8 h-8 md:w-7 md:h-7 shrink-0 touch-manipulation" onClick={onClose} aria-label="Fechar busca">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5" role="tablist" aria-label="Filtros de tipo de mensagem">
              {FILTERS.map((f) => (
                <Badge
                  key={f.key}
                  role="tab"
                  aria-selected={filter === f.key}
                  tabIndex={0}
                  variant={filter === f.key ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer whitespace-nowrap text-[10px] px-2 py-0.5 gap-1 transition-colors shrink-0',
                    filter === f.key
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setFilter(f.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilter(f.key); } }}
                >
                  {f.icon}
                  {f.label}
                  {(debouncedQuery.trim() || f.key !== 'all') && filterCounts[f.key] > 0 && (
                    <span className="ml-0.5 text-[9px] opacity-70">{filterCounts[f.key]}</span>
                  )}
                </Badge>
              ))}
            </div>

            {/* Empty state */}
            {(debouncedQuery.trim() || filter !== 'all') && results.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground"
              >
                <Search className="w-3.5 h-3.5 opacity-50" />
                <span className="text-xs">
                  {debouncedQuery.trim()
                    ? `Nenhum resultado para "${debouncedQuery.trim().slice(0, 30)}${debouncedQuery.trim().length > 30 ? '…' : ''}"`
                    : `Nenhuma mensagem do tipo "${FILTERS.find(f => f.key === filter)?.label}"`}
                </span>
              </motion.div>
            )}

            {/* Results preview */}
            {debouncedQuery.trim() && results.length > 0 && (
              <div ref={previewListRef} className="max-h-[120px] overflow-y-auto scrollbar-thin space-y-0.5">
                {results.slice(0, 5).map((msg, idx) => {
                  const snippet = (msg.content || msg.transcription || msg.mediaUrl || '').slice(0, 80);
                  const TypeIcon = TYPE_ICON_MAP[msg.type] || FileText;
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
                        'w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left transition-colors text-xs',
                        activeIndex === idx
                          ? 'bg-primary/10 text-foreground'
                          : 'hover:bg-muted/60 text-muted-foreground'
                      )}
                    >
                      <TypeIcon className="w-3 h-3 shrink-0 opacity-50" />
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 w-10">
                        {format(msg.timestamp, 'HH:mm')}
                      </span>
                      <span className="truncate flex-1">
                        <HighlightedText text={snippet} query={debouncedQuery} />
                        {(msg.content || '').length > 80 && '…'}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                        {msg.sender === 'agent' ? 'Você' : 'Contato'}
                      </Badge>
                    </motion.button>
                  );
                })}
                {results.length > 5 && (
                  <span className="text-[10px] text-muted-foreground/60 px-2 block">
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
