import { lazy, Suspense } from 'react';
import { Conversation, Message } from '@/types/chat';
import { ExternalProductCatalog } from '@/components/catalog/ExternalProductCatalog';
import { CRMAutoSync } from './CRMAutoSync';
import { Radar, GraduationCap, FileText } from 'lucide-react';
import { ToolPanel } from './ai-tools/ToolPanel';
import { VisionIcon } from './ai-tools/VisionIcon';

import { ChatPanelHeader } from './chat/ChatPanelHeader';
import { ChatAssignedBar } from './chat/ChatAssignedBar';
import { ChatMessagesArea } from './chat/ChatMessagesArea';
import { ChatInputArea } from './chat/ChatInputArea';
import { ChatDragOverlay } from './chat/ChatDragOverlay';
import { ChatQuickRepliesPopover } from './chat/ChatQuickRepliesPopover';
import { ChatSearchBar } from './chat/ChatSearchBar';
import { useChatPanelHandlers } from './useChatPanelHandlers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { log } from '@/lib/logger';

const ConversationSummary = lazy(() => import('./ConversationSummary').then(m => ({ default: m.ConversationSummary })));
const ObjectionDetector = lazy(() => import('./ObjectionDetector').then(m => ({ default: m.ObjectionDetector })));
const UniversityHelp = lazy(() => import('./UniversityHelp').then(m => ({ default: m.UniversityHelp })));
const TransferDialog = lazy(() => import('./TransferDialog').then(m => ({ default: m.TransferDialog })));
const WhisperMode = lazy(() => import('./WhisperMode').then(m => ({ default: m.WhisperMode })));
const ScheduleMessageDialog = lazy(() => import('./ScheduleMessageDialog').then(m => ({ default: m.ScheduleMessageDialog })));
const CallDialog = lazy(() => import('@/components/calls/CallDialog').then(m => ({ default: m.CallDialog })));
const GlobalSearch = lazy(() => import('./GlobalSearch').then(m => ({ default: m.GlobalSearch })));
const InteractiveMessageBuilder = lazy(() => import('./InteractiveMessageBuilder').then(m => ({ default: m.InteractiveMessageBuilder })));
const ForwardMessageDialog = lazy(() => import('./ForwardMessageDialog').then(m => ({ default: m.ForwardMessageDialog })));
const LocationPicker = lazy(() => import('./LocationPicker').then(m => ({ default: m.LocationPicker })));
const AIConversationAssistant = lazy(() => import('./AIConversationAssistant').then(m => ({ default: m.AIConversationAssistant })));
const RealtimeTranscription = lazy(() => import('./RealtimeTranscription').then(m => ({ default: m.RealtimeTranscription })));
const CloseConversationDialog = lazy(() => import('./CloseConversationDialog').then(m => ({ default: m.CloseConversationDialog })));
const NextBestActionEngine = lazy(() => import('./NextBestActionEngine').then(m => ({ default: m.NextBestActionEngine })));

