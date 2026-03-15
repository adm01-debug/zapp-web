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

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 py-2 bg-[hsl(var(--chat-input-bg))] border-t border-border"
      >
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted"
              title="Emoji"
            >
              <Smile className="w-5 h-5" />
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

            <AdvancedMessageMenu
              instanceName={instanceName || ''}
              recipientNumber={contactPhone}
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
              className="h-10 rounded-lg border-0 bg-background pr-4 text-sm"
            />
          </div>

          <Button
            onClick={hasText ? onSend : onRecordToggle}
            variant="ghost"
            size="icon"
            className={cn(
              'rounded-full text-primary hover:bg-primary/10',
              isRecordingAudio && 'text-destructive hover:bg-destructive/10'
            )}
            title={hasText ? 'Enviar' : 'Áudio'}
          >
            {hasText ? <Send className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
        </div>

        <AnimatePresence>
          {isRecordingAudio && (
            <div className="mt-3">
              <AudioRecorder
                onSend={onAudioSend}
                onCancel={onAudioCancel}
              />
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
