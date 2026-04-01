/**
 * CRMAutoSync
 * 
 * Invisible component that auto-syncs conversation data to the CRM
 * when a conversation status changes to 'resolved'. Also provides
 * a manual sync button for the contact details panel.
 * 
 * Enhanced: auto-detect sentiment from messages, build richer summary.
 */
import { useEffect, useRef, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSyncToCRM } from '@/hooks/useSyncToCRM';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { log } from '@/lib/logger';
import type { Conversation, Message } from '@/types/chat';

interface CRMAutoSyncProps {
  conversation: Conversation;
  messageCount?: number;
  agentName?: string;
  messages?: Message[];
}

// Simple sentiment heuristic from message content
function detectSentiment(messages: Message[] | undefined): string {
  if (!messages || messages.length === 0) return 'neutral';

  const lastMessages = messages.slice(-10);
  const text = lastMessages.map(m => m.content?.toLowerCase() || '').join(' ');

  const positiveWords = ['obrigad', 'perfeito', 'ótimo', 'excelente', 'maravilh', 'amei', 'adorei', 'top', 'parabéns', 'show', '👍', '😊', '❤', '🙏', 'fechado', 'aprovado'];
  const negativeWords = ['reclam', 'péssim', 'horrível', 'absurd', 'descaso', 'nunca mais', 'cancelar', 'devolver', 'insatisf', 'raiva', '😡', '😤', 'atraso', 'demora'];

  const posScore = positiveWords.filter(w => text.includes(w)).length;
  const negScore = negativeWords.filter(w => text.includes(w)).length;

  if (negScore >= 2) return 'negative';
  if (negScore > posScore) return 'negative';
  if (posScore >= 2) return 'positive';
  if (posScore > negScore) return 'positive';
  return 'neutral';
}

// Build a summary from the conversation
function buildSummary(conversation: Conversation, messages: Message[] | undefined): string {
  const parts: string[] = [];

  // Contact info
  parts.push(`Conversa com ${conversation.contact.name}`);

  // Duration estimate
  if (messages && messages.length > 1) {
    const first = messages[0]?.timestamp;
    const last = messages[messages.length - 1]?.timestamp;
    if (first && last) {
      const diffMin = Math.round((last.getTime() - first.getTime()) / 60000);
      if (diffMin > 0) parts.push(`(${diffMin} min)`);
    }
  }

  // Message count
  if (messages) {
    const agentMsgs = messages.filter(m => m.sender === 'agent').length;
    const contactMsgs = messages.filter(m => m.sender === 'contact').length;
    parts.push(`${contactMsgs} msgs cliente, ${agentMsgs} msgs agente`);
  }

  // Last messages as context
  if (messages && messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.content) {
      parts.push('Última: ' + lastMsg.content.slice(0, 200));
    }
  }

  return parts.join('. ');
}

/**
 * Auto-sync: watches conversation status and syncs to CRM when resolved.
 */
export function CRMAutoSync({ conversation, messageCount, agentName, messages }: CRMAutoSyncProps) {
  const { syncConversation, isConfigured } = useSyncToCRM();
  const lastSyncedStatus = useRef<string>('');
  const lastSyncedId = useRef<string>('');

  const sentiment = useMemo(() => detectSentiment(messages), [messages]);

  useEffect(() => {
    if (!isConfigured) return;
    if (!conversation.contact.phone) return;

    const shouldSync =
      conversation.status === 'resolved' &&
      (lastSyncedStatus.current !== 'resolved' || lastSyncedId.current !== conversation.id);

    if (shouldSync) {
      lastSyncedStatus.current = conversation.status;
      lastSyncedId.current = conversation.id;

      const summary = buildSummary(conversation, messages);

      syncConversation({
        phone: conversation.contact.phone,
        channel: 'whatsapp',
        direction: 'inbound',
        assunto: `Conversa WhatsApp — ${conversation.contact.name}`,
        resumo: summary,
        sentiment,
        messageCount: messageCount || messages?.length || 0,
        agentName: agentName || undefined,
        zappConversationId: conversation.id,
      });

      log.info('CRM auto-sync triggered:', { id: conversation.id, sentiment });
    }

    lastSyncedStatus.current = conversation.status;
  }, [conversation.status, conversation.id, conversation.contact.phone, isConfigured, syncConversation, messageCount, agentName, conversation.contact.name, messages, sentiment]);

  return null; // Invisible component
}

/**
 * Manual sync button — drop into ContactDetails or ExternalContact360Panel.
 */
export function CRMSyncButton({ conversation, messageCount }: { conversation: Conversation; messageCount?: number }) {
  const { syncConversationAsync, isSyncing, isConfigured, lastResult } = useSyncToCRM();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [contactNotFound, setContactNotFound] = useState(false);

  if (!isConfigured) return null;

  const handleSync = async () => {
    try {
      const result = await syncConversationAsync({
        phone: conversation.contact.phone,
        channel: 'whatsapp',
        direction: 'inbound',
        assunto: `Conversa WhatsApp — ${conversation.contact.name}`,
        resumo: conversation.lastMessage?.content?.slice(0, 500) || undefined,
        sentiment: 'neutral',
        messageCount: messageCount || 0,
        zappConversationId: conversation.id,
      });

      if (result?.synced) {
        setLastSyncTime(new Date());
        setContactNotFound(false);
        toast.success('Sincronizado com o CRM!', {
          description: result.new_relationship_score
            ? `Score atualizado: ${result.new_relationship_score}`
            : undefined,
        });
      } else if (result?.reason === 'duplicate') {
        setLastSyncTime(new Date());
        toast.info('Já sincronizado', { description: 'Esta conversa já foi enviada ao CRM.' });
      } else if (result?.reason === 'contact_not_found') {
        setContactNotFound(true);
        toast.warning('Contato não encontrado no CRM');
      }
    } catch {
      toast.error('Erro ao sincronizar com CRM');
    }
  };

  if (contactNotFound) {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs gap-1.5 h-7 opacity-50">
        <RefreshCw className="w-3 h-3 text-muted-foreground" />
        Sem CRM
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isSyncing}
        className="text-xs gap-1.5 h-7"
      >
        {isSyncing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : lastResult?.synced ? (
          <CheckCircle2 className="w-3 h-3 text-success" />
        ) : (
          <RefreshCw className="w-3 h-3" />
        )}
        Sync CRM
      </Button>
      {lastSyncTime && (
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(lastSyncTime, { addSuffix: true, locale: ptBR })}
        </span>
      )}
    </div>
  );
}
