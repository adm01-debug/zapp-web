import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Phone,
  Mail,
  Copy,
  Building,
  Briefcase,
  Shield,
  Ban,
  Star,
  Archive,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { EnrichedContactData } from '@/hooks/useContactEnrichedData';
import { EngagementScore } from './EngagementScore';

// Channel icons mapping
const channelIcons: Record<string, string> = {
  whatsapp: '💬',
  instagram: '📸',
  facebook: '📘',
  telegram: '✈️',
  email: '📧',
  sms: '📱',
  webchat: '🌐',
};

const sentimentConfig: Record<string, { label: string; color: string; emoji: string }> = {
  positive: { label: 'Positivo', color: 'bg-success/15 text-success border-success/30', emoji: '😊' },
  neutral: { label: 'Neutro', color: 'bg-muted/30 text-muted-foreground border-border/30', emoji: '😐' },
  negative: { label: 'Negativo', color: 'bg-warning/15 text-warning border-warning/30', emoji: '😟' },
  critical: { label: 'Crítico', color: 'bg-destructive/15 text-destructive border-destructive/30', emoji: '🔴' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: 'Alta', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  medium: { label: 'Média', color: 'bg-warning/15 text-warning border-warning/30' },
  low: { label: 'Baixa', color: 'bg-success/15 text-success border-success/30' },
};

const contactTypeConfig: Record<string, { label: string; color: string }> = {
  customer: { label: 'Cliente', color: 'bg-primary/15 text-primary border-primary/30' },
  lead: { label: 'Lead', color: 'bg-info/15 text-info border-info/30' },
  employee: { label: 'Colaborador', color: 'bg-success/15 text-success border-success/30' },
  supplier: { label: 'Fornecedor', color: 'bg-warning/15 text-warning border-warning/30' },
};

interface ContactHeaderSectionProps {
  contact: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    email?: string;
  };
  enrichedData: EnrichedContactData | null | undefined;
  onQuickAction?: (action: string) => void;
}

export function ContactHeaderSection({ contact, enrichedData, onQuickAction }: ContactHeaderSectionProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const channelType = enrichedData?.channel_type;
  const channelEmoji = channelType ? channelIcons[channelType] || '💬' : null;
  const sentiment = enrichedData?.ai_sentiment;
  const priority = enrichedData?.ai_priority;
  const contactType = enrichedData?.contact_type;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 flex flex-col items-center text-center border-b border-border"
    >
      {/* Avatar with channel badge */}
      <div className="relative mb-3">
        <Avatar className="w-24 h-24 ring-2 ring-border/30 ring-offset-2 ring-offset-background">
          <AvatarImage src={contact.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        {channelEmoji && (
          <span className="absolute -bottom-1 -right-1 text-lg bg-card rounded-full p-0.5 ring-2 ring-background">
            {channelEmoji}
          </span>
        )}
      </div>

      {/* Name + subtitle */}
      <h4 className="font-semibold text-lg text-foreground">{contact.name}</h4>
      {(enrichedData?.job_title || enrichedData?.company) && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          {enrichedData.job_title && (
            <>
              <Briefcase className="w-3 h-3" />
              {enrichedData.job_title}
            </>
          )}
          {enrichedData.job_title && enrichedData.company && <span>•</span>}
          {enrichedData.company && (
            <>
              <Building className="w-3 h-3" />
              {enrichedData.company}
            </>
          )}
        </p>
      )}
      <p className="text-sm text-muted-foreground mt-0.5">{contact.phone}</p>

      {/* Badges row: type, sentiment, priority */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
        {contactType && contactTypeConfig[contactType] && (
          <Badge variant="outline" className={`text-[10px] ${contactTypeConfig[contactType].color}`}>
            {contactTypeConfig[contactType].label}
          </Badge>
        )}
        {sentiment && sentimentConfig[sentiment] && (
          <Badge variant="outline" className={`text-[10px] ${sentimentConfig[sentiment].color}`}>
            {sentimentConfig[sentiment].emoji} {sentimentConfig[sentiment].label}
          </Badge>
        )}
        {priority && priorityConfig[priority] && (
          <Badge variant="outline" className={`text-[10px] ${priorityConfig[priority].color}`}>
            {priorityConfig[priority].label} Prioridade
          </Badge>
        )}
      </div>

      {/* Engagement Score */}
      <div className="mt-3">
        <EngagementScore score={(() => {
          let s = 50;
          if (enrichedData?.ai_sentiment === 'positive') s += 25;
          if (enrichedData?.ai_priority === 'high') s += 15;
          if (enrichedData?.company) s += 5;
          if (enrichedData?.contact_type === 'customer') s += 5;
          return Math.min(s, 100);
        })()} />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-border/30 hover:border-success/50 hover:bg-success/10 transition-all"
                onClick={() => {
                  const cleanPhone = contact.phone.replace(/\D/g, '');
                  window.open(`https://wa.me/${cleanPhone}`, '_blank');
                }}
              >
                <MessageSquare className="w-4 h-4 mr-1 text-success" />
                WhatsApp
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir conversa no WhatsApp</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-border/30 hover:border-primary/50 hover:bg-primary/10 transition-all"
                onClick={() => copyToClipboard(contact.phone, 'Telefone')}
              >
                <Phone className="w-4 h-4 mr-1 text-primary" />
                Ligar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copiar telefone</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-border/30 hover:border-primary/50 hover:bg-primary/10 transition-all"
                onClick={() => contact.email && copyToClipboard(contact.email, 'Email')}
                disabled={!contact.email}
              >
                <Mail className="w-4 h-4 mr-1 text-primary" />
                Email
              </Button>
            </TooltipTrigger>
            <TooltipContent>{contact.email || 'Sem email'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Quick actions row */}
      <div className="flex items-center gap-1 mt-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 hover:bg-warning/10 hover:text-warning"
                onClick={() => onQuickAction?.('vip')}
              >
                <Star className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Marcar VIP</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 hover:bg-muted hover:text-muted-foreground"
                onClick={() => onQuickAction?.('archive')}
              >
                <Archive className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Arquivar contato</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onQuickAction?.('block')}
              >
                <Ban className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bloquear contato</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  );
}
