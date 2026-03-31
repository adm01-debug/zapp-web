import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMessages } from '@/hooks/useMessages';
import { Conversation, Message } from '@/types/chat';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Minus, Maximize2, Minimize2, X } from 'lucide-react';

const ChatPanel = lazy(() => import('@/components/inbox/ChatPanel').then(m => ({ default: m.ChatPanel })));

function mapToLegacyMessages(msgs: any[], contactId: string): Message[] {
  return msgs.map((m) => ({
    id: m.id,
    conversationId: contactId,
    content: m.content,
    type: (m.message_type || 'text') as Message['type'],
    sender: m.sender as Message['sender'],
    agentId: m.agent_id || undefined,
    timestamp: new Date(m.created_at),
    status: (m.status as Message['status'] | null) || (m.is_read ? 'read' : 'delivered'),
    mediaUrl: m.media_url || undefined,
    transcription: m.transcription || null,
    transcriptionStatus: m.transcription_status as Message['transcriptionStatus'] || null,
  }));
}

export default function ChatPopup() {
  const { contactId } = useParams<{ contactId: string }>();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const { messages, loading: messagesLoading } = useMessages({ contactId: contactId || '', enabled: !!contactId });

  useEffect(() => {
    if (!contactId) return;
    (async () => {
      const { data } = await supabase.from('contacts').select('*').eq('id', contactId).single();
      if (data) {
        setContact(data);
        document.title = `Chat — ${data.name}`;
      }
      setLoading(false);
    })();
  }, [contactId]);

  const conversation: Conversation | null = contact ? {
    id: contactId!,
    contact: {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      avatar: contact.avatar_url || undefined,
      email: contact.email || undefined,
      tags: contact.tags || [],
      createdAt: new Date(contact.created_at),
    },
    status: 'open',
    lastMessage: undefined,
    unreadCount: 0,
    tags: contact.tags || [],
    priority: contact.ai_priority === 'high' ? 'high' : 'medium',
    createdAt: new Date(contact.created_at),
    updatedAt: new Date(contact.updated_at),
    assignedTo: undefined,
  } : null;

  const legacyMessages = contactId ? mapToLegacyMessages(messages, contactId) : [];

  const handleSendMessage = useCallback(async (content: string) => {
    if (!contactId) return;
    await supabase.from('messages').insert({
      contact_id: contactId,
      content,
      sender: 'agent',
      message_type: 'text',
    });
  }, [contactId]);

  const handleClose = () => window.close();

  const handleToggleMaximize = () => {
    if (isMaximized) {
      window.resizeTo(420, 650);
      setIsMaximized(false);
    } else {
      window.resizeTo(screen.availWidth, screen.availHeight);
      window.moveTo(0, 0);
      setIsMaximized(true);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="space-y-3 text-center">
          <Skeleton className="h-10 w-10 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!contact || !conversation) {
    return (
      <div className="h-screen bg-background flex items-center justify-center text-muted-foreground">
        Contato não encontrado
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Compact popup titlebar */}
      <div className="flex items-center justify-between px-3 h-9 bg-card border-b border-border shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="w-5 h-5">
            <AvatarImage src={contact.avatar_url} />
            <AvatarFallback className="bg-primary/15 text-primary text-[8px] font-bold">
              {contact.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground truncate">
            {contact.name}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 text-muted-foreground hover:text-foreground"
            onClick={() => window.resizeTo(420, 48)}
            title="Minimizar"
          >
            <Minus className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 text-muted-foreground hover:text-foreground"
            onClick={handleToggleMaximize}
            title={isMaximized ? "Restaurar" : "Maximizar"}
          >
            {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 text-muted-foreground hover:text-destructive"
            onClick={handleClose}
            title="Fechar"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Chat content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-8 w-32" />
          </div>
        }>
          <ChatPanel
            key={contactId}
            conversation={conversation}
            messages={legacyMessages}
            onSendMessage={handleSendMessage}
          />
        </Suspense>
      </div>
    </div>
  );
}
