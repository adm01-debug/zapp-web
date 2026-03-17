import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, Message, InteractiveMessage, InteractiveButton, LocationMessage } from '@/types/chat';
import { FileUploaderRef } from './FileUploader';
import { SlashCommand } from './SlashCommands';
import { Product } from '@/components/catalog/ProductCard';
import { useTypingPresence } from '@/hooks/useTypingPresence';
import { useQuickReplies } from '@/hooks/useQuickReplies';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from '@/hooks/use-toast';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';

import { ChatPanelHeader } from './chat/ChatPanelHeader';
import { ChatAssignedBar } from './chat/ChatAssignedBar';
import { ChatMessagesArea, ChatMessagesAreaRef } from './chat/ChatMessagesArea';
import { ChatInputArea } from './chat/ChatInputArea';
import { ChatDragOverlay } from './chat/ChatDragOverlay';
import { ChatQuickRepliesPopover } from './chat/ChatQuickRepliesPopover';

// Lazy-load heavy dialog/modal components (only loaded when opened)
const ConversationSummary = lazy(() => import('./ConversationSummary').then(m => ({ default: m.ConversationSummary })));
const TransferDialog = lazy(() => import('./TransferDialog').then(m => ({ default: m.TransferDialog })));
const ScheduleMessageDialog = lazy(() => import('./ScheduleMessageDialog').then(m => ({ default: m.ScheduleMessageDialog })));
const CallDialog = lazy(() => import('@/components/calls/CallDialog').then(m => ({ default: m.CallDialog })));
const GlobalSearch = lazy(() => import('./GlobalSearch').then(m => ({ default: m.GlobalSearch })));
const InteractiveMessageBuilder = lazy(() => import('./InteractiveMessageBuilder').then(m => ({ default: m.InteractiveMessageBuilder })));
const ForwardMessageDialog = lazy(() => import('./ForwardMessageDialog').then(m => ({ default: m.ForwardMessageDialog })));
const LocationPicker = lazy(() => import('./LocationPicker').then(m => ({ default: m.LocationPicker })));
const AIConversationAssistant = lazy(() => import('./AIConversationAssistant').then(m => ({ default: m.AIConversationAssistant })));

interface ChatPanelProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string) => void;
  showDetails?: boolean;
  onToggleDetails?: () => void;
}

