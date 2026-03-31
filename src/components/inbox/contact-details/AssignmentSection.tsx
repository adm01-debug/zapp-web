import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgents } from '@/hooks/useAgents';
import { useQueues } from '@/hooks/useQueues';
import { useContactAssignment } from '@/hooks/useContactAssignment';
import { Conversation } from '@/types/chat';

interface AssignmentSectionProps {
  conversation: Conversation;
}

export function AssignmentSection({ conversation }: AssignmentSectionProps) {
  const { agents } = useAgents();
  const { queues } = useQueues();
  const { assignAgent, assignQueue } = useContactAssignment(conversation.contact.id);

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <User className="w-4 h-4 text-primary" />
        Atribuição
      </h5>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Atendente</label>
          <Select
            defaultValue={conversation.assignedTo?.id}
            onValueChange={(value) => assignAgent(value)}
          >
            <SelectTrigger className="w-full border-border/30 hover:border-primary/30 transition-colors bg-muted/20">
              <SelectValue placeholder="Selecionar atendente" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/30">
              {agents.filter(a => a.is_active).map((agent) => (
                <SelectItem key={agent.id} value={agent.id} className="hover:bg-primary/10">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-5 h-5 ring-1 ring-border/30">
                      <AvatarImage src={agent.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {agent.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span>{agent.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Fila</label>
          <Select
            defaultValue={conversation.queue?.id}
            onValueChange={(value) => assignQueue(value)}
          >
            <SelectTrigger className="w-full border-border/30 hover:border-primary/30 transition-colors bg-muted/20">
              <SelectValue placeholder="Selecionar fila" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/30">
              {queues.map((queue) => (
                <SelectItem key={queue.id} value={queue.id} className="hover:bg-primary/10">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: queue.color }} />
                    <span>{queue.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
