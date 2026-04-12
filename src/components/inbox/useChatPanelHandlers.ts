import { useState, useRef, useEffect, useReducer, useCallback } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { undoToast } from '@/lib/undoToast';
import { Conversation, Message, InteractiveMessage, InteractiveButton, LocationMessage } from '@/types/chat';
import { FileUploaderRef } from './FileUploader';
import { SlashCommand } from './SlashCommands';
import { ExternalProduct } from '@/hooks/useExternalCatalog';
import { useTypingPresence } from '@/hooks/useTypingPresence';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { useQuickReplies } from '@/hooks/useQuickReplies';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from '@/hooks/use-toast';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { useMessageSignature } from '@/hooks/useMessageSignature';
import { useChatMediaSending } from './useChatMediaSending';
import { useAmbientColor } from '@/hooks/useAmbientColor';
import { ChatMessagesAreaRef } from './chat/ChatMessagesArea';

// Dialog state reducer
export type DialogKey = 'quickReplies' | 'slashCommands' | 'transferDialog' | 'scheduleDialog' |
  'callDialog' | 'globalSearch' | 'chatSearch' | 'interactiveBuilder' | 'forwardDialog' |
  'locationPicker' | 'aiAssistant' | 'catalogDirect' | 'whisper' | 'templatesWithVars' |
  'realtimeTranscription' | 'closeDialog';

type DialogState = Record<DialogKey, boolean>;
type DialogAction =
  | { type: 'TOGGLE'; key: DialogKey }
  | { type: 'OPEN'; key: DialogKey }
  | { type: 'CLOSE'; key: DialogKey }
  | { type: 'RESET'; keys: DialogKey[] };

const initialDialogState: DialogState = {
  quickReplies: false, slashCommands: false, transferDialog: false, scheduleDialog: false,
  callDialog: false, globalSearch: false, chatSearch: false, interactiveBuilder: false,
  forwardDialog: false, locationPicker: false, aiAssistant: false, catalogDirect: false,
  whisper: false, templatesWithVars: false, realtimeTranscription: false, closeDialog: false,
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'TOGGLE': return { ...state, [action.key]: !state[action.key] };
    case 'OPEN': return state[action.key] ? state : { ...state, [action.key]: true };
    case 'CLOSE': return state[action.key] ? { ...state, [action.key]: false } : state;
    case 'RESET': {
      const next = { ...state };
      let changed = false;
      for (const k of action.keys) { if (next[k]) { next[k] = false; changed = true; } }
      return changed ? next : state;
    }
    default: return state;
  }
}

export type ActiveTool = 'chatSearch' | 'objections' | 'university' | 'aiAssistant' | 'summary' | null;

