import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Conversation, Message, QuickReply } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  UserPlus,
  Tag,
  Archive,
  CheckCircle,
  Zap,
  Image,
  Mic,
  X,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mockQuickReplies } from '@/data/mockData';

interface ChatPanelProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export function ChatPanel({ conversation, messages, onSendMessage }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (inputValue.startsWith('/')) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }
  };

  const handleQuickReply = (reply: QuickReply) => {
    setInputValue(reply.content);
    setShowQuickReplies(false);
  };

  const filteredQuickReplies = mockQuickReplies.filter(
    (reply) =>
      inputValue.startsWith('/') &&
      reply.shortcut.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-chat-header border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={conversation.contact.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">
                {conversation.contact.name}
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] capitalize',
                  conversation.status === 'open' && 'border-status-open text-status-open',
                  conversation.status === 'pending' && 'border-status-pending text-status-pending',
                  conversation.status === 'resolved' && 'border-status-resolved text-status-resolved',
                  conversation.status === 'waiting' && 'border-status-waiting text-status-waiting'
                )}
              >
                {conversation.status === 'open' ? 'Aberto' : 
                 conversation.status === 'pending' ? 'Pendente' :
                 conversation.status === 'resolved' ? 'Resolvido' : 'Aguardando'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{conversation.contact.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <UserPlus className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Tag className="w-4 h-4 mr-2" />
                Adicionar tag
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="w-4 h-4 mr-2" />
                Transferir
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como resolvido
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="w-4 h-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Assigned agent bar */}
      {conversation.assignedTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Atribuído a:</span>
            <Avatar className="w-5 h-5">
              <AvatarImage src={conversation.assignedTo.avatar} />
              <AvatarFallback className="text-[10px]">
                {conversation.assignedTo.name[0]}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{conversation.assignedTo.name}</span>
          </div>
          <Button variant="ghost" size="sm" className="text-xs h-7">
            <UserPlus className="w-3 h-3 mr-1" />
            Transferir
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message, index) => {
          const isSent = message.sender === 'agent';
          const showTimestamp =
            index === 0 ||
            new Date(message.timestamp).getTime() -
              new Date(messages[index - 1].timestamp).getTime() >
              5 * 60 * 1000;

          return (
            <div key={message.id}>
              {showTimestamp && (
                <div className="flex justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {format(message.timestamp, "d 'de' MMMM, HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  'flex animate-fade-in',
                  isSent ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'message-bubble',
                    isSent ? 'sent' : 'received'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div
                    className={cn(
                      'flex items-center justify-end gap-1 mt-1',
                      isSent ? 'text-white/70' : 'text-muted-foreground'
                    )}
                  >
                    <span className="text-[10px]">
                      {format(message.timestamp, 'HH:mm')}
                    </span>
                    {isSent && (
                      <span className="text-[10px]">
                        {message.status === 'read' ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies popover */}
      {showQuickReplies && filteredQuickReplies.length > 0 && (
        <div className="absolute bottom-20 left-4 right-4 bg-popover border border-border rounded-lg shadow-lg p-2 z-10">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs font-medium text-muted-foreground">
              Respostas rápidas
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5"
              onClick={() => setShowQuickReplies(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredQuickReplies.map((reply) => (
              <button
                key={reply.id}
                onClick={() => handleQuickReply(reply)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{reply.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {reply.shortcut}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {reply.content}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-chat-input-bg border-t border-border">
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Image className="w-5 h-5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Zap className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <div className="p-3 border-b border-border">
                  <h4 className="font-medium text-sm">Respostas Rápidas</h4>
                  <p className="text-xs text-muted-foreground">
                    Digite / para usar atalhos
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {mockQuickReplies.map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => handleQuickReply(reply)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{reply.title}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {reply.shortcut}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              className="pr-10 bg-secondary border-0"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground w-8 h-8"
            >
              <Smile className="w-5 h-5" />
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Mic className="w-5 h-5" />
          </Button>

          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
