import { useRef, useEffect, useState } from 'react';
import { TeamConversation, useTeamMessages, useSendTeamMessage, TeamMessage } from '@/hooks/useTeamChat';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  conversation: TeamConversation;
  onBack: () => void;
}

function formatTime(dateStr: string) {
  return format(new Date(dateStr), 'HH:mm');
}

function formatDateSep(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return format(d, "d 'de' MMMM", { locale: ptBR });
}

export function TeamChatPanel({ conversation, onBack }: Props) {
  const { profile } = useAuth();
  const { data: messages = [], isLoading } = useTeamMessages(conversation.id);
  const sendMutation = useSendTeamMessage();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate({
      conversationId: conversation.id,
      content: trimmed,
    });
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  let lastDate = '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarImage src={conversation.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {conversation.type === 'group' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{conversation.name}</h3>
          <p className="text-xs text-muted-foreground">
            {conversation.type === 'group'
              ? `${conversation.members?.length || 0} membros`
              : conversation.members?.find(m => m.profile_id !== profile?.id)?.profile?.is_active
                ? 'Online'
                : 'Offline'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-1 bg-muted/5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <Skeleton className="h-10 rounded-2xl" style={{ width: 120 + (i % 3) * 60 }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            Envie a primeira mensagem!
          </div>
        ) : (
          messages.map((msg) => {
            const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
            let showDate = false;
            if (dateKey !== lastDate) {
              lastDate = dateKey;
              showDate = true;
            }
            const isMine = msg.sender_id === profile?.id;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center py-2">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/20">
                      {formatDateSep(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={cn("flex gap-2 py-0.5", isMine ? "justify-end" : "justify-start")}>
                  {!isMine && (
                    <Avatar className="w-7 h-7 mt-1 shrink-0">
                      <AvatarImage src={msg.sender?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {msg.sender?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    "max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border/30 text-foreground rounded-bl-md"
                  )}>
                    {!isMine && conversation.type === 'group' && (
                      <p className="text-[10px] font-medium mb-0.5 opacity-70">{msg.sender?.name}</p>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-0.5 text-right",
                      isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>
                      {formatTime(msg.created_at)}
                      {msg.is_edited && ' · editado'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className="shrink-0 h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
