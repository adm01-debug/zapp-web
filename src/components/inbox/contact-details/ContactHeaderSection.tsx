import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Phone,
  Mail,
  Building,
  Briefcase,
  Ban,
  Star,
  Archive,
  MessageSquare,
  Crown,
  User,
  MoreHorizontal,
  ChevronsDownUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { EnrichedContactData } from '@/hooks/useContactEnrichedData';
import { useExternalContact360 } from '@/hooks/useExternalContact360';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const channelIcons: Record<string, string> = {
  whatsapp: '💬', instagram: '📸', facebook: '📘', telegram: '✈️',
  email: '📧', sms: '📱', webchat: '🌐',
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
  isCompact?: boolean;
  hasExpandedSections?: boolean;
  onCollapseAll?: () => void;
}

export function ContactHeaderSection({ contact, enrichedData, onQuickAction, isCompact = false, hasExpandedSections = false, onCollapseAll }: ContactHeaderSectionProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const { data: crmData } = useExternalContact360(isExternalConfigured ? contact.phone : undefined);
  const crmContact = crmData?.found ? crmData.contact : null;
  const crmCompany = crmData?.found ? crmData.company : null;
  const crmCustomer = crmData?.found ? crmData.customer : null;
  const isVip = crmContact && crmContact.relationship_score >= 70;
  const nomeTratamento = crmContact?.nome_tratamento || crmContact?.apelido;

  const channelType = enrichedData?.channel_type;
  const channelEmoji = channelType ? channelIcons[channelType] || '💬' : null;
  const sentiment = enrichedData?.ai_sentiment;
  const priority = enrichedData?.ai_priority;
  const contactType = enrichedData?.contact_type;

  // Engagement score
  const engagementScore = (() => {
    let s = 50;
    if (enrichedData?.ai_sentiment === 'positive') s += 25;
    if (enrichedData?.ai_priority === 'high') s += 15;
    if (enrichedData?.company) s += 5;
    if (enrichedData?.contact_type === 'customer') s += 5;
    return Math.min(s, 100);
  })();

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'hsl(var(--success))';
    if (s >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  // First name for display
  const firstName = contact.name.split(' ')[0];
  const companyName = crmCompany?.nome_fantasia || enrichedData?.company;

  // =============================================
  // COMPACT HEADER (shown when scrolled)
  // =============================================
  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card"
      >
        <div className="relative">
          <Avatar className="w-9 h-9 ring-1 ring-border/20">
            <AvatarImage src={contact.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {isVip && (
            <Crown className="w-3 h-3 text-warning absolute -top-0.5 -right-0.5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground truncate">{firstName}</span>
            {companyName && (
              <>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-xs text-muted-foreground truncate">{companyName}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-success/10" onClick={() => {
                  const cleanPhone = contact.phone.replace(/\D/g, '');
                  window.open(`https://wa.me/${cleanPhone}`, '_blank');
                }}>
                  <MessageSquare className="w-3.5 h-3.5 text-success" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>WhatsApp</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-primary/10" onClick={() => copyToClipboard(contact.phone, 'Telefone')}>
                  <Phone className="w-3.5 h-3.5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copiar telefone</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>
    );
  }

  // =============================================
  // FULL HEADER
  // =============================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 flex flex-col items-center text-center border-b border-border"
    >
      {/* Avatar with channel badge, company logo, and engagement ring */}
      <div className="relative mb-3">
        <div className="relative inline-block">
          {/* Engagement ring SVG behind avatar */}
          <svg className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] -rotate-90" viewBox="0 0 108 108">
            <circle cx="54" cy="54" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" opacity="0.3" />
            <motion.circle
              cx="54" cy="54" r="50"
              fill="none"
              stroke={getScoreColor(engagementScore)}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 50}
              initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
              animate={{ strokeDashoffset: ((100 - engagementScore) / 100) * 2 * Math.PI * 50 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <Avatar className="w-24 h-24 ring-2 ring-background">
            <AvatarImage src={contact.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {/* Engagement score badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-background"
                  style={{ backgroundColor: getScoreColor(engagementScore), color: 'white' }}
                >
                  {engagementScore}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Engajamento: {engagementScore >= 80 ? 'Alto' : engagementScore >= 50 ? 'Médio' : 'Baixo'} ({engagementScore}/100)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {channelEmoji && (
            <span className="absolute -bottom-1 -right-1 text-lg bg-card rounded-full p-0.5 ring-2 ring-background">
              {channelEmoji}
            </span>
          )}
          {crmCompany?.logo_url && (
            <img
              src={crmCompany.logo_url}
              alt={crmCompany.nome_fantasia || ''}
              className="absolute -top-1 -left-1 w-8 h-8 rounded-md object-contain bg-white border border-border/30 ring-2 ring-background"
            />
          )}
        </div>
      </div>

      {/* Name + Company in a single line hierarchy */}
      <h4 className="font-semibold text-lg text-foreground leading-tight">{firstName}</h4>
      {companyName && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Building className="w-3 h-3" />
          {companyName}
        </p>
      )}
      {nomeTratamento && (
        <p className="text-[10px] text-primary/70 italic mt-0.5">"{nomeTratamento}"</p>
      )}
      {(enrichedData?.job_title && !companyName) && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Briefcase className="w-3 h-3" />
          {enrichedData.job_title}
        </p>
      )}
      {enrichedData?.job_title && companyName && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{enrichedData.job_title}</p>
      )}
      <p className="text-xs text-muted-foreground mt-0.5 font-mono tracking-tight">{contact.phone}</p>

      {/* Badges row */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
        {isVip && (
          <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30">
            <Crown className="w-3 h-3 mr-0.5" />
            VIP
          </Badge>
        )}
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
            {priorityConfig[priority].label}
          </Badge>
        )}
      </div>

      {/* Vendedor responsável */}
      {crmCustomer?.vendedor_nome && (
        <Badge variant="secondary" className="text-[10px] bg-muted/30 text-muted-foreground mt-1.5">
          <User className="w-3 h-3 mr-0.5" />
          {crmCustomer.vendedor_nome}
        </Badge>
      )}

      {/* Action icons row - compact */}
      <div className="flex items-center gap-1 mt-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-9 h-9 border-border/30 hover:border-success/50 hover:bg-success/10"
                onClick={() => {
                  const cleanPhone = contact.phone.replace(/\D/g, '');
                  window.open(`https://wa.me/${cleanPhone}`, '_blank');
                }}
              >
                <MessageSquare className="w-4 h-4 text-success" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">WhatsApp</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-9 h-9 border-border/30 hover:border-primary/50 hover:bg-primary/10"
                onClick={() => copyToClipboard(contact.phone, 'Telefone')}
              >
                <Phone className="w-4 h-4 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Copiar telefone</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-9 h-9 border-border/30 hover:border-primary/50 hover:bg-primary/10"
                onClick={() => contact.email && copyToClipboard(contact.email, 'Email')}
                disabled={!contact.email}
              >
                <Mail className="w-4 h-4 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{contact.email || 'Sem email'}</TooltipContent>
          </Tooltip>

          {/* Collapse all sections */}
          {hasExpandedSections && onCollapseAll && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-9 h-9 border-border/30 hover:border-muted-foreground/50 hover:bg-muted/20"
                  onClick={onCollapseAll}
                >
                  <ChevronsDownUp className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Recolher todas as seções</TooltipContent>
            </Tooltip>
          )}

          {/* More actions dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="w-9 h-9 border-border/30 hover:bg-muted/30">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Mais ações</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="center" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => onQuickAction?.('vip')} className="gap-2 text-xs">
                <Star className="w-3.5 h-3.5 text-warning" />
                Marcar VIP
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction?.('archive')} className="gap-2 text-xs">
                <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                Arquivar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction?.('block')} className="gap-2 text-xs text-destructive">
                <Ban className="w-3.5 h-3.5" />
                Bloquear
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      </div>
    </motion.div>
  );
}
