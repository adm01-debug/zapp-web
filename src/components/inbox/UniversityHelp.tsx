import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Loader2, Sparkles, AlertTriangle, MessageSquare, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { ToneSelector, type ToneKey, getTonePrompt } from './ai-tools/ToneSelector';
import { AIResponseCard } from './ai-tools/AIResponseCard';
import { PeriodFilterSelector, usePeriodFilter } from './ai-tools/PeriodFilterSelector';

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  created_at?: string;
}

interface UniversityHelpProps {
  contactId: string;
  messages: ChatMessage[];
  onSelectSuggestion?: (text: string) => void;
}

type FilterMode = 'all' | 'client' | 'agent';

// Normalize messages to have created_at for period filtering
function normalizeMessages(messages: ChatMessage[]) {
  return messages.map(m => ({
    ...m,
    created_at: m.created_at || m.timestamp,
  }));
}

export function UniversityHelp({ contactId, messages, onSelectSuggestion }: UniversityHelpProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<ToneKey>('friendly');
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const responseRef = useRef<HTMLDivElement>(null);
  const lastCallRef = useRef(0);

  const normalized = useMemo(() => normalizeMessages(messages), [messages]);

  const {
    analysisPeriod,
    setAnalysisPeriod,
    customDateFrom,
    customDateTo,
    setCustomDateFrom,
    setCustomDateTo,
    clearCustomDates,
    filteredMessages: periodFiltered,
  } = usePeriodFilter(normalized, 'all');

  const recentMessages = useMemo(() => {
    return periodFiltered
      .filter(m => m.content && m.content.trim().length > 0)
      .slice(-30)
      .reverse();
  }, [periodFiltered]);

  const filteredMessages = useMemo(() => {
    if (filterMode === 'client') return recentMessages.filter(m => m.sender !== 'agent');
    if (filterMode === 'agent') return recentMessages.filter(m => m.sender === 'agent');
    return recentMessages;
  }, [recentMessages, filterMode]);

  const selectedInOrder = useMemo(() => {
    return normalized.filter(m => selectedIds.has(m.id));
  }, [normalized, selectedIds]);

  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [response]);

  // Clear selection when period changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [analysisPeriod, customDateFrom, customDateTo]);

  const toggleMessage = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filteredMessages.length && filteredMessages.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMessages.map(m => m.id)));
    }
  }, [selectedIds.size, filteredMessages]);

  const generateResponse = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.warning('Selecione pelo menos uma mensagem.');
      return;
    }

    const now = Date.now();
    if (now - lastCallRef.current < 3000) {
      toast.warning('Aguarde alguns segundos antes de tentar novamente.');
      return;
    }
    lastCallRef.current = now;

    setLoading(true);
    setResponse(null);
    setError(null);

    const tonePrompt = getTonePrompt(selectedTone);

    try {
      const result = await supabase.functions.invoke('ai-proxy', {
        body: {
          messages: [
            {
              role: 'system',
              content: `Você é um assistente especialista em atendimento ao cliente. Analise as mensagens selecionadas da conversa e crie uma resposta inteligente e adequada para o atendente enviar ao cliente.
${tonePrompt}
Considere o contexto completo das mensagens selecionadas. Crie UMA resposta pronta para envio, sem explicações adicionais ou meta-comentários. A resposta deve ser direta e natural.`,
            },
            {
              role: 'user',
              content: `Mensagens selecionadas da conversa:\n${selectedInOrder.map(m => `[${m.sender === 'agent' ? 'Atendente' : 'Cliente'}]: ${m.content}`).join('\n')}`,
            },
          ],
          model: 'google/gemini-2.5-flash',
        },
      });

      if (result.error) throw new Error(result.error.message || 'Erro na API');

      const content = result.data?.content || result.data?.choices?.[0]?.message?.content;
      if (content && content.trim().length > 0) {
        setResponse(content.trim());
        toast.success('Resposta gerada com sucesso!');
      } else {
        throw new Error('Resposta vazia da IA');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      setResponse(null);
      toast.error('Falha ao gerar resposta. Tente novamente.');
    }

    setLoading(false);
  }, [selectedIds, selectedInOrder, selectedTone]);

  const handleRegenerate = useCallback(() => {
    setResponse(null);
    setError(null);
    generateResponse();
  }, [generateResponse]);

  // Keyboard shortcut: Ctrl+Enter to generate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && selectedIds.size > 0 && !loading) {
        e.preventDefault();
        generateResponse();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [generateResponse, selectedIds.size, loading]);

  const filterButtons: { mode: FilterMode; label: string }[] = [
    { mode: 'all', label: 'Todos' },
    { mode: 'client', label: 'Só cliente' },
    { mode: 'agent', label: 'Só atendente' },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <span className="text-xs font-semibold">Ajuda dos Universitários</span>
          <p className="text-[10px] text-muted-foreground">Selecione mensagens para gerar uma resposta inteligente</p>
        </div>
      </div>

      {/* Period Filter */}
      <PeriodFilterSelector
        period={analysisPeriod}
        onPeriodChange={setAnalysisPeriod}
        customFrom={customDateFrom}
        customTo={customDateTo}
        onCustomFromChange={setCustomDateFrom}
        onCustomToChange={setCustomDateTo}
        onClearCustom={clearCustomDates}
        filteredCount={periodFiltered.length}
        totalCount={messages.length}
      />

      <ToneSelector selected={selectedTone} onChange={setSelectedTone} disabled={loading} />

      {/* Filter & selection controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {filterButtons.map(f => (
            <button
              key={f.mode}
              type="button"
              onClick={() => {
                setFilterMode(f.mode);
                setSelectedIds(new Set());
              }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
                filterMode === f.mode
                  ? 'bg-accent border-border text-foreground'
                  : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={selectAll}
            className="text-[10px] text-primary hover:underline font-medium"
          >
            {selectedIds.size === filteredMessages.length && filteredMessages.length > 0 ? 'Limpar' : 'Selecionar todos'}
          </button>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-semibold tabular-nums">
            {selectedIds.size}
          </Badge>
        </div>
      </div>

      {/* Message list */}
      <ScrollArea className="h-48 rounded-xl border border-border/30 bg-muted/5">
        <div className="p-1.5 space-y-0.5">
          {filteredMessages.map(m => {
            const isSelected = selectedIds.has(m.id);
            const isAgent = m.sender === 'agent';
            return (
              <label
                key={m.id}
                className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-primary/5 ring-1 ring-primary/20'
                    : 'hover:bg-muted/20'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleMessage(m.id)}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-4 mb-0.5 ${
                      isAgent
                        ? 'text-primary border-primary/30 bg-primary/5'
                        : 'text-warning border-warning/30 bg-warning/5'
                    }`}
                  >
                    {isAgent ? '🧑‍💼 Atendente' : '👤 Cliente'}
                  </Badge>
                  <p className="text-[11px] text-foreground line-clamp-2 leading-snug">{m.content}</p>
                </div>
              </label>
            );
          })}
          {filteredMessages.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-2">
              <MessageSquare className="w-5 h-5 text-muted-foreground/40" />
              <p className="text-[11px] text-muted-foreground">Nenhuma mensagem disponível</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Generate button */}
      <Button
        variant="default"
        size="sm"
        className="w-full h-9 text-xs font-medium"
        onClick={generateResponse}
        disabled={loading || selectedIds.size === 0}
        title="Ctrl+Enter para gerar"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Gerando resposta...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Gerar resposta ({selectedIds.size} {selectedIds.size === 1 ? 'msg' : 'msgs'})
          </>
        )}
      </Button>
      {selectedIds.size > 0 && !loading && !response && (
        <p className="text-[9px] text-muted-foreground text-center">⌘/Ctrl + Enter para gerar rapidamente</p>
      )}

      {/* Error state */}
      {error && !response && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
        >
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs text-destructive font-semibold mb-0.5">Erro ao gerar resposta</p>
            <p className="text-[11px] text-destructive/80">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Response */}
      <AnimatePresence>
        {response && (
          <div ref={responseRef}>
            <AIResponseCard
              response={response}
              onUse={onSelectSuggestion}
              onRegenerate={handleRegenerate}
              isRegenerating={loading}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
