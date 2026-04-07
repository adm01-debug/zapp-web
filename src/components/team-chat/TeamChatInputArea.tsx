import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { TeamMessage } from '@/hooks/useTeamChat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getLogger } from '@/lib/logger';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { RichTextToolbar, RichTextToggle } from '@/components/inbox/chat/RichTextToolbar';
import { AIRewriteButton } from '@/components/inbox/chat/AIRewriteButton';
import { TextToAudioButton } from '@/components/inbox/TextToAudioButton';
import { MentionAutocomplete, useMentions } from '@/components/inbox/chat/MentionAutocomplete';
import { MarkdownPreview } from '@/components/inbox/chat/MarkdownPreview';
import { StickerPicker } from '@/components/inbox/StickerPicker';
import { AudioMemePicker } from '@/components/inbox/AudioMemePicker';
import { CustomEmojiPicker } from '@/components/inbox/CustomEmojiPicker';
import { AudioRecorder } from '@/components/inbox/AudioRecorder';
import { VoiceDictationButton } from '@/components/mobile/VoiceDictationButton';
import { TeamFileUploader } from './TeamFileUploader';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Send,
  Mic,
  Reply,
  X,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const DRAFT_KEY_PREFIX = 'team_draft_';
const CHAR_LIMIT = 10000;

interface TeamChatInputAreaProps {
  conversationId: string;
  text: string;
  setText: (text: string) => void;
  replyTo: TeamMessage | null;
  isRecordingAudio: boolean;
  isPending: boolean;
  onSend: () => void;
  onCancelReply: () => void;
  onRecordToggle: () => void;
  onAudioSend: (blob: Blob) => void;
  onSendSticker: (url: string) => void;
  onSendAudioMeme: (url: string) => void;
  onSendCustomEmoji: (url: string) => void;
  onFileSent: (mediaUrl: string, mediaType: string, fileName: string) => void;
}

