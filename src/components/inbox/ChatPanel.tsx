import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { undoToast } from '@/lib/undoToast';
import { Conversation, Message, InteractiveMessage, InteractiveButton, LocationMessage } from '@/types/chat';
import { FileUploaderRef } from './FileUploader';
import { SlashCommand } from './SlashCommands';
import { ExternalProduct } from '@/hooks/useExternalCatalog';
import { ExternalProductCatalog } from '@/components/catalog/ExternalProductCatalog';
import { useTypingPresence } from '@/hooks/useTypingPresence';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { useQuickReplies } from '@/hooks/useQuickReplies';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from '@/hooks/use-toast';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { useMessageSignature } from '@/hooks/useMessageSignature';
import { useChatMediaSending } from './useChatMediaSending';
import { CRMAutoSync } from './CRMAutoSync';
import { useAmbientColor } from '@/hooks/useAmbientColor';

import { ChatPanelHeader } from './chat/ChatPanelHeader';
import { ChatAssignedBar } from './chat/ChatAssignedBar';
import { ChatMessagesArea, ChatMessagesAreaRef } from './chat/ChatMessagesArea';
import { ChatInputArea } from './chat/ChatInputArea';
import { ChatDragOverlay } from './chat/ChatDragOverlay';
import { ChatQuickRepliesPopover } from './chat/ChatQuickRepliesPopover';
import { ChatSearchBar } from './chat/ChatSearchBar';

const ConversationSummary = lazy(() => import('./ConversationSummary').then(m => ({ default: m.ConversationSummary })));
const TransferDialog = lazy(() => import('./TransferDialog').then(m => ({ default: m.TransferDialog })));
const WhisperMode = lazy(() => import('./WhisperMode').then(m => ({ default: m.WhisperMode })));
const ScheduleMessageDialog = lazy(() => import('./ScheduleMessageDialog').then(m => ({ default: m.ScheduleMessageDialog })));
const CallDialog = lazy(() => import('@/components/calls/CallDialog').then(m => ({ default: m.CallDialog })));
const GlobalSearch = lazy(() => import('./GlobalSearch').then(m => ({ default: m.GlobalSearch })));
const InteractiveMessageBuilder = lazy(() => import('./InteractiveMessageBuilder').then(m => ({ default: m.InteractiveMessageBuilder })));
const ForwardMessageDialog = lazy(() => import('./ForwardMessageDialog').then(m => ({ default: m.ForwardMessageDialog })));
const LocationPicker = lazy(() => import('./LocationPicker').then(m => ({ default: m.LocationPicker })));
const AIConversationAssistant = lazy(() => import('./AIConversationAssistant').then(m => ({ default: m.AIConversationAssistant })));
const TemplatesWithVariables = lazy(() => import('./TemplatesWithVariables').then(m => ({ default: m.TemplatesWithVariables })));
const RealtimeTranscription = lazy(() => import('./RealtimeTranscription').then(m => ({ default: m.RealtimeTranscription })));
interface ChatPanelProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onSendAudio?: (blob: Blob) => Promise<void>;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  onBack?: () => void;
  hideHeader?: boolean;
}

