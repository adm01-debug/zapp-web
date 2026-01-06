import { useRef, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

interface QuickReply {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  category: string;
}

interface ChatMessageInputProps {
  inputValue: string;
  replyToMessage: Message | null;
  isRecordingAudio: boolean;
  showSlashCommands: boolean;
  contactId: string;
  contactPhone: string;
  contactName: string;
  messages: Message[];
  quickReplies: QuickReply[];
  onInputChange: (value: string) => void;
  onSend: () => void;
  onCancelReply: () => void;
  onSlashCommand: (command: SlashCommand, subCommand?: string) => void;
  onCloseSlashCommands: () => void;
  onQuickReply: (reply: QuickReply) => void;
  onRecordToggle: () => void;
  onAudioSend: (blob: Blob) => void;
  onAudioCancel: () => void;
  onOpenInteractiveBuilder: () => void;
  onOpenSchedule: () => void;
  onOpenLocationPicker: () => void;
  onSendProduct: (product: Product) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onExternalFiles?: (files: File[]) => void;
}

export interface ChatMessageInputRef {
  focus: () => void;
  handleExternalFiles: (files: File[]) => void;
}

export const ChatMessageInput = forwardRef<ChatMessageInputRef, ChatMessageInputProps>(({
  inputValue,
  replyToMessage,
  isRecordingAudio,
  showSlashCommands,
  contactId,
  contactPhone,
  contactName,
  messages,
  quickReplies,
  onInputChange,
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
  onTypingStart,
  onTypingStop,
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    handleExternalFiles: (files: File[]) => {
      fileUploaderRef.current?.handleExternalFiles(files);
    },
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onInputChange(value);
    
    if (value.length > 0) {
      onTypingStart();
    } else {
      onTypingStop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlashCommands && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
    
    if (e.key === 'Escape' && showSlashCommands) {
      onCloseSlashCommands();
    }
  };

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
        className="p-4 glass-strong border-t border-border/50"
      >
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1">
            <FileUploader
              ref={fileUploaderRef}
              instanceName={contactId}
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
            
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={onOpenInteractiveBuilder}
                    aria-label="Mensagem Interativa"
                  >
                    <Layers className="w-5 h-5" />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>Mensagem Interativa</TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                    aria-label="Respostas rápidas"
                  >
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
            
            <AISuggestions
              messages={messages.map(m => ({
                id: m.id,
                content: m.content,
                sender: m.sender,
                timestamp: m.timestamp
              }))}
              contactName={contactName}
              onSelectSuggestion={(text) => onInputChange(text)}
            />
            
            <MessageTemplates onSelectTemplate={(text) => onInputChange(text)} />
          </div>

          <div className="flex-1 relative group">
            <SlashCommands
              inputValue={inputValue}
              onSelectCommand={onSlashCommand}
              onClose={onCloseSlashCommands}
              isOpen={showSlashCommands}
            />
            
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={onTypingStop}
              placeholder={replyToMessage ? "Digite sua resposta..." : "Digite / para comandos..."}
              className="pr-10 glass border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
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
                aria-label="Emojis"
              >
                <Smile className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "text-muted-foreground hover:text-primary hover:bg-primary/10",
                    isRecordingAudio && "text-destructive bg-destructive/10"
                  )}
                  onClick={onRecordToggle}
                  aria-label={isRecordingAudio ? "Parar gravação" : "Gravar áudio"}
                >
                  <Mic className="w-5 h-5" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>{isRecordingAudio ? "Parar gravação" : "Gravar áudio"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={onOpenLocationPicker}
                  aria-label="Compartilhar localização"
                >
                  <MapPin className="w-5 h-5" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>Compartilhar localização</TooltipContent>
          </Tooltip>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <ProductCatalog
              onSendProduct={onSendProduct}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                  aria-label="Catálogo de produtos"
                >
                  <Package className="w-5 h-5" />
                </Button>
              }
            />
          </motion.div>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={onOpenSchedule}
                  aria-label="Agendar mensagem"
                >
                  <Clock className="w-5 h-5" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>Agendar mensagem</TooltipContent>
          </Tooltip>

          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={onSend}
              disabled={!inputValue.trim()}
              className="text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-50"
              style={{ background: 'var(--gradient-primary)' }}
              aria-label="Enviar mensagem"
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
});

ChatMessageInput.displayName = 'ChatMessageInput';
