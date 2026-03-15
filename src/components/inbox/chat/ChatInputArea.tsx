import { useRef } from 'react';
import { AdvancedMessageMenu } from '../AdvancedMessageMenu';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from '@/components/ui/motion';
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

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 py-2 bg-[hsl(var(--chat-input-bg))] border-t border-border"
      >
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1">
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
            
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={onOpenInteractiveBuilder}
                title="Mensagem Interativa"
              >
                <Layers className="w-5 h-5" />
              </Button>
            </motion.div>

            {/* Advanced Message Menu (Stickers, Polls, vCard, Status) */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <AdvancedMessageMenu
                instanceName={instanceName || ''}
                recipientNumber={contactPhone}
              />
            </motion.div>

            <Popover>
              <PopoverTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                    <Zap className="w-5 h-5" />
                  </Button>
                </motion.div>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 glass-strong border-border/50" align="start">
                <div className="p-3 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
                  <h4 className="font-medium text-sm">Respostas Rápidas</h4>
                  <p className="text-xs text-muted-foreground">
                    Digite / para usar atalhos
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {quickReplies.map((reply) => (
                    <motion.button
                      key={reply.id}
                      whileHover={{ x: 4 }}
                      onClick={() => onQuickReply(reply)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{reply.title}</span>
                        <Badge variant="outline" className="text-[10px] border-primary/30">
                          {reply.shortcut}
                        </Badge>
                      </div>
                    </motion.button>
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

          <div className="flex-1 relative group">
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
              className="pr-10 bg-input border-0 focus:ring-0 rounded-lg text-sm"
            />
            <motion.div 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary w-8 h-8"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "text-muted-foreground hover:text-primary hover:bg-primary/10",
                isRecordingAudio && "text-destructive bg-destructive/10"
              )}
              onClick={onRecordToggle}
            >
              <Mic className="w-5 h-5" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={onOpenLocationPicker}
              title="Compartilhar localização"
            >
              <MapPin className="w-5 h-5" />
            </Button>
          </motion.div>

          {/* Product Catalog */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <ProductCatalog
              onSendProduct={onSendProduct}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                  title="Catálogo de produtos"
                >
                  <Package className="w-5 h-5" />
                </Button>
              }
            />
          </motion.div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={onOpenSchedule}
            >
              <Clock className="w-5 h-5" />
            </Button>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={onSend}
              disabled={!inputValue.trim()}
              className="text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-50"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
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
      </motion.div>
    </>
  );
}
