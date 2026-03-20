import { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  Plus,
} from 'lucide-react';
import { AIEnhanceButton } from './AIEnhanceButton';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileUploaderRef = useRef<FileUploaderRef>(null);
  const isMobile = useIsMobile();

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    handleExternalFiles: (files: File[]) => {
      fileUploaderRef.current?.handleExternalFiles(files);
    },
  }));

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onInputChange(value);
    autoResize(e.target);
    
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

  // Extra tools that go into the "+" menu on mobile
  const extraTools = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={onOpenInteractiveBuilder}
            aria-label="Mensagem Interativa"
          >
            <Layers className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Mensagem Interativa</TooltipContent>
      </Tooltip>

      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            aria-label="Respostas rápidas"
          >
            <Zap className="w-5 h-5" />
          </Button>
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

      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent>{isRecordingAudio ? "Parar gravação" : "Gravar áudio"}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={onOpenLocationPicker}
            aria-label="Compartilhar localização"
          >
            <MapPin className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Compartilhar localização</TooltipContent>
      </Tooltip>

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

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={onOpenSchedule}
            aria-label="Agendar mensagem"
          >
            <Clock className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Agendar mensagem</TooltipContent>
      </Tooltip>
    </>
  );

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
        className={cn("glass-strong border-t border-border/50", isMobile ? "p-2" : "p-4")}
      >
        <div className="flex items-end gap-1.5">
          {/* Attachment always visible */}
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

          {/* Mobile: "+" popover for extra tools | Desktop: inline buttons */}
          {isMobile ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 w-9 h-9"
                  aria-label="Mais opções"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 glass-strong border-border/50" align="start" side="top">
                <div className="flex flex-wrap gap-1 max-w-[240px]">
                  {extraTools}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-1">
              {extraTools}
            </div>
          )}

          {/* Textarea */}
          <div className="flex-1 relative group min-w-0">
            <SlashCommands
              inputValue={inputValue}
              onSelectCommand={onSlashCommand}
              onClose={onCloseSlashCommands}
              isOpen={showSlashCommands}
            />
            
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={onTypingStop}
              placeholder={replyToMessage ? "Digite sua resposta..." : isMobile ? "Mensagem..." : "Digite / para comandos... (Shift+Enter para nova linha)"}
              className="min-h-[40px] max-h-[120px] resize-none pr-10 glass border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all py-2.5"
              rows={1}
            />
            <div className="absolute right-1 top-1.5 flex items-center gap-0.5">
              <AIEnhanceButton
                inputValue={inputValue}
                onInputChange={onInputChange}
              />
              {!isMobile && (
                <motion.div 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }}
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
              )}
            </div>
          </div>

          {/* Send button */}
          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0"
          >
            <Button
              onClick={onSend}
              disabled={!inputValue.trim()}
              size={isMobile ? "icon" : "default"}
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
