import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface SearchResult {
  id: string;
  type: 'message' | 'contact';
  title: string;
  preview: string;
  timestamp: Date;
  contactName?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResult: (result: SearchResult) => void;
}

// Mock search results for demo
const mockResults: SearchResult[] = [
  {
    id: '1',
    type: 'message',
    title: 'Conversa com Maria Silva',
    preview: 'Olá, preciso de ajuda com meu pedido #12345',
    timestamp: new Date(),
    contactName: 'Maria Silva'
  },
  {
    id: '2',
    type: 'message',
    title: 'Conversa com João Santos',
    preview: 'Quando vai chegar minha encomenda?',
    timestamp: new Date(Date.now() - 86400000),
    contactName: 'João Santos'
  },
  {
    id: '3',
    type: 'contact',
    title: 'Pedro Oliveira',
    preview: '+55 11 99999-8888',
    timestamp: new Date(Date.now() - 172800000),
  },
];

export function GlobalSearch({ open, onOpenChange, onSelectResult }: GlobalSearchProps) {
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = async (query: string) => {
    setSearch(query);
    
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    // Simulated search delay
    setTimeout(() => {
      const filtered = mockResults.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.preview.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setIsLoading(false);
    }, 300);
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
