import { useRef, useEffect, useState, useCallback } from 'react';
import { getLogger } from '@/lib/logger';

const log = getLogger('TeamChatPanel');
import { TeamConversation, useTeamMessages, useSendTeamMessage, useDeleteTeamMessage, useEditTeamMessage, TeamMessage } from '@/hooks/useTeamChat';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Users, User, ArrowDown, Pencil, Trash2, X, Check, Mic, Reply, Image as ImageIcon, Music, FileText, Video, UserPlus, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StickerPicker } from '@/components/inbox/StickerPicker';
import { AudioMemePicker } from '@/components/inbox/AudioMemePicker';
import { CustomEmojiPicker } from '@/components/inbox/CustomEmojiPicker';
import { AudioRecorder } from '@/components/inbox/AudioRecorder';
import { MentionAutocomplete, useMentions } from '@/components/inbox/chat/MentionAutocomplete';
import { MarkdownPreview } from '@/components/inbox/chat/MarkdownPreview';
import { RichTextToolbar, RichTextToggle } from '@/components/inbox/chat/RichTextToolbar';
import { AIRewriteButton } from '@/components/inbox/chat/AIRewriteButton';
import { TextToAudioButton } from '@/components/inbox/TextToAudioButton';
import { VoiceDictationButton } from '@/components/mobile/VoiceDictationButton';
import { TeamFileUploader } from './TeamFileUploader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { AddMembersDialog } from './AddMembersDialog';

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
      return (
        <video
          src={msg.media_url}
          controls
          className="rounded-lg max-h-48 max-w-full"
        />
      );
    case 'audio':
    case 'audio_meme':
      return (
        <audio src={msg.media_url} controls className="max-w-full" />
      );
    case 'document':
      return (
        <a
          href={msg.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
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
    case 'sticker': return <ImageIcon className="w-3 h-3" />;
    default: return null;
  }
}

