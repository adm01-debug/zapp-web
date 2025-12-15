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
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mockAgents, mockQueues } from '@/data/mockData';
import { PrivateNotes } from './PrivateNotes';
import { motion } from 'framer-motion';

interface ContactDetailsProps {
  conversation: Conversation;
  onClose: () => void;
}

export function ContactDetails({ conversation, onClose }: ContactDetailsProps) {
  const { contact } = conversation;

  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-80 h-full glass-strong border-l border-border/50 flex flex-col relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent backdrop-blur-sm relative z-10">
        <h3 className="font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
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

      <div className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
        {/* Contact Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 flex flex-col items-center text-center border-b border-border/50"
        >
          <div className="relative">
            <Avatar className="w-20 h-20 mb-3 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
              <AvatarImage src={contact.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-xl font-semibold">
                {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <motion.div 
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </motion.div>
          </div>
          <h4 className="font-semibold text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            {contact.name}
          </h4>
          <p className="text-sm text-muted-foreground">{contact.phone}</p>
          
          <div className="flex items-center gap-2 mt-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                size="sm"
                className="glass border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all"
              >
                <Phone className="w-4 h-4 mr-1 text-primary" />
                Ligar
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                size="sm"
                className="glass border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all"
              >
                <Mail className="w-4 h-4 mr-1 text-primary" />
                Email
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Contact Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 space-y-4 border-b border-border/50"
        >
          <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Informações
          </h5>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm glass-soft rounded-lg p-2.5 group hover:bg-primary/5 transition-colors">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-foreground/90">{contact.phone}</span>
            </div>
            {contact.email && (
              <div className="flex items-center gap-3 text-sm glass-soft rounded-lg p-2.5 group hover:bg-primary/5 transition-colors">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-foreground/90">{contact.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm glass-soft rounded-lg p-2.5 group hover:bg-primary/5 transition-colors">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-foreground/90">
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
          className="p-4 space-y-3 border-b border-border/50"
        >
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Tags
            </h5>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-6 h-6 hover:bg-primary/10 hover:text-primary"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {contact.tags.map((tag, index) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 bg-gradient-to-r from-primary/20 to-primary/10 border-primary/20 text-foreground hover:from-primary/30 hover:to-primary/20 transition-all"
                >
                  {tag}
                  <X className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" />
                </Badge>
              </motion.div>
            ))}
            {conversation.tags.map((tag, index) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 glass border-border/50 hover:border-primary/50 transition-all"
                >
                  {tag}
                  <X className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" />
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Assignment */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 space-y-3 border-b border-border/50"
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
                <SelectTrigger className="w-full glass border-border/50 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Selecionar atendente" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-border/50">
                  {mockAgents.filter(a => a.status !== 'offline').map((agent) => (
                    <SelectItem key={agent.id} value={agent.id} className="hover:bg-primary/10">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5 ring-1 ring-primary/20">
                          <AvatarImage src={agent.avatar} />
                          <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/20 to-accent/20">
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
                <SelectTrigger className="w-full glass border-border/50 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Selecionar fila" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-border/50">
                  {mockQueues.map((queue) => (
                    <SelectItem key={queue.id} value={queue.id} className="hover:bg-primary/10">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-background"
                          style={{ backgroundColor: queue.color, boxShadow: `0 0 8px ${queue.color}40` }}
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

        {/* Private Notes */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-4 border-b border-border/50"
        >
          <PrivateNotes contactId={contact.phone} />
        </motion.div>

        {/* Conversation Stats */}
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
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="glass-soft rounded-lg p-3 border border-border/30 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MessageSquare className="w-4 h-4 group-hover:text-primary transition-colors" />
                <span className="text-xs">Mensagens</span>
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                24
              </span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="glass-soft rounded-lg p-3 border border-border/30 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4 group-hover:text-primary transition-colors" />
                <span className="text-xs">Tempo médio</span>
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                3min
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
