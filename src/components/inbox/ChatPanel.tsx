import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Conversation, Message, QuickReply, InteractiveMessage, InteractiveButton, LocationMessage, MessageReaction } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence, StaggeredList, StaggeredItem } from '@/components/ui/motion';
import { TypingIndicator, TypingIndicatorCompact } from './TypingIndicator';
import { MessageReactions } from './MessageReactions';
import { useTypingPresence } from '@/hooks/useTypingPresence';
import { MessageImage } from './ImagePreview';
import { MediaMessage, DocumentPreview, VideoPreview } from './MediaPreview';
import { TransferDialog } from './TransferDialog';
import { ScheduleMessageDialog } from './ScheduleMessageDialog';
import { AudioRecorder } from './AudioRecorder';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { AISuggestions } from './AISuggestions';
import { MessageTemplates } from './MessageTemplates';
import { GlobalSearch } from './GlobalSearch';
import { ConversationSummary } from './ConversationSummary';
import { SLAIndicator } from './SLAIndicator';
import { CallDialog } from '@/components/calls/CallDialog';
import { InteractiveMessageDisplay, ButtonResponseBadge } from './InteractiveMessage';
import { InteractiveMessageBuilder } from './InteractiveMessageBuilder';
import { ReplyPreview, QuotedMessage } from './ReplyQuote';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { LocationMessageDisplay } from './LocationMessage';
import { LocationPicker } from './LocationPicker';
import { ProductCatalog } from '@/components/catalog/ProductCatalog';
import { ProductMessage } from '@/components/catalog/ProductMessage';
import { Product } from '@/components/catalog/ProductCard';
import { AIConversationAssistant } from './AIConversationAssistant';
import { FileUploader, FileUploaderRef } from './FileUploader';
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
  Search,
  Layers,
  Reply,
  Forward,
  Copy,
  MapPin,
  Package,
  Brain,
} from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuickReplies } from '@/hooks/useQuickReplies';

interface ChatPanelProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

