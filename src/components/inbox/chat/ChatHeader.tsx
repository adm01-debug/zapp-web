import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from '@/components/ui/motion';
import { TypingIndicatorCompact } from '../TypingIndicator';
import { SLAIndicator } from '../SLAIndicator';
import { VoiceSelector } from '../VoiceSelector';
import { SpeedSelector } from '../SpeedSelector';
import { useExternalContact360 } from '@/hooks/useExternalContact360';
import { useContactIntelligence } from '@/hooks/useContactIntelligence';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
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
  Building,
  User,
  Users,
  UserCheck,
  Truck,
  Wrench,
} from 'lucide-react';

const contactTypeConfig: Record<string, { label: string; icon: typeof Users; color: string }> = {
  cliente: { label: 'Cliente', icon: Users, color: 'bg-info/10 text-info border-info/30' },
  colaborador: { label: 'Colaborador', icon: UserCheck, color: 'bg-success/10 text-success border-success/30' },
  fornecedor: { label: 'Fornecedor', icon: Truck, color: 'bg-secondary/10 text-secondary border-secondary/30' },
  prestador_servico: { label: 'Prestador', icon: Wrench, color: 'bg-warning/10 text-warning border-warning/30' },
  transportadora: { label: 'Transportadora', icon: Truck, color: 'bg-info/10 text-info border-info/30' },
};

interface ChatHeaderProps {
  conversation: Conversation;
  isContactTyping: boolean;
  showAIAssistant: boolean;
  showDetails: boolean;
  voiceId: string;
  speed: number;
  onToggleAIAssistant: () => void;
  onToggleDetails: () => void;
  onStartCall: () => void;
  onOpenSearch: () => void;
  onOpenTransfer: () => void;
  onOpenSchedule: () => void;
  onVoiceChange: (voiceId: string) => void;
  onSpeedChange: (speed: number) => void;
}

