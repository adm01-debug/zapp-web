import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
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

type SearchFilter = 'all' | 'text' | 'image' | 'video' | 'audio' | 'document' | 'link';

interface ChatSearchBarProps {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
  onHighlightChange: (messageIds: Set<string>, activeId: string | null) => void;
  onSearchQueryChange?: (query: string) => void;
}

const URL_REGEX = /https?:\/\/\S+/i;

const FILTERS: { key: SearchFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'Todos', icon: <Search className="w-3 h-3" /> },
  { key: 'text', label: 'Textos', icon: <FileText className="w-3 h-3" /> },
  { key: 'image', label: 'Imagens', icon: <Image className="w-3 h-3" /> },
  { key: 'video', label: 'Vídeos', icon: <Video className="w-3 h-3" /> },
  { key: 'audio', label: 'Áudios', icon: <Music className="w-3 h-3" /> },
  { key: 'document', label: 'Documentos', icon: <File className="w-3 h-3" /> },
  { key: 'link', label: 'Links', icon: <Link2 className="w-3 h-3" /> },
];

/** Normalize text for accent-insensitive search */
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function ChatSearchBar({
  messages,
  isOpen,
  onClose,
  onNavigateToMessage,
  onHighlightChange,
  onSearchQueryChange,
}: ChatSearchBarProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Stable refs for callbacks to avoid useEffect dep issues
  const onHighlightChangeRef = useRef(onHighlightChange);
  const onNavigateToMessageRef = useRef(onNavigateToMessage);
  onHighlightChangeRef.current = onHighlightChange;
  onNavigateToMessageRef.current = onNavigateToMessage;

  // Focus input on open, reset state on close
  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    if (isOpen) {
      focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setDebouncedQuery('');
      setFilter('all');
      setActiveIndex(0);
      onHighlightChangeRef.current(new Set(), null);
      onSearchQueryChange?.('');
    }
    return () => { if (focusTimer) clearTimeout(focusTimer); };
  }, [isOpen]);

  // Debounce query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      onSearchQueryChange?.(query);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Search logic — excludes deleted messages, accent-insensitive
  const results = useMemo(() => {
    if (!debouncedQuery.trim() && filter === 'all') return [];

    return messages.filter((msg) => {
      // Skip deleted messages
      if (msg.is_deleted) return false;

      // Filter by type
      if (filter === 'link') {
        if (!URL_REGEX.test(msg.content || '')) return false;
      } else if (filter !== 'all') {
        if (msg.type !== filter) return false;
      }

      // If no query, show all of the filtered type
      if (!debouncedQuery.trim()) return filter !== 'all';

      const q = normalizeText(debouncedQuery);
      const searchable = normalizeText(
        [msg.content, msg.transcription, msg.mediaUrl].filter(Boolean).join(' ')
      );

      return searchable.includes(q);
    });
  }, [messages, debouncedQuery, filter]);

  // Compute counts per filter type for chips
  const filterCounts = useMemo(() => {
    const activeMessages = messages.filter((m) => !m.is_deleted);
    const matchesQuery = (msg: Message) => {
      if (!debouncedQuery.trim()) return true;
      const q = normalizeText(debouncedQuery);
      return normalizeText([msg.content, msg.transcription, msg.mediaUrl].filter(Boolean).join(' ')).includes(q);
    };

    const counts: Record<SearchFilter, number> = {
      all: 0, text: 0, image: 0, video: 0, audio: 0, document: 0, link: 0,
    };

    for (const msg of activeMessages) {
      if (!matchesQuery(msg)) continue;
      counts.all++;
      if (msg.type === 'text') counts.text++;
      if (msg.type === 'image') counts.image++;
      if (msg.type === 'video') counts.video++;
      if (msg.type === 'audio') counts.audio++;
      if (msg.type === 'document') counts.document++;
      if (URL_REGEX.test(msg.content || '')) counts.link++;
    }
    return counts;
  }, [messages, debouncedQuery]);

  // Update highlights when results or activeIndex change
  useEffect(() => {
    const ids = new Set(results.map((r) => r.id));
    const activeId = results[activeIndex]?.id || null;
    onHighlightChangeRef.current(ids, activeId);
    if (activeId) onNavigateToMessageRef.current(activeId);
  }, [results, activeIndex]);

  // Reset active index when search criteria change
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, filter]);

  const navigateUp = useCallback(() => {
    if (results.length === 0) return;
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
  }, [results.length]);

  const navigateDown = useCallback(() => {
    if (results.length === 0) return;
    setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
  }, [results.length]);

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
          <div className="px-2 md:px-3 py-2 space-y-1.5 md:space-y-2">
            {/* Search input row */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar na conversa..."
                className="h-8 text-sm border-none bg-transparent shadow-none focus-visible:ring-0 px-0 min-w-0"
              />

              {/* Result counter */}
              {(debouncedQuery.trim() || filter !== 'all') && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {results.length > 0
                    ? `${activeIndex + 1} de ${results.length}`
                    : 'Nenhum resultado'}
                </span>
              )}

              {/* Navigate arrows */}
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 md:w-7 md:h-7 touch-manipulation"
                  onClick={navigateUp}
                  disabled={results.length === 0}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 md:w-7 md:h-7 touch-manipulation"
                  onClick={navigateDown}
                  disabled={results.length === 0}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 md:w-7 md:h-7 shrink-0 touch-manipulation"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {FILTERS.map((f) => (
                <Badge
                  key={f.key}
                  variant={filter === f.key ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer whitespace-nowrap text-[10px] px-2 py-0.5 gap-1 transition-colors shrink-0',
                    filter === f.key
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setFilter(f.key)}
                >
                  {f.icon}
                  {f.label}
                  {(debouncedQuery.trim() || f.key !== 'all') && filterCounts[f.key] > 0 && (
                    <span className="ml-0.5 text-[9px] opacity-70">{filterCounts[f.key]}</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
