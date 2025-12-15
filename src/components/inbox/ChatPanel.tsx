import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Conversation, Message, QuickReply } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { TypingIndicator } from './TypingIndicator';
import { MessageReactions } from './MessageReactions';
import { MessageImage } from './ImagePreview';
import { TransferDialog } from './TransferDialog';
import { ScheduleMessageDialog } from './ScheduleMessageDialog';
import { AudioRecorder } from './AudioRecorder';
import { CallDialog } from '@/components/calls/CallDialog';
import { toast } from '@/hooks/use-toast';
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
  Check,
  CheckCheck,
  Clock,
  ArrowRight,
  PhoneCall,
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mockQuickReplies } from '@/data/mockData';

interface ChatPanelProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

// Mock reactions data
const mockReactions: Record<string, { emoji: string; count: number }[]> = {
  'msg-1': [{ emoji: '👍', count: 1 }],
  'msg-3': [{ emoji: '❤️', count: 2 }],
};

// Format timestamp intelligently
function formatMessageTime(date: Date): string {
  return format(date, 'HH:mm');
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) {
    return 'Hoje';
  }
  if (isYesterday(date)) {
    return 'Ontem';
  }
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

// Message status icon
function MessageStatus({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="w-3 h-3" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-whatsapp-light" />;
    default:
      return null;
  }
}

