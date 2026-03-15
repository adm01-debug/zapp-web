import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnimatePresence } from '@/components/ui/motion';
import { ReplyPreview } from '../ReplyQuote';
import { SlashCommands, SlashCommand } from '../SlashCommands';
import { AudioRecorder } from '../AudioRecorder';
import { FileUploader, FileUploaderRef } from '../FileUploader';
import { Product } from '@/components/catalog/ProductCard';
import { Send, Smile, Mic, Paperclip } from 'lucide-react';
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
  onSelectSuggestion: (text: string) => void;
  onSelectTemplate: (text: string) => void;
  onExternalFiles?: (files: File[]) => void;
  fileUploaderRef: React.RefObject<FileUploaderRef | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatInputArea({
  inputValue,
  replyToMessage,
  isRecordingAudio,
  showSlashCommands,
  contactId,
  contactPhone,
  instanceName,
  onInputChange,
  onKeyDown,
  onBlur,
  onSend,
  onCancelReply,
  onSlashCommand,
  onCloseSlashCommands,
  onRecordToggle,
  onAudioSend,
  onAudioCancel,
  fileUploaderRef,
  inputRef,
}: ChatInputAreaProps) {
  const hasText = inputValue.trim().length > 0;

  return (
    <>
      <AnimatePresence>
        {replyToMessage && (
          <ReplyPreview
            message={replyToMessage}
            onCancel={onCancelReply}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1 px-2 h-[62px] bg-[hsl(var(--sidebar-header))] border-t border-border flex-shrink-0">
        {/* Left icons */}
        <div className="flex items-center gap-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-[42px] h-[42px] rounded-full text-[hsl(var(--avatar-fallback-foreground))] hover:bg-muted/60"
            title="Emoji"
          >
            <Smile className="w-[24px] h-[24px]" />
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
            onFileSent={() => {
              toast({
                title: 'Arquivo enviado',
                description: 'Mídia enviada com sucesso.',
              });
            }}
          />
        </div>

        {/* Input field */}
        <div className="flex-1 relative">
          <SlashCommands
            inputValue={inputValue}
            onSelectCommand={onSlashCommand}
            onClose={onCloseSlashCommands}
            isOpen={showSlashCommands}
          />

          <Input
            ref={inputRef}
            value={inputValue}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            placeholder={replyToMessage ? 'Responder mensagem...' : 'Digite uma mensagem'}
            className="h-[42px] rounded-lg border-0 bg-card text-[15px] px-3 focus-visible:ring-0 focus-visible:shadow-none"
          />
        </div>

        {/* Right icon: Send or Mic */}
        <Button
          onClick={hasText ? onSend : onRecordToggle}
          variant="ghost"
          size="icon"
          className={cn(
            'w-[42px] h-[42px] rounded-full text-[hsl(var(--avatar-fallback-foreground))] hover:bg-muted/60',
            isRecordingAudio && 'text-destructive hover:bg-destructive/10'
          )}
          title={hasText ? 'Enviar' : 'Áudio'}
        >
          {hasText ? <Send className="w-[24px] h-[24px]" /> : <Mic className="w-[24px] h-[24px]" />}
        </Button>
      </div>

      <AnimatePresence>
        {isRecordingAudio && (
          <div className="px-4 py-2 bg-[hsl(var(--sidebar-header))] border-t border-border">
            <AudioRecorder
              onSend={onAudioSend}
              onCancel={onAudioCancel}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