export function ChatHeader({
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
}: ChatHeaderProps) {
  // CRM 360° data
  const { data: crmData } = useExternalContact360(
    isExternalConfigured ? conversation.contact.phone : undefined
  );
  const crmCompany = crmData?.found ? crmData.company : null;
  const crmCustomer = crmData?.found ? crmData.customer : null;
  const crmRfm = crmData?.found ? crmData.rfm : null;

  // Intelligence briefing
  const { data: intel } = useContactIntelligence(
    isExternalConfigured ? conversation.contact.phone : undefined
  );
  const briefing = intel?.found ? intel.briefing : null;

  const rfmSegmentColors: Record<string, string> = {
    Champions: 'bg-success/15 text-success border-success/30',
    'Loyal Customers': 'bg-info/15 text-info border-info/30',
    'At Risk': 'bg-destructive/15 text-destructive border-destructive/30',
    Hibernating: 'bg-muted text-muted-foreground border-border',
    Lost: 'bg-muted/50 text-muted-foreground border-border/50',
    "Can't Lose Them": 'bg-destructive/15 text-destructive border-destructive/30',
    'Need Attention': 'bg-warning/15 text-warning border-warning/30',
    Promising: 'bg-secondary/15 text-secondary border-secondary/30',
  };

  const formatCurrency = (v: number | null) =>
    v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-card"
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
          <div className="flex items-center gap-2 flex-wrap">
            {briefing ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="font-semibold text-foreground cursor-help border-b border-dashed border-primary/30 flex items-center gap-1.5">
                    {conversation.contact.name}
                    <Brain className="w-3.5 h-3.5 text-primary/60" />
                  </h3>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  className={cn(
                    'max-w-[320px] p-3',
                    briefing.risk_alert && 'border-destructive/50 ring-1 ring-destructive/20'
                  )}
                >
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2 text-xs"
                  >
                    <p className="font-medium text-foreground">{briefing.opening_tip}</p>
                    {briefing.risk_alert && (
                      <p className="text-destructive font-medium">{briefing.risk_alert}</p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                      <span>Score: <strong className="text-foreground">{briefing.relationship_score ?? '—'}</strong></span>
                      <span>Etapa: <strong className="text-foreground">{briefing.relationship_stage ?? '—'}</strong></span>
                      <span>Último: <strong className="text-foreground">{briefing.days_since_last_contact != null ? `${briefing.days_since_last_contact}d` : '—'}</strong></span>
                      <span>Interações: <strong className="text-foreground">{briefing.total_interactions}</strong></span>
                      {briefing.vendedor && <span>Vendedor: <strong className="text-foreground">{briefing.vendedor.split(' ').slice(0,2).join(' ')}</strong></span>}
                      {briefing.rfm_segment && <span>RFM: <strong className="text-foreground">{briefing.rfm_segment}</strong></span>}
                    </div>
                    {intel?.rapport?.suggestions && intel.rapport.suggestions.length > 0 && (
                      <div className="border-t border-border/30 pt-1.5 mt-1">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Rapport:</p>
                        {intel.rapport.suggestions.slice(0, 2).map((s, i) => (
                          <p key={i} className="text-success text-[11px]">{s}</p>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <h3 className="font-semibold text-foreground">
                {conversation.contact.name}
              </h3>
            )}
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] capitalize border',
                // Sentiment-based color override when intel is available
                briefing?.sentiment === 'positive' && 'border-success/50 text-success bg-success/10',
                briefing?.sentiment === 'negative' && 'border-destructive/50 text-destructive bg-destructive/10',
                !briefing?.sentiment && conversation.status === 'open' && 'border-success/50 text-success bg-success/10',
                !briefing?.sentiment && conversation.status === 'pending' && 'border-warning/50 text-warning bg-warning/10',
                !briefing?.sentiment && conversation.status === 'resolved' && 'border-muted-foreground/50 text-muted-foreground',
                !briefing?.sentiment && conversation.status === 'waiting' && 'border-info/50 text-info bg-info/10',
                briefing?.sentiment === 'neutral' && conversation.status === 'open' && 'border-success/50 text-success bg-success/10',
                briefing?.sentiment === 'neutral' && conversation.status === 'pending' && 'border-warning/50 text-warning bg-warning/10',
                briefing?.sentiment === 'neutral' && conversation.status === 'resolved' && 'border-muted-foreground/50 text-muted-foreground',
                briefing?.sentiment === 'neutral' && conversation.status === 'waiting' && 'border-info/50 text-info bg-info/10',
              )}
            >
              {briefing?.sentiment && briefing.sentiment !== 'neutral' && (
                <span className="mr-0.5">{briefing.sentiment === 'positive' ? '😊' : '😟'}</span>
              )}
              {conversation.status === 'open' ? 'Aberto' : 
               conversation.status === 'pending' ? 'Pendente' :
               conversation.status === 'resolved' ? 'Resolvido' : 'Aguardando'}
            </Badge>
            {/* Contact Type Badge */}
            {(() => {
              const ct = conversation.contact.contact_type;
              const cfg = ct ? contactTypeConfig[ct] : null;
              if (!cfg) return null;
              const TypeIcon = cfg.icon;
              return (
                <Badge variant="outline" className={cn('text-[10px] border font-medium', cfg.color)}>
                  <TypeIcon className="w-3 h-3 mr-0.5" />
                  {cfg.label}
                </Badge>
              );
            })()}
            <SLAIndicator
              firstMessageAt={conversation.createdAt}
              firstResponseAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
              resolvedAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
              firstResponseMinutes={conversation.priority === 'high' ? 2 : 5}
              resolutionMinutes={conversation.priority === 'high' ? 30 : 60}
            />
            {/* CRM Badges */}
            {crmCompany && (
              <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                <Building className="w-3 h-3 mr-0.5" />
                {crmCompany.nome_fantasia || crmCompany.nome_crm}
              </Badge>
            )}
            {crmCustomer?.vendedor_nome && (
              <Badge variant="outline" className="text-[10px] bg-muted/20 border-border/30">
                <User className="w-3 h-3 mr-0.5" />
                {crmCustomer.vendedor_nome.split(' ').slice(0, 2).join(' ')}
              </Badge>
            )}
            {crmRfm?.segment_code && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px]', rfmSegmentColors[crmRfm.segment_code] || 'bg-muted/20')}
                  >
                    {crmRfm.segment_code}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="space-y-1">
                    <p>Pedidos: {crmCustomer?.total_pedidos ?? 0}</p>
                    <p>Ticket médio: {formatCurrency(crmCustomer?.ticket_medio ?? null)}</p>
                    <p>Total compras: {formatCurrency(crmCustomer?.valor_total_compras ?? null)}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            {crmCustomer && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  crmCustomer.cliente_ativado
                    ? 'bg-success/10 text-success border-success/30'
                    : 'bg-destructive/10 text-destructive border-destructive/30'
                )}
              >
                {crmCustomer.cliente_ativado ? 'Ativo' : 'Inativo'}
              </Badge>
            )}
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
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={onOpenSearch}
                aria-label="Buscar (Ctrl+K)"
              >
                <Search className="w-4 h-4" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>Buscar (Ctrl+K)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={onStartCall}
                aria-label="Iniciar chamada"
              >
                <PhoneCall className="w-4 h-4" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>Iniciar chamada</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                aria-label="Videochamada"
              >
                <Video className="w-4 h-4" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>Videochamada</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "text-muted-foreground hover:text-primary hover:bg-primary/10",
                  showAIAssistant && "text-primary bg-primary/10"
                )}
                onClick={onToggleAIAssistant}
                aria-label="Assistente IA"
              >
                <Brain className="w-4 h-4" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>Assistente IA</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "text-muted-foreground hover:text-primary hover:bg-primary/10 relative",
                  showDetails && "text-primary bg-primary/10"
                )}
                onClick={onToggleDetails}
                aria-label="Detalhes do contato"
              >
                <Info className="w-4 h-4" />
                {!showDetails && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>Detalhes do contato</TooltipContent>
        </Tooltip>

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
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                aria-label="Mais opções"
              >
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
