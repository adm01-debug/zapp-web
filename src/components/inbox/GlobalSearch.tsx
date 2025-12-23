import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, X, MessageSquare, User, Calendar, Loader2, Mic, FileText, Filter, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
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
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'message' | 'contact' | 'transcription';
  title: string;
  preview: string;
  timestamp: Date;
  contactId?: string;
  contactName?: string;
  messageType?: string;
}

type ResultType = 'message' | 'contact' | 'transcription';
type DateFilter = 'all' | 'today' | '7days' | '30days' | '90days';

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
  
  // Filters
  const [activeTypes, setActiveTypes] = useState<Set<ResultType>>(new Set(['message', 'transcription', 'contact']));
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const toggleType = (type: ResultType) => {
    const newTypes = new Set(activeTypes);
    if (newTypes.has(type)) {
      if (newTypes.size > 1) {
        newTypes.delete(type);
      }
    } else {
      newTypes.add(type);
    }
    setActiveTypes(newTypes);
  };

  const getDateFilterStart = (filter: DateFilter): Date | null => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return startOfDay(now);
      case '7days':
        return subDays(now, 7);
      case '30days':
        return subMonths(now, 1);
      case '90days':
        return subMonths(now, 3);
      default:
        return null;
    }
  };

  const performSearch = useCallback(async (query: string, types: Set<ResultType>, dateRange: DateFilter) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const dateStart = getDateFilterStart(dateRange);
    
    try {
      const searchResults: SearchResult[] = [];
      const addedMessageIds = new Set<string>();

      // Search text messages
      if (types.has('message')) {
        let textQuery = supabase
          .from('messages')
          .select(`
            id,
            content,
            message_type,
            created_at,
            contact_id,
            contacts:contact_id (
              id,
              name,
              surname
            )
          `)
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(15);

        if (dateStart) {
          textQuery = textQuery.gte('created_at', dateStart.toISOString());
        }

        const { data: textMessages, error: textError } = await textQuery;

        if (textError) {
          console.error('Error searching text messages:', textError);
        }

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
      if (types.has('transcription')) {
        let audioQuery = supabase
          .from('messages')
          .select(`
            id,
            content,
            transcription,
            message_type,
            created_at,
            contact_id,
            contacts:contact_id (
              id,
              name,
              surname
            )
          `)
          .not('transcription', 'is', null)
          .ilike('transcription', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(15);

        if (dateStart) {
          audioQuery = audioQuery.gte('created_at', dateStart.toISOString());
        }

        const { data: audioMessages, error: audioError } = await audioQuery;

        if (audioError) {
          console.error('Error searching audio transcriptions:', audioError);
        }

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

      // Search contacts
      if (types.has('contact')) {
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('id, name, surname, phone, email, created_at')
          .or(`name.ilike.%${query}%,surname.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
          .order('name', { ascending: true })
          .limit(10);

        if (contactsError) {
          console.error('Error searching contacts:', contactsError);
        }

        if (contacts) {
          contacts.forEach((contact) => {
            searchResults.push({
              id: contact.id,
              type: 'contact',
              title: `${contact.name}${contact.surname ? ` ${contact.surname}` : ''}`,
              preview: contact.phone || contact.email || '',
              timestamp: new Date(contact.created_at),
              contactId: contact.id
            });
          });
        }
      }

      // Sort by timestamp (most recent first)
      searchResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useDebounce((query: string) => {
    performSearch(query, activeTypes, dateFilter);
  }, 300);

  const handleSearch = (query: string) => {
    setSearch(query);
    debouncedSearch(query);
  };

  // Re-search when filters change
  useEffect(() => {
    if (search.length >= 2) {
      performSearch(search, activeTypes, dateFilter);
    }
  }, [activeTypes, dateFilter, performSearch, search]);

  const handleSelect = (result: SearchResult) => {
    onSelectResult(result);
    onOpenChange(false);
    setSearch('');
    setResults([]);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'transcription':
        return <Mic className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'contact':
        return <User className="h-4 w-4" />;
    }
  };

  const getResultStyle = (type: SearchResult['type']) => {
    switch (type) {
      case 'transcription':
        return 'bg-orange-500/10 text-orange-500';
      case 'message':
        return 'bg-primary/10 text-primary';
      case 'contact':
        return 'bg-secondary/10 text-secondary';
    }
  };

  const getResultLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'transcription':
        return 'Transcrição';
      case 'message':
        return 'Texto';
      case 'contact':
        return 'Contato';
    }
  };

  const getDateFilterLabel = (filter: DateFilter) => {
    switch (filter) {
      case 'all':
        return 'Todo período';
      case 'today':
        return 'Hoje';
      case '7days':
        return 'Últimos 7 dias';
      case '30days':
        return 'Últimos 30 dias';
      case '90days':
        return 'Últimos 90 dias';
    }
  };

  const activeFiltersCount = (activeTypes.size < 3 ? 1 : 0) + (dateFilter !== 'all' ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar em textos e transcrições de áudio..."
              className="pl-10 pr-20 h-12 text-lg"
              autoFocus
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setSearch('');
                    setResults([]);
                  }}
                >
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
          
          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3 bg-muted/50 rounded-lg space-y-3"
            >
              {/* Type Filters */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipo de conteúdo</label>
                <div className="flex flex-wrap gap-2">
                  <Toggle
                    pressed={activeTypes.has('message')}
                    onPressedChange={() => toggleType('message')}
                    size="sm"
                    className="gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Textos
                  </Toggle>
                  <Toggle
                    pressed={activeTypes.has('transcription')}
                    onPressedChange={() => toggleType('transcription')}
                    size="sm"
                    className="gap-1.5 data-[state=on]:bg-orange-500 data-[state=on]:text-white"
                  >
                    <Mic className="h-3.5 w-3.5" />
                    Transcrições
                  </Toggle>
                  <Toggle
                    pressed={activeTypes.has('contact')}
                    onPressedChange={() => toggleType('contact')}
                    size="sm"
                    className="gap-1.5 data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
                  >
                    <User className="h-3.5 w-3.5" />
                    Contatos
                  </Toggle>
                </div>
              </div>

              {/* Date Filter */}
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

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setActiveTypes(new Set(['message', 'transcription', 'contact']));
                    setDateFilter('all');
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </motion.div>
          )}
          
          {/* Active Filters Summary */}
          {!showFilters && activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className="text-muted-foreground">Filtros:</span>
              {activeTypes.size < 3 && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  {Array.from(activeTypes).map(t => getResultLabel(t)).join(', ')}
                </Badge>
              )}
              {dateFilter !== 'all' && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Clock className="h-3 w-3" />
                  {getDateFilterLabel(dateFilter)}
                </Badge>
              )}
            </div>
          )}
          
          {/* Quick Type Badges (when filters hidden) */}
          {!showFilters && activeFiltersCount === 0 && (
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] gap-1">
                <FileText className="h-3 w-3" /> Textos
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1 border-orange-500/30 text-orange-500">
                <Mic className="h-3 w-3" /> Transcrições
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <User className="h-3 w-3" /> Contatos
              </Badge>
            </div>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              <div className="px-2 pb-2 text-xs text-muted-foreground">
                {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
              </div>
              {results.map((result, index) => (
                <motion.button
                  key={`${result.type}-${result.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSelect(result)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <div className={`p-2 rounded-full ${getResultStyle(result.type)}`}>
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate">{result.title}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] shrink-0 ${result.type === 'transcription' ? 'border-orange-500/30 text-orange-500' : ''}`}
                        >
                          {getResultLabel(result.type)}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3" />
                        {format(result.timestamp, 'dd MMM yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {result.type === 'transcription' && '🎙️ '}
                      {result.preview}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : search.length >= 2 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum resultado encontrado</p>
              <p className="text-sm">Tente buscar por outro termo ou ajuste os filtros</p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Digite para buscar</p>
              <p className="text-sm">Busque em mensagens de texto e transcrições de áudio</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
