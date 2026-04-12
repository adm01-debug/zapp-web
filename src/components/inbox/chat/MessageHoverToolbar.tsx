import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Reply, Forward, Copy, MoreVertical, Pin, Star, Trash2, Flag, Clock, CheckCircle, XCircle, Volume2 } from 'lucide-react';
import { Message } from '@/types/chat';
import { TextToSpeechButton } from '../TextToSpeechButton';
import { MessageContextActions } from '../MessageContextActions';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageHoverToolbarProps {
  message: Message;
  isSent: boolean;
  instanceName?: string;
  contactJid?: string;
  ttsLoading: boolean;
  ttsPlaying: boolean;
  ttsMessageId: string | null;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onCopy: (content: string) => void;
  onSpeak: (messageId: string, text: string) => void;
  onStop: () => void;
  onEditStart?: (message: Message) => void;
  onMessageDeleted: (messageId: string) => void;
}

export function MessageHoverToolbar({
  message, isSent, instanceName, contactJid,
  ttsLoading, ttsPlaying, ttsMessageId,
  onReply, onForward, onCopy, onSpeak, onStop,
  onEditStart, onMessageDeleted,
}: MessageHoverToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={cn(
      "absolute top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10",
      menuOpen && "opacity-100",
      isSent ? "right-full mr-1.5" : "left-full ml-1.5"
    )}>
      {/* Pill toolbar — WhatsApp Web style */}
      <div className="flex items-center rounded-full bg-card/95 dark:bg-[hsl(var(--card)/0.95)] border border-border/40 shadow-lg backdrop-blur-sm overflow-hidden">
        <ToolbarButton onClick={() => onReply(message)} title="Responder">
          <Reply className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => onForward(message)} title="Encaminhar">
          <Forward className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => onCopy(message.content)} title="Copiar">
          <Copy className="w-3.5 h-3.5" />
        </ToolbarButton>
        {message.type === 'text' && (
          <TextToSpeechButton
            messageId={message.id}
            text={message.content}
            isLoading={ttsLoading}
            isPlaying={ttsPlaying}
            currentMessageId={ttsMessageId}
            onSpeak={onSpeak}
            onStop={onStop}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          />
        )}
        {instanceName && contactJid && (
          <MessageContextActions
            message={message}
            instanceName={instanceName}
            contactJid={contactJid}
            onEditStart={onEditStart}
            onMessageDeleted={onMessageDeleted}
          />
        )}

        {/* ⋮ More menu */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Mais opções"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-52 bg-card border-border/50 shadow-xl"
            align={isSent ? 'end' : 'start'}
            sideOffset={8}
          >
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Star className="w-4 h-4" /> Favoritar
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Pin className="w-4 h-4" /> Fixar
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <Clock className="w-4 h-4" /> Responder depois
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44 bg-card border-border/50">
                <DropdownMenuItem className="cursor-pointer">Em 1 hora</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Em 3 horas</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Amanhã</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Escolher data/hora...</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <CheckCircle className="w-4 h-4" /> Marcar como lido
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <XCircle className="w-4 h-4" /> Marcar como não lido
            </DropdownMenuItem>

            {!isSent && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer text-warning">
                  <Flag className="w-4 h-4" /> Reportar
                </DropdownMenuItem>
              </>
            )}

            {isSent && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer text-destructive">
                  <Trash2 className="w-4 h-4" /> Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
    >
      {children}
    </button>
  );
}
