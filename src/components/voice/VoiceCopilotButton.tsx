import { useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { log } from '@/lib/logger';

interface TranscriptEntry {
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export function VoiceCopilotButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);

  const conversation = useConversation({
    onConnect: () => {
      log.info('Voice Copilot connected');
      toast.success('Copiloto de voz conectado!');
    },
    onDisconnect: () => {
      log.info('Voice Copilot disconnected');
      setIsExpanded(false);
    },
    onMessage: (message: unknown) => {
      const msg = message as Record<string, any>;
      if (msg?.user_transcription_event?.user_transcript) {
        const text = msg.user_transcription_event.user_transcript;
        setTranscripts(prev => [...prev.slice(-9), { role: 'user', text, timestamp: new Date() }]);
      }
      if (msg?.agent_response_event?.agent_response) {
        const text = msg.agent_response_event.agent_response;
        setTranscripts(prev => [...prev.slice(-9), { role: 'agent', text, timestamp: new Date() }]);
      }
    },
    onError: (error) => {
      log.error('Voice Copilot error:', error);
      toast.error('Erro no copiloto de voz');
    },
    clientTools: {
      searchContacts: async (params: { query: string }) => {
        const { data } = await supabase.functions.invoke('voice-copilot-action', {
          body: { action: 'search_contacts', params }
        });
        return JSON.stringify(data?.result || []);
      },
      getConversationSummary: async (params: { contactId: string }) => {
        const { data } = await supabase.functions.invoke('voice-copilot-action', {
          body: { action: 'get_conversation_summary', params }
        });
        return JSON.stringify(data?.result || {});
      },
      getDashboardMetrics: async () => {
        const { data } = await supabase.functions.invoke('voice-copilot-action', {
          body: { action: 'get_dashboard_metrics', params: {} }
        });
        return JSON.stringify(data?.result || {});
      },
      assignConversation: async (params: { contactId: string; agentName: string }) => {
        const { data } = await supabase.functions.invoke('voice-copilot-action', {
          body: { action: 'assign_conversation', params }
        });
        return JSON.stringify(data?.result || {});
      },
      navigateTo: (params: { page: string }) => {
        const routes: Record<string, string> = {
          'inbox': '/#inbox',
          'dashboard': '/#dashboard',
          'contatos': '/#contacts',
          'campanhas': '/#campaigns',
          'equipe': '/#team',
          'configurações': '/#settings',
          'sentimento': '/sentiment-alerts',
          'chatbot': '/#chatbot-builder',
          'filas': '/#queues',
        };
        const route = routes[params.page.toLowerCase()] || `/#${params.page}`;
        window.location.hash = route.replace('/#', '');
        return `Navegado para ${params.page}`;
      },
      listAgents: async () => {
        const { data } = await supabase.functions.invoke('voice-copilot-action', {
          body: { action: 'list_agents', params: {} }
        });
        return JSON.stringify(data?.result || []);
      },
      getQueueStatus: async () => {
        const { data } = await supabase.functions.invoke('voice-copilot-action', {
          body: { action: 'get_queue_status', params: {} }
        });
        return JSON.stringify(data?.result || []);
      },
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setIsExpanded(true);
    setTranscripts([]);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke('elevenlabs-agent-token');

      if (error || !data?.token) {
        throw new Error(error?.message || 'Não foi possível obter token do agente');
      }

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
      });
    } catch (error) {
      log.error('Failed to start voice copilot:', error);
      toast.error('Erro ao conectar copiloto de voz. Verifique as configurações.');
      setIsExpanded(false);
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setIsExpanded(false);
    toast.info('Copiloto de voz desconectado');
  }, [conversation]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Expanded panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="w-80 max-h-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isConnected ? "bg-success" : isConnecting ? "bg-warning" : "bg-muted-foreground"
                    )}
                  />
                  <span className="text-sm font-semibold text-foreground">
                    Copiloto de Voz
                  </span>
                  {isSpeaking && (
                    <Volume2 className="w-3.5 h-3.5 text-primary animate-pulse" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    if (isConnected) stopConversation();
                    else setIsExpanded(false);
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Status */}
              <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/50">
                {isConnecting && 'Conectando ao agente...'}
                {isConnected && !isSpeaking && '🎤 Ouvindo... Fale seu comando.'}
                {isConnected && isSpeaking && '🔊 Respondendo...'}
                {!isConnected && !isConnecting && 'Clique no microfone para iniciar'}
              </div>

              {/* Transcript feed */}
              <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                {transcripts.length === 0 && isConnected && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    <p className="font-medium mb-1">Exemplos de comandos:</p>
                    <p>"Buscar contato João Silva"</p>
                    <p>"Quais as métricas do dashboard?"</p>
                    <p>"Ir para a inbox"</p>
                    <p>"Listar agentes ativos"</p>
                  </div>
                )}
                {transcripts.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: t.role === 'user' ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "text-xs p-2 rounded-lg max-w-[90%]",
                      t.role === 'user'
                        ? "ml-auto bg-primary/10 text-foreground"
                        : "mr-auto bg-muted text-foreground"
                    )}
                  >
                    <span className="font-medium text-[10px] text-muted-foreground block mb-0.5">
                      {t.role === 'user' ? 'Você' : 'Copiloto'}
                    </span>
                    {t.text}
                  </motion.div>
                ))}
              </div>

              {/* Audio visualization when connected */}
              {isConnected && (
                <div className="px-3 pb-3 flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary/60 rounded-full"
                      animate={{
                        height: isSpeaking
                          ? [4, 16 + Math.random() * 12, 4]
                          : [4, 8 + Math.random() * 4, 4],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6 + i * 0.1,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={isConnected ? stopConversation : startConversation}
            disabled={isConnecting}
            className={cn(
              "h-14 w-14 rounded-full shadow-lg transition-all",
              isConnected
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-gradient-to-br from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            )}
            size="icon"
          >
            {isConnecting ? (
              <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
            ) : isConnected ? (
              <MicOff className="w-6 h-6 text-primary-foreground" />
            ) : (
              <Mic className="w-6 h-6 text-primary-foreground" />
            )}
          </Button>
        </motion.div>

        {/* Pulse ring */}
        {isConnected && (
          <motion.div
            className="absolute bottom-0 right-0 w-14 h-14 rounded-full border-2 border-destructive/40 pointer-events-none"
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
    </>
  );
}
