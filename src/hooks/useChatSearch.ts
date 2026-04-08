import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Message } from '@/types/chat';

export type SearchFilter = 'all' | 'text' | 'image' | 'video' | 'audio' | 'document' | 'link';

const URL_REGEX = /https?:\/\/\S+/i;

/** Normalize text for accent-insensitive search */
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

interface UseChatSearchOptions {
  messages: Message[];
  isOpen: boolean;
  onHighlightChange: (messageIds: Set<string>, activeId: string | null) => void;
  onNavigateToMessage: (messageId: string) => void;
  onSearchQueryChange?: (query: string) => void;
}

export function useChatSearch({
  messages,
  isOpen,
  onHighlightChange,
  onNavigateToMessage,
  onSearchQueryChange,
}: UseChatSearchOptions) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Stable refs for callbacks
  const onHighlightChangeRef = useRef(onHighlightChange);
  const onNavigateToMessageRef = useRef(onNavigateToMessage);
  onHighlightChangeRef.current = onHighlightChange;
  onNavigateToMessageRef.current = onNavigateToMessage;

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setFilter('all');
      setActiveIndex(0);
      onHighlightChangeRef.current(new Set(), null);
      onSearchQueryChange?.('');
    }
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
      if (msg.is_deleted) return false;

      if (filter === 'link') {
        if (!URL_REGEX.test(msg.content || '')) return false;
      } else if (filter !== 'all') {
        if (msg.type !== filter) return false;
      }

      if (!debouncedQuery.trim()) return filter !== 'all';

      const q = normalizeText(debouncedQuery);
      const searchable = normalizeText(
        [msg.content, msg.transcription, msg.mediaUrl, msg.senderName].filter(Boolean).join(' ')
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
      return normalizeText(
        [msg.content, msg.transcription, msg.mediaUrl, msg.senderName].filter(Boolean).join(' ')
      ).includes(q);
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

  // Update highlights
  useEffect(() => {
    const ids = new Set(results.map((r) => r.id));
    const activeId = results[activeIndex]?.id || null;
    onHighlightChangeRef.current(ids, activeId);
    if (activeId) onNavigateToMessageRef.current(activeId);
  }, [results, activeIndex]);

  // Reset active index on criteria change
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

  return {
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
  };
}