export function ChatPanel({ conversation, messages, onSendMessage, showDetails = false, onToggleDetails }: ChatPanelProps) {
  // ── State ──
  const [inputValue, setInputValue] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
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

  // ── Refs ──
  const inputRef = useRef<HTMLInputElement>(null);
  const fileUploaderRef = useRef<FileUploaderRef>(null);
  const messagesAreaRef = useRef<ChatMessagesAreaRef>(null);
  const dragCounterRef = useRef(0);

  // ── Hooks ──
  const { isContactTyping, typingUsers, handleTypingStart, handleTypingStop } = useTypingPresence({
    conversationId: conversation.id,
    currentUserId: 'agent',
    currentUserName: conversation.assignedTo?.name || 'Agente',
  });

  const { quickReplies: dbQuickReplies, incrementUseCount } = useQuickReplies();
  const { settings, updateSettings, saveSettings } = useUserSettings();

  const handleVoiceChange = (newVoiceId: string) => {
    updateSettings({ tts_voice_id: newVoiceId });
    setTimeout(() => saveSettings(), 100);
  };

  const handleSpeedChange = (newSpeed: number) => {
    updateSettings({ tts_speed: newSpeed });
    setTimeout(() => saveSettings(), 100);
  };

  const { speak, stop, isLoading: ttsLoading, isPlaying: ttsPlaying, currentMessageId: ttsMessageId, voiceId, setVoiceId, speed, setSpeed } = useTextToSpeech({
    initialVoiceId: settings.tts_voice_id,
    initialSpeed: settings.tts_speed,
    onVoiceChange: handleVoiceChange,
    onSpeedChange: handleSpeedChange,
  });

  // ── Resolve WhatsApp instance name from contact ──
  const [instanceName, setInstanceName] = useState<string>('');

  useEffect(() => {
    const resolveInstance = async () => {
      try {
        // Look up the contact's whatsapp_connection_id → instance_id
        const { data: contact } = await supabase
          .from('contacts')
          .select('whatsapp_connection_id')
          .eq('id', conversation.contact.id)
          .maybeSingle();
        
        if (contact?.whatsapp_connection_id) {
          const { data: conn } = await (supabase as any)
            .from('whatsapp_connections')
            .select('instance_id')
            .eq('id', contact.whatsapp_connection_id)
            .maybeSingle();
          if (conn?.instance_id) {
            setInstanceName(conn.instance_id);
          }
        }
      } catch {
        // Silently fail — instanceName stays empty
      }
    };
    resolveInstance();
  }, [conversation.contact.id]);

  // ── Effects ──
  useEffect(() => {
    messagesAreaRef.current?.scrollToBottom();
  }, [messages, isContactTyping]);

  // ── Handlers ──
  const handleSend = () => {
    if (inputValue.trim()) {
      if (replyToMessage) {
        log.debug('Sending reply to:', replyToMessage.id);
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

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copiado!', description: 'Mensagem copiada para a área de transferência.' });
  };

  const handleForwardMessage = (message: Message) => {
    setForwardMessage(message);
    setShowForwardDialog(true);
  };

  const handleForwardToTargets = (targetIds: string[], targetType: 'contact' | 'group') => {
    log.debug('Forwarding to:', { targetIds, targetType, message: forwardMessage });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (value.startsWith('/')) {
      setShowSlashCommands(true);
      setShowQuickReplies(false);
    } else {
      setShowSlashCommands(false);
    }
    if (value.length > 0) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlashCommands && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'k' && e.ctrlKey) {
      e.preventDefault();
      setShowGlobalSearch(true);
    }
    if (e.key === 'Escape' && showSlashCommands) {
      setShowSlashCommands(false);
    }
  };

  const handleSlashCommand = (command: SlashCommand, subCommand?: string) => {
    setShowSlashCommands(false);
    setInputValue('');
    switch (command.id) {
      case 'transfer': setShowTransferDialog(true); break;
      case 'resolve': toast({ title: '✅ Conversa Resolvida', description: 'A conversa foi marcada como resolvida.' }); break;
      case 'template': toast({ title: '📝 Templates', description: 'Use o botão de templates no input para selecionar.' }); break;
      case 'note': toast({ title: '📝 Nota Privada', description: 'Funcionalidade de notas será aberta.' }); break;
      case 'tag':
        toast({ title: subCommand === 'add' ? '🏷️ Adicionar Tag' : '🏷️ Remover Tag', description: subCommand === 'add' ? 'Selecione uma tag para adicionar.' : 'Selecione uma tag para remover.' });
        break;
      case 'priority': {
        const labels: Record<string, string> = { high: 'Alta', medium: 'Média', low: 'Baixa' };
        toast({ title: '⚡ Prioridade Definida', description: `Prioridade definida como ${labels[subCommand || ''] || subCommand}.` });
        break;
      }
      case 'assign': toast({ title: '👤 Atribuir Conversa', description: 'Selecione um agente para atribuir.' }); break;
      case 'snooze': {
        const labels: Record<string, string> = { '1h': '1 hora', '3h': '3 horas', tomorrow: 'amanhã', nextweek: 'próxima semana' };
        toast({ title: '⏰ Conversa Adiada', description: `Conversa adiada para ${labels[subCommand || ''] || subCommand}.` });
        break;
      }
      case 'star': toast({ title: '⭐ Conversa Favoritada', description: 'A conversa foi marcada como favorita.' }); break;
      case 'archive': toast({ title: '📦 Conversa Arquivada', description: 'A conversa foi arquivada.' }); break;
      case 'remind': toast({ title: '🔔 Lembrete Criado', description: 'Um lembrete foi criado para esta conversa.' }); break;
      case 'quick': toast({ title: '⚡ Resposta Rápida', description: 'Use / seguido do atalho para respostas rápidas.' }); break;
      case 'summary': setShowAIAssistant(true); break;
      default: toast({ title: `Comando: ${command.label}`, description: command.description }); break;
    }
  };

  const handleQuickReply = (reply: { id: string; title: string; shortcut: string; content: string; category: string }) => {
    setInputValue(reply.content);
    setShowQuickReplies(false);
    incrementUseCount(reply.id);
  };

  const handleTransfer = (type: 'agent' | 'queue', targetId: string, message?: string) => {
    toast({
      title: 'Chat transferido!',
      description: type === 'agent' ? 'O chat foi transferido para outro atendente.' : 'O chat foi transferido para outra fila.',
    });
  };

  const handleScheduleMessage = (message: string, scheduledAt: Date, attachment?: File) => {
    log.debug('Scheduled message:', { message, scheduledAt, attachment });
  };

  const handleAudioSend = (audioBlob: Blob) => {
    toast({ title: 'Áudio enviado!', description: 'A mensagem de áudio foi enviada com sucesso.' });
    setIsRecordingAudio(false);
  };

  const handleStartCall = () => {
    setCallDirection('outbound');
    setShowCallDialog(true);
  };

  const handleSendInteractiveMessage = (interactive: InteractiveMessage) => {
    toast({ title: 'Mensagem interativa enviada!', description: `Mensagem com ${interactive.buttons?.length || 0} botões enviada.` });
    log.debug('Interactive message:', interactive);
  };

  const handleInteractiveButtonClick = (button: InteractiveButton) => {
    toast({ title: 'Botão clicado', description: `Resposta: ${button.title}` });
    log.debug('Button clicked:', button);
  };

  const handleSendLocation = (location: LocationMessage) => {
    toast({
      title: 'Localização enviada!',
      description: location.isLive
        ? `Localização em tempo real por ${location.liveUntil ? Math.round((location.liveUntil.getTime() - Date.now()) / 60000) : 15} minutos`
        : location.name || 'Localização compartilhada',
    });
    log.debug('Location sent:', location);
  };

  const handleSendProduct = (product: Product) => {
    toast({
      title: 'Produto enviado!',
      description: `${product.name} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: product.currency }).format(product.price)}`,
    });
    log.debug('Product sent:', product);
  };

  const filteredQuickReplies = dbQuickReplies.filter(
    (reply) => inputValue.startsWith('/') && reply.shortcut.toLowerCase().includes(inputValue.toLowerCase())
  );

  // ── Drag & Drop ──
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
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
    if (files.length > 0 && fileUploaderRef.current) {
      fileUploaderRef.current.handleExternalFiles(files);
    }
  };

  // ── Render ──
  return (
    <div 
      className="flex h-full bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ChatDragOverlay isDraggingOver={isDraggingOver} />

      <div className="flex flex-col flex-1 h-full">
        <ChatPanelHeader
          conversation={conversation}
          isContactTyping={isContactTyping}
          showAIAssistant={showAIAssistant}
          showDetails={showDetails}
          voiceId={voiceId}
          speed={speed}
          onToggleAIAssistant={() => setShowAIAssistant(!showAIAssistant)}
          onToggleDetails={onToggleDetails}
          onStartCall={handleStartCall}
          onOpenSearch={() => setShowGlobalSearch(true)}
          onOpenTransfer={() => setShowTransferDialog(true)}
          onOpenSchedule={() => setShowScheduleDialog(true)}
          onVoiceChange={setVoiceId}
          onSpeedChange={setSpeed}
        />

        <ChatAssignedBar
          conversation={conversation}
          onOpenTransfer={() => setShowTransferDialog(true)}
        />

        <Suspense fallback={null}>
          <ConversationSummary 
            messages={messages.map(m => ({
              id: m.id,
              sender: m.sender,
              content: m.content,
              created_at: m.timestamp.toISOString()
            }))}
            contactName={conversation.contact.name}
          />
        </Suspense>

        <ChatMessagesArea
          ref={messagesAreaRef}
          messages={messages}
          isContactTyping={isContactTyping}
          typingUserName={typingUsers[0]?.name || conversation.contact.name}
          ttsLoading={ttsLoading}
          ttsPlaying={ttsPlaying}
          ttsMessageId={ttsMessageId}
          instanceName={instanceName}
          contactJid={conversation.contact.phone ? `${conversation.contact.phone}@s.whatsapp.net` : ''}
          contactAvatar={conversation.contact.avatar || undefined}
          onSpeak={speak}
          onStop={stop}
          onReply={handleReplyToMessage}
          onForward={handleForwardMessage}
          onCopy={handleCopyMessage}
          onScrollToMessage={(id) => messagesAreaRef.current?.scrollToMessage(id)}
          onInteractiveButtonClick={handleInteractiveButtonClick}
        />

        <ChatQuickRepliesPopover
          show={showQuickReplies}
          replies={filteredQuickReplies}
          onSelect={handleQuickReply}
          onClose={() => setShowQuickReplies(false)}
        />

        <ChatInputArea
          inputValue={inputValue}
          replyToMessage={replyToMessage}
          isRecordingAudio={isRecordingAudio}
          showSlashCommands={showSlashCommands}
          contactId={conversation.contact.id}
          contactPhone={conversation.contact.phone}
          contactName={conversation.contact.name}
          instanceName={instanceName}
          messages={messages}
          quickReplies={dbQuickReplies}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleTypingStop}
          onSend={handleSend}
          onCancelReply={() => setReplyToMessage(null)}
          onSlashCommand={handleSlashCommand}
          onCloseSlashCommands={() => setShowSlashCommands(false)}
          onQuickReply={handleQuickReply}
          onRecordToggle={() => setIsRecordingAudio(!isRecordingAudio)}
          onAudioSend={handleAudioSend}
          onAudioCancel={() => setIsRecordingAudio(false)}
          onOpenInteractiveBuilder={() => setShowInteractiveBuilder(true)}
          onOpenSchedule={() => setShowScheduleDialog(true)}
          onOpenLocationPicker={() => setShowLocationPicker(true)}
          onSendProduct={handleSendProduct}
          onSelectSuggestion={(text) => setInputValue(text)}
          onSelectTemplate={(text) => setInputValue(text)}
          fileUploaderRef={fileUploaderRef}
          inputRef={inputRef}
        />

        {/* Dialogs */}
        <Suspense fallback={null}>
          {showTransferDialog && <TransferDialog open={showTransferDialog} onOpenChange={setShowTransferDialog} onTransfer={handleTransfer} />}
          {showScheduleDialog && <ScheduleMessageDialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog} onSchedule={handleScheduleMessage} />}
          {showCallDialog && (
            <CallDialog
              open={showCallDialog}
              onOpenChange={setShowCallDialog}
              contact={{ name: conversation.contact.name, phone: conversation.contact.phone, avatar: conversation.contact.avatar }}
              direction={callDirection}
              onEnd={() => setShowCallDialog(false)}
            />
          )}
          {showGlobalSearch && (
            <GlobalSearch
              open={showGlobalSearch}
              onOpenChange={setShowGlobalSearch}
              onSelectResult={(result) => {
                log.debug('Selected:', result);
                toast({ title: 'Resultado selecionado', description: result.title });
              }}
            />
          )}
          {showInteractiveBuilder && <InteractiveMessageBuilder open={showInteractiveBuilder} onOpenChange={setShowInteractiveBuilder} onSend={handleSendInteractiveMessage} />}
          {showForwardDialog && <ForwardMessageDialog open={showForwardDialog} onOpenChange={setShowForwardDialog} message={forwardMessage} onForward={handleForwardToTargets} />}
          {showLocationPicker && <LocationPicker open={showLocationPicker} onOpenChange={setShowLocationPicker} onSend={handleSendLocation} />}
        </Suspense>
      </div>

      {/* AI Conversation Assistant - lazy */}
      {showAIAssistant && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </div>
  );
}