// Mock reactions data with new format
const mockReactions: Record<string, MessageReaction[]> = {
  'msg-1': [{ emoji: '👍', userId: 'agent', userName: 'Agente', timestamp: new Date() }],
  'msg-3': [
    { emoji: '❤️', userId: 'contact', userName: 'Cliente', timestamp: new Date() },
    { emoji: '❤️', userId: 'agent', userName: 'Agente', timestamp: new Date() }
  ],
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

// Message status icon with improved styling
function MessageStatusIcon({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="w-3 h-3" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-400" />;
    case 'failed':
      return <X className="w-3 h-3 text-destructive" />;
    default:
      return <Clock className="w-3 h-3 animate-pulse" />;
  }
}

export function ChatPanel({ conversation, messages, onSendMessage }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [reactions, setReactions] = useState(mockReactions);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showInteractiveBuilder, setShowInteractiveBuilder] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragCounterRef = useRef(0);
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  // Use Supabase Presence for typing indicator
  const { 
    isContactTyping, 
    typingUsers,
    handleTypingStart, 
    handleTypingStop 
  } = useTypingPresence({
    conversationId: conversation.id,
    currentUserId: 'agent',
    currentUserName: conversation.assignedTo?.name || 'Agente'
  });

  // Quick replies from DB
  const { quickReplies: dbQuickReplies, incrementUseCount } = useQuickReplies();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isContactTyping]);

  const handleSend = () => {
    if (inputValue.trim()) {
      // In real implementation, include replyTo data
      if (replyToMessage) {
        console.log('Sending reply to:', replyToMessage.id);
        toast({
          title: 'Resposta enviada',
          description: `Respondendo a: "${replyToMessage.content.slice(0, 30)}..."`,
        });
      }
      onSendMessage(inputValue.trim());
      setInputValue('');
      setReplyToMessage(null);
      handleTypingStop();
    }
  };

  const handleReplyToMessage = (message: Message) => {
    setReplyToMessage(message);
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 2000);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copiado!',
      description: 'Mensagem copiada para a área de transferência.',
    });
  };

  const handleForwardMessage = (message: Message) => {
    setForwardMessage(message);
    setShowForwardDialog(true);
  };

  const handleForwardToTargets = (targetIds: string[], targetType: 'contact' | 'group') => {
    // In a real implementation, this would send via WhatsApp API
    console.log('Forwarding to:', { targetIds, targetType, message: forwardMessage });
    // The toast is shown in the ForwardMessageDialog component
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value.length > 0) {
      handleTypingStart(); // Signal that agent is typing
    } else {
      handleTypingStop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Ctrl+K for global search
    if (e.key === 'k' && e.ctrlKey) {
      e.preventDefault();
      setShowGlobalSearch(true);
    }
    if (inputValue.startsWith('/')) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }
  };

  const handleQuickReply = (reply: { id: string; title: string; shortcut: string; content: string; category: string }) => {
    setInputValue(reply.content);
    setShowQuickReplies(false);
    incrementUseCount(reply.id);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setReactions((prev) => {
      const messageReactions = prev[messageId] || [];
      const newReaction: MessageReaction = {
        emoji,
        userId: 'agent',
        userName: 'Agente',
        timestamp: new Date(),
      };
      
      return {
        ...prev,
        [messageId]: [...messageReactions, newReaction],
      };
    });
    
    toast({
      title: 'Reação adicionada',
      description: `Você reagiu com ${emoji}`,
    });
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    setReactions((prev) => {
      const messageReactions = prev[messageId] || [];
      const filtered = messageReactions.filter(
        r => !(r.emoji === emoji && r.userId === 'agent')
      );
      
      return {
        ...prev,
        [messageId]: filtered,
      };
    });
    
    toast({
      title: 'Reação removida',
      description: `Você removeu ${emoji}`,
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

  const handleSendInteractiveMessage = (interactive: InteractiveMessage) => {
    // In a real implementation, this would send via WhatsApp API
    toast({
      title: 'Mensagem interativa enviada!',
      description: `Mensagem com ${interactive.buttons?.length || 0} botões enviada.`,
    });
    console.log('Interactive message:', interactive);
  };

  const handleInteractiveButtonClick = (button: InteractiveButton) => {
    toast({
      title: 'Botão clicado',
      description: `Resposta: ${button.title}`,
    });
    console.log('Button clicked:', button);
  };

  const handleSendLocation = (location: LocationMessage) => {
    toast({
      title: 'Localização enviada!',
      description: location.isLive 
        ? `Localização em tempo real por ${location.liveUntil ? Math.round((location.liveUntil.getTime() - Date.now()) / 60000) : 15} minutos`
        : location.name || 'Localização compartilhada',
    });
    console.log('Location sent:', location);
  };

  const handleSendProduct = (product: Product) => {
    toast({
      title: 'Produto enviado!',
      description: `${product.name} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: product.currency }).format(product.price)}`,
    });
    console.log('Product sent:', product);
  };

  const filteredQuickReplies = dbQuickReplies.filter(
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

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0]; // Process first file
      setDroppedFile(file);
      // The FileUploader will handle this file
      if (fileUploaderRef.current) {
        fileUploaderRef.current.handleExternalFile(file);
      }
    }
  };

  return (
    <div 
      className="flex h-full bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card p-8 rounded-xl shadow-xl border border-primary/30 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Paperclip className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Soltar arquivo aqui</h3>
              <p className="text-sm text-muted-foreground">
                Imagens, vídeos, áudios e documentos
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1 h-full">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-card"
      >
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }}>
            <Avatar className="w-10 h-10 ring-2 ring-border/30">
              <AvatarImage src={conversation.contact.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
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
                  'text-[10px] capitalize border',
                  conversation.status === 'open' && 'border-success/50 text-success bg-success/10',
                  conversation.status === 'pending' && 'border-warning/50 text-warning bg-warning/10',
                  conversation.status === 'resolved' && 'border-muted-foreground/50 text-muted-foreground',
                  conversation.status === 'waiting' && 'border-info/50 text-info bg-info/10'
                )}
              >
                {conversation.status === 'open' ? 'Aberto' : 
                 conversation.status === 'pending' ? 'Pendente' :
                 conversation.status === 'resolved' ? 'Resolvido' : 'Aguardando'}
              </Badge>
              {/* SLA Indicator in header */}
              <SLAIndicator
                firstMessageAt={conversation.createdAt}
                firstResponseAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
                resolvedAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
                firstResponseMinutes={conversation.priority === 'high' ? 2 : 5}
                resolutionMinutes={conversation.priority === 'high' ? 30 : 60}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isContactTyping ? (
                <TypingIndicatorCompact isVisible={true} />
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
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => setShowGlobalSearch(true)}
              title="Buscar (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={handleStartCall}
            >
              <PhoneCall className="w-4 h-4" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
              <Video className="w-4 h-4" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "text-muted-foreground hover:text-primary hover:bg-primary/10",
                showAIAssistant && "text-primary bg-primary/10"
              )}
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              title="Assistente IA"
            >
              <Brain className="w-4 h-4" />
            </Button>
          </motion.div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border/30">
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

      {/* Conversation Summary */}
      <ConversationSummary 
        messages={messages.map(m => ({
          id: m.id,
          sender: m.sender,
          content: m.content,
          created_at: m.timestamp.toISOString()
        }))}
        contactName={conversation.contact.name}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-muted/5">
        {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
          <div key={dateKey}>
            {/* Date separator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center my-4"
            >
              <span className="text-xs text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full font-medium border border-border/20">
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
                    <div 
                      ref={(el) => { messageRefs.current[message.id] = el; }}
                      className={cn('flex group', isSent ? 'justify-end' : 'justify-start')}
                    >
                      <motion.div
                        initial={{ opacity: 0, x: isSent ? 20 : -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="max-w-[70%] space-y-1 relative"
                      >
                        {/* Message Actions (visible on hover) */}
                        <div className={cn(
                          "absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                          isSent ? "right-full mr-2" : "left-full ml-2"
                        )}>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleReplyToMessage(message)}
                            className="p-1.5 rounded-full bg-card border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-sm"
                            title="Responder"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleForwardMessage(message)}
                            className="p-1.5 rounded-full bg-card border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-sm"
                            title="Encaminhar"
                          >
                            <Forward className="w-3.5 h-3.5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleCopyMessage(message.content)}
                            className="p-1.5 rounded-full bg-card border border-border/50 text-muted-foreground hover:text-primary hover:bg-primary/10 shadow-sm"
                            title="Copiar"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>

                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className={cn(
                            'relative px-4 py-2.5 rounded-2xl shadow-sm transition-all',
                            isSent 
                              ? 'rounded-br-md bg-primary text-primary-foreground' 
                              : 'rounded-bl-md bg-card border border-border/30 text-foreground'
                          )}
                        >
                          {/* Subtle glow for sent messages */}
                          {isSent && (
                            <div className="absolute inset-0 rounded-2xl rounded-br-md bg-primary/30 blur-lg -z-10" />
                          )}

                          {/* Quoted message (reply) */}
                          {message.replyTo && (
                            <QuotedMessage
                              replyTo={message.replyTo}
                              isSent={isSent}
                              onClick={() => scrollToMessage(message.replyTo!.messageId)}
                            />
                          )}

                          {/* Button response badge */}
                          {message.buttonResponse && (
                            <ButtonResponseBadge 
                              buttonTitle={message.buttonResponse.buttonTitle}
                              isSent={isSent}
                            />
                          )}

                          {/* Interactive message */}
                          {message.type === 'interactive' && message.interactive && (
                            <InteractiveMessageDisplay
                              interactive={message.interactive}
                              isSent={isSent}
                              onButtonClick={handleInteractiveButtonClick}
                            />
                          )}

                          {/* Image message */}
                          {message.type === 'image' && message.mediaUrl && (
                            <div className="mb-2 rounded-lg overflow-hidden">
                              <MessageImage src={message.mediaUrl} />
                            </div>
                          )}

                          {/* Video message */}
                          {message.type === 'video' && message.mediaUrl && (
                            <div className="mb-2">
                              <VideoPreview
                                url={message.mediaUrl}
                                caption={message.content}
                                isSent={isSent}
                              />
                            </div>
                          )}

                          {/* Audio message */}
                          {message.type === 'audio' && message.mediaUrl && (
                            <div className="mb-2">
                              <AudioMessagePlayer
                                audioUrl={message.mediaUrl}
                                messageId={message.id}
                                isSent={isSent}
                              />
                            </div>
                          )}

                          {/* Document message */}
                          {message.type === 'document' && message.mediaUrl && (
                            <div className="mb-2">
                              <DocumentPreview
                                url={message.mediaUrl}
                                fileName={message.content || 'documento'}
                                isSent={isSent}
                              />
                            </div>
                          )}

                          {/* Location message */}
                          {message.type === 'location' && message.location && (
                            <LocationMessageDisplay
                              location={message.location}
                              isSent={isSent}
                            />
                          )}

                          {/* Text content - hide for video/document with content as filename */}
                          {message.content && message.type !== 'audio' && message.type !== 'location' && message.type !== 'video' && message.type !== 'document' && (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          )}

                          {/* Timestamp and status */}
                          <div
                            className={cn(
                              'flex items-center justify-end gap-1.5 mt-1',
                              isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            )}
                          >
                            <span className="text-[10px]">
                              {formatMessageTime(message.timestamp)}
                            </span>
                            {isSent && <MessageStatusIcon status={message.status} />}
                          </div>
                        </motion.div>

                        {/* Reactions */}
                        <MessageReactions
                          messageId={message.id}
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
        <div className="flex justify-start">
          <TypingIndicator 
            isVisible={isContactTyping} 
            userName={typingUsers[0]?.name || conversation.contact.name}
          />
        </div>

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

      {/* Reply Preview */}
      <AnimatePresence>
        {replyToMessage && (
          <ReplyPreview
            message={replyToMessage}
            onCancel={handleCancelReply}
          />
        )}
      </AnimatePresence>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 glass-strong border-t border-border/50"
      >
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1">
            {/* File Uploader with WhatsApp validation - connected to Evolution API */}
            <FileUploader
              ref={fileUploaderRef}
              instanceName={conversation.contact.id} // Use connection instance name when available
              recipientNumber={conversation.contact.phone}
              onFileSelect={(file, category) => {
                toast({
                  title: 'Arquivo selecionado',
                  description: `${file.name} (${category}) será enviado.`,
                });
              }}
              onFileSent={(result) => {
                toast({
                  title: 'Arquivo enviado!',
                  description: 'O arquivo foi enviado com sucesso via WhatsApp.',
                });
                console.log('File sent:', result);
              }}
            />
            
            {/* Interactive Message Button */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setShowInteractiveBuilder(true)}
                title="Mensagem Interativa"
              >
                <Layers className="w-5 h-5" />
              </Button>
            </motion.div>
            <Popover>
              <PopoverTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                    <Zap className="w-5 h-5" />
                  </Button>
                </motion.div>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 glass-strong border-border/50" align="start">
                <div className="p-3 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
                  <h4 className="font-medium text-sm">Respostas Rápidas</h4>
                  <p className="text-xs text-muted-foreground">
                    Digite / para usar atalhos
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {dbQuickReplies.map((reply) => (
                    <motion.button
                      key={reply.id}
                      whileHover={{ x: 4 }}
                      onClick={() => handleQuickReply(reply)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{reply.title}</span>
                        <Badge variant="outline" className="text-[10px] border-primary/30">
                          {reply.shortcut}
                        </Badge>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* AI Suggestions */}
            <AISuggestions
              messages={messages.map(m => ({
                id: m.id,
                content: m.content,
                sender: m.sender,
                timestamp: m.timestamp
              }))}
              contactName={conversation.contact.name}
              onSelectSuggestion={(text) => setInputValue(text)}
            />
            
            {/* Message Templates */}
            <MessageTemplates onSelectTemplate={(text) => setInputValue(text)} />
          </div>

          <div className="flex-1 relative group">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleTypingStop}
              placeholder={replyToMessage ? "Digite sua resposta..." : "Digite uma mensagem..."}
              className="pr-10 glass border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
            />
            <motion.div 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary w-8 h-8"
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
                "text-muted-foreground hover:text-primary hover:bg-primary/10",
                isRecordingAudio && "text-destructive bg-destructive/10"
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
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => setShowLocationPicker(true)}
              title="Compartilhar localização"
            >
              <MapPin className="w-5 h-5" />
            </Button>
          </motion.div>

          {/* Product Catalog */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <ProductCatalog
              onSendProduct={handleSendProduct}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                  title="Catálogo de produtos"
                >
                  <Package className="w-5 h-5" />
                </Button>
              }
            />
          </motion.div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
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
              className="text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-50"
              style={{ background: 'var(--gradient-primary)' }}
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

      {/* Global Search */}
      <GlobalSearch
        open={showGlobalSearch}
        onOpenChange={setShowGlobalSearch}
        onSelectResult={(result) => {
          console.log('Selected:', result);
          toast({
            title: "Resultado selecionado",
            description: result.title
          });
        }}
      />

      {/* Interactive Message Builder */}
      <InteractiveMessageBuilder
        open={showInteractiveBuilder}
        onOpenChange={setShowInteractiveBuilder}
        onSend={handleSendInteractiveMessage}
      />

      {/* Forward Message Dialog */}
      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        message={forwardMessage}
        onForward={handleForwardToTargets}
      />

      {/* Location Picker */}
      <LocationPicker
        open={showLocationPicker}
        onOpenChange={setShowLocationPicker}
        onSend={handleSendLocation}
      />
      </div>

      {/* AI Conversation Assistant */}
      <AIConversationAssistant
        messages={messages.map(m => ({
          id: m.id,
          sender: m.sender,
          content: m.content,
          type: m.type,
          mediaUrl: m.mediaUrl,
          created_at: m.timestamp.toISOString()
        }))}
        contactId={conversation.contact.id}
        contactName={conversation.contact.name}
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
      />
    </div>
  );
}
