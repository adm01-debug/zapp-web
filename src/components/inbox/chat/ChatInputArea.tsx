import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { VoiceDictationButton } from '@/components/mobile/VoiceDictationButton';
import { AdvancedMessageMenu } from '../AdvancedMessageMenu';
import { StickerPicker } from '../StickerPicker';
import { AudioMemePicker } from '../AudioMemePicker';
import { CustomEmojiPicker } from '../CustomEmojiPicker';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { RichTextToolbar, RichTextToggle } from './RichTextToolbar';
import { AIRewriteButton } from './AIRewriteButton';
import { TextToAudioButton } from '../TextToAudioButton';
import { MentionAutocomplete, useMentions } from './MentionAutocomplete';
import { MarkdownPreview } from './MarkdownPreview';
import { ReplyPreview } from '../ReplyQuote';
import { SlashCommands, SlashCommand } from '../SlashCommands';
import { AudioRecorder } from '../AudioRecorder';
import { FileUploader, FileUploaderRef } from '../FileUploader';
import { AISuggestions } from '../AISuggestions';
import { MessageTemplates } from '../MessageTemplates';
import { ExternalProductCatalog } from '@/components/catalog/ExternalProductCatalog';
import { ExternalProduct } from '@/hooks/useExternalCatalog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Send,
  Mic,
  Clock,
  MapPin,
  Package,
  Layers,
  Paperclip,
  Pencil,
  X,
  Check,
  Plus,
  Zap,
  Loader2,
  PenTool,
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

  // Memoize quick replies list
  const quickRepliesList = useMemo(() => (
    quickReplies.slice(0, 50).map((reply) => (
      <button
        key={reply.id}
        onClick={() => onQuickReply(reply)}
        className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{reply.title}</span>
          <Badge variant="outline" className="text-[10px] border-border">
            {reply.shortcut}
          </Badge>
        </div>
      </button>
    ))
  ), [quickReplies, onQuickReply]);

  // Tertiary tools (inside "+" menu)
  const tertiaryTools = useMemo(() => (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={onOpenInteractiveBuilder}
        aria-label="Mensagem interativa"
      >
        <Layers className="w-4 h-4" />
        Mensagem Interativa
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={onOpenLocationPicker}
        aria-label="Enviar localização"
      >
        <MapPin className="w-4 h-4" />
        Localização
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={onOpenSchedule}
        aria-label="Agendar mensagem"
      >
        <Clock className="w-4 h-4" />
        Agendar
      </Button>
      <ExternalProductCatalog
        onSendProduct={onSendProduct}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 text-muted-foreground hover:text-foreground w-full"
            aria-label="Catálogo de produtos"
          >
            <Package className="w-4 h-4" />
            Catálogo
          </Button>
        }
      />
      <AdvancedMessageMenu
        instanceName={instanceName || ''}
        recipientNumber={contactPhone}
        onPollSent={onPollSent}
        onContactSent={onContactSent}
      />
      <AISuggestions
        messages={messages.map(m => ({
          id: m.id,
          content: m.content,
          sender: m.sender,
          timestamp: m.timestamp
        }))}
        contactName={contactName}
        onSelectSuggestion={onSelectSuggestion}
      />
      <MessageTemplates onSelectTemplate={onSelectTemplate} />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="justify-start gap-2 text-muted-foreground hover:text-foreground w-full" aria-label="Respostas rápidas">
            <Zap className="w-4 h-4" />
            Respostas Rápidas
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 bg-popover border-border" align="start" side="top">
          <div className="p-3 border-b border-border">
            <h4 className="font-medium text-sm text-foreground">Respostas Rápidas</h4>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {quickRepliesList}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  ), [instanceName, contactPhone, contactName, messages, quickRepliesList, onOpenInteractiveBuilder, onOpenLocationPicker, onOpenSchedule, onSendProduct, onSelectSuggestion, onSelectTemplate]);

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
        "px-4 py-3 border-t border-border bg-card safe-area-bottom",
        isMobile && "px-3 py-2"
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

        {/* Main input row: [+menu] [textarea] [secondary icons] [send/mic] */}
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

          {/* Secondary icons (always visible): AI Rewrite, RichText, Emoji, Sticker, Audio Meme */}
          {!isMobile && (
            <div className="flex items-center gap-0.5 shrink-0">
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
              <TextToAudioButton inputValue={inputValue} onAudioReady={onAudioSend} />
              <StickerPicker onSendSticker={onSendSticker} />
              <AudioMemePicker onSendAudio={onSendAudioMeme} />
              <CustomEmojiPicker onSendEmoji={onSendCustomEmoji} />
              {onOpenCatalog && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                      onClick={onOpenCatalog}
                      aria-label="Catálogo de produtos"
                    >
                      <Package className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Catálogo de Produtos</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Primary icons: VoiceDictation, Mic/Attach, Send */}
          <div className="flex items-center gap-0.5 shrink-0">
            <VoiceDictationButton onTranscript={handleVoiceDictation} disabled={isRecordingAudio} />

            {/* File Uploader (single instance, no duplication) */}
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

            {/* Adaptive Send/Mic button */}
            <AnimatePresence mode="wait">
              {hasText || editingMessage ? (
                <motion.div
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
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
                          sendAnimation && "animate-pulse"
                        )}
                        aria-label={editingMessage ? "Confirmar edição" : "Enviar mensagem"}
                      >
                        {isSending ? (
                          <Loader2 className="w-[18px] h-[18px] animate-spin" />
                        ) : editingMessage ? (
                          <Check className="w-[18px] h-[18px]" />
                        ) : (
                          <motion.div
                            animate={sendAnimation ? { x: [0, 4, 0], y: [0, -2, 0] } : {}}
                            transition={{ duration: 0.3 }}
                          >
                            <Send className="w-[18px] h-[18px]" />
                          </motion.div>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{editingMessage ? 'Confirmar edição' : 'Enviar (Enter)'}</TooltipContent>
                  </Tooltip>
                </motion.div>
              ) : (
                <motion.div
                  key="mic"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "shrink-0 touch-manipulation active:scale-95 rounded-full",
                          isMobile ? "w-11 h-11" : "w-10 h-10",
                          isRecordingAudio
                            ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                        )}
                        onClick={onRecordToggle}
                        aria-label={isRecordingAudio ? "Parar gravação" : "Gravar áudio"}
                      >
                        <Mic className="w-[18px] h-[18px]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{isRecordingAudio ? 'Parar gravação' : 'Gravar áudio'}</TooltipContent>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile: secondary tools row */}
        {isMobile && hasText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1 mt-2 overflow-x-auto"
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
          </motion.div>
        )}
      </div>
    </>
  );
}
