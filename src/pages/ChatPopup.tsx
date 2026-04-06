import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMessages } from '@/hooks/useMessages';
import { Conversation, Message } from '@/types/chat';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Minus,
  Maximize2,
  Minimize2,
  X,
  Phone,
  Search,
  MoreVertical,
  MessageSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

const ChatPanel = lazy(() =>
  import('@/components/inbox/ChatPanel').then((m) => ({ default: m.ChatPanel }))
);

interface RawMessage {
  id: string;
  content: string;
  message_type?: string;
  sender: string;
  agent_id?: string;
  created_at: string;
  status?: string;
  is_read?: boolean;
  media_url?: string;
  transcription?: string;
  transcription_status?: string;
}

function mapToLegacyMessages(msgs: RawMessage[], contactId: string): Message[] {
  return msgs.map((m) => ({
    id: m.id,
    conversationId: contactId,
    content: m.content,
    type: (m.message_type || 'text') as Message['type'],
    sender: m.sender as Message['sender'],
    agentId: m.agent_id || undefined,
    timestamp: new Date(m.created_at),
    status:
      (m.status as Message['status'] | null) ||
      (m.is_read ? 'read' : 'delivered'),
    mediaUrl: m.media_url || undefined,
    transcription: m.transcription || null,
    transcriptionStatus:
      (m.transcription_status as Message['transcriptionStatus']) || null,
  }));
}

export default function ChatPopup() {
  const { contactId } = useParams<{ contactId: string }>();
  const [contact, setContact] = useState<{ id: string; name: string; phone: string; avatar_url?: string | null; email?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const { messages, loading: messagesLoading } = useMessages({
    contactId: contactId || '',
    enabled: !!contactId,
  });

  useEffect(() => {
    if (!contactId) return;
    (async () => {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      if (data) {
        setContact(data);
        document.title = `Chat — ${data.name}`;
      }
      setLoading(false);
    })();
  }, [contactId]);

  const conversation: Conversation | null = contact
    ? {
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
      }
    : null;

  const legacyMessages = contactId
    ? mapToLegacyMessages(messages, contactId)
    : [];

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!contactId) return;
      await supabase.from('messages').insert({
        contact_id: contactId,
        content,
        sender: 'agent',
        message_type: 'text',
      });
    },
    [contactId]
  );

  const handleClose = () => window.close();

  const handleToggleMaximize = () => {
    if (isMaximized) {
      window.resizeTo(440, 680);
      setIsMaximized(false);
    } else {
      window.resizeTo(screen.availWidth, screen.availHeight);
      window.moveTo(0, 0);
      setIsMaximized(true);
    }
  };

  const initials = contact?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // ── Loading State ──
  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
          </div>
          <div className="space-y-2 text-center">
            <Skeleton className="h-4 w-28 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not Found ──
  if (!contact || !conversation) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Contato não encontrado
        </p>
        <Button variant="outline" size="sm" onClick={handleClose}>
          Fechar janela
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* ── Unified Header ── */}
        <div className="flex items-center justify-between px-3 h-12 bg-card/80 backdrop-blur-sm border-b border-border shrink-0 select-none">
          {/* Left: Avatar + Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="w-8 h-8 ring-1 ring-border">
                <AvatarImage src={contact.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate leading-tight">
                {contact.name}
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight flex items-center gap-1">
                <span className="truncate">{contact.phone}</span>
                {contact.tags?.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-3.5 text-[9px] px-1 py-0 font-normal"
                  >
                    {contact.tags[0]}
                  </Badge>
                )}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <Search className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Buscar
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <Phone className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Ligar
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border mx-0.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-foreground rounded-lg"
                  onClick={() => window.resizeTo(440, 48)}
                  title="Minimizar"
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Minimizar
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-foreground rounded-lg"
                  onClick={handleToggleMaximize}
                >
                  {isMaximized ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isMaximized ? 'Restaurar' : 'Maximizar'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-destructive rounded-lg"
                  onClick={handleClose}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Fechar
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Chat Content ── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-xs text-muted-foreground">
                    Carregando conversa...
                  </span>
                </div>
              </div>
            }
          >
            <ChatPanel
              key={contactId}
              conversation={conversation}
              messages={legacyMessages}
              onSendMessage={handleSendMessage}
              hideHeader
            />
          </Suspense>
        </div>
      </div>
    </TooltipProvider>
  );
}