export function TeamChatPanel({ conversation, onBack, onToggleDetails, showDetails }: Props) {
  const { profile } = useAuth();
  const { data: messages = [], isLoading } = useTeamMessages(conversation.id);
  const sendMutation = useSendTeamMessage();
  const deleteMutation = useDeleteTeamMessage();
  const editMutation = useEditTeamMessage();
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showRichToolbar, setShowRichToolbar] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [replyTo, setReplyTo] = useState<TeamMessage | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mentions
  const {
    isOpen: mentionOpen,
    cursorPos: mentionCursorPos,
    checkForMention,
    handleSelect: handleMentionSelect,
    close: closeMention,
  } = useMentions(textareaRef);

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.id]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate({
      conversationId: conversation.id,
      content: trimmed,
      replyToId: replyTo?.id,
    });
    setText('');
    setReplyTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendMedia = (mediaUrl: string, mediaType: string, content?: string) => {
    sendMutation.mutate({
      conversationId: conversation.id,
      content: content || '',
      mediaUrl,
      mediaType,
      replyToId: replyTo?.id,
    });
    setReplyTo(null);
  };

  const handleSendSticker = (stickerUrl: string) => handleSendMedia(stickerUrl, 'sticker', '🎨 Figurinha');
  const handleSendAudioMeme = (audioUrl: string) => handleSendMedia(audioUrl, 'audio_meme', '🎵 Áudio meme');
  const handleSendCustomEmoji = (emojiUrl: string) => handleSendMedia(emojiUrl, 'emoji', '😀 Emoji');

  const handleFileSent = (mediaUrl: string, mediaType: string, fileName: string) => {
    handleSendMedia(mediaUrl, mediaType, fileName);
  };

  const handleAudioSend = async (blob: Blob) => {
    setIsRecordingAudio(false);
    try {
      const ext = 'webm';
      const path = `${profile?.id}/${conversation.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('team-chat-files')
        .upload(path, blob, { contentType: 'audio/webm' });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('team-chat-files')
        .getPublicUrl(path);

      handleSendMedia(urlData.publicUrl, 'audio', '🎤 Mensagem de áudio');
    } catch (err) {
      toast.error('Erro ao enviar áudio');
      log.error('Audio upload error:', err);
    }
  };

  const handleDelete = (msgId: string) => {
    deleteMutation.mutate({ messageId: msgId, conversationId: conversation.id });
  };

  const handleStartEdit = (msg: TeamMessage) => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    editMutation.mutate({
      messageId: editingId,
      content: editText.trim(),
      conversationId: conversation.id,
    });
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const dateGroups = new Set<string>();

  return (
    <div className="flex flex-col h-full w-full relative">
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
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-foreground truncate">{conversation.name}</h3>
          <p className="text-xs text-muted-foreground">
            {conversation.type === 'group'
              ? `${conversation.members?.length || 0} membros`
              : 'Chat direto'}
          </p>
        </div>
        {conversation.type === 'group' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setShowAddMembers(true)}
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Adicionar membros</TooltipContent>
          </Tooltip>
        )}
        {onToggleDetails && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onToggleDetails}
              >
                {showDetails ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showDetails ? 'Fechar detalhes' : 'Ver detalhes'}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-4 space-y-1 bg-muted/5"
        onScroll={checkNearBottom}
      >
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
            const showDate = !dateGroups.has(dateKey);
            if (showDate) dateGroups.add(dateKey);
            const isMine = msg.sender_id === profile?.id;
            const isEditing = editingId === msg.id;
            const hasMedia = !!msg.media_url;

            // Find the replied message
            const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

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
                    "max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border/30 text-foreground rounded-bl-md"
                  )}>
                    {!isMine && conversation.type === 'group' && (
                      <p className="text-[10px] font-medium mb-0.5 opacity-70">{msg.sender?.name}</p>
                    )}

                    {/* Reply reference */}
                    {repliedMsg && (
                      <div className={cn(
                        "text-[10px] mb-1.5 px-2 py-1 rounded border-l-2",
                        isMine
                          ? "bg-primary-foreground/10 border-primary-foreground/30"
                          : "bg-muted/50 border-muted-foreground/30"
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
                        <Input
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="h-7 text-sm bg-background text-foreground"
                          autoFocus
                        />
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleCancelEdit}>
                            <X className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleSaveEdit}>
                            <Check className="w-3 h-3" />
                          </Button>
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
                        {msg.content && hasMedia && msg.media_type !== 'document' && msg.content !== '🎨 Figurinha' && msg.content !== '🎵 Áudio meme' && msg.content !== '😀 Emoji' && msg.content !== '🎤 Mensagem de áudio' && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1">{msg.content}</p>
                        )}
                        <p className={cn(
                          "text-[10px] mt-0.5 text-right",
                          isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                        )}>
                          {formatTime(msg.created_at)}
                          {msg.is_edited && ' · editado'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );

            if (isMine && !isEditing) {
              return (
                <ContextMenu key={msg.id}>
                  <ContextMenuTrigger asChild>
                    {messageContent}
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => setReplyTo(msg)} className="gap-2">
                      <Reply className="w-3.5 h-3.5" /> Responder
                    </ContextMenuItem>
                    {!hasMedia && (
                      <ContextMenuItem onClick={() => handleStartEdit(msg)} className="gap-2">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem
                      onClick={() => handleDelete(msg.id)}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            }

            // Other user's messages — allow reply via context menu
            return (
              <ContextMenu key={msg.id}>
                <ContextMenuTrigger asChild>
                  {messageContent}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => setReplyTo(msg)} className="gap-2">
                    <Reply className="w-3.5 h-3.5" /> Responder
                  </ContextMenuItem>
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

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pt-2 bg-card border-t border-border"
          >
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border-l-2 border-primary">
              <Reply className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-primary">{replyTo.sender?.name || 'Você'}</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  {replyTo.media_type && <MediaTypeIcon type={replyTo.media_type} />}
                  {replyTo.content || 'Mídia'}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => setReplyTo(null)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="p-3 border-t border-border bg-card space-y-2">
        {isRecordingAudio ? (
          <AudioRecorder
            onSend={handleAudioSend}
            onCancel={() => setIsRecordingAudio(false)}
          />
        ) : (
          <>
            {/* Mention autocomplete */}
            <div className="relative">
              <MentionAutocomplete
                inputValue={text}
                cursorPosition={mentionCursorPos}
                onSelect={handleMentionSelect}
                onClose={closeMention}
                isOpen={mentionOpen}
              />
            </div>

            {/* Markdown Preview */}
            <AnimatePresence>
              {showMarkdownPreview && text.trim() && showRichToolbar && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 py-2 border border-border/50 rounded-lg bg-muted/30 text-sm max-h-[100px] overflow-y-auto"
                >
                  <MarkdownPreview text={text} className="text-foreground leading-relaxed" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rich Text Toolbar */}
            {showRichToolbar && (
              <RichTextToolbar
                inputRef={textareaRef}
                inputValue={text}
                onInputChange={setText}
                visible={showRichToolbar}
                onToggle={() => setShowRichToolbar(!showRichToolbar)}
              />
            )}

            <div className="flex items-end gap-2">
              {/* Left tools */}
              <div className="flex items-center gap-0.5 shrink-0">
                <TeamFileUploader
                  conversationId={conversation.id}
                  onFileSent={handleFileSent}
                />
                <VoiceDictationButton
                  onTranscript={(transcript) => {
                    setText(prev => prev + (prev ? ' ' : '') + transcript);
                  }}
                  disabled={isRecordingAudio}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setIsRecordingAudio(true)}
                  title="Gravar áudio"
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </div>

              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={text}
                onChange={e => {
                  setText(e.target.value);
                  checkForMention(e.target.value, e.target.selectionStart || 0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem... (@mencionar)"
                className="min-h-[40px] max-h-[120px] resize-none flex-1"
                rows={1}
              />

              {/* Right tools */}
              <div className="flex items-center gap-0.5 shrink-0">
                <AIRewriteButton
                  inputValue={text}
                  onRewrite={(newText) => {
                    const el = textareaRef.current;
                    if (!el) return;
                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                    if (nativeSetter) {
                      nativeSetter.call(el, newText);
                      el.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }}
                />
                <RichTextToggle active={showRichToolbar} onToggle={() => setShowRichToolbar(!showRichToolbar)} />
                <TextToAudioButton inputValue={text} onAudioReady={handleAudioSend} />
                <CustomEmojiPicker onSendEmoji={handleSendCustomEmoji} />
                <StickerPicker onSendSticker={handleSendSticker} />
                <AudioMemePicker onSendAudio={handleSendAudioMeme} />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!text.trim() || sendMutation.isPending}
                  className="h-10 w-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Members Dialog */}
      <AddMembersDialog
        open={showAddMembers}
        onOpenChange={setShowAddMembers}
        conversation={conversation}
      />
    </div>
  );
}
