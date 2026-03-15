import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TypingIndicatorCompact } from '../TypingIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Archive, CheckCircle, Search, Info } from 'lucide-react';

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
  onOpenSearch,
  onOpenTransfer,
}: ChatPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between h-[59px] px-4 bg-[hsl(var(--sidebar-header))] border-b border-border flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={onToggleDetails}>
        <Avatar className="w-10 h-10">
          <AvatarImage src={conversation.contact.avatar} />
          <AvatarFallback className="bg-[hsl(var(--avatar-fallback))] text-[hsl(var(--avatar-fallback-foreground))] text-sm font-normal">
            {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <h3 className="text-[16px] font-normal text-foreground truncate leading-[21px]">
            {conversation.contact.name}
          </h3>
          <p className="text-[13px] text-muted-foreground truncate leading-[20px]">
            {isContactTyping ? <TypingIndicatorCompact isVisible /> : conversation.contact.phone}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full text-[hsl(var(--avatar-fallback-foreground))] hover:bg-muted/60"
          onClick={onOpenSearch}
          title="Buscar"
        >
          <Search className="w-[20px] h-[20px]" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full text-[hsl(var(--avatar-fallback-foreground))] hover:bg-muted/60"
              title="Menu"
            >
              <MoreVertical className="w-[20px] h-[20px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {onToggleDetails && (
              <DropdownMenuItem onClick={onToggleDetails}>
                <Info className="w-4 h-4 mr-2" />
                {showDetails ? 'Fechar detalhes' : 'Dados do contato'}
              </DropdownMenuItem>
            )}
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
    </div>
  );
}
