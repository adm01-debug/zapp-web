import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from '@/components/ui/motion';
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
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-4 py-2 border-b border-border bg-[hsl(var(--chat-header))]"
    >
      <div className="flex items-center gap-3">
        <motion.div whileHover={{ scale: 1.05 }}>
          <Avatar className="w-10 h-10 ring-2 ring-border/30">
            <AvatarImage src={conversation.contact.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </motion.div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">
              {conversation.contact.name}
            </h3>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] capitalize border',
                conversation.status === 'open' && 'border-success/50 text-success bg-success/10',
                conversation.status === 'pending' && 'border-warning/50 text-warning bg-warning/10',
                conversation.status === 'resolved' && 'border-muted-foreground/50 text-muted-foreground',
                conversation.status === 'waiting' && 'border-info/50 text-info bg-info/10'
              )}
            >
              {conversation.status === 'open' ? 'Aberto' : 
               conversation.status === 'pending' ? 'Pendente' :
               conversation.status === 'resolved' ? 'Resolvido' : 'Aguardando'}
            </Badge>
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
              conversation.contact.phone
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={onOpenSearch}
            title="Buscar (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={onStartCall}
          >
            <PhoneCall className="w-4 h-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
            <Video className="w-4 h-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "text-muted-foreground hover:text-primary hover:bg-primary/10",
              showAIAssistant && "text-primary bg-primary/10"
            )}
            onClick={onToggleAIAssistant}
            title="Assistente IA"
          >
            <Brain className="w-4 h-4" />
          </Button>
        </motion.div>
        {onToggleDetails && (
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "text-muted-foreground hover:text-primary hover:bg-primary/10",
                showDetails && "text-primary bg-primary/10"
              )}
              onClick={onToggleDetails}
              title="Detalhes do contato"
            >
              <Info className="w-4 h-4" />
            </Button>
          </motion.div>
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
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border-border/30">
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
    </motion.div>
  );
}
