import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { getLogger } from '@/lib/logger';

const log = getLogger('TeamChatPanel');
import { TeamConversation, useTeamMessages, useSendTeamMessage, useDeleteTeamMessage, useEditTeamMessage, useToggleMuteConversation, TeamMessage } from '@/hooks/useTeamChat';
import { useAuth } from '@/hooks/useAuth';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, Pencil, Trash2, X, Check, Reply, Image as ImageIcon, Music, FileText, Video, Copy, Volume2, VolumeX, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MarkdownPreview } from '@/components/inbox/chat/MarkdownPreview';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { AddMembersDialog } from './AddMembersDialog';
import { TeamChatHeader } from './TeamChatHeader';
import { TeamChatInputArea } from './TeamChatInputArea';

interface Props {
  conversation: TeamConversation;
  onBack: () => void;
  onToggleDetails?: () => void;
  showDetails?: boolean;
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

function MediaContent({ msg }: { msg: TeamMessage }) {
  if (!msg.media_url) return null;
  switch (msg.media_type) {
    case 'image':
    case 'sticker':
    case 'emoji':
      return (
        <img
          src={msg.media_url}
          alt="media"
          className={cn(
            "rounded-lg max-h-48 object-contain cursor-pointer",
            msg.media_type === 'sticker' || msg.media_type === 'emoji' ? 'w-24 h-24' : 'max-w-full'
          )}
          onClick={() => window.open(msg.media_url!, '_blank')}
        />
      );
    case 'video':
      return <video src={msg.media_url} controls className="rounded-lg max-h-48 max-w-full" />;
    case 'audio':
    case 'audio_meme':
      return <audio src={msg.media_url} controls className="max-w-full" />;
    case 'document':
      return (
        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground underline truncate">{msg.content || 'Documento'}</span>
        </a>
      );
    default:
      return null;
  }
}

function MediaTypeIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'image': return <ImageIcon className="w-3 h-3" />;
    case 'video': return <Video className="w-3 h-3" />;
    case 'audio':
    case 'audio_meme': return <Music className="w-3 h-3" />;
    case 'document': return <FileText className="w-3 h-3" />;
    default: return null;
  }
}

