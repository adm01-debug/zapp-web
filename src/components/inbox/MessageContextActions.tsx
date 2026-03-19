import { useCallback } from 'react';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { Message } from '@/types/chat';
import { toast } from 'sonner';
import { log } from '@/lib/logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Pencil,
  Trash2,
  Archive,
  CheckCheck,
  EyeOff,
  Ban,
} from 'lucide-react';

interface MessageContextActionsProps {
  message: Message;
  instanceName: string;
  contactJid: string;
  onEditStart?: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
}

export function MessageContextActions({
  message,
  instanceName,
  contactJid,
  onEditStart,
  onMessageDeleted,
}: MessageContextActionsProps) {
  const {
    deleteMessage,
    updateMessage,
    markMessageAsRead,
    markMessageAsUnread,
    archiveChat,
    updateBlockStatus,
    isLoading,
  } = useEvolutionApi();

  const isSent = message.sender === 'agent';
  const externalId = (message as Record<string, unknown>).external_id as string | undefined;

  const handleDelete = useCallback(async () => {
    if (!externalId) {
      toast.error('Mensagem sem ID externo — não pode ser deletada via API');
      return;
    }
    try {
      await deleteMessage(instanceName, externalId, contactJid, isSent);
      toast.success('Mensagem deletada para todos');
      onMessageDeleted?.(message.id);
    } catch (err) {
      log.error('Error deleting message:', err);
      toast.error('Erro ao deletar mensagem');
    }
  }, [instanceName, externalId, contactJid, isSent, deleteMessage, message.id, onMessageDeleted]);

  const handleMarkRead = useCallback(async () => {
    if (!externalId) return;
    try {
      await markMessageAsRead(instanceName, {
        remoteJid: contactJid,
        fromMe: isSent,
        id: externalId,
      });
      toast.success('Marcada como lida');
    } catch (err) {
      log.error('Error marking message as read:', err);
      toast.error('Erro ao marcar como lida');
    }
  }, [instanceName, externalId, contactJid, isSent, markMessageAsRead]);

  const handleMarkUnread = useCallback(async () => {
    if (!externalId) return;
    try {
      await markMessageAsUnread(instanceName, {
        remoteJid: contactJid,
        fromMe: isSent,
        id: externalId,
      });
      toast.success('Marcada como não lida');
    } catch (err) {
      log.error('Error marking message as unread:', err);
      toast.error('Erro ao marcar como não lida');
    }
  }, [instanceName, externalId, contactJid, isSent, markMessageAsUnread]);

  const handleArchive = useCallback(async () => {
    try {
      await archiveChat(instanceName, {}, contactJid, true);
      toast.success('Chat arquivado');
    } catch (err) {
      log.error('Error archiving chat:', err);
      toast.error('Erro ao arquivar');
    }
  }, [instanceName, contactJid, archiveChat]);

  const handleBlock = useCallback(async () => {
    try {
      await updateBlockStatus(instanceName, contactJid, 'block');
    } catch (err) {
      log.error('Error blocking contact:', err);
      toast.error('Erro ao bloquear contato');
    }
  }, [instanceName, contactJid, updateBlockStatus]);

  const handleUnblock = useCallback(async () => {
    try {
      await updateBlockStatus(instanceName, contactJid, 'unblock');
    } catch (err) {
      log.error('Error unblocking contact:', err);
      toast.error('Erro ao desbloquear contato');
    }
  }, [instanceName, contactJid, updateBlockStatus]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isSent ? 'end' : 'start'} className="w-48">
        {isSent && message.type === 'text' && onEditStart && (
          <DropdownMenuItem onClick={() => onEditStart(message)}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar mensagem
          </DropdownMenuItem>
        )}
        {isSent && (
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Apagar para todos
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleMarkRead}>
          <CheckCheck className="w-4 h-4 mr-2" />
          Marcar como lida
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleMarkUnread}>
          <EyeOff className="w-4 h-4 mr-2" />
          Marcar como não lida
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleArchive}>
          <Archive className="w-4 h-4 mr-2" />
          Arquivar chat
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleBlock} className="text-destructive">
          <Ban className="w-4 h-4 mr-2" />
          Bloquear contato
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleUnblock}>
          <Ban className="w-4 h-4 mr-2" />
          Desbloquear contato
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