export function ChatPanel({ conversation, messages, onSendMessage }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [reactions, setReactions] = useState(mockReactions);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('outbound');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Simulate contact typing
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTyping((prev) => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const handleReaction = (messageId: string, emoji: string) => {
    setReactions((prev) => {
      const messageReactions = prev[messageId] || [];
      const existingIndex = messageReactions.findIndex((r) => r.emoji === emoji);
      
      if (existingIndex >= 0) {
        const updated = [...messageReactions];
        updated[existingIndex].count++;
        return { ...prev, [messageId]: updated };
      }
      
      return {
        ...prev,
        [messageId]: [...messageReactions, { emoji, count: 1 }],
      };
    });
  };

  const handleTransfer = (type: 'agent' | 'queue', targetId: string, message?: string) => {
    toast({
      title: 'Chat transferido!',
      description: type === 'agent' 
        ? 'O chat foi transferido para outro atendente.'
        : 'O chat foi transferido para outra fila.',
    });
  };

  const handleScheduleMessage = (message: string, scheduledAt: Date, attachment?: File) => {
    console.log('Scheduled message:', { message, scheduledAt, attachment });
  };

  const handleAudioSend = (audioBlob: Blob) => {
    toast({
      title: 'Áudio enviado!',
      description: 'A mensagem de áudio foi enviada com sucesso.',
    });
    setIsRecordingAudio(false);
  };

  const handleStartCall = () => {
    setCallDirection('outbound');
    setShowCallDialog(true);
  };

  const handleEndCall = () => {
    setShowCallDialog(false);
  };

  const filteredQuickReplies = mockQuickReplies.filter(
    (reply) =>
      inputValue.startsWith('/') &&
      reply.shortcut.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const dateKey = format(message.timestamp, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-3 bg-chat-header border-b border-border"
      >
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }}>
            <Avatar className="w-10 h-10">
              <AvatarImage src={conversation.contact.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </motion.div>
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
            <p className="text-xs text-muted-foreground">
              {isTyping ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-whatsapp"
                >
                  digitando...
                </motion.span>
              ) : (
                conversation.contact.phone
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground hover:text-whatsapp"
              onClick={handleStartCall}
            >
              <PhoneCall className="w-4 h-4" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Video className="w-4 h-4" />
            </Button>
          </motion.div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Tag className="w-4 h-4 mr-2" />
                Adicionar tag
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTransferDialog(true)}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Transferir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowScheduleDialog(true)}>
                <Clock className="w-4 h-4 mr-2" />
                Agendar mensagem
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
      </motion.div>

      {/* Assigned agent bar */}
      <AnimatePresence>
        {conversation.assignedTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border"
          >
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
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => setShowTransferDialog(true)}
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                Transferir
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
          <div key={dateKey}>
            {/* Date separator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center my-4"
            >
              <span className="text-xs text-muted-foreground bg-muted/80 backdrop-blur-sm px-4 py-1.5 rounded-full font-medium">
                {formatDateSeparator(new Date(dateKey))}
              </span>
            </motion.div>

            {/* Messages for this day */}
            <StaggeredList className="space-y-3">
              {dayMessages.map((message) => {
                const isSent = message.sender === 'agent';
                const messageReactions = reactions[message.id] || [];

                return (
                  <StaggeredItem key={message.id}>
                    <div className={cn('flex group', isSent ? 'justify-end' : 'justify-start')}>
                      <motion.div
                        initial={{ opacity: 0, x: isSent ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="max-w-[70%] space-y-1"
                      >
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className={cn('message-bubble relative', isSent ? 'sent' : 'received')}
                        >
                          {/* Image message */}
                          {message.type === 'image' && message.mediaUrl && (
                            <div className="mb-2">
                              <MessageImage src={message.mediaUrl} />
                            </div>
                          )}

                          {/* Text content */}
                          {message.content && (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}

                          {/* Timestamp and status */}
                          <div
                            className={cn(
                              'flex items-center justify-end gap-1.5 mt-1',
                              isSent ? 'text-white/70' : 'text-muted-foreground'
                            )}
                          >
                            <span className="text-[10px]">
                              {formatMessageTime(message.timestamp)}
                            </span>
                            {isSent && <MessageStatus status={message.status} />}
                          </div>
                        </motion.div>

                        {/* Reactions */}
                        <MessageReactions
                          messageId={message.id}
                          reactions={messageReactions}
                          onReact={(emoji) => handleReaction(message.id, emoji)}
                          isSent={isSent}
                        />
                      </motion.div>
                    </div>
                  </StaggeredItem>
                );
              })}
            </StaggeredList>
          </div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-start"
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies popover */}
      <AnimatePresence>
        {showQuickReplies && filteredQuickReplies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-4 right-4 bg-popover border border-border rounded-lg shadow-lg p-2 z-10"
          >
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-medium text-muted-foreground">
                Respostas rápidas
              </span>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5"
                  onClick={() => setShowQuickReplies(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </motion.div>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredQuickReplies.map((reply) => (
                <motion.button
                  key={reply.id}
                  whileHover={{ x: 4 }}
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
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-chat-input-bg border-t border-border"
      >
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1">
            {[Paperclip, Image].map((Icon, index) => (
              <motion.div key={index} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Icon className="w-5 h-5" />
                </Button>
              </motion.div>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Zap className="w-5 h-5" />
                  </Button>
                </motion.div>
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
                    <motion.button
                      key={reply.id}
                      whileHover={{ x: 4 }}
                      onClick={() => handleQuickReply(reply)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{reply.title}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {reply.shortcut}
                        </Badge>
                      </div>
                    </motion.button>
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
            <motion.div 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground w-8 h-8"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "text-muted-foreground hover:text-foreground",
                isRecordingAudio && "text-destructive"
              )}
              onClick={() => setIsRecordingAudio(!isRecordingAudio)}
            >
              <Mic className="w-5 h-5" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowScheduleDialog(true)}
            >
              <Clock className="w-5 h-5" />
            </Button>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="bg-whatsapp hover:bg-whatsapp-dark text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        {/* Audio Recorder */}
        <AnimatePresence>
          {isRecordingAudio && (
            <div className="mt-3">
              <AudioRecorder
                onSend={handleAudioSend}
                onCancel={() => setIsRecordingAudio(false)}
              />
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dialogs */}
      <TransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        onTransfer={handleTransfer}
      />
      
      <ScheduleMessageDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onSchedule={handleScheduleMessage}
      />

      <CallDialog
        open={showCallDialog}
        onOpenChange={setShowCallDialog}
        contact={{
          name: conversation.contact.name,
          phone: conversation.contact.phone,
          avatar: conversation.contact.avatar,
        }}
        direction={callDirection}
        onEnd={handleEndCall}
      />
    </div>
  );
}
