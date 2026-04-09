import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Loader2, Sparkles, Copy, Check, RefreshCw, AlertTriangle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const TONE_OPTIONS = [
  { key: 'professional', label: '💼 Formal', prompt: 'Use tom formal, profissional e corporativo.' },
  { key: 'friendly', label: '😊 Amigável', prompt: 'Use tom amigável, acolhedor e empático.' },
  { key: 'casual', label: '🤙 Descontraído', prompt: 'Use tom descontraído, leve e informal.' },
  { key: 'persuasive', label: '🎯 Persuasivo', prompt: 'Use tom persuasivo, confiante e orientado a resultados.' },
] as const;

type ToneKey = typeof TONE_OPTIONS[number]['key'];

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
}

interface UniversityHelpProps {
  contactId: string;
  messages: ChatMessage[];
  onSelectSuggestion?: (text: string) => void;
}

export function UniversityHelp({ contactId, messages, onSelectSuggestion }: UniversityHelpProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<ToneKey>('friendly');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out empty messages, show last 30 in reverse chronological order for display
  const recentMessages = useMemo(() => {
    return messages
      .filter(m => m.content && m.content.trim().length > 0)
      .slice(-30)
      .reverse();
  }, [messages]);

  // For AI, keep chronological order
  const selectedInOrder = useMemo(() => {
    return messages.filter(m => selectedIds.has(m.id));
  }, [messages, selectedIds]);

  const toggleMessage = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === recentMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recentMessages.map(m => m.id)));
    }
  };

  const selectContactOnly = () => {
    const contactMsgs = recentMessages.filter(m => m.sender !== 'agent');
    setSelectedIds(new Set(contactMsgs.map(m => m.id)));
  };

  const generateResponse = async () => {
    if (selectedIds.size === 0) {
      toast.warning('Selecione pelo menos uma mensagem.');
      return;
    }
    setLoading(true);
    setResponse(null);
    setError(null);

    const tonePrompt = TONE_OPTIONS.find(t => t.key === selectedTone)!.prompt;

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
      if (content) {
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
  };

  const handleUse = () => {
    if (response) {
      onSelectSuggestion?.(response);
      toast.success('Resposta inserida no chat!');
    }
  };

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = () => {
    setResponse(null);
    setError(null);
    generateResponse();
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <GraduationCap className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium">Ajuda dos Universitários</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Selecione mensagens do chat e a IA criará uma resposta inteligente para você enviar.
      </p>

      {/* Tone selector */}
      <div className="flex flex-wrap gap-1">
        {TONE_OPTIONS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSelectedTone(t.key)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border ${
              selectedTone === t.key
                ? 'bg-primary/20 border-primary/40 text-primary'
                : 'bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Quick select buttons */}
      <div className="flex gap-1.5">
        <button type="button" onClick={selectAll} className="text-[10px] text-primary hover:underline">
          {selectedIds.size === recentMessages.length && recentMessages.length > 0 ? 'Desmarcar todos' : 'Todos'}
        </button>
        <span className="text-[10px] text-muted-foreground">•</span>
        <button type="button" onClick={selectContactOnly} className="text-[10px] text-primary hover:underline">
          Só cliente
        </button>
        {selectedIds.size > 0 && (
          <>
            <span className="text-[10px] text-muted-foreground">•</span>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-[10px] text-destructive hover:underline">
              Limpar
            </button>
          </>
        )}
        <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto">{selectedIds.size} selecionadas</Badge>
      </div>

      {/* Message list */}
      <ScrollArea className="h-48 rounded-lg border border-border/30 bg-muted/10">
        <div className="p-1.5 space-y-0.5">
          {recentMessages.map(m => (
            <label
              key={m.id}
              className={`flex items-start gap-2 p-1.5 rounded-md cursor-pointer transition-all hover:bg-muted/30 ${
                selectedIds.has(m.id) ? 'bg-primary/5 ring-1 ring-primary/20' : ''
              }`}
            >
              <Checkbox
                checked={selectedIds.has(m.id)}
                onCheckedChange={() => toggleMessage(m.id)}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 py-0 h-3.5 ${
                      m.sender === 'agent' ? 'text-primary border-primary/30 bg-primary/5' : 'text-warning border-warning/30 bg-warning/5'
                    }`}
                  >
                    {m.sender === 'agent' ? '🧑‍💼 Atendente' : '👤 Cliente'}
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground line-clamp-2 leading-tight">{m.content}</p>
              </div>
            </label>
          ))}
          {recentMessages.length === 0 && (
            <div className="flex flex-col items-center py-6 gap-1.5">
              <MessageSquare className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Nenhuma mensagem disponível</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Generate button */}
      <Button
        variant="default"
        size="sm"
        className="w-full h-8 text-xs"
        onClick={generateResponse}
        disabled={loading || selectedIds.size === 0}
      >
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            Gerando resposta...
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 mr-1.5" />
            Gerar resposta ({selectedIds.size} {selectedIds.size === 1 ? 'msg' : 'msgs'})
          </>
        )}
      </Button>

      {/* Error state */}
      {error && !response && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-1.5 p-2 rounded-lg bg-destructive/10 border border-destructive/20"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] text-destructive">{error}</p>
        </motion.div>
      )}

      {/* Response */}
      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Resposta sugerida
              </span>
              <div className="flex gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                  onClick={handleRegenerate}
                  disabled={loading}
                  title="Regenerar"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                  onClick={handleCopy}
                  title="Copiar"
                >
                  {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{response}</p>
            <Button
              variant="default"
              size="sm"
              className="w-full h-7 text-xs font-medium"
              onClick={handleUse}
            >
              Usar resposta ↵
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