export function TeamChatPanel({ conversation, onBack, onToggleDetails, showDetails }: Props) {
  const { profile } = useAuth();
  const { data: messages = [], isLoading } = useTeamMessages(conversation.id);
  const sendMutation = useSendTeamMessage();
  const deleteMutation = useDeleteTeamMessage();
  const editMutation = useEditTeamMessage();
  const muteMutation = useToggleMuteConversation();

  // Determine if current user has muted this conversation
  const currentMember = conversation.members?.find(m => m.profile_id === profile?.id);
  const isMuted = currentMember?.is_muted ?? false;
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [replyTo, setReplyTo] = useState<TeamMessage | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // TTS
  const { settings, updateSettings, saveSettings } = useUserSettings();
  const handleVoiceChange = (v: string) => { updateSettings({ tts_voice_id: v }); setTimeout(() => saveSettings(), 100); };
  const handleSpeedChange = (s: number) => { updateSettings({ tts_speed: s }); setTimeout(() => saveSettings(), 100); };
  const { speak, stop, isLoading: ttsLoading, isPlaying: ttsPlaying, currentMessageId: ttsMessageId, voiceId, setVoiceId, speed, setSpeed } = useTextToSpeech({
    initialVoiceId: settings.tts_voice_id,
    initialSpeed: settings.tts_speed,
    onVoiceChange: handleVoiceChange,
    onSpeedChange: handleSpeedChange,
  });

  const checkNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isNearBottomRef.current = nearBottom;
    setShowScrollDown(!nearBottom);
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversation.id]);

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(
      { conversationId: conversation.id, content: trimmed, replyToId: replyTo?.id },
      {
        onError: (err) => {
          log.error('Failed to send message:', err);
          toast.error('Falha ao enviar mensagem. Tente novamente.');
          // Restore text so user doesn't lose their message
          setText(trimmed);
        },
      }
    );
    setText('');
    setReplyTo(null);
  };

  const handleSendMedia = (mediaUrl: string, mediaType: string, content?: string) => {
    sendMutation.mutate(
      { conversationId: conversation.id, content: content || '', mediaUrl, mediaType, replyToId: replyTo?.id },
      {
        onError: (err) => {
          log.error('Failed to send media:', err);
          toast.error('Falha ao enviar mídia. Tente novamente.');
        },
      }
    );
    setReplyTo(null);
  };

  const handleSendSticker = (stickerUrl: string) => handleSendMedia(stickerUrl, 'sticker', '🎨 Figurinha');
  const handleSendAudioMeme = (audioUrl: string) => handleSendMedia(audioUrl, 'audio_meme', '🎵 Áudio meme');
  const handleSendCustomEmoji = (emojiUrl: string) => handleSendMedia(emojiUrl, 'emoji', '😀 Emoji');
  const handleFileSent = (mediaUrl: string, mediaType: string, fileName: string) => handleSendMedia(mediaUrl, mediaType, fileName);

  const handleAudioSend = async (blob: Blob) => {
    setIsRecordingAudio(false);
    try {
      const path = `${profile?.id}/${conversation.id}/${Date.now()}.webm`;
      const { error } = await supabase.storage.from('team-chat-files').upload(path, blob, { contentType: 'audio/webm' });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('team-chat-files').getPublicUrl(path);
      handleSendMedia(urlData.publicUrl, 'audio', '🎤 Mensagem de áudio');
    } catch (err) {
      toast.error('Erro ao enviar áudio');
      log.error('Audio upload error:', err);
    }
  };

  const handleDelete = (msgId: string) => deleteMutation.mutate(
    { messageId: msgId, conversationId: conversation.id },
    {
      onError: (err) => {
        log.error('Failed to delete message:', err);
        toast.error('Falha ao excluir mensagem.');
      },
    }
  );
  const handleStartEdit = (msg: TeamMessage) => { setEditingId(msg.id); setEditText(msg.content); };
  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    const savedId = editingId;
    const savedText = editText;
    editMutation.mutate(
      { messageId: editingId, content: editText.trim(), conversationId: conversation.id },
      {
        onError: (err) => {
          log.error('Failed to edit message:', err);
          toast.error('Falha ao editar mensagem.');
          setEditingId(savedId);
          setEditText(savedText);
        },
      }
    );
    setEditingId(null); setEditText('');
  };
  const handleCancelEdit = () => { setEditingId(null); setEditText(''); };
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => toast.success('Mensagem copiada!')).catch(() => toast.error('Erro ao copiar'));
  };

  // Filter messages by search (memoized)
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(m => m.content?.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  // Track which dates have been rendered for separators
  const dateGroupsRef = useRef(new Set<string>());
  // Reset when messages change
  useMemo(() => { dateGroupsRef.current = new Set<string>(); }, [filteredMessages]);
  const dateGroups = dateGroupsRef.current;

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <TeamChatHeader
        conversation={conversation}
        showDetails={showDetails}
        voiceId={voiceId}
        speed={speed}
        showSearch={showSearch}
        isMuted={isMuted}
        onBack={onBack}
        onToggleDetails={onToggleDetails}
        onToggleSearch={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
        onAddMembers={() => setShowAddMembers(true)}
        onVoiceChange={setVoiceId}
        onSpeedChange={setSpeed}
        onToggleMute={() => muteMutation.mutate({ conversationId: conversation.id, muted: !isMuted })}
      />

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 border-b border-border bg-card"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); } }}
                placeholder="Buscar nas mensagens..."
                className="h-8 text-sm"
                aria-label="Buscar mensagens na conversa"
              />
              {searchQuery && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {filteredMessages.length} resultado{filteredMessages.length !== 1 ? 's' : ''}
                </span>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setShowSearch(false); setSearchQuery(''); }} aria-label="Fechar busca">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-1 bg-muted/5" onScroll={checkNearBottom} role="log" aria-label="Mensagens da conversa" aria-live="polite">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <Skeleton className="h-10 rounded-2xl" style={{ width: 120 + (i % 3) * 60 }} />
              </div>
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            {searchQuery ? 'Nenhuma mensagem encontrada' : 'Envie a primeira mensagem!'}
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
            const showDate = !dateGroups.has(dateKey);
            if (showDate) dateGroups.add(dateKey);
            const isMine = msg.sender_id === profile?.id;
            const isEditing = editingId === msg.id;
            const hasMedia = !!msg.media_url;
            const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

            // TTS state for this message
            const isThisTtsPlaying = ttsPlaying && ttsMessageId === msg.id;
            const isThisTtsLoading = ttsLoading && ttsMessageId === msg.id;
            const cleanTextForTts = msg.content?.replace(/\[.*?\]/g, '').replace(/https?:\/\/\S+/g, '').trim();

            const messageContent = (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center py-2">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/20">
                      {formatDateSep(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={cn("flex gap-2 py-0.5 group", isMine ? "justify-end" : "justify-start")}>
                  {!isMine && (
                    <Avatar className="w-7 h-7 mt-1 shrink-0">
                      <AvatarImage src={msg.sender?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {msg.sender?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    "max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm relative",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border/30 text-foreground rounded-bl-md"
                  )}>
                    {!isMine && conversation.type === 'group' && (
                      <p className="text-[10px] font-medium mb-0.5 opacity-70">{msg.sender?.name}</p>
                    )}

                    {repliedMsg && (
                      <div className={cn(
                        "text-[10px] mb-1.5 px-2 py-1 rounded border-l-2",
                        isMine ? "bg-primary-foreground/10 border-primary-foreground/30" : "bg-muted/50 border-muted-foreground/30"
                      )}>
                        <span className="font-medium">{repliedMsg.sender?.name}</span>
                        <p className="truncate opacity-80 flex items-center gap-1">
                          {repliedMsg.media_type && <MediaTypeIcon type={repliedMsg.media_type} />}
                          {repliedMsg.content || 'Mídia'}
                        </p>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="space-y-1.5">
                        <Input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }} className="h-7 text-sm bg-background text-foreground" autoFocus />
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleCancelEdit}><X className="w-3 h-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleSaveEdit}><Check className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {hasMedia && <MediaContent msg={msg} />}
                        {msg.content && (!hasMedia || msg.media_type === 'document') && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            <MarkdownPreview text={msg.content} className="inline" />
                          </p>
                        )}
                        {msg.content && hasMedia && msg.media_type !== 'document' && !['🎨 Figurinha', '🎵 Áudio meme', '😀 Emoji', '🎤 Mensagem de áudio'].includes(msg.content) && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1">{msg.content}</p>
                        )}
                        <div className={cn("flex items-center gap-1 mt-0.5", isMine ? "justify-end" : "justify-between")}>
                          {/* TTS button */}
                          {cleanTextForTts && (
                            <button
                              onClick={() => isThisTtsPlaying ? stop() : speak(msg.content, msg.id)}
                              className={cn(
                                "opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full",
                                isMine ? "text-primary-foreground/60 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                              )}
                              title={isThisTtsPlaying ? 'Parar' : 'Ouvir'}
                            >
                              {isThisTtsLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isThisTtsPlaying ? (
                                <VolumeX className="w-3 h-3" />
                              ) : (
                                <Volume2 className="w-3 h-3" />
                              )}
                            </button>
                          )}
                          <span className={cn(
                            "text-[10px]",
                            isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                          )}>
                            {formatTime(msg.created_at)}
                            {msg.is_edited && ' · editado'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );

            // Context menu for all messages
            return (
              <ContextMenu key={msg.id}>
                <ContextMenuTrigger asChild>
                  {messageContent}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => setReplyTo(msg)} className="gap-2">
                    <Reply className="w-3.5 h-3.5" /> Responder
                  </ContextMenuItem>
                  {msg.content && (
                    <ContextMenuItem onClick={() => handleCopyMessage(msg.content)} className="gap-2">
                      <Copy className="w-3.5 h-3.5" /> Copiar texto
                    </ContextMenuItem>
                  )}
                  {cleanTextForTts && (
                    <ContextMenuItem onClick={() => isThisTtsPlaying ? stop() : speak(msg.content, msg.id)} className="gap-2">
                      <Volume2 className="w-3.5 h-3.5" /> {isThisTtsPlaying ? 'Parar áudio' : 'Ouvir mensagem'}
                    </ContextMenuItem>
                  )}
                  {isMine && !isEditing && (
                    <>
                      <ContextMenuSeparator />
                      {!hasMedia && (
                        <ContextMenuItem onClick={() => handleStartEdit(msg)} className="gap-2">
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </ContextMenuItem>
                      )}
                      <ContextMenuItem onClick={() => handleDelete(msg.id)} className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            );
          })
        )}
      </div>

      {/* Scroll to bottom */}
      {showScrollDown && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <Button size="icon" variant="secondary" className="rounded-full shadow-lg h-8 w-8" onClick={scrollToBottom}>
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <TeamChatInputArea
        conversationId={conversation.id}
        text={text}
        setText={setText}
        replyTo={replyTo}
        isRecordingAudio={isRecordingAudio}
        isPending={sendMutation.isPending}
        onSend={handleSend}
        onCancelReply={() => setReplyTo(null)}
        onRecordToggle={() => setIsRecordingAudio(!isRecordingAudio)}
        onAudioSend={handleAudioSend}
        onSendSticker={handleSendSticker}
        onSendAudioMeme={handleSendAudioMeme}
        onSendCustomEmoji={handleSendCustomEmoji}
        onFileSent={handleFileSent}
      />

      {/* Add Members Dialog */}
      <AddMembersDialog
        open={showAddMembers}
        onOpenChange={setShowAddMembers}
        conversation={conversation}
      />
    </div>
  );
}