export function useChatPanelHandlers(conversation: Conversation, messages: Message[], onSendMessage: (content: string) => void, onSendAudio?: (blob: Blob) => Promise<void>) {
  const [dialogs, dispatch] = useReducer(dialogReducer, initialDialogState);
  const openDialog = useCallback((key: DialogKey) => dispatch({ type: 'OPEN', key }), []);
  const closeDialog = useCallback((key: DialogKey) => dispatch({ type: 'CLOSE', key }), []);
  const toggleDialog = useCallback((key: DialogKey) => dispatch({ type: 'TOGGLE', key }), []);

  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const handleSetActiveTool = useCallback((tool: ActiveTool) => {
    setActiveTool(prev => prev === tool ? null : tool);
  }, []);

  useEffect(() => {
    if (activeTool === 'chatSearch') dispatch({ type: 'OPEN', key: 'chatSearch' });
    else dispatch({ type: 'CLOSE', key: 'chatSearch' });
    if (activeTool === 'aiAssistant') dispatch({ type: 'OPEN', key: 'aiAssistant' });
    else dispatch({ type: 'CLOSE', key: 'aiAssistant' });
  }, [activeTool]);

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [highlightedMessageIds, setHighlightedMessageIds] = useState<Set<string>>(new Set());
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileUploaderRef = useRef<FileUploaderRef>(null);
  const messagesAreaRef = useRef<ChatMessagesAreaRef>(null);
  const dragCounterRef = useRef(0);

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
  const tts = useTextToSpeech({ initialVoiceId: settings.tts_voice_id, initialSpeed: settings.tts_speed, onVoiceChange: handleVoiceChange, onSpeedChange: handleSpeedChange });

  useEffect(() => { initResolve(); }, [conversation.contact.id]);
  useEffect(() => { messagesAreaRef.current?.scrollToBottom(); }, [messages, isContactTyping]);
  useEffect(() => { setActiveTool(null); setHighlightedMessageIds(new Set()); setActiveHighlightId(null); setSearchQuery(''); }, [conversation.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); handleSetActiveTool('chatSearch'); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const canGenerateSummary = messages.length >= 10;
  const EDIT_WINDOW_MINUTES = 15;

  const handleEditStart = (message: Message) => {
    const minutesAgo = (Date.now() - message.timestamp.getTime()) / 60000;
    if (minutesAgo > EDIT_WINDOW_MINUTES) { toast({ title: 'Tempo expirado', description: `Você só pode editar mensagens nos primeiros ${EDIT_WINDOW_MINUTES} minutos.`, variant: 'destructive' }); return; }
    setEditingMessage(message); setInputValue(message.content); inputRef.current?.focus();
  };
  const handleCancelEdit = () => { setEditingMessage(null); setInputValue(''); };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    if (editingMessage) {
      const externalId = editingMessage.external_id;
      const contactJid = conversation.contact.phone ? `${conversation.contact.phone}@s.whatsapp.net` : '';
      setIsSending(true);
      try {
        if (instanceName && externalId && contactJid) await editMessage(instanceName, { number: contactJid, messageId: externalId, text: inputValue.trim() });
        await supabase.from('messages').update({ content: inputValue.trim(), updated_at: new Date().toISOString() }).eq('id', editingMessage.id);
        toast({ title: '✏️ Mensagem editada', description: 'A mensagem foi atualizada com sucesso.' });
      } catch (err) { log.error('Failed to edit message:', err); toast({ title: 'Erro ao editar', description: 'Não foi possível editar a mensagem.', variant: 'destructive' }); }
      finally { setIsSending(false); }
      setEditingMessage(null); setInputValue(''); return;
    }
    const messageContent = applySignature(inputValue.trim());
    const wasReply = replyToMessage;
    setIsSending(true); setInputValue(''); setReplyToMessage(null); handleTypingStop();
    try {
      onSendMessage(messageContent);
      undoToast({ message: 'Mensagem enviada', icon: '📨', delay: 3000, onUndo: () => { setInputValue(messageContent); if (wasReply) setReplyToMessage(wasReply); toast({ title: '↩️ Mensagem restaurada' }); } });
    } catch (err) { log.error('Failed to send message:', err); setInputValue(messageContent); toast({ title: 'Erro ao enviar', variant: 'destructive' }); }
    finally { setIsSending(false); }
  };

  const handleReplyToMessage = (message: Message) => { setReplyToMessage(message); inputRef.current?.focus(); };
  const handleCopyMessage = (content: string) => { navigator.clipboard.writeText(content); toast({ title: 'Copiado!' }); };
  const handleForwardMessage = (message: Message) => { setForwardMessage(message); openDialog('forwardDialog'); };
  const handleForwardToTargets = (targetIds: string[], targetType: 'contact' | 'group') => { log.debug('Forwarding to:', { targetIds, targetType }); };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value; setInputValue(value);
    if (value.startsWith('/')) { openDialog('slashCommands'); closeDialog('quickReplies'); } else { closeDialog('slashCommands'); }
    if (value.length > 0) handleTypingStart(); else handleTypingStop();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (dialogs.slashCommands && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'k' && e.ctrlKey) { e.preventDefault(); openDialog('globalSearch'); }
    if (e.key === 'f' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSetActiveTool('chatSearch'); }
    if (e.key === 'Escape' && dialogs.slashCommands) closeDialog('slashCommands');
  };

  const handleSlashCommand = (command: SlashCommand, subCommand?: string) => {
    closeDialog('slashCommands'); setInputValue('');
    switch (command.id) {
      case 'transfer': openDialog('transferDialog'); break;
      case 'resolve': toast({ title: '✅ Conversa Resolvida' }); break;
      case 'summary': handleSetActiveTool('aiAssistant'); break;
      case 'produto': openDialog('catalogDirect'); break;
      default: toast({ title: `Comando: ${command.label}`, description: command.description }); break;
    }
  };

  const handleQuickReply = (reply: { id: string; content: string }) => { setInputValue(reply.content); closeDialog('quickReplies'); incrementUseCount(reply.id); };

  const handleScheduleMessage = async (message: string, scheduledAt: Date, attachment?: File) => {
    try {
      let mediaUrl: string | undefined; let messageType = 'text';
      if (attachment) {
        const fileName = `scheduled_${Date.now()}_${attachment.name}`;
        const { error: uploadError } = await supabase.storage.from('whatsapp-media').upload(fileName, attachment);
        if (!uploadError) { const { data: signedData } = await supabase.storage.from('whatsapp-media').createSignedUrl(fileName, 3600); mediaUrl = signedData?.signedUrl; messageType = attachment.type.startsWith('audio') ? 'audio' : attachment.type.startsWith('image') ? 'image' : 'document'; }
      }
      await scheduleMessage({ contactId: conversation.contact.id, content: message, scheduledAt, messageType, mediaUrl });
      closeDialog('scheduleDialog');
    } catch (err) { log.error('Failed to schedule:', err); }
  };

  const handleAudioSend = async (audioBlob: Blob) => {
    if (onSendAudio) { try { await onSendAudio(audioBlob); } catch (err) { log.error('Error sending audio:', err); } }
    setIsRecordingAudio(false);
  };

  const handleSendProduct = (product: ExternalProduct) => {
    const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.sale_price);
    const lines = [`📦 *${product.name}*`, product.brand ? `🏷️ Marca: ${product.brand}` : '', `💰 Preço: ${price}`, product.primary_image_url ? `\n🔗 ${product.primary_image_url}` : ''].filter(Boolean).join('\n');
    onSendMessage(lines); toast({ title: 'Produto enviado!', description: `${product.name} - ${price}` });
  };

  const handleSendInteractiveMessage = (interactive: InteractiveMessage) => { toast({ title: 'Mensagem interativa enviada!' }); };
  const handleInteractiveButtonClick = (button: InteractiveButton) => { toast({ title: 'Botão clicado', description: `Resposta: ${button.title}` }); };
  const handleSendLocation = (location: LocationMessage) => { toast({ title: 'Localização enviada!' }); };

  const filteredQuickReplies = dbQuickReplies.filter(r => inputValue.startsWith('/') && r.shortcut.toLowerCase().includes(inputValue.toLowerCase()));

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current++; if (e.dataTransfer.types.includes('Files')) setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current--; if (dragCounterRef.current === 0) setIsDraggingOver(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); dragCounterRef.current = 0; setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && fileUploaderRef.current) fileUploaderRef.current.handleExternalFiles(files);
  };

  const ambient = useAmbientColor(conversation.sentiment);

  return {
    dialogs, openDialog, closeDialog, toggleDialog,
    activeTool, handleSetActiveTool, canGenerateSummary,
    inputValue, setInputValue, isSending, isRecordingAudio, setIsRecordingAudio,
    callDirection, setCallDirection,
    highlightedMessageIds, setHighlightedMessageIds,
    activeHighlightId, setActiveHighlightId,
    searchQuery, setSearchQuery,
    replyToMessage, setReplyToMessage, forwardMessage,
    isDraggingOver, editingMessage,
    inputRef, fileUploaderRef, messagesAreaRef,
    isContactTyping, typingUsers, handleTypingStart, handleTypingStop,
    dbQuickReplies, filteredQuickReplies,
    tts, instanceName, whatsappConnectionId,
    signatureEnabled, agentName, toggleSignature,
    handleSendSticker, handleSendCustomEmoji, handleSendAudioMeme,
    handleEditStart, handleCancelEdit, handleSend,
    handleReplyToMessage, handleCopyMessage, handleForwardMessage, handleForwardToTargets,
    handleInputChange, handleKeyDown, handleSlashCommand, handleQuickReply,
    handleScheduleMessage, handleAudioSend, handleSendProduct,
    handleSendInteractiveMessage, handleInteractiveButtonClick, handleSendLocation,
    handleDragEnter, handleDragLeave, handleDragOver, handleDrop,
    ambient,
  };
}
