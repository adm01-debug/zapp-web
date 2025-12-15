import { Conversation, Agent } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  Mail,
  Calendar,
  Tag,
  X,
  Plus,
  MessageSquare,
  Clock,
  User,
  Building,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mockAgents, mockQueues } from '@/data/mockData';

interface ContactDetailsProps {
  conversation: Conversation;
  onClose: () => void;
}

export function ContactDetails({ conversation, onClose }: ContactDetailsProps) {
  const { contact } = conversation;

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Detalhes do Contato</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Contact Info */}
        <div className="p-4 flex flex-col items-center text-center border-b border-border">
          <Avatar className="w-20 h-20 mb-3">
            <AvatarImage src={contact.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <h4 className="font-semibold text-lg text-foreground">{contact.name}</h4>
          <p className="text-sm text-muted-foreground">{contact.phone}</p>
          
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4 mr-1" />
              Ligar
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-1" />
              Email
            </Button>
          </div>
        </div>

        {/* Contact Details */}
        <div className="p-4 space-y-4 border-b border-border">
          <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Informações
          </h5>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{contact.phone}</span>
            </div>
            {contact.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{contact.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>
                Cliente desde {format(contact.createdAt, "MMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="p-4 space-y-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tags
            </h5>
            <Button variant="ghost" size="icon" className="w-6 h-6">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {contact.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {tag}
                <X className="w-3 h-3 cursor-pointer hover:text-destructive" />
              </Badge>
            ))}
            {conversation.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="flex items-center gap-1"
              >
                {tag}
                <X className="w-3 h-3 cursor-pointer hover:text-destructive" />
              </Badge>
            ))}
          </div>
        </div>

        {/* Assignment */}
        <div className="p-4 space-y-3 border-b border-border">
          <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Atribuição
          </h5>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Atendente
              </label>
              <Select defaultValue={conversation.assignedTo?.id}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar atendente" />
                </SelectTrigger>
                <SelectContent>
                  {mockAgents.filter(a => a.status !== 'offline').map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={agent.avatar} />
                          <AvatarFallback className="text-[10px]">
                            {agent.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>{agent.name}</span>
                        <span className={`status-dot ${agent.status}`} />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Fila
              </label>
              <Select defaultValue={conversation.queue?.id}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar fila" />
                </SelectTrigger>
                <SelectContent>
                  {mockQueues.map((queue) => (
                    <SelectItem key={queue.id} value={queue.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: queue.color }}
                        />
                        <span>{queue.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Conversation Stats */}
        <div className="p-4 space-y-3">
          <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Estatísticas
          </h5>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs">Mensagens</span>
              </div>
              <span className="text-lg font-semibold">24</span>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Tempo médio</span>
              </div>
              <span className="text-lg font-semibold">3min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
