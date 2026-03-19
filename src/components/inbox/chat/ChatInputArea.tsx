import { useRef, useState } from 'react';
import { AdvancedMessageMenu } from '../AdvancedMessageMenu';
import { StickerPicker } from '../StickerPicker';
import { AudioMemePicker } from '../AudioMemePicker';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { RichTextToolbar, RichTextToggle } from './RichTextToolbar';
import { AIRewriteButton } from './AIRewriteButton';
import { TextToAudioButton } from '../TextToAudioButton';
import { ReplyPreview } from '../ReplyQuote';
import { SlashCommands, SlashCommand } from '../SlashCommands';
import { AudioRecorder } from '../AudioRecorder';
import { FileUploader, FileUploaderRef } from '../FileUploader';
import { AISuggestions } from '../AISuggestions';
import { MessageTemplates } from '../MessageTemplates';
import { ProductCatalog } from '@/components/catalog/ProductCatalog';
import { Product } from '@/components/catalog/ProductCard';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Send,
  Smile,
  Zap,
  Mic,
  Clock,
  MapPin,
  Package,
  Layers,
  Settings,
  Paperclip,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  messages: Message[];
  quickReplies: QuickReplyItem[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onSendProduct: (product: Product) => void;
  onSendSticker: (stickerUrl: string) => void;
  onSelectSuggestion: (text: string) => void;
  onSelectTemplate: (text: string) => void;
  onExternalFiles?: (files: File[]) => void;
  fileUploaderRef: React.RefObject<FileUploaderRef | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

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
  messages,
  quickReplies,
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
  onSelectSuggestion,
  onSelectTemplate,
  fileUploaderRef,
  inputRef,
}: ChatInputAreaProps) {
  const [showRichToolbar, setShowRichToolbar] = useState(false);

  return (
    <>
      {/* Rich Text Toolbar */}
      <RichTextToolbar
        inputRef={inputRef}
        inputValue={inputValue}
        onInputChange={(val) => {
          // Simulate input change event
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (inputRef.current && nativeInputValueSetter) {
            nativeInputValueSetter.call(inputRef.current, val);
            inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
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
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Footer — DreamsChat style: single row */}
      <div className="px-4 py-3 border-t border-border bg-card">
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

        {/* Main input row — DreamsChat: [settings] [input] [emoji] [attach] [send] */}
        <div className="flex items-center gap-2">
          {/* Left: Settings/options popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                title="Opções"
              >
                <Settings className="w-[18px] h-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-popover border-border" align="start" side="top">
              <div className="flex flex-col gap-1">
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
                  onFileSent={(result) => {
                    toast({
                      title: 'Arquivo enviado!',
                      description: 'O arquivo foi enviado com sucesso via WhatsApp.',
                    });
                  }}
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={onOpenInteractiveBuilder}
                >
                  <Layers className="w-4 h-4" />
                  Mensagem Interativa
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={onOpenLocationPicker}
                >
                  <MapPin className="w-4 h-4" />
                  Localização
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={onOpenSchedule}
                >
                  <Clock className="w-4 h-4" />
                  Agendar
                </Button>
                <ProductCatalog
                  onSendProduct={onSendProduct}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start gap-2 text-muted-foreground hover:text-foreground w-full"
                    >
                      <Package className="w-4 h-4" />
                      Catálogo
                    </Button>
                  }
                />
                <AdvancedMessageMenu
                  instanceName={instanceName || ''}
                  recipientNumber={contactPhone}
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
                    <Button variant="ghost" size="sm" className="justify-start gap-2 text-muted-foreground hover:text-foreground w-full">
                      <Zap className="w-4 h-4" />
                      Respostas Rápidas
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0 bg-popover border-border" align="start" side="top">
                    <div className="p-3 border-b border-border">
                      <h4 className="font-medium text-sm text-foreground">Respostas Rápidas</h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                      {quickReplies.map((reply) => (
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
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </PopoverContent>
          </Popover>

          {/* Input field — transparent bg, DreamsChat style */}
          <div className="flex-1">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
              placeholder={editingMessage ? "Editar mensagem..." : replyToMessage ? "Digite sua resposta..." : "Type Your Message"}
              className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground h-10 px-2"
            />
          </div>

          {/* Right icons: AI Rewrite, RichText, Sticker, Emoji, Mic, Attach, Send */}
          <AIRewriteButton
            inputValue={inputValue}
            onRewrite={(newText) => {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (inputRef.current && nativeInputValueSetter) {
                nativeInputValueSetter.call(inputRef.current, newText);
                inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }}
          />

          <RichTextToggle active={showRichToolbar} onToggle={() => setShowRichToolbar(!showRichToolbar)} />

          <TextToAudioButton
            inputValue={inputValue}
            onAudioReady={onAudioSend}
          />

          <StickerPicker onSendSticker={onSendSticker} />

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            title="Emoji"
          >
            <Smile className="w-[18px] h-[18px]" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0",
              isRecordingAudio && "text-destructive bg-destructive/10"
            )}
            onClick={onRecordToggle}
            title="Gravar áudio"
          >
            <Mic className="w-[18px] h-[18px]" />
          </Button>

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
            onFileSent={(result) => {
              toast({
                title: 'Arquivo enviado!',
                description: 'O arquivo foi enviado com sucesso via WhatsApp.',
              });
            }}
          />

          {/* Send/Confirm button */}
          <Button
            onClick={onSend}
            disabled={!inputValue.trim()}
            size="icon"
            className={cn(
              "w-10 h-10 rounded-full shrink-0 disabled:opacity-40",
              editingMessage
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {editingMessage ? <Check className="w-[18px] h-[18px]" /> : <Send className="w-[18px] h-[18px]" />}
          </Button>
        </div>
      </div>
    </>
  );
}
