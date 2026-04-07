import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { RichTextToolbar } from './RichTextToolbar';
import { AIRewriteButton } from './AIRewriteButton';
import { MentionAutocomplete, useMentions } from './MentionAutocomplete';
import { MarkdownPreview } from './MarkdownPreview';
import { ReplyPreview } from '../ReplyQuote';
import { SlashCommands, SlashCommand } from '../SlashCommands';
import { AudioRecorder } from '../AudioRecorder';
import { FileUploaderRef } from '../FileUploader';
import { ExternalProduct } from '@/hooks/useExternalCatalog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SecondaryToolbar, TertiaryToolsMenu } from './ChatInputToolbars';
import { StickerPicker } from '../StickerPicker';
import { CustomEmojiPicker } from '../CustomEmojiPicker';
import { RichTextToggle } from './RichTextToolbar';
import { FileUploader } from '../FileUploader';
import {
  Send, Mic, Pencil, X, Check, Plus, Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface QuickReplyItem {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  category: string;
}

interface ChatInputAreaProps {
  inputValue: string;
  replyToMessage: Message | null;
  editingMessage?: Message | null;
  isRecordingAudio: boolean;
  showSlashCommands: boolean;
  contactId: string;
  contactPhone: string;
  contactName: string;
  instanceName?: string;
  onPollSent?: (poll: { name: string; options: string[]; selectableCount: number }) => void;
  onContactSent?: (contactName: string) => void;
  messages: Message[];
  quickReplies: QuickReplyItem[];
  isSending?: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  onSend: () => void;
  onCancelReply: () => void;
  onCancelEdit?: () => void;
  onSlashCommand: (command: SlashCommand, subCommand?: string) => void;
  onCloseSlashCommands: () => void;
  onQuickReply: (reply: QuickReplyItem) => void;
  onRecordToggle: () => void;
  onAudioSend: (blob: Blob) => void;
  onAudioCancel: () => void;
  onOpenInteractiveBuilder: () => void;
  onOpenSchedule: () => void;
  onOpenLocationPicker: () => void;
  onSendProduct: (product: ExternalProduct) => void;
  onSendSticker: (stickerUrl: string) => void;
  onSendAudioMeme: (audioUrl: string) => void;
  onSendCustomEmoji: (emojiUrl: string) => void;
  onOpenCatalog?: () => void;
  onSelectSuggestion: (text: string) => void;
  onSelectTemplate: (text: string) => void;
  onExternalFiles?: (files: File[]) => void;
  onPasteFiles?: (files: File[]) => void;
  signatureEnabled?: boolean;
  signatureName?: string;
  onToggleSignature?: () => void;
  fileUploaderRef: React.RefObject<FileUploaderRef | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

// Draft auto-save key
const DRAFT_KEY_PREFIX = 'chat_draft_';

export function ChatInputArea({
  inputValue,
  replyToMessage,
  editingMessage,
  isRecordingAudio,
  showSlashCommands,
  contactId,
  contactPhone,
  contactName,
  instanceName,
  onPollSent,
  onContactSent,
  messages,
  quickReplies,
  isSending = false,
  onInputChange,
  onKeyDown,
  onBlur,
  onSend,
  onCancelReply,
  onCancelEdit,
  onSlashCommand,
  onCloseSlashCommands,
  onQuickReply,
  onRecordToggle,
  onAudioSend,
  onAudioCancel,
  onOpenInteractiveBuilder,
  onOpenSchedule,
  onOpenLocationPicker,
  onSendProduct,
  onSendSticker,
  onSendAudioMeme,
  onSendCustomEmoji,
  onOpenCatalog,
  onSelectSuggestion,
  onSelectTemplate,
   onPasteFiles,
   signatureEnabled,
   signatureName,
   onToggleSignature,
   fileUploaderRef,
   inputRef,
}: ChatInputAreaProps) {
  const [showRichToolbar, setShowRichToolbar] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [sendAnimation, setSendAnimation] = useState(false);
  const isMobile = useIsMobile();

  // Mentions support
  const { isOpen: mentionOpen, cursorPos: mentionCursorPos, checkForMention, handleSelect: handleMentionSelect, close: closeMention } = useMentions(inputRef);

  const hasText = inputValue.trim().length > 0;
  const charCount = inputValue.length;
  const CHAR_LIMIT = 4096; // WhatsApp limit
  const isNearLimit = charCount > CHAR_LIMIT * 0.9;
  const isOverLimit = charCount > CHAR_LIMIT;

  // Auto-grow textarea
  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`; // max 200px instead of 120
  }, [inputRef]);

  useEffect(() => {
    autoResize();
  }, [inputValue, autoResize]);

  // Auto-save drafts
  useEffect(() => {
    if (!contactId || editingMessage) return;
    const timer = setTimeout(() => {
      try {
        if (inputValue.trim()) {
          localStorage.setItem(`${DRAFT_KEY_PREFIX}${contactId}`, inputValue);
        } else {
          localStorage.removeItem(`${DRAFT_KEY_PREFIX}${contactId}`);
        }
      } catch { /* quota exceeded or private mode */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue, contactId, editingMessage]);

  // Restore draft on contact change
  useEffect(() => {
    if (!contactId || editingMessage) return;
    let draft: string | null = null;
    try { draft = localStorage.getItem(`${DRAFT_KEY_PREFIX}${contactId}`); } catch { /* private mode */ }
    if (draft && !inputValue) {
      const el = inputRef.current;
      if (el) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(el, draft);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  }, [contactId]);

  // Paste images from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      if (onPasteFiles) {
        onPasteFiles(files);
      } else if (fileUploaderRef.current) {
        fileUploaderRef.current.handleExternalFiles(files);
      }
    }
  }, [onPasteFiles, fileUploaderRef]);

  // Voice dictation handler
  const handleVoiceDictation = useCallback((text: string) => {
    const el = inputRef.current;
    if (!el) return;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeSetter) {
      const current = el.value;
      const newValue = current ? `${current} ${text}` : text;
      nativeSetter.call(el, newValue);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
    }
  }, [inputRef]);

  // Send with animation
  const handleSendWithAnimation = useCallback(() => {
    if (!hasText || isOverLimit) return;
    setSendAnimation(true);
    // Clear draft on send
    try { localStorage.removeItem(`${DRAFT_KEY_PREFIX}${contactId}`); } catch { /* ignore */ }
    // Haptic feedback on mobile
    if (isMobile && navigator.vibrate) {
      navigator.vibrate(50);
    }
    onSend();
    setTimeout(() => setSendAnimation(false), 400);
  }, [hasText, isOverLimit, contactId, isMobile, onSend]);

  // Tertiary tools menu (rendered via extracted component)
  const tertiaryTools = useMemo(() => (
    <TertiaryToolsMenu
      instanceName={instanceName}
      contactPhone={contactPhone}
      contactName={contactName}
      messages={messages}
      quickReplies={quickReplies}
      onOpenInteractiveBuilder={onOpenInteractiveBuilder}
      onOpenLocationPicker={onOpenLocationPicker}
      onOpenSchedule={onOpenSchedule}
      onSendProduct={onSendProduct}
      onSelectSuggestion={onSelectSuggestion}
      onSelectTemplate={onSelectTemplate}
      onQuickReply={onQuickReply}
      signatureEnabled={signatureEnabled}
      signatureName={signatureName}
      onToggleSignature={onToggleSignature}
      onPollSent={onPollSent}
      onContactSent={onContactSent}
    />
  ), [instanceName, contactPhone, contactName, messages, quickReplies, onOpenInteractiveBuilder, onOpenLocationPicker, onOpenSchedule, onSendProduct, onSelectSuggestion, onSelectTemplate, signatureEnabled, signatureName, onToggleSignature]);

  return (
    <>
      {/* Rich Text Toolbar */}
      <RichTextToolbar
        inputRef={inputRef}
        inputValue={inputValue}
        onInputChange={(val) => {
          const el = inputRef.current;
          if (!el) return;
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          if (nativeSetter) {
            nativeSetter.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }}
        visible={showRichToolbar}
        onToggle={() => setShowRichToolbar(!showRichToolbar)}
      />

      {/* Reply Preview */}
      <AnimatePresence>
        {replyToMessage && !editingMessage && (
          <ReplyPreview
            message={replyToMessage}
            onCancel={onCancelReply}
          />
        )}
      </AnimatePresence>

      {/* Edit Preview Bar */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-2"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <Pencil className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-primary">Editando mensagem</span>
                <p className="text-xs text-muted-foreground truncate">{editingMessage.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 text-muted-foreground hover:text-destructive shrink-0"
                onClick={onCancelEdit}
                aria-label="Cancelar edição"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Footer */}
      <div className={cn(
        "px-4 py-3 border-t border-border bg-card",
        isMobile && "px-2.5 py-2 safe-area-bottom"
      )}>
        {/* Audio Recorder overlay */}
        <AnimatePresence>
          {isRecordingAudio && (
            <div className="mb-3">
              <AudioRecorder
                onSend={onAudioSend}
                onCancel={onAudioCancel}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Slash Commands Menu */}
        <SlashCommands
          inputValue={inputValue}
          onSelectCommand={onSlashCommand}
          onClose={onCloseSlashCommands}
          isOpen={showSlashCommands}
        />

        {/* Main input row: [+menu] [mic] [textarea] [secondary icons] [send/mic] */}
        <div className="flex items-end gap-1.5" role="toolbar" aria-label="Barra de mensagem">
          {/* Tertiary tools menu */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 touch-manipulation active:scale-95",
                  isMobile ? "w-10 h-10" : "w-9 h-9"
                )}
                aria-label="Mais opções de mensagem"
              >
                <Plus className="w-[18px] h-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-popover border-border" align="start" side="top">
              {tertiaryTools}
            </PopoverContent>
          </Popover>

          {/* Textarea with mentions and markdown preview */}
          <div className="flex-1 min-w-0 relative">
            {/* Mention Autocomplete */}
            <MentionAutocomplete
              inputValue={inputValue}
              cursorPosition={mentionCursorPos}
              onSelect={handleMentionSelect}
              onClose={closeMention}
              isOpen={mentionOpen}
            />

            {/* Markdown Preview (above textarea) */}
            <AnimatePresence>
              {showMarkdownPreview && hasText && showRichToolbar && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-1 px-3 py-2 border border-border/50 rounded-lg bg-muted/30 text-sm max-h-[100px] overflow-y-auto"
                >
                  <MarkdownPreview text={inputValue} className="text-foreground leading-relaxed" />
                </motion.div>
              )}
            </AnimatePresence>

            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                onInputChange(e);
                // Check for @mentions
                checkForMention(e.target.value, e.target.selectionStart ?? 0);
              }}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
              onPaste={handlePaste}
              onClick={(e) => {
                // Update mention position on click
                const target = e.target as HTMLTextAreaElement;
                checkForMention(target.value, target.selectionStart ?? 0);
              }}
              placeholder={
                editingMessage
                  ? "Editar mensagem..."
                  : replyToMessage
                    ? "Digite sua resposta..."
                    : "Digite uma mensagem... (/ para comandos, @ para mencionar)"
              }
              rows={1}
              className={cn(
                "w-full bg-transparent border border-border/50 rounded-xl outline-none text-sm text-foreground",
                "placeholder:text-muted-foreground resize-none transition-all",
                "focus:border-primary/50 focus:ring-1 focus:ring-primary/20",
                isMobile ? "px-3 py-2.5 text-[16px] min-h-[42px] max-h-[200px]" : "px-3 py-2 min-h-[40px] max-h-[200px]",
                isOverLimit && "border-destructive/50 focus:border-destructive focus:ring-destructive/20"
              )}
              aria-label={
                editingMessage
                  ? "Editar mensagem"
                  : replyToMessage
                    ? "Responder mensagem"
                    : "Digite sua mensagem"
              }
              aria-describedby={charCount > 0 ? "char-counter" : undefined}
            />
            {/* Character counter */}
            {charCount > 100 && (
              <span
                id="char-counter"
                className={cn(
                  "absolute bottom-1 right-2 text-[10px] select-none pointer-events-none",
                  isOverLimit ? "text-destructive font-medium" : isNearLimit ? "text-warning" : "text-muted-foreground/50"
                )}
              >
                {charCount}/{CHAR_LIMIT}
              </span>
            )}
          </div>

          {/* Primary action: Send + Mic (immediately after textarea) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSendWithAnimation}
                  disabled={(!hasText && !editingMessage) || isOverLimit || isSending}
                  size="icon"
                  className={cn(
                    "rounded-full shrink-0 disabled:opacity-40 touch-manipulation active:scale-95 transition-all",
                    "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40",
                    isMobile ? "w-11 h-11" : "w-10 h-10",
                    sendAnimation && "motion-safe:animate-pulse"
                  )}
                  aria-label={editingMessage ? "Confirmar edição" : "Enviar mensagem"}
                >
                  {isSending ? (
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                  ) : editingMessage ? (
                    <Check className="w-[18px] h-[18px]" />
                  ) : (
                    <Send className="w-[18px] h-[18px]" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{editingMessage ? 'Confirmar edição' : 'Enviar (Enter)'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={cn(
                    "shrink-0 touch-manipulation active:scale-95 rounded-full transition-all",
                    isMobile ? "w-11 h-11" : "w-10 h-10",
                    isRecordingAudio
                      ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30 hover:bg-destructive/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
                  )}
                  onClick={onRecordToggle}
                  aria-label={isRecordingAudio ? "Parar gravação" : "Gravar áudio"}
                >
                  <Mic className={cn("w-5 h-5", isRecordingAudio && "motion-safe:animate-pulse")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{isRecordingAudio ? 'Parar gravação' : 'Gravar áudio'}</TooltipContent>
            </Tooltip>
          </div>

          {/* Secondary icons toolbar (desktop) */}
          {!isMobile && (
            <SecondaryToolbar
              inputRef={inputRef}
              inputValue={inputValue}
              showRichToolbar={showRichToolbar}
              onToggleRichToolbar={() => setShowRichToolbar(!showRichToolbar)}
              isRecordingAudio={isRecordingAudio}
              onSendSticker={onSendSticker}
              onSendAudioMeme={onSendAudioMeme}
              onSendCustomEmoji={onSendCustomEmoji}
              onOpenCatalog={onOpenCatalog}
              onAudioSend={onAudioSend}
              fileUploaderRef={fileUploaderRef}
              instanceName={instanceName}
              contactPhone={contactPhone}
              contactId={contactId}
              onVoiceDictation={handleVoiceDictation}
            />
          )}

          {/* Mobile: attach */}
          {isMobile && (
            <div className="flex items-center gap-0.5 shrink-0">
              <FileUploader
                ref={fileUploaderRef}
                instanceName={instanceName || ''}
                recipientNumber={contactPhone}
                contactId={contactId}
                connectionId={undefined}
                onFileSelect={(file, category) => {
                  toast({
                    title: 'Arquivo selecionado',
                    description: `${file.name} (${category}) será enviado.`,
                  });
                }}
                onFileSent={() => {
                  toast({
                    title: 'Arquivo enviado!',
                    description: 'O arquivo foi enviado com sucesso.',
                  });
                }}
              />
            </div>
          )}
        </div>

        {/* Mobile: compact secondary tools row */}
        {isMobile && hasText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 mt-1.5 overflow-x-auto scrollbar-none pb-0.5"
          >
            <AIRewriteButton
              inputValue={inputValue}
              onRewrite={(newText) => {
                const el = inputRef.current;
                if (!el) return;
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                if (nativeSetter) {
                  nativeSetter.call(el, newText);
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
            />
            <RichTextToggle active={showRichToolbar} onToggle={() => setShowRichToolbar(!showRichToolbar)} />
            <CustomEmojiPicker onSendEmoji={onSendCustomEmoji} />
            <StickerPicker onSendSticker={onSendSticker} />
          </motion.div>
        )}
      </div>
    </>
  );
}
