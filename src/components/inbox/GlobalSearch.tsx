import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { log } from '@/lib/logger';
import { 
  Search, X, MessageSquare, User, Calendar, Loader2, Mic, FileText, 
  Filter, Clock, History, Tag, Trash2, Command, Plus, UserPlus, 
  Send, Settings, LayoutDashboard, Inbox, Zap, ArrowRight,
  Image, Video, FileDown, Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, subDays, subMonths, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase, isExternalConfigured } from '@/integrations/supabase/externalClient';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchHistory } from '@/hooks/useSearchHistory';

interface SearchResult {
  id: string;
  type: 'message' | 'contact' | 'transcription' | 'action' | 'crm';
  title: string;
  preview: string;
  timestamp: Date;
  contactId?: string;
  contactName?: string;
  messageType?: string;
  tags?: string[];
  action?: () => void;
  crmPhone?: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

type ResultType = 'message' | 'contact' | 'transcription' | 'action' | 'crm';
type DateFilter = 'all' | 'today' | '7days' | '30days' | '90days';
type MediaTypeFilter = 'all' | 'text' | 'image' | 'video' | 'audio' | 'document' | 'link';

interface TagSuggestion {
  id: string;
  name: string;
  color: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResult: (result: SearchResult) => void;
}

export function GlobalSearch({ open, onOpenChange, onSelectResult }: GlobalSearchProps) {
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [allTags, setAllTags] = useState<TagSuggestion[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Filters
  const [activeTypes, setActiveTypes] = useState<Set<ResultType>>(new Set(['message', 'transcription', 'contact', 'action', 'crm']));
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');

  // History
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  // Quick actions - always available for power users
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'new-conversation',
      title: 'Nova conversa',
      description: 'Iniciar uma nova conversa',
      icon: <Plus className="h-4 w-4" />,
      action: () => {
        onOpenChange(false);
        // Trigger new conversation action - would integrate with parent
      },
      keywords: ['nova', 'novo', 'conversa', 'chat', 'iniciar', 'criar'],
    },
    {
      id: 'go-inbox',
      title: 'Ir para Inbox',
      description: 'Abrir caixa de entrada',
      icon: <Inbox className="h-4 w-4" />,
      action: () => {
        onOpenChange(false);
        window.location.hash = '#inbox';
      },
      keywords: ['inbox', 'caixa', 'entrada', 'mensagens'],
    },
    {
      id: 'go-dashboard',
      title: 'Ir para Dashboard',
      description: 'Ver métricas e estatísticas',
      icon: <LayoutDashboard className="h-4 w-4" />,
      action: () => {
        onOpenChange(false);
        window.location.hash = '#dashboard';
      },
      keywords: ['dashboard', 'métricas', 'estatísticas', 'painel'],
    },
    {
      id: 'go-settings',
      title: 'Configurações',
      description: 'Ajustar preferências do sistema',
      icon: <Settings className="h-4 w-4" />,
      action: () => {
        onOpenChange(false);
        window.location.hash = '#settings';
      },
      keywords: ['config', 'configurações', 'preferências', 'ajustes', 'settings'],
    },
    {
      id: 'quick-reply',
      title: 'Respostas rápidas',
      description: 'Gerenciar templates de resposta',
      icon: <Zap className="h-4 w-4" />,
      action: () => {
        onOpenChange(false);
        // Trigger quick replies manager
      },
      keywords: ['resposta', 'rápida', 'template', 'templates', 'atalho'],
    },
  ], [onOpenChange]);

  // Filter actions based on search
  const filteredActions = useMemo(() => {
    if (!search || search.startsWith('#')) return quickActions;
    
    const query = search.toLowerCase();
    return quickActions.filter((action) => 
      action.title.toLowerCase().includes(query) ||
      action.description.toLowerCase().includes(query) ||
      action.keywords.some((k) => k.includes(query))
    );
  }, [search, quickActions]);

  // Load tags on mount
  useEffect(() => {
    const loadTags = async () => {
      const { data } = await supabase.from('tags').select('id, name, color').order('name');
      if (data) setAllTags(data);
    };
    if (open) loadTags();
  }, [open]);

  // Filter tag suggestions based on input
  useEffect(() => {
    if (search.startsWith('#') || search.includes(' #')) {
      const tagQuery = search.includes(' #') 
        ? search.split(' #').pop()?.toLowerCase() || ''
        : search.slice(1).toLowerCase();
      
      const filtered = allTags.filter(
        (tag) => tag.name.toLowerCase().includes(tagQuery) && !selectedTags.includes(tag.id)
      ).slice(0, 5);
      setTagSuggestions(filtered);
    } else {
      setTagSuggestions([]);
    }
  }, [search, allTags, selectedTags]);

  const toggleType = (type: ResultType) => {
    const newTypes = new Set(activeTypes);
    if (newTypes.has(type)) {
      if (newTypes.size > 1) newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setActiveTypes(newTypes);
  };

  const getDateFilterStart = (filter: DateFilter): Date | null => {
    const now = new Date();
    switch (filter) {
      case 'today': return startOfDay(now);
      case '7days': return subDays(now, 7);
      case '30days': return subMonths(now, 1);
      case '90days': return subMonths(now, 3);
      default: return null;
    }
  };

  const performSearch = useCallback(async (query: string, types: Set<ResultType>, dateRange: DateFilter, tags: string[], mediaType: MediaTypeFilter = 'all') => {
    // Remove tag syntax from query
    const cleanQuery = query.replace(/#\w*/g, '').trim();
    
    // Allow search with empty query when media type filter is active
    if (cleanQuery.length < 2 && tags.length === 0 && mediaType === 'all') {
      setResults([]);
      return;
    }

    // For link searches, look for URLs in message content
    const isLinkSearch = mediaType === 'link';

    setIsLoading(true);
    const dateStart = getDateFilterStart(dateRange);
    
    try {
      const searchResults: SearchResult[] = [];
      const addedMessageIds = new Set<string>();

      // Search messages
      if (types.has('message') && (cleanQuery.length >= 2 || mediaType !== 'all')) {
        let textQuery = supabase
          .from('messages')
          .select(`id, content, message_type, created_at, contact_id, contacts:contact_id (id, name, surname)`)
          .order('created_at', { ascending: false })
          .limit(20);

        // Apply text search only if there's a query
        if (cleanQuery.length >= 2) {
          if (isLinkSearch) {
            // Search for URLs in content
            textQuery = textQuery.or(`content.ilike.%http://%,content.ilike.%https://%,content.ilike.%www.%`);
            if (cleanQuery.length >= 2) {
              textQuery = textQuery.ilike('content', `%${cleanQuery}%`);
            }
          } else {
            textQuery = textQuery.ilike('content', `%${cleanQuery}%`);
          }
        } else if (isLinkSearch) {
          textQuery = textQuery.or(`content.ilike.%http://%,content.ilike.%https://%,content.ilike.%www.%`);
        }

        // Apply media type filter
        if (mediaType !== 'all' && mediaType !== 'link') {
          textQuery = textQuery.eq('message_type', mediaType);
        }

        if (dateStart) textQuery = textQuery.gte('created_at', dateStart.toISOString());

        const { data: textMessages } = await textQuery;
        if (textMessages) {
          textMessages.forEach((msg) => {
            const contact = msg.contacts as { id: string; name: string; surname: string | null } | null;
            addedMessageIds.add(msg.id);
            searchResults.push({
              id: msg.id,
              type: 'message',
              title: contact ? `Conversa com ${contact.name}${contact.surname ? ` ${contact.surname}` : ''}` : 'Mensagem',
              preview: msg.content.length > 100 ? `${msg.content.substring(0, 100)}...` : msg.content,
              timestamp: new Date(msg.created_at),
              contactId: msg.contact_id || undefined,
              contactName: contact ? `${contact.name}${contact.surname ? ` ${contact.surname}` : ''}` : undefined,
              messageType: msg.message_type
            });
          });
        }
      }

      // Search transcriptions
      if (types.has('transcription') && cleanQuery.length >= 2) {
        let audioQuery = supabase
          .from('messages')
          .select(`id, content, transcription, message_type, created_at, contact_id, contacts:contact_id (id, name, surname)`)
          .not('transcription', 'is', null)
          .ilike('transcription', `%${cleanQuery}%`)
          .order('created_at', { ascending: false })
          .limit(15);

        if (dateStart) audioQuery = audioQuery.gte('created_at', dateStart.toISOString());

        const { data: audioMessages } = await audioQuery;
        if (audioMessages) {
          audioMessages.forEach((msg) => {
            if (addedMessageIds.has(msg.id)) return;
            const contact = msg.contacts as { id: string; name: string; surname: string | null } | null;
            const transcription = msg.transcription || '';
            searchResults.push({
              id: msg.id,
              type: 'transcription',
              title: contact ? `Áudio de ${contact.name}${contact.surname ? ` ${contact.surname}` : ''}` : 'Áudio transcrito',
              preview: transcription.length > 100 ? `${transcription.substring(0, 100)}...` : transcription,
              timestamp: new Date(msg.created_at),
              contactId: msg.contact_id || undefined,
              contactName: contact ? `${contact.name}${contact.surname ? ` ${contact.surname}` : ''}` : undefined,
              messageType: msg.message_type
            });
          });
        }
      }

      // Search contacts (including by tag)
      if (types.has('contact')) {
        let contactQuery = supabase.from('contacts').select('id, name, surname, phone, email, created_at, tags');
        
        if (cleanQuery.length >= 2) {
          contactQuery = contactQuery.or(`name.ilike.%${cleanQuery}%,surname.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`);
        }

        const { data: contacts } = await contactQuery.order('name', { ascending: true }).limit(10);
        
        if (contacts) {
          // Filter by selected tags if any
          let filteredContacts = contacts;
          if (tags.length > 0) {
            const selectedTagNames = allTags.filter(t => tags.includes(t.id)).map(t => t.name);
            filteredContacts = contacts.filter(c => 
              c.tags && c.tags.some((tag: string) => selectedTagNames.includes(tag))
            );
          }

          filteredContacts.forEach((contact) => {
            searchResults.push({
              id: contact.id,
              type: 'contact',
              title: `${contact.name}${contact.surname ? ` ${contact.surname}` : ''}`,
              preview: contact.phone || contact.email || '',
              timestamp: new Date(contact.created_at),
              contactId: contact.id,
              tags: contact.tags
            });
          });
        }
      }

      // Search CRM external database
      if (types.has('crm') && isExternalConfigured && cleanQuery.length >= 3) {
        try {
          const { data: crmData } = await externalSupabase.rpc('search_contacts_advanced', {
            p_search: cleanQuery,
            p_vendedor: null,
            p_ramo: null,
            p_rfm_segment: null,
            p_estado: null,
            p_cliente_ativado: null,
            p_ja_comprou: null,
            p_sort_by: 'relevance',
            p_page: 0,
            p_page_size: 8,
          });
          if (crmData?.results) {
            // Get local contact phones for deduplication
            const localPhones = new Set(
              searchResults.filter(r => r.type === 'contact').map(r => r.preview.replace(/\D/g, ''))
            );
            crmData.results.forEach((cr: any) => {
              const phone = cr.phone_primary?.replace(/\D/g, '') || '';
              if (phone && localPhones.has(phone)) return; // skip duplicates
              searchResults.push({
                id: `crm-${cr.contact_id}`,
                type: 'crm' as const,
                title: cr.full_name || cr.nome_tratamento || 'Sem nome',
                preview: [cr.company_name, cr.phone_primary, cr.rfm_segment].filter(Boolean).join(' • '),
                timestamp: new Date(),
                crmPhone: cr.phone_primary,
              });
            });
          }
        } catch (err) {
          // Silently fail CRM search
        }
      }

      searchResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setResults(searchResults);
      
      // Save to history
      if (cleanQuery.length >= 2) {
        addToHistory(cleanQuery, searchResults.length);
      }
    } catch (error) {
      log.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [addToHistory, allTags]);

  const debouncedSearch = useDebounce((query: string) => {
    performSearch(query, activeTypes, dateFilter, selectedTags, mediaTypeFilter);
  }, 300);

  const handleSearch = (query: string) => {
    setSearch(query);
    setSelectedIndex(0);
    debouncedSearch(query);
  };

  useEffect(() => {
    if (search.length >= 2 || selectedTags.length > 0 || mediaTypeFilter !== 'all') {
      performSearch(search, activeTypes, dateFilter, selectedTags, mediaTypeFilter);
    }
  }, [activeTypes, dateFilter, selectedTags, mediaTypeFilter]);

  const handleSelect = (result: SearchResult) => {
    onSelectResult(result);
    onOpenChange(false);
    setSearch('');
    setResults([]);
  };

  const handleHistorySelect = (query: string) => {
    setSearch(query);
    performSearch(query, activeTypes, dateFilter, selectedTags, mediaTypeFilter);
  };

  const handleTagSelect = (tag: TagSuggestion) => {
    setSelectedTags([...selectedTags, tag.id]);
    // Remove tag syntax from search
    setSearch(search.replace(/#\w*$/, '').trim());
    setTagSuggestions([]);
  };

  const removeTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tagId));
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const totalItems = tagSuggestions.length > 0 ? tagSuggestions.length : results.length;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === 'Enter' && totalItems > 0) {
        e.preventDefault();
        if (tagSuggestions.length > 0) {
          handleTagSelect(tagSuggestions[selectedIndex]);
        } else if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, results, tagSuggestions, selectedIndex]);

  const getResultIcon = (type: SearchResult['type'], messageType?: string) => {
    if (type === 'message' && messageType) {
      switch (messageType) {
        case 'image': return <Image className="h-4 w-4" />;
        case 'video': return <Video className="h-4 w-4" />;
        case 'audio': return <Mic className="h-4 w-4" />;
        case 'document': return <FileDown className="h-4 w-4" />;
      }
    }
    switch (type) {
      case 'transcription': return <Mic className="h-4 w-4" />;
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'contact': return <User className="h-4 w-4" />;
      case 'crm': return <Sparkles className="h-4 w-4" />;
      case 'action': return <Zap className="h-4 w-4" />;
    }
  };

  const getResultStyle = (type: SearchResult['type']) => {
    switch (type) {
      case 'transcription': return 'bg-warning/10 text-warning';
      case 'message': return 'bg-primary/10 text-primary';
      case 'contact': return 'bg-secondary/10 text-secondary';
      case 'crm': return 'bg-primary/10 text-primary';
      case 'action': return 'bg-accent/10 text-accent';
    }
  };

  const getResultLabel = (type: SearchResult['type'], messageType?: string) => {
    if (type === 'message' && messageType) {
      switch (messageType) {
        case 'image': return 'Imagem';
        case 'video': return 'Vídeo';
        case 'audio': return 'Áudio';
        case 'document': return 'Documento';
      }
    }
    switch (type) {
      case 'transcription': return 'Transcrição';
      case 'message': return 'Texto';
      case 'contact': return 'Contato';
      case 'crm': return 'CRM';
      case 'action': return 'Ação';
    }
  };

  const activeFiltersCount = (activeTypes.size < 4 ? 1 : 0) + (dateFilter !== 'all' ? 1 : 0) + (selectedTags.length > 0 ? 1 : 0) + (mediaTypeFilter !== 'all' ? 1 : 0);
  const showHistory = search.length === 0 && history.length > 0 && tagSuggestions.length === 0;
  const showActions = activeTypes.has('action') && filteredActions.length > 0 && (search.length === 0 || search.length >= 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          {/* Keyboard shortcut hint */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>Pressione</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">K</kbd>
              <span>para abrir a busca</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
              <span>navegar</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
              <span>selecionar</span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar mensagens, imagens, vídeos, links... Use # para tags"
              className="pl-10 pr-20 h-12 text-lg"
              autoFocus
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {search && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSearch(''); setResults([]); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant={showFilters ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 relative"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedTags.map((tagId) => {
                const tag = allTags.find(t => t.id === tagId);
                if (!tag) return null;
                return (
                  <Badge
                    key={tagId}
                    variant="secondary"
                    className="gap-1 pr-1"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }}
                  >
                    <Tag className="h-3 w-3" />
                    {tag.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-0.5 hover:bg-transparent"
                      onClick={() => removeTag(tagId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          )}
          
          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-muted/50 rounded-lg space-y-3"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                  <div className="flex flex-wrap gap-2">
                    <Toggle pressed={activeTypes.has('action')} onPressedChange={() => toggleType('action')} size="sm" className="gap-1.5 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
                      <Zap className="h-3.5 w-3.5" /> Ações
                    </Toggle>
                    <Toggle pressed={activeTypes.has('message')} onPressedChange={() => toggleType('message')} size="sm" className="gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      <FileText className="h-3.5 w-3.5" /> Textos
                    </Toggle>
                    <Toggle pressed={activeTypes.has('transcription')} onPressedChange={() => toggleType('transcription')} size="sm" className="gap-1.5 data-[state=on]:bg-warning data-[state=on]:text-primary-foreground">
                      <Mic className="h-3.5 w-3.5" /> Transcrições
                    </Toggle>
                    <Toggle pressed={activeTypes.has('contact')} onPressedChange={() => toggleType('contact')} size="sm" className="gap-1.5 data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground">
                      <User className="h-3.5 w-3.5" /> Contatos
                    </Toggle>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Período</label>
                  <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                    <SelectTrigger className="w-full h-9">
                      <Clock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo período</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="7days">Últimos 7 dias</SelectItem>
                      <SelectItem value="30days">Últimos 30 dias</SelectItem>
                      <SelectItem value="90days">Últimos 90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tipo de Mídia</label>
                  <div className="flex flex-wrap gap-2">
                    <Toggle pressed={mediaTypeFilter === 'all'} onPressedChange={() => setMediaTypeFilter('all')} size="sm" className="gap-1.5 data-[state=on]:bg-muted-foreground/20 data-[state=on]:text-foreground">
                      <MessageSquare className="h-3.5 w-3.5" /> Todos
                    </Toggle>
                    <Toggle pressed={mediaTypeFilter === 'text'} onPressedChange={() => setMediaTypeFilter(mediaTypeFilter === 'text' ? 'all' : 'text')} size="sm" className="gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      <FileText className="h-3.5 w-3.5" /> Texto
                    </Toggle>
                    <Toggle pressed={mediaTypeFilter === 'image'} onPressedChange={() => setMediaTypeFilter(mediaTypeFilter === 'image' ? 'all' : 'image')} size="sm" className="gap-1.5 data-[state=on]:bg-success data-[state=on]:text-primary-foreground">
                      <Image className="h-3.5 w-3.5" /> Imagens
                    </Toggle>
                    <Toggle pressed={mediaTypeFilter === 'video'} onPressedChange={() => setMediaTypeFilter(mediaTypeFilter === 'video' ? 'all' : 'video')} size="sm" className="gap-1.5 data-[state=on]:bg-info data-[state=on]:text-primary-foreground">
                      <Video className="h-3.5 w-3.5" /> Vídeos
                    </Toggle>
                    <Toggle pressed={mediaTypeFilter === 'audio'} onPressedChange={() => setMediaTypeFilter(mediaTypeFilter === 'audio' ? 'all' : 'audio')} size="sm" className="gap-1.5 data-[state=on]:bg-warning data-[state=on]:text-primary-foreground">
                      <Mic className="h-3.5 w-3.5" /> Áudios
                    </Toggle>
                    <Toggle pressed={mediaTypeFilter === 'document'} onPressedChange={() => setMediaTypeFilter(mediaTypeFilter === 'document' ? 'all' : 'document')} size="sm" className="gap-1.5 data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground">
                      <FileDown className="h-3.5 w-3.5" /> Documentos
                    </Toggle>
                    <Toggle pressed={mediaTypeFilter === 'link'} onPressedChange={() => setMediaTypeFilter(mediaTypeFilter === 'link' ? 'all' : 'link')} size="sm" className="gap-1.5 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
                      <Link2 className="h-3.5 w-3.5" /> Links
                    </Toggle>
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => {
                    setActiveTypes(new Set(['message', 'transcription', 'contact', 'action']));
                    setDateFilter('all');
                    setMediaTypeFilter('all');
                    setSelectedTags([]);
                  }}>
                    <X className="h-3 w-3 mr-1" /> Limpar filtros
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ScrollArea className="max-h-96">
          {/* Tag Suggestions */}
          {tagSuggestions.length > 0 && (
            <div className="p-2 border-b border-border">
              <div className="px-2 pb-2 text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags sugeridas
              </div>
              {tagSuggestions.map((tag, index) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagSelect(tag)}
                  className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition-colors ${
                    index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm">{tag.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {showActions && tagSuggestions.length === 0 && (
            <div className="p-2 border-b border-border">
              <div className="px-2 pb-2 text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> Ações rápidas
              </div>
              {filteredActions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => action.action()}
                  className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${
                    !search && index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="p-2 rounded-full bg-accent/10 text-accent">
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{action.title}</span>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* Search History */}
          {showHistory && (
            <div className="p-2">
              <div className="px-2 pb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <History className="h-3 w-3" /> Buscas recentes
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearHistory}>
                  <Trash2 className="h-3 w-3 mr-1" /> Limpar
                </Button>
              </div>
              {history.map((item, index) => (
                <button
                  key={item.timestamp}
                  onClick={() => handleHistorySelect(item.query)}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item.query}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.resultCount !== undefined && (
                      <span className="text-xs text-muted-foreground">{item.resultCount} resultados</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); removeFromHistory(item.query); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && tagSuggestions.length === 0 && (
            <div className="p-2">
              <div className="px-2 pb-2 text-xs text-muted-foreground">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </div>
              {results.map((result, index) => (
                <motion.button
                  key={`${result.type}-${result.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleSelect(result)}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                    index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className={`p-2 rounded-full ${getResultStyle(result.type)}`}>
                    {getResultIcon(result.type, result.messageType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{result.title}</span>
                      <Badge variant="secondary" className="text-[10px]">{getResultLabel(result.type, result.messageType)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{result.preview}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {format(result.timestamp, "d 'de' MMM, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && search.length >= 2 && results.length === 0 && tagSuggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhum resultado encontrado</p>
              <p className="text-xs mt-1">Tente outros termos ou ajuste os filtros</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
