import { motion } from 'framer-motion';
import { X, Reply, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';

interface ReplyPreviewProps {
  message: Message;
  onCancel: () => void;
}

export function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  const isSent = message.sender === 'agent';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: 10, height: 0 }}
      className="mx-4 mb-2"
    >
      <div className={cn(
        "flex items-start gap-2 p-3 rounded-lg border-l-4",
        isSent 
          ? "bg-primary/10 border-primary" 
          : "bg-muted/50 border-muted-foreground"
      )}>
        <Reply className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-xs font-medium mb-0.5",
            isSent ? "text-primary" : "text-muted-foreground"
          )}>
            Respondendo a {isSent ? 'você' : 'contato'}
          </p>
          <p className="text-sm text-foreground line-clamp-2">
            {message.type === 'audio' ? '🎵 Mensagem de áudio' : 
             message.type === 'image' ? '📷 Imagem' :
             message.type === 'video' ? '🎥 Vídeo' :
             message.type === 'document' ? '📄 Documento' :
             message.content}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={onCancel}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

interface QuotedMessageProps {
  replyTo: {
    messageId: string;
    content: string;
    sender: 'contact' | 'agent';
  };
  isSent: boolean;
  onClick?: () => void;
}

export function QuotedMessage({ replyTo, isSent, onClick }: QuotedMessageProps) {
  const isQuoteFromAgent = replyTo.sender === 'agent';
  
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={cn(
        "w-full text-left p-2 rounded-lg mb-2 border-l-2 transition-colors",
        isSent 
          ? "bg-primary-foreground/10 border-primary-foreground/50 hover:bg-primary-foreground/20" 
          : "bg-muted/50 border-muted-foreground/50 hover:bg-muted"
      )}
    >
      <div className="flex items-start gap-1.5">
        <CornerDownRight className={cn(
          "w-3 h-3 mt-0.5 flex-shrink-0",
          isSent ? "text-primary-foreground/70" : "text-muted-foreground"
        )} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-[10px] font-medium mb-0.5",
            isSent 
              ? "text-primary-foreground/80" 
              : isQuoteFromAgent 
                ? "text-primary" 
                : "text-muted-foreground"
          )}>
            {isQuoteFromAgent ? 'Você' : 'Contato'}
          </p>
          <p className={cn(
            "text-xs line-clamp-2",
            isSent ? "text-primary-foreground/90" : "text-foreground/80"
          )}>
            {replyTo.content}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
