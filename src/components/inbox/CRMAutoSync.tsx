/**
 * CRMAutoSync
 * 
 * Invisible component that auto-syncs conversation data to the CRM
 * when a conversation status changes to 'resolved'. Also provides
 * a manual sync button for the contact details panel.
 * 
 * Drop this inside ChatPanel — it watches conversation.status and
 * triggers sync_interaction_from_zapp on the external CRM.
 */
import { useEffect, useRef } from 'react';
import { useSyncToCRM } from '@/hooks/useSyncToCRM';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { log } from '@/lib/logger';
import type { Conversation } from '@/types/chat';

interface CRMAutoSyncProps {
  conversation: Conversation;
  messageCount?: number;
  agentName?: string;
}

/**
 * Auto-sync: watches conversation status and syncs to CRM when resolved.
 * Renders nothing visible — just the sync logic.
 */
export function CRMAutoSync({ conversation, messageCount, agentName }: CRMAutoSyncProps) {
  const { syncConversation, isConfigured } = useSyncToCRM();
  const lastSyncedStatus = useRef<string>('');
  const lastSyncedId = useRef<string>('');

  useEffect(() => {
    if (!isConfigured) return;
    if (!conversation.contact.phone) return;

    // Only sync when status changes TO resolved AND we haven't already synced this one
    const shouldSync =
      conversation.status === 'resolved' &&
      (lastSyncedStatus.current !== 'resolved' || lastSyncedId.current !== conversation.id);

    if (shouldSync) {
      lastSyncedStatus.current = conversation.status;
      lastSyncedId.current = conversation.id;

      syncConversation({
        phone: conversation.contact.phone,
        channel: 'whatsapp',
        direction: 'inbound',
        assunto: `Conversa WhatsApp — ${conversation.contact.name}`,
        resumo: conversation.lastMessage?.content?.slice(0, 500) || undefined,
        sentiment: 'neutral',
        messageCount: messageCount || 0,
        agentName: agentName || undefined,
        zappConversationId: conversation.id,
      });

      log.info('CRM auto-sync triggered for conversation:', conversation.id);
    }

    lastSyncedStatus.current = conversation.status;
  }, [conversation.status, conversation.id, conversation.contact.phone, isConfigured, syncConversation, messageCount, agentName, conversation.contact.name, conversation.lastMessage?.content]);

  return null; // Invisible component
}

/**
 * Manual sync button — drop into ContactDetails or ExternalContact360Panel.
 */
export function CRMSyncButton({ conversation, messageCount }: { conversation: Conversation; messageCount?: number }) {
  const { syncConversationAsync, isSyncing, isConfigured, lastResult } = useSyncToCRM();

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
        toast.success('Sincronizado com o CRM!', {
          description: result.new_relationship_score
            ? `Score atualizado: ${result.new_relationship_score}`
            : undefined,
        });
      } else if (result?.reason === 'duplicate') {
        toast.info('Já sincronizado', { description: 'Esta conversa já foi enviada ao CRM.' });
      } else if (result?.reason === 'contact_not_found') {
        toast.warning('Contato não encontrado no CRM');
      }
    } catch {
      toast.error('Erro ao sincronizar com CRM');
    }
  };

  return (
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
  );
}
