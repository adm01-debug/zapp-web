import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion } from '@/components/ui/motion';
import { TypingIndicatorCompact } from '../TypingIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Video,
  Archive,
  CheckCircle,
  PhoneCall,
  Search,
  Info,
} from 'lucide-react';

interface ChatPanelHeaderProps {
  conversation: Conversation;
  isContactTyping: boolean;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  onStartCall: () => void;
  onOpenSearch: () => void;
  onOpenTransfer: () => void;
}

export function ChatPanelHeader({
  conversation,
  isContactTyping,
  showDetails,
  onToggleDetails,
  onStartCall,
  onOpenSearch,
  onOpenTransfer,
}: ChatPanelHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-4 py-2 border-b border-border bg-[hsl(var(--chat-header))]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10">
          <AvatarImage src={conversation.contact.avatar} />
          <AvatarFallback className="bg-muted text-foreground font-medium">
            {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">
            {conversation.contact.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {isContactTyping ? <TypingIndicatorCompact isVisible={true} /> : conversation.contact.phone}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-muted"
          onClick={onOpenSearch}
          title="Buscar"
        >
          <Search className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-muted"
          onClick={onStartCall}
          title="Ligar"
        >
          <PhoneCall className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted" title="Vídeo">
          <Video className="w-4 h-4" />
        </Button>

        {onToggleDetails && (
          <Button
            variant="ghost"
            size="icon"
            className={cn('text-muted-foreground hover:bg-muted', showDetails && 'text-foreground bg-muted')}
            onClick={onToggleDetails}
            title="Detalhes"
          >
            <Info className="w-4 h-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted" title="Menu">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpenTransfer}>Transferir conversa</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar como resolvida
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive className="w-4 h-4 mr-2" />
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