if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  (window as Window).requestIdleCallback(() => { import('./TransferDialog'); import('./AIConversationAssistant'); import('./CloseConversationDialog'); });
}

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
  const s = useChatPanelHandlers(conversation, messages, onSendMessage, onSendAudio);

  return (
    <div className={`flex h-full min-h-0 min-w-0 overflow-hidden relative ${s.ambient.className}`} style={{ backgroundColor: s.ambient.bgTint }} onDragEnter={s.handleDragEnter} onDragLeave={s.handleDragLeave} onDragOver={s.handleDragOver} onDrop={s.handleDrop}>
      <ChatDragOverlay isDraggingOver={s.isDraggingOver} />
      <CRMAutoSync conversation={conversation} messageCount={messages.length} messages={messages} />

      <div className="flex flex-col flex-1 h-full min-h-0 min-w-0 overflow-hidden">
        {!hideHeader && (
          <ChatPanelHeader conversation={conversation} isContactTyping={s.isContactTyping} showAIAssistant={s.activeTool === 'aiAssistant'} showDetails={showDetails}
            showSummaryPanel={s.activeTool === 'summary'} activeTool={s.activeTool} onSetActiveTool={s.handleSetActiveTool}
            voiceId={s.tts.voiceId} speed={s.tts.speed} onToggleAIAssistant={() => s.handleSetActiveTool('aiAssistant')} onToggleDetails={onToggleDetails}
            onStartCall={() => { s.setCallDirection('outbound'); s.openDialog('callDialog'); }} onOpenSearch={() => s.handleSetActiveTool('chatSearch')}
            onOpenTransfer={() => s.openDialog('transferDialog')} onOpenSchedule={() => s.openDialog('scheduleDialog')}
            onVoiceChange={s.tts.setVoiceId} onSpeedChange={s.tts.setSpeed} onBack={onBack}
            onGenerateSummary={() => s.handleSetActiveTool('summary')} isSummaryLoading={false} canGenerateSummary={s.canGenerateSummary}
            onCloseConversation={() => s.openDialog('closeDialog')}
            lastMessages={messages.filter(m => m.sender === 'contact').slice(-5).map(m => m.content)}
            allMessages={messages.map(m => ({ id: m.id, content: m.content, sender: m.sender, timestamp: m.timestamp.toISOString() }))}
            onSelectSuggestion={(text) => s.setInputValue(text)} />
        )}

        <ChatSearchBar messages={messages} isOpen={s.activeTool === 'chatSearch'}
          onClose={() => { s.handleSetActiveTool('chatSearch'); setTimeout(() => s.inputRef.current?.focus(), 150); }}
          onNavigateToMessage={(id) => s.messagesAreaRef.current?.scrollToMessage(id)}
          onHighlightChange={(ids, activeId) => { s.setHighlightedMessageIds(ids); s.setActiveHighlightId(activeId); }}
          onSearchQueryChange={s.setSearchQuery} />

        <ChatAssignedBar conversation={conversation} onOpenTransfer={() => s.openDialog('transferDialog')} />
        <Suspense fallback={null}><NextBestActionEngine contactId={conversation.contact.id} contactName={conversation.contact.name} /></Suspense>

        <ChatMessagesArea ref={s.messagesAreaRef} messages={messages} isContactTyping={s.isContactTyping} typingUserName={s.typingUsers[0]?.name || conversation.contact.name}
          ttsLoading={s.tts.isLoading} ttsPlaying={s.tts.isPlaying} ttsMessageId={s.tts.currentMessageId} instanceName={s.instanceName}
          contactJid={conversation.contact.phone ? `${conversation.contact.phone}@s.whatsapp.net` : ''} contactAvatar={conversation.contact.avatar || undefined}
          onSpeak={s.tts.speak} onStop={s.tts.stop} onReply={s.handleReplyToMessage} onForward={s.handleForwardMessage} onCopy={s.handleCopyMessage}
          onScrollToMessage={(id) => s.messagesAreaRef.current?.scrollToMessage(id)} onInteractiveButtonClick={s.handleInteractiveButtonClick} onEditStart={s.handleEditStart}
          highlightedMessageIds={s.highlightedMessageIds} activeHighlightId={s.activeHighlightId} searchQuery={s.searchQuery} />

        <ChatQuickRepliesPopover show={s.dialogs.quickReplies} replies={s.filteredQuickReplies} onSelect={s.handleQuickReply} onClose={() => s.closeDialog('quickReplies')} />

        {s.dialogs.whisper && <Suspense fallback={null}><WhisperMode contactId={conversation.contact.id} className="mx-3 mb-2" /></Suspense>}

        <ChatInputArea inputValue={s.inputValue} replyToMessage={s.replyToMessage} editingMessage={s.editingMessage} isRecordingAudio={s.isRecordingAudio}
          showSlashCommands={s.dialogs.slashCommands} contactId={conversation.contact.id} contactPhone={conversation.contact.phone}
          contactName={conversation.contact.name} instanceName={s.instanceName} messages={messages} quickReplies={s.dbQuickReplies} isSending={s.isSending}
          onInputChange={s.handleInputChange} onKeyDown={s.handleKeyDown} onBlur={s.handleTypingStop} onSend={s.handleSend}
          onCancelReply={() => s.setReplyToMessage(null)} onCancelEdit={s.handleCancelEdit} onSlashCommand={s.handleSlashCommand}
          onCloseSlashCommands={() => s.closeDialog('slashCommands')} onQuickReply={s.handleQuickReply}
          onRecordToggle={() => s.setIsRecordingAudio(!s.isRecordingAudio)} onAudioSend={s.handleAudioSend} onAudioCancel={() => s.setIsRecordingAudio(false)}
          onOpenInteractiveBuilder={() => s.openDialog('interactiveBuilder')} onOpenSchedule={() => s.openDialog('scheduleDialog')}
          onOpenLocationPicker={() => s.openDialog('locationPicker')} onSendProduct={s.handleSendProduct} onSendSticker={s.handleSendSticker}
          onSendAudioMeme={s.handleSendAudioMeme} onSendCustomEmoji={s.handleSendCustomEmoji}
          signatureEnabled={s.signatureEnabled} signatureName={s.agentName} onToggleSignature={s.toggleSignature}
          onPollSent={async (poll) => { await supabase.from('messages').insert({ contact_id: conversation.contact.id, whatsapp_connection_id: s.whatsappConnectionId, content: `📊 *Enquete:* ${poll.name}\n${poll.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`, message_type: 'text', sender: 'agent', status: 'sent' }); }}
          onContactSent={async (contactName) => { await supabase.from('messages').insert({ contact_id: conversation.contact.id, whatsapp_connection_id: s.whatsappConnectionId, content: `📇 Cartão de contato: ${contactName}`, message_type: 'text', sender: 'agent', status: 'sent' }); }}
          onOpenCatalog={() => s.openDialog('catalogDirect')} onSelectSuggestion={(text) => s.setInputValue(text)} onSelectTemplate={(text) => s.setInputValue(text)}
          fileUploaderRef={s.fileUploaderRef} inputRef={s.inputRef} />

        <Suspense fallback={null}>
          {s.dialogs.transferDialog && <TransferDialog open={s.dialogs.transferDialog} onOpenChange={(v) => v ? s.openDialog('transferDialog') : s.closeDialog('transferDialog')} onTransfer={(() => { toast({ title: 'Chat transferido!' }); }) as any} />}
          {s.dialogs.scheduleDialog && <ScheduleMessageDialog open={s.dialogs.scheduleDialog} onOpenChange={(v) => v ? s.openDialog('scheduleDialog') : s.closeDialog('scheduleDialog')} onSchedule={s.handleScheduleMessage} />}
          {s.dialogs.callDialog && <CallDialog open={s.dialogs.callDialog} onOpenChange={(v) => v ? s.openDialog('callDialog') : s.closeDialog('callDialog')} contact={{ name: conversation.contact.name, phone: conversation.contact.phone, avatar: conversation.contact.avatar }} direction={s.callDirection} onEnd={() => s.closeDialog('callDialog')} />}
          {s.dialogs.globalSearch && <GlobalSearch open={s.dialogs.globalSearch} onOpenChange={(v) => v ? s.openDialog('globalSearch') : s.closeDialog('globalSearch')} onSelectResult={(result) => { log.debug('Selected:', result); }} />}
          {s.dialogs.interactiveBuilder && <InteractiveMessageBuilder open={s.dialogs.interactiveBuilder} onOpenChange={(v) => v ? s.openDialog('interactiveBuilder') : s.closeDialog('interactiveBuilder')} onSend={s.handleSendInteractiveMessage} />}
          {s.dialogs.forwardDialog && <ForwardMessageDialog open={s.dialogs.forwardDialog} onOpenChange={(v) => v ? s.openDialog('forwardDialog') : s.closeDialog('forwardDialog')} message={s.forwardMessage} onForward={s.handleForwardToTargets} />}
          {s.dialogs.locationPicker && <LocationPicker open={s.dialogs.locationPicker} onOpenChange={(v) => v ? s.openDialog('locationPicker') : s.closeDialog('locationPicker')} onSend={s.handleSendLocation} />}
          {s.dialogs.closeDialog && <CloseConversationDialog open={s.dialogs.closeDialog} onOpenChange={(v) => v ? s.openDialog('closeDialog') : s.closeDialog('closeDialog')} contactId={conversation.contact.id} />}
        </Suspense>

        {s.dialogs.catalogDirect && <ExternalProductCatalog onSendProduct={s.handleSendProduct} open={s.dialogs.catalogDirect} onOpenChange={(v) => v ? s.openDialog('catalogDirect') : s.closeDialog('catalogDirect')} />}

        {s.dialogs.realtimeTranscription && (
          <Suspense fallback={null}>
            <div className="px-3 mb-2">
              <RealtimeTranscription onTranscript={(text, isFinal) => { if (isFinal) s.setInputValue(prev => prev + ' ' + text); }} onStatusChange={() => {}} className="w-full" />
            </div>
          </Suspense>
        )}
      </div>

      {s.activeTool === 'aiAssistant' && (
        <Suspense fallback={null}>
          <ToolPanel isOpen={true} onClose={() => s.handleSetActiveTool('aiAssistant')} icon={<VisionIcon className="w-4 h-4 text-primary" />} title="Visão" subtitle="Análise Profunda">
            <AIConversationAssistant messages={messages.map(m => ({ id: m.id, sender: m.sender, content: m.content, type: m.type, mediaUrl: m.mediaUrl, created_at: m.timestamp.toISOString() }))}
              contactId={conversation.contact.id} contactName={conversation.contact.name} isOpen={s.activeTool === 'aiAssistant'} onClose={() => s.handleSetActiveTool('aiAssistant')} />
          </ToolPanel>
        </Suspense>
      )}

      {s.activeTool === 'objections' && (
        <Suspense fallback={null}>
          <ToolPanel isOpen={true} onClose={() => s.handleSetActiveTool('objections')} icon={<Radar className="w-4 h-4 text-warning" />} title="Monitoramento de Objeções" subtitle="Detecta resistências e sugere contra-argumentos">
            <ObjectionDetector contactId={conversation.contact.id} contactName={conversation.contact.name}
              lastMessages={messages.filter(m => m.sender === 'contact').slice(-5).map(m => m.content)}
              allMessages={messages.map(m => ({ id: m.id, content: m.content, sender: m.sender, timestamp: m.timestamp.toISOString() }))}
              onSelectSuggestion={(text) => s.setInputValue(text)} />
          </ToolPanel>
        </Suspense>
      )}

      {s.activeTool === 'university' && (
        <Suspense fallback={null}>
          <ToolPanel isOpen={true} onClose={() => s.handleSetActiveTool('university')} icon={<GraduationCap className="w-4 h-4 text-primary" />} title="Ajuda dos Universitários" subtitle="Gera respostas inteligentes a partir de mensagens">
            <UniversityHelp contactId={conversation.contact.id} contactName={conversation.contact.name}
              messages={messages.map(m => ({ id: m.id, content: m.content, sender: m.sender, timestamp: m.timestamp.toISOString() }))}
              onSelectSuggestion={(text) => s.setInputValue(text)} />
          </ToolPanel>
        </Suspense>
      )}

      {s.activeTool === 'summary' && (
        <Suspense fallback={null}>
          <ToolPanel isOpen={true} onClose={() => s.handleSetActiveTool('summary')} icon={<FileText className="w-4 h-4 text-primary" />} title="Resumo da Conversa" subtitle="Análise e pontos-chave da conversa">
            <ConversationSummary messages={messages.map(m => ({ id: m.id, sender: m.sender, content: m.content, created_at: m.timestamp.toISOString() }))}
              contactName={conversation.contact.name} contactId={conversation.contact.id} />
          </ToolPanel>
        </Suspense>
      )}
    </div>
  );
}