export function TeamChatInputArea({
  conversationId,
  text,
  setText,
  replyTo,
  isRecordingAudio,
  isPending,
  onSend,
  onCancelReply,
  onRecordToggle,
  onAudioSend,
  onSendSticker,
  onSendAudioMeme,
  onSendCustomEmoji,
  onFileSent,
}: TeamChatInputAreaProps) {
  const { profile } = useAuth();
  const log = useMemo(() => getLogger('TeamChatInputArea'), []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showRichToolbar, setShowRichToolbar] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [pasteUploading, setPasteUploading] = useState(false);
  const [sendAnimation, setSendAnimation] = useState(false);
  const isMobile = useIsMobile();

  // Mentions
  const {
    isOpen: mentionOpen,
    cursorPos: mentionCursorPos,
    checkForMention,
    handleSelect: handleMentionSelect,
    close: closeMention,
  } = useMentions(textareaRef);

  const hasText = text.trim().length > 0;
  const charCount = text.length;
  const isNearLimit = charCount > CHAR_LIMIT * 0.9;
  const isOverLimit = charCount > CHAR_LIMIT;

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  // Auto-save drafts
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (text.trim()) {
          localStorage.setItem(`${DRAFT_KEY_PREFIX}${conversationId}`, text);
        } else {
          localStorage.removeItem(`${DRAFT_KEY_PREFIX}${conversationId}`);
        }
      } catch { /* quota exceeded */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [text, conversationId]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(`${DRAFT_KEY_PREFIX}${conversationId}`);
      if (draft && !text) setText(draft);
    } catch { /* private mode */ }
  }, [conversationId]);

  // Paste images from clipboard
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !profile || pasteUploading) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) return;

        setPasteUploading(true);
        try {
          const ext = file.type.split('/')[1] || 'png';
          const path = `${profile.id}/${conversationId}/${Date.now()}_paste.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('team-chat-files')
            .upload(path, file, { contentType: file.type });
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('team-chat-files')
            .getPublicUrl(path);

          onFileSent(urlData.publicUrl, 'image', `📋 Imagem colada`);
        } catch (err) {
          log.error('Paste image upload error:', err);
          toast.error('Erro ao enviar imagem colada');
        } finally {
          setPasteUploading(false);
        }
        return;
      }
    }
  }, [profile, conversationId, pasteUploading, onFileSent, log]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendWithAnimation();
    }
  };

  const handleSendWithAnimation = useCallback(() => {
    if (!hasText || isOverLimit || isPending) return;
    setSendAnimation(true);
    try { localStorage.removeItem(`${DRAFT_KEY_PREFIX}${conversationId}`); } catch { /* ignore */ }
    if (isMobile && navigator.vibrate) navigator.vibrate(50);
    onSend();
    setTimeout(() => setSendAnimation(false), 400);
  }, [hasText, isOverLimit, isPending, conversationId, isMobile, onSend]);

  const handleVoiceDictation = useCallback((transcript: string) => {
    setText(text ? `${text} ${transcript}` : transcript);
    textareaRef.current?.focus();
  }, [text, setText]);

  return (
    <>
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
                <p className="text-xs text-muted-foreground truncate">{replyTo.content || 'Mídia'}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={onCancelReply}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rich Text Toolbar */}
      <RichTextToolbar
        inputRef={textareaRef}
        inputValue={text}
        onInputChange={setText}
        visible={showRichToolbar}
        onToggle={() => setShowRichToolbar(!showRichToolbar)}
      />

      {/* Input Footer */}
      <div className={cn("px-4 py-3 border-t border-border bg-card", isMobile && "px-2.5 py-2 safe-area-bottom")}>
        {/* Audio Recorder overlay */}
        <AnimatePresence>
          {isRecordingAudio && (
            <div className="mb-3">
              <AudioRecorder onSend={onAudioSend} onCancel={() => onRecordToggle()} />
            </div>
          )}
        </AnimatePresence>

        {/* Markdown Preview */}
        <AnimatePresence>
          {showMarkdownPreview && hasText && showRichToolbar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-1 px-3 py-2 border border-border/50 rounded-lg bg-muted/30 text-sm max-h-[100px] overflow-y-auto"
            >
              <MarkdownPreview text={text} className="text-foreground leading-relaxed" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main input row */}
        <div className="flex items-end gap-1.5" role="toolbar" aria-label="Barra de mensagem">
          {/* + Menu (attach/options) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 touch-manipulation", isMobile ? "w-10 h-10" : "w-9 h-9")}
                aria-label="Mais opções"
              >
                <Plus className="w-[18px] h-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-popover border-border" align="start" side="top">
              <div className="flex flex-col gap-1">
                <TeamFileUploader conversationId={conversationId} onFileSent={onFileSent} />
              </div>
            </PopoverContent>
          </Popover>

          {/* Textarea */}
          <div className="flex-1 min-w-0 relative">
            <MentionAutocomplete
              inputValue={text}
              cursorPosition={mentionCursorPos}
              onSelect={handleMentionSelect}
              onClose={closeMention}
              isOpen={mentionOpen}
            />
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                checkForMention(e.target.value, e.target.selectionStart ?? 0);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onClick={(e) => {
                const target = e.target as HTMLTextAreaElement;
                checkForMention(target.value, target.selectionStart ?? 0);
              }}
              placeholder="Digite uma mensagem... (/ para comandos, @ para mencionar)"
              rows={1}
              className={cn(
                "w-full bg-transparent border border-border/50 rounded-xl outline-none text-sm text-foreground",
                "placeholder:text-muted-foreground resize-none transition-all",
                "focus:border-primary/50 focus:ring-1 focus:ring-primary/20",
                isMobile ? "px-3 py-2.5 text-[16px] min-h-[42px] max-h-[200px]" : "px-3 py-2 min-h-[40px] max-h-[200px]",
                isOverLimit && "border-destructive/50 focus:border-destructive focus:ring-destructive/20"
              )}
              aria-label="Digite sua mensagem"
              aria-describedby={charCount > 0 ? "team-char-counter" : undefined}
            />
            {charCount > 100 && (
              <span
                id="team-char-counter"
                className={cn(
                  "absolute bottom-1 right-2 text-[10px] select-none pointer-events-none",
                  isOverLimit ? "text-destructive font-medium" : isNearLimit ? "text-warning" : "text-muted-foreground/50"
                )}
              >
                {charCount}/{CHAR_LIMIT}
              </span>
            )}
          </div>

          {/* Send + Mic */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSendWithAnimation}
                  disabled={!hasText || isOverLimit || isPending}
                  size="icon"
                  className={cn(
                    "rounded-full shrink-0 disabled:opacity-40 touch-manipulation active:scale-95 transition-all",
                    "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25",
                    isMobile ? "w-11 h-11" : "w-10 h-10",
                    sendAnimation && "motion-safe:animate-pulse"
                  )}
                >
                  {isPending ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Send className="w-[18px] h-[18px]" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Enviar (Enter)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={cn(
                    "shrink-0 touch-manipulation active:scale-95 rounded-full transition-all",
                    isMobile ? "w-11 h-11" : "w-10 h-10",
                    isRecordingAudio
                      ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
                  )}
                  onClick={onRecordToggle}
                >
                  <Mic className={cn("w-5 h-5", isRecordingAudio && "motion-safe:animate-pulse")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{isRecordingAudio ? 'Parar gravação' : 'Gravar áudio'}</TooltipContent>
            </Tooltip>
          </div>

          {/* Secondary icons: AI, Stickers, AudioMemes, CustomEmoji, Attach, RichText, Dictation, TTS */}
          {!isMobile && (
            <div className="flex items-center gap-0.5 shrink-0">
              <AIRewriteButton
                inputValue={text}
                onRewrite={(newText) => setText(newText)}
              />
              <StickerPicker onSendSticker={onSendSticker} />
              <AudioMemePicker onSendAudio={onSendAudioMeme} />
              <CustomEmojiPicker onSendEmoji={onSendCustomEmoji} />
              <RichTextToggle active={showRichToolbar} onToggle={() => setShowRichToolbar(!showRichToolbar)} />
              <VoiceDictationButton onTranscript={handleVoiceDictation} disabled={isRecordingAudio} />
              <TextToAudioButton inputValue={text} onAudioReady={onAudioSend} />
            </div>
          )}

          {/* Mobile: attach only */}
          {isMobile && (
            <div className="flex items-center gap-0.5 shrink-0">
              <TeamFileUploader conversationId={conversationId} onFileSent={onFileSent} />
            </div>
          )}
        </div>

        {/* Mobile: secondary tools row */}
        {isMobile && hasText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 mt-1.5 overflow-x-auto scrollbar-none pb-0.5"
          >
            <AIRewriteButton inputValue={text} onRewrite={(newText) => setText(newText)} />
            <RichTextToggle active={showRichToolbar} onToggle={() => setShowRichToolbar(!showRichToolbar)} />
            <CustomEmojiPicker onSendEmoji={onSendCustomEmoji} />
            <StickerPicker onSendSticker={onSendSticker} />
          </motion.div>
        )}
      </div>
    </>
  );
}
