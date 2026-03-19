import { log } from '@/lib/logger';
import { Conversation, Agent } from '@/types/chat';
import { CustomFieldsSection } from '@/components/contacts/CustomFieldsSection';
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
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAgents } from '@/hooks/useAgents';
import { useQueues } from '@/hooks/useQueues';
import { PrivateNotes } from './PrivateNotes';
import { ConversationHistory } from './ConversationHistory';
import { motion } from 'framer-motion';

interface ContactDetailsProps {
  conversation: Conversation;
  onClose: () => void;
}

export function ContactDetails({ conversation, onClose }: ContactDetailsProps) {
  const { contact } = conversation;
  const { agents } = useAgents();
  const { queues } = useQueues();

  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-80 h-full min-h-0 shrink-0 bg-card border-l border-border flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
        <h3 className="font-semibold text-foreground">
          Detalhes do Contato
        </h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {/* Contact Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 flex flex-col items-center text-center border-b border-border"
        >
          <div className="relative">
            <Avatar className="w-20 h-20 mb-3 ring-2 ring-border/30 ring-offset-2 ring-offset-background">
              <AvatarImage src={contact.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
          <h4 className="font-semibold text-lg text-foreground">
            {contact.name}
          </h4>
          <p className="text-sm text-muted-foreground">{contact.phone}</p>
          
          <div className="flex items-center gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              className="border-border/30 hover:border-primary/50 hover:bg-primary/10 transition-all"
            >
              <Phone className="w-4 h-4 mr-1 text-primary" />
              Ligar
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="border-border/30 hover:border-primary/50 hover:bg-primary/10 transition-all"
            >
              <Mail className="w-4 h-4 mr-1 text-primary" />
              Email
            </Button>
          </div>
        </motion.div>

        {/* Contact Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 space-y-4 border-b border-border/30"
        >
          <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Informações
          </h5>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm bg-muted/20 rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-foreground">{contact.phone}</span>
            </div>
            {contact.email && (
              <div className="flex items-center gap-3 text-sm bg-muted/20 rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-foreground">{contact.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm bg-muted/20 rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-foreground">
                Cliente desde {format(contact.createdAt, "MMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Tags */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 space-y-3 border-b border-border/30"
        >
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Tags
            </h5>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-6 h-6 hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {contact.tags.map((tag, index) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-foreground hover:bg-primary/20 transition-all"
              >
                {tag}
                <X className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" />
              </Badge>
            ))}
            {conversation.tags.map((tag, index) => (
              <Badge
                key={tag}
                variant="outline"
                className="flex items-center gap-1 border-border/30 hover:border-primary/30 transition-all"
              >
                {tag}
                <X className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" />
              </Badge>
            ))}
          </div>
        </motion.div>

        {/* Assignment */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 space-y-3 border-b border-border/30"
        >
          <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Atribuição
          </h5>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Atendente
              </label>
              <Select defaultValue={conversation.assignedTo?.id}>
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
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Fila
              </label>
              <Select defaultValue={conversation.queue?.id}>
                <SelectTrigger className="w-full border-border/30 hover:border-primary/30 transition-colors bg-muted/20">
                  <SelectValue placeholder="Selecionar fila" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/30">
                  {queues.map((queue) => (
                    <SelectItem key={queue.id} value={queue.id} className="hover:bg-primary/10">
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
        </motion.div>

        {/* Custom Fields */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="p-4 border-b border-border/30"
        >
          <CustomFieldsSection contactId={contact.id || contact.phone} />
        </motion.div>

        {/* Private Notes */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-4 border-b border-border/30"
        >
          <PrivateNotes contactId={contact.phone} />
        </motion.div>

        {/* Conversation History */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="p-4 border-b border-border/30"
        >
          <ConversationHistory 
            contactId={contact.id || contact.phone} 
            contactPhone={contact.phone}
            onSelectConversation={(id) => log.debug('Selected conversation:', id)}
          />
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-4 space-y-3"
        >
          <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Estatísticas
          </h5>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/20 rounded-lg p-3 border border-border/20 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs">Mensagens</span>
              </div>
              <span className="text-lg font-semibold text-primary">
                24
              </span>
            </div>
            <div className="bg-muted/20 rounded-lg p-3 border border-border/20 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Tempo médio</span>
              </div>
              <span className="text-lg font-semibold text-primary">
                3min
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
