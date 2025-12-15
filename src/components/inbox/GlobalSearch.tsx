import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, X, MessageSquare, User, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'message' | 'contact';
  title: string;
  preview: string;
  timestamp: Date;
  contactId?: string;
  contactName?: string;
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

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Search messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
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
        .limit(10);

      if (messagesError) {
        console.error('Error searching messages:', messagesError);
      }

      // Search contacts
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, surname, phone, email')
        .or(`name.ilike.%${query}%,surname.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .order('name', { ascending: true })
        .limit(10);

      if (contactsError) {
        console.error('Error searching contacts:', contactsError);
      }

      const searchResults: SearchResult[] = [];

      // Add message results
      if (messages) {
        messages.forEach((msg) => {
          const contact = msg.contacts as { id: string; name: string; surname: string | null } | null;
          searchResults.push({
            id: msg.id,
            type: 'message',
            title: contact ? `Conversa com ${contact.name}${contact.surname ? ` ${contact.surname}` : ''}` : 'Mensagem',
            preview: msg.content.length > 100 ? `${msg.content.substring(0, 100)}...` : msg.content,
            timestamp: new Date(msg.created_at),
            contactId: msg.contact_id || undefined,
            contactName: contact ? `${contact.name}${contact.surname ? ` ${contact.surname}` : ''}` : undefined
          });
        });
      }

      // Add contact results
      if (contacts) {
        contacts.forEach((contact) => {
          searchResults.push({
            id: contact.id,
            type: 'contact',
            title: `${contact.name}${contact.surname ? ` ${contact.surname}` : ''}`,
            preview: contact.phone || contact.email || '',
            timestamp: new Date(),
            contactId: contact.id
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useDebounce(performSearch, 300);

  const handleSearch = (query: string) => {
    setSearch(query);
    debouncedSearch(query);
  };

  const handleSelect = (result: SearchResult) => {
    onSelectResult(result);
    onOpenChange(false);
    setSearch('');
    setResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar em todas as conversas..."
              className="pl-10 pr-10 h-12 text-lg"
              autoFocus
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => {
                  setSearch('');
                  setResults([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              <kbd className="font-mono">↑↓</kbd> navegar
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              <kbd className="font-mono">Enter</kbd> selecionar
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              <kbd className="font-mono">Esc</kbd> fechar
            </Badge>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((result, index) => (
                <motion.button
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelect(result)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <div className={`p-2 rounded-full ${result.type === 'message' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                    {result.type === 'message' ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{result.title}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(result.timestamp, 'dd MMM', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
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
              <p className="text-sm">Tente buscar por outro termo</p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Digite para buscar</p>
              <p className="text-sm">Busque por mensagens, contatos ou conversas</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
