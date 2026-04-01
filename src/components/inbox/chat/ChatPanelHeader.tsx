import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TypingIndicatorCompact } from '../TypingIndicator';
import { SLAIndicator } from '../SLAIndicator';
import { VoiceSelector } from '../VoiceSelector';
import { SpeedSelector } from '../SpeedSelector';
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
  Tag,
  Archive,
  CheckCircle,
  Clock,
  ArrowRight,
  PhoneCall,
  Search,
  Brain,
  Info,
} from 'lucide-react';

interface ChatPanelHeaderProps {
  conversation: Conversation;
  isContactTyping: boolean;
  showAIAssistant: boolean;
  showDetails?: boolean;
  voiceId: string;
  speed: number;
  onToggleAIAssistant: () => void;
  onToggleDetails?: () => void;
  onStartCall: () => void;
  onOpenSearch: () => void;
  onOpenTransfer: () => void;
  onOpenSchedule: () => void;
  onVoiceChange: (voiceId: string) => void;
  onSpeedChange: (speed: number) => void;
}

export function ChatPanelHeader({
  conversation,
  isContactTyping,
  showAIAssistant,
  showDetails,
  voiceId,
  speed,
  onToggleAIAssistant,
  onToggleDetails,
  onStartCall,
  onOpenSearch,
  onOpenTransfer,
  onOpenSchedule,
  onVoiceChange,
  onSpeedChange,
}: ChatPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 h-[65px] border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={conversation.contact.avatar} />
            <AvatarFallback className="bg-primary/15 text-primary font-semibold text-sm">
              {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {/* Online status dot */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[hsl(var(--online))] border-2 border-card" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-[15px]">
              {conversation.contact.name}
            </h3>
            <SLAIndicator
              firstMessageAt={conversation.createdAt}
              firstResponseAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
              resolvedAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
              firstResponseMinutes={conversation.priority === 'high' ? 2 : 5}
              resolutionMinutes={conversation.priority === 'high' ? 30 : 60}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isContactTyping ? (
              <TypingIndicatorCompact isVisible={true} />
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--online))]" />
                Online
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {/* Action buttons — DreamsChat style: Audio, Video, Chat, Search */}
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onStartCall}
          aria-label="Chamada de voz"
        >
          <PhoneCall className="w-[18px] h-[18px]" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Chamada de vídeo"
        >
          <Video className="w-[18px] h-[18px]" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onOpenSearch}
          aria-label="Buscar mensagens"
        >
          <Search className="w-[18px] h-[18px]" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted",
            showAIAssistant && "text-primary bg-primary/10"
          )}
          onClick={onToggleAIAssistant}
          aria-label={showAIAssistant ? "Fechar assistente IA" : "Abrir assistente IA"}
          aria-pressed={showAIAssistant}
        >
          <Brain className="w-[18px] h-[18px]" />
        </Button>
        {onToggleDetails && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted",
              showDetails && "text-primary bg-primary/10"
            )}
            onClick={onToggleDetails}
            aria-label={showDetails ? "Ocultar detalhes do contato" : "Ver detalhes do contato"}
            aria-expanded={showDetails}
          >
            <Info className="w-[18px] h-[18px]" />
          </Button>
        )}
        <VoiceSelector
          selectedVoiceId={voiceId}
          onVoiceChange={onVoiceChange}
        />
        <SpeedSelector
          speed={speed}
          onSpeedChange={onSpeedChange}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Mais opções da conversa">
              <MoreVertical className="w-[18px] h-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
            <DropdownMenuItem>
              <Tag className="w-4 h-4 mr-2" />
              Adicionar tag
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenTransfer}>
              <ArrowRight className="w-4 h-4 mr-2" />
              Transferir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSchedule}>
              <Clock className="w-4 h-4 mr-2" />
              Agendar mensagem
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar como resolvido
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
