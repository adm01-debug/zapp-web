import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  const recentMessages = messages.slice(-20);

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

  const generateResponse = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    setResponse(null);

    const selected = recentMessages.filter(m => selectedIds.has(m.id));
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
              content: `Mensagens selecionadas da conversa:\n${selected.map(m => `[${m.sender === 'agent' ? 'Atendente' : 'Cliente'}]: ${m.content}`).join('\n')}`,
            },
          ],
          model: 'google/gemini-2.5-flash',
        },
      });

      const content = result.data?.content || result.data?.choices?.[0]?.message?.content;
      if (content) {
        setResponse(content.trim());
      }
    } catch {
      setResponse(null);
    }

    setLoading(false);
  };

  const handleUse = () => {
    if (response) {
      onSelectSuggestion?.(response);
    }
  };

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <GraduationCap className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium">Selecione mensagens para análise</span>
      </div>

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

      {/* Message list */}
      <ScrollArea className="h-48 rounded-lg border border-border/30 bg-muted/10">
        <div className="p-1.5 space-y-1">
          <button
            type="button"
            onClick={selectAll}
            className="text-[10px] text-primary hover:underline mb-1 px-1"
          >
            {selectedIds.size === recentMessages.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          {recentMessages.map(m => (
            <label
              key={m.id}
              className={`flex items-start gap-2 p-1.5 rounded-md cursor-pointer transition-colors hover:bg-muted/30 ${
                selectedIds.has(m.id) ? 'bg-primary/5 border border-primary/20' : 'border border-transparent'
              }`}
            >
              <Checkbox
                checked={selectedIds.has(m.id)}
                onCheckedChange={() => toggleMessage(m.id)}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1 py-0 mb-0.5 ${
                    m.sender === 'agent' ? 'text-primary border-primary/30' : 'text-warning border-warning/30'
                  }`}
                >
                  {m.sender === 'agent' ? 'Atendente' : 'Cliente'}
                </Badge>
                <p className="text-[11px] text-foreground line-clamp-2 leading-tight">{m.content}</p>
              </div>
            </label>
          ))}
          {recentMessages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma mensagem disponível</p>
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
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Gerando resposta...
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 mr-1" />
            Gerar resposta ({selectedIds.size} {selectedIds.size === 1 ? 'msg' : 'msgs'})
          </>
        )}
      </Button>

      {/* Response */}
      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-primary">Resposta sugerida</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px]"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-foreground leading-relaxed">{response}</p>
            <Button
              variant="default"
              size="sm"
              className="w-full h-7 text-xs"
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
