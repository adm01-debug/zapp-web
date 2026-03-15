import { AdvancedMessageMenu } from '../AdvancedMessageMenu';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { ReplyPreview } from '../ReplyQuote';
import { SlashCommands, SlashCommand } from '../SlashCommands';
import { AudioRecorder } from '../AudioRecorder';
import { FileUploader, FileUploaderRef } from '../FileUploader';
import { Product } from '@/components/catalog/ProductCard';
import { Send, Smile, Mic } from 'lucide-react';
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

      <div className="px-2 py-[5px] bg-[hsl(var(--chat-input-bg))]">
        <div className="flex items-end gap-1">
          <div className="flex items-center gap-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full text-muted-foreground hover:bg-muted/50"
              title="Emoji"
            >
              <Smile className="w-6 h-6" />
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
              className="h-10 rounded-lg border-0 bg-card text-sm px-4"
            />
          </div>

          <Button
            onClick={hasText ? onSend : onRecordToggle}
            variant="ghost"
            size="icon"
            className={cn(
              'w-10 h-10 rounded-full text-muted-foreground hover:bg-muted/50',
              isRecordingAudio && 'text-destructive hover:bg-destructive/10'
            )}
            title={hasText ? 'Enviar' : 'Áudio'}
          >
            {hasText ? <Send className="w-6 h-6 text-muted-foreground" /> : <Mic className="w-6 h-6" />}
          </Button>
        </div>

        <AnimatePresence>
          {isRecordingAudio && (
            <div className="mt-2">
              <AudioRecorder
                onSend={onAudioSend}
                onCancel={onAudioCancel}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