export function ChatPanel({ conversation, messages, onSendMessage, onSendAudio, showDetails = false, onToggleDetails, onBack, hideHeader = false }: ChatPanelProps) {
  // ── State ──
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [highlightedMessageIds, setHighlightedMessageIds] = useState<Set<string>>(new Set());
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [showInteractiveBuilder, setShowInteractiveBuilder] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showCatalogDirect, setShowCatalogDirect] = useState(false);
  const [showWhisper, setShowWhisper] = useState(false);
  const [showTemplatesWithVars, setShowTemplatesWithVars] = useState(false);
  const [showRealtimeTranscription, setShowRealtimeTranscription] = useState(false);

  // ── Refs ──
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileUploaderRef = useRef<FileUploaderRef>(null);
  const messagesAreaRef = useRef<ChatMessagesAreaRef>(null);
  const dragCounterRef = useRef(0);

  // ── Hooks ──
  const { isContactTyping, typingUsers, handleTypingStart, handleTypingStop } = useTypingPresence({
    conversationId: conversation.id, currentUserId: 'agent', currentUserName: conversation.assignedTo?.name || 'Agente',
  });
  const { quickReplies: dbQuickReplies, incrementUseCount } = useQuickReplies();
  const { settings, updateSettings, saveSettings } = useUserSettings();
  const { editMessage } = useEvolutionApi();
  const { scheduleMessage } = useScheduledMessages(conversation.contact.id);
  const { signatureEnabled, agentName, toggleSignature, applySignature } = useMessageSignature();
  const { instanceName, whatsappConnectionId, initResolve, handleSendSticker, handleSendCustomEmoji, handleSendAudioMeme } = useChatMediaSending(conversation.contact.id, conversation.contact.phone);

  const handleVoiceChange = (v: string) => { updateSettings({ tts_voice_id: v }); setTimeout(() => saveSettings(), 100); };
  const handleSpeedChange = (s: number) => { updateSettings({ tts_speed: s }); setTimeout(() => saveSettings(), 100); };

  const { speak, stop, isLoading: ttsLoading, isPlaying: ttsPlaying, currentMessageId: ttsMessageId, voiceId, setVoiceId, speed, setSpeed } = useTextToSpeech({
    initialVoiceId: settings.tts_voice_id, initialSpeed: settings.tts_speed, onVoiceChange: handleVoiceChange, onSpeedChange: handleSpeedChange,
  });

  useEffect(() => { initResolve(); }, [conversation.contact.id]);
  useEffect(() => { messagesAreaRef.current?.scrollToBottom(); }, [messages, isContactTyping]);

  // Global Ctrl+F handler for chat search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowChatSearch(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // ── Handlers ──
  const EDIT_WINDOW_MINUTES = 15;

  const handleEditStart = (message: Message) => {
    const minutesAgo = (Date.now() - message.timestamp.getTime()) / 60000;
    if (minutesAgo > EDIT_WINDOW_MINUTES) {
      toast({ title: 'Tempo expirado', description: `Você só pode editar mensagens nos primeiros ${EDIT_WINDOW_MINUTES} minutos.`, variant: 'destructive' });
      return;
    }
    setEditingMessage(message);
    setInputValue(message.content);
    inputRef.current?.focus();
  };

  const handleCancelEdit = () => { setEditingMessage(null); setInputValue(''); };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    if (editingMessage) {
      const externalId = editingMessage.external_id;
      const contactJid = conversation.contact.phone ? `${conversation.contact.phone}@s.whatsapp.net` : '';
      setIsSending(true);
      try {
        if (instanceName && externalId && contactJid) {
          await editMessage(instanceName, { number: contactJid, messageId: externalId, text: inputValue.trim() });
        }
        await supabase.from('messages').update({ content: inputValue.trim(), updated_at: new Date().toISOString() }).eq('id', editingMessage.id);
        toast({ title: '✏️ Mensagem editada', description: 'A mensagem foi atualizada com sucesso.' });
      } catch (err) {
        log.error('Failed to edit message:', err);
        toast({ title: 'Erro ao editar', description: 'Não foi possível editar a mensagem.', variant: 'destructive' });
      } finally { setIsSending(false); }
      setEditingMessage(null); setInputValue('');
      return;
    }

    const messageContent = applySignature(inputValue.trim());
    const wasReply = replyToMessage;
    setIsSending(true); setInputValue(''); setReplyToMessage(null); handleTypingStop();

    if (wasReply) log.debug('Sending reply to:', wasReply.id);

    try {
      onSendMessage(messageContent);
      undoToast({
        message: 'Mensagem enviada', icon: '📨', delay: 3000,
        onUndo: () => {
          setInputValue(messageContent);
          if (wasReply) setReplyToMessage(wasReply);
          toast({ title: '↩️ Mensagem restaurada', description: 'O texto foi restaurado no campo de entrada.' });
        },
      });
    } catch (err) {
      log.error('Failed to send message:', err);
      setInputValue(messageContent);
      toast({ title: 'Erro ao enviar', description: 'Tente novamente.', variant: 'destructive' });
    } finally { setIsSending(false); }
  };

  const handleReplyToMessage = (message: Message) => { setReplyToMessage(message); inputRef.current?.focus(); };
  const handleCopyMessage = (content: string) => { navigator.clipboard.writeText(content); toast({ title: 'Copiado!', description: 'Mensagem copiada para a área de transferência.' }); };
  const handleForwardMessage = (message: Message) => { setForwardMessage(message); setShowForwardDialog(true); };
  const handleForwardToTargets = (targetIds: string[], targetType: 'contact' | 'group') => { log.debug('Forwarding to:', { targetIds, targetType, message: forwardMessage }); };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (value.startsWith('/')) { setShowSlashCommands(true); setShowQuickReplies(false); } else { setShowSlashCommands(false); }
    if (value.length > 0) handleTypingStart(); else handleTypingStop();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlashCommands && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'k' && e.ctrlKey) { e.preventDefault(); setShowGlobalSearch(true); }
    if (e.key === 'f' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setShowChatSearch(true); }
    if (e.key === 'Escape' && showSlashCommands) setShowSlashCommands(false);
  };

  const handleSlashCommand = (command: SlashCommand, subCommand?: string) => {
    setShowSlashCommands(false); setInputValue('');
    switch (command.id) {
      case 'transfer': setShowTransferDialog(true); break;
      case 'resolve': toast({ title: '✅ Conversa Resolvida', description: 'A conversa foi marcada como resolvida.' }); break;
      case 'template': toast({ title: '📝 Templates', description: 'Use o botão de templates no input para selecionar.' }); break;
      case 'note': toast({ title: '📝 Nota Privada', description: 'Funcionalidade de notas será aberta.' }); break;
      case 'tag': toast({ title: subCommand === 'add' ? '🏷️ Adicionar Tag' : '🏷️ Remover Tag', description: subCommand === 'add' ? 'Selecione uma tag para adicionar.' : 'Selecione uma tag para remover.' }); break;
      case 'priority': { const labels: Record<string, string> = { high: 'Alta', medium: 'Média', low: 'Baixa' }; toast({ title: '⚡ Prioridade Definida', description: `Prioridade definida como ${labels[subCommand || ''] || subCommand}.` }); break; }
      case 'assign': toast({ title: '👤 Atribuir Conversa', description: 'Selecione um agente para atribuir.' }); break;
      case 'snooze': { const labels: Record<string, string> = { '1h': '1 hora', '3h': '3 horas', tomorrow: 'amanhã', nextweek: 'próxima semana' }; toast({ title: '⏰ Conversa Adiada', description: `Conversa adiada para ${labels[subCommand || ''] || subCommand}.` }); break; }
      case 'star': toast({ title: '⭐ Conversa Favoritada', description: 'A conversa foi marcada como favorita.' }); break;
      case 'archive': toast({ title: '📦 Conversa Arquivada', description: 'A conversa foi arquivada.' }); break;
      case 'remind': toast({ title: '🔔 Lembrete Criado', description: 'Um lembrete foi criado para esta conversa.' }); break;
      case 'quick': toast({ title: '⚡ Resposta Rápida', description: 'Use / seguido do atalho para respostas rápidas.' }); break;
      case 'summary': setShowAIAssistant(true); break;
      case 'produto': setShowCatalogDirect(true); break;
      default: toast({ title: `Comando: ${command.label}`, description: command.description }); break;
    }
  };

  const handleQuickReply = (reply: { id: string; title: string; shortcut: string; content: string; category: string }) => {
    setInputValue(reply.content); setShowQuickReplies(false); incrementUseCount(reply.id);
  };

  const handleTransfer = (type: 'agent' | 'queue', targetId: string, message?: string) => {
    toast({ title: 'Chat transferido!', description: type === 'agent' ? 'O chat foi transferido para outro atendente.' : 'O chat foi transferido para outra fila.' });
  };

  const handleScheduleMessage = async (message: string, scheduledAt: Date, attachment?: File) => {
    try {
      let mediaUrl: string | undefined;
      let messageType = 'text';
      if (attachment) {
        const fileName = `scheduled_${Date.now()}_${attachment.name}`;
        const { error: uploadError } = await supabase.storage.from('whatsapp-media').upload(fileName, attachment);
        if (!uploadError) {
          const { data: signedData } = await supabase.storage.from('whatsapp-media').createSignedUrl(fileName, 3600);
          mediaUrl = signedData?.signedUrl;
          messageType = attachment.type.startsWith('audio') ? 'audio' : attachment.type.startsWith('image') ? 'image' : attachment.type.startsWith('video') ? 'video' : 'document';
        }
      }
      await scheduleMessage({ contactId: conversation.contact.id, content: message, scheduledAt, messageType, mediaUrl });
      setShowScheduleDialog(false);
    } catch (err) { log.error('Failed to schedule message:', err); }
  };

  const handleAudioSend = async (audioBlob: Blob) => {
    if (onSendAudio) {
      try { await onSendAudio(audioBlob); } catch (err) { log.error('Error sending audio:', err); toast({ title: 'Erro ao enviar áudio', description: 'Tente novamente.', variant: 'destructive' }); }
    } else { toast({ title: 'Erro', description: 'Envio de áudio não configurado.', variant: 'destructive' }); }
    setIsRecordingAudio(false);
  };

  const handleSendProduct = (product: ExternalProduct) => {
    const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.sale_price);
    const lines = [
      `📦 *${product.name}*`, product.brand ? `🏷️ Marca: ${product.brand}` : '', `💰 Preço: ${price}`,
      product.min_quantity ? `📋 Qtd. mínima: ${product.min_quantity} un.` : '',
      product.colors?.length ? `🎨 Cores: ${product.colors.join(', ')}` : '',
      product.dimensions_display ? `📏 Dimensões: ${product.dimensions_display}` : '',
      product.allows_personalization ? '✅ Permite personalização' : '',
      product.lead_time_days ? `⏱️ Prazo: ${product.lead_time_days} dias úteis` : '',
      product.is_stockout ? '⚠️ *Sem estoque no momento*' : `✅ Em estoque: ${product.stock_quantity} un.`,
      (product.short_description || product.description) ? `\n${(product.short_description || product.description || '').slice(0, 300)}` : '',
      product.primary_image_url ? `\n🔗 ${product.primary_image_url}` : '',
    ].filter(Boolean).join('\n');
    onSendMessage(lines);
    toast({ title: 'Produto enviado!', description: `${product.name} - ${price}` });
  };

  const handleSendInteractiveMessage = (interactive: InteractiveMessage) => {
    toast({ title: 'Mensagem interativa enviada!', description: `Mensagem com ${interactive.buttons?.length || 0} botões enviada.` });
  };
  const handleInteractiveButtonClick = (button: InteractiveButton) => { toast({ title: 'Botão clicado', description: `Resposta: ${button.title}` }); };
  const handleSendLocation = (location: LocationMessage) => {
    toast({ title: 'Localização enviada!', description: location.isLive ? `Localização em tempo real por ${location.liveUntil ? Math.round((location.liveUntil.getTime() - Date.now()) / 60000) : 15} minutos` : location.name || 'Localização compartilhada' });
  };

  const filteredQuickReplies = dbQuickReplies.filter(r => inputValue.startsWith('/') && r.shortcut.toLowerCase().includes(inputValue.toLowerCase()));

  // ── Drag & Drop ──
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current++; if (e.dataTransfer.types.includes('Files')) setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current--; if (dragCounterRef.current === 0) setIsDraggingOver(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); dragCounterRef.current = 0; setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && fileUploaderRef.current) fileUploaderRef.current.handleExternalFiles(files);
  };

  const ambient = useAmbientColor(conversation.sentiment);

  // ── Render ──
  return (
    <div className={`flex h-full min-h-0 min-w-0 overflow-hidden relative ${ambient.className}`} style={{ backgroundColor: ambient.bgTint }} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
      <ChatDragOverlay isDraggingOver={isDraggingOver} />
      <CRMAutoSync conversation={conversation} messageCount={messages.length} messages={messages} />

      <div className="flex flex-col flex-1 h-full min-h-0 min-w-0 overflow-hidden">
        {!hideHeader && (
          <ChatPanelHeader conversation={conversation} isContactTyping={isContactTyping} showAIAssistant={showAIAssistant} showDetails={showDetails}
            voiceId={voiceId} speed={speed} onToggleAIAssistant={() => setShowAIAssistant(!showAIAssistant)} onToggleDetails={onToggleDetails}
            onStartCall={() => { setCallDirection('outbound'); setShowCallDialog(true); }} onOpenSearch={() => setShowChatSearch(true)}
            onOpenTransfer={() => setShowTransferDialog(true)} onOpenSchedule={() => setShowScheduleDialog(true)}
            onVoiceChange={setVoiceId} onSpeedChange={setSpeed} onBack={onBack} />
        )}

        <ChatSearchBar
          messages={messages}
          isOpen={showChatSearch}
          onClose={() => setShowChatSearch(false)}
          onNavigateToMessage={(id) => messagesAreaRef.current?.scrollToMessage(id)}
          onHighlightChange={(ids, activeId) => { setHighlightedMessageIds(ids); setActiveHighlightId(activeId); }}
        />

        <ChatAssignedBar conversation={conversation} onOpenTransfer={() => setShowTransferDialog(true)} />

        <Suspense fallback={null}>
          <ConversationSummary messages={messages.map(m => ({ id: m.id, sender: m.sender, content: m.content, created_at: m.timestamp.toISOString() }))} contactName={conversation.contact.name} />
        </Suspense>

        <ChatMessagesArea ref={messagesAreaRef} messages={messages} isContactTyping={isContactTyping} typingUserName={typingUsers[0]?.name || conversation.contact.name}
          ttsLoading={ttsLoading} ttsPlaying={ttsPlaying} ttsMessageId={ttsMessageId} instanceName={instanceName}
          contactJid={conversation.contact.phone ? `${conversation.contact.phone}@s.whatsapp.net` : ''} contactAvatar={conversation.contact.avatar || undefined}
          onSpeak={speak} onStop={stop} onReply={handleReplyToMessage} onForward={handleForwardMessage} onCopy={handleCopyMessage}
          onScrollToMessage={(id) => messagesAreaRef.current?.scrollToMessage(id)} onInteractiveButtonClick={handleInteractiveButtonClick} onEditStart={handleEditStart}
          highlightedMessageIds={highlightedMessageIds} activeHighlightId={activeHighlightId} />

        <ChatQuickRepliesPopover show={showQuickReplies} replies={filteredQuickReplies} onSelect={handleQuickReply} onClose={() => setShowQuickReplies(false)} />

        {showWhisper && (
          <Suspense fallback={null}>
            <WhisperMode contactId={conversation.contact.id} className="mx-3 mb-2" />
          </Suspense>
        )}

        <ChatInputArea inputValue={inputValue} replyToMessage={replyToMessage} editingMessage={editingMessage} isRecordingAudio={isRecordingAudio}
          showSlashCommands={showSlashCommands} contactId={conversation.contact.id} contactPhone={conversation.contact.phone}
          contactName={conversation.contact.name} instanceName={instanceName} messages={messages} quickReplies={dbQuickReplies} isSending={isSending}
          onInputChange={handleInputChange} onKeyDown={handleKeyDown} onBlur={handleTypingStop} onSend={handleSend}
          onCancelReply={() => setReplyToMessage(null)} onCancelEdit={handleCancelEdit} onSlashCommand={handleSlashCommand}
          onCloseSlashCommands={() => setShowSlashCommands(false)} onQuickReply={handleQuickReply}
          onRecordToggle={() => setIsRecordingAudio(!isRecordingAudio)} onAudioSend={handleAudioSend} onAudioCancel={() => setIsRecordingAudio(false)}
          onOpenInteractiveBuilder={() => setShowInteractiveBuilder(true)} onOpenSchedule={() => setShowScheduleDialog(true)}
          onOpenLocationPicker={() => setShowLocationPicker(true)} onSendProduct={handleSendProduct} onSendSticker={handleSendSticker}
          onSendAudioMeme={handleSendAudioMeme} onSendCustomEmoji={handleSendCustomEmoji}
          signatureEnabled={signatureEnabled} signatureName={agentName} onToggleSignature={toggleSignature}
          onPollSent={async (poll) => { await supabase.from('messages').insert({ contact_id: conversation.contact.id, whatsapp_connection_id: whatsappConnectionId, content: `📊 *Enquete:* ${poll.name}\n${poll.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`, message_type: 'text', sender: 'agent', status: 'sent' }); }}
          onContactSent={async (contactName) => { await supabase.from('messages').insert({ contact_id: conversation.contact.id, whatsapp_connection_id: whatsappConnectionId, content: `📇 Cartão de contato: ${contactName}`, message_type: 'text', sender: 'agent', status: 'sent' }); }}
          onOpenCatalog={() => setShowCatalogDirect(true)} onSelectSuggestion={(text) => setInputValue(text)} onSelectTemplate={(text) => setInputValue(text)}
          fileUploaderRef={fileUploaderRef} inputRef={inputRef} />

        <Suspense fallback={null}>
          {showTransferDialog && <TransferDialog open={showTransferDialog} onOpenChange={setShowTransferDialog} onTransfer={handleTransfer as (type: "agent" | "connection" | "queue", targetId: string, message?: string) => void} />}
          {showScheduleDialog && <ScheduleMessageDialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog} onSchedule={handleScheduleMessage} />}
          {showCallDialog && <CallDialog open={showCallDialog} onOpenChange={setShowCallDialog} contact={{ name: conversation.contact.name, phone: conversation.contact.phone, avatar: conversation.contact.avatar }} direction={callDirection} onEnd={() => setShowCallDialog(false)} />}
          {showGlobalSearch && <GlobalSearch open={showGlobalSearch} onOpenChange={setShowGlobalSearch} onSelectResult={(result) => { log.debug('Selected:', result); toast({ title: 'Resultado selecionado', description: result.title }); }} />}
          {showInteractiveBuilder && <InteractiveMessageBuilder open={showInteractiveBuilder} onOpenChange={setShowInteractiveBuilder} onSend={handleSendInteractiveMessage} />}
          {showForwardDialog && <ForwardMessageDialog open={showForwardDialog} onOpenChange={setShowForwardDialog} message={forwardMessage} onForward={handleForwardToTargets} />}
          {showLocationPicker && <LocationPicker open={showLocationPicker} onOpenChange={setShowLocationPicker} onSend={handleSendLocation} />}
        </Suspense>

        {showCatalogDirect && <ExternalProductCatalog onSendProduct={handleSendProduct} open={showCatalogDirect} onOpenChange={setShowCatalogDirect} />}

        {showRealtimeTranscription && (
          <Suspense fallback={null}>
            <div className="px-3 mb-2">
              <RealtimeTranscription
                onTranscript={(text, isFinal) => { if (isFinal) setInputValue(prev => prev + ' ' + text); }}
                onStatusChange={() => {}}
                className="w-full"
              />
            </div>
          </Suspense>
        )}
      </div>

      {showAIAssistant && (
        <Suspense fallback={null}>
          <AIConversationAssistant messages={messages.map(m => ({ id: m.id, sender: m.sender, content: m.content, type: m.type, mediaUrl: m.mediaUrl, created_at: m.timestamp.toISOString() }))}
            contactId={conversation.contact.id} contactName={conversation.contact.name} isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} />
        </Suspense>
      )}
    </div>
  );
}
