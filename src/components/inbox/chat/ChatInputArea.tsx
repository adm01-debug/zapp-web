import { useRef } from 'react';
import { AdvancedMessageMenu } from '../AdvancedMessageMenu';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence } from 'framer-motion';
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
  contactName,
  instanceName,
  messages,
  quickReplies,
  onInputChange,
  onKeyDown,
  onBlur,
  onSend,
  onCancelReply,
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
  onSelectSuggestion,
  onSelectTemplate,
  fileUploaderRef,
  inputRef,
}: ChatInputAreaProps) {
  return (
    <>
      {/* Reply Preview */}
      <AnimatePresence>
        {replyToMessage && (
          <ReplyPreview
            message={replyToMessage}
            onCancel={onCancelReply}
          />
        )}
      </AnimatePresence>

      {/* Input Footer — DreamsChat style */}
      <div className="px-4 py-3 border-t border-border bg-card">
        {/* Action icons row */}
        <div className="flex items-center gap-1 mb-2">
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
            size="icon" 
            className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={onOpenInteractiveBuilder}
            title="Mensagem Interativa"
          >
            <Layers className="w-[18px] h-[18px]" />
          </Button>

          <AdvancedMessageMenu
            instanceName={instanceName || ''}
            recipientNumber={contactPhone}
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                <Zap className="w-[18px] h-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 bg-popover border-border" align="start">
              <div className="p-3 border-b border-border">
                <h4 className="font-medium text-sm text-foreground">Respostas Rápidas</h4>
                <p className="text-xs text-muted-foreground">
                  Digite / para usar atalhos
                </p>
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
          
          {/* AI Suggestions */}
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
          
          {/* Message Templates */}
          <MessageTemplates onSelectTemplate={onSelectTemplate} />
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            {/* Slash Commands Menu */}
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
              placeholder={replyToMessage ? "Digite sua resposta..." : "Digite / para comandos..."}
              className="bg-muted border-border rounded-full h-10 px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-0"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground hover:text-foreground"
            >
              <Smile className="w-[18px] h-[18px]" />
            </Button>
          </div>

          {/* Right side action buttons */}
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0",
              isRecordingAudio && "text-destructive bg-destructive/10"
            )}
            onClick={onRecordToggle}
          >
            <Mic className="w-[18px] h-[18px]" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            onClick={onOpenLocationPicker}
            title="Compartilhar localização"
          >
            <MapPin className="w-[18px] h-[18px]" />
          </Button>

          <ProductCatalog
            onSendProduct={onSendProduct}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                title="Catálogo de produtos"
              >
                <Package className="w-[18px] h-[18px]" />
              </Button>
            }
          />

          <Button 
            variant="ghost" 
            size="icon" 
            className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            onClick={onOpenSchedule}
          >
            <Clock className="w-[18px] h-[18px]" />
          </Button>

          {/* Send button — DreamsChat circular purple */}
          <Button
            onClick={onSend}
            disabled={!inputValue.trim()}
            size="icon"
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 disabled:opacity-40"
          >
            <Send className="w-[18px] h-[18px]" />
          </Button>
        </div>

        {/* Audio Recorder */}
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
      </div>
    </>
  );
}
