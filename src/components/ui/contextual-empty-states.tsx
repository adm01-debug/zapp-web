import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { 
  MessageSquare, 
  Users, 
  BarChart3, 
  Phone, 
  Tag, 
  Inbox,
  FileText,
  Bell,
  Search,
  Plus,
  ArrowRight,
  Upload,
  Link2,
  UserPlus,
  Settings,
  Wand2,
  RefreshCw,
  Filter,
  Zap,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

/**
 * Contextual Empty States with Smart CTAs
 * Each empty state has context-specific primary and secondary actions
 */

interface ContextualAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  external?: boolean;
}

interface ContextualEmptyStateProps {
  context: 'inbox' | 'contacts' | 'queues' | 'agents' | 'tags' | 'transcriptions' | 'dashboard' | 'search' | 'notifications' | 'calls' | 'wallet' | 'messages';
  
  // Override defaults
  title?: string;
  description?: string;
  
  // Context-specific callbacks for smart CTAs
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onTertiaryAction?: () => void;
  
  // For search context
  searchQuery?: string;
  
  // Display options
  compact?: boolean;
  showHelp?: boolean;
  className?: string;
}

// Context-specific configurations
const contextConfigs: Record<string, {
  icon: React.ElementType;
  title: string;
  description: string;
  primaryAction: { label: string; icon: React.ReactNode };
  secondaryAction?: { label: string; icon: React.ReactNode };
  tertiaryAction?: { label: string; icon: React.ReactNode };
  helpText?: string;
}> = {
  inbox: {
    icon: Inbox,
    title: 'Nenhuma conversa ainda',
    description: 'Conecte seu WhatsApp ou importe contatos para começar a atender.',
    primaryAction: { 
      label: 'Conectar WhatsApp', 
      icon: <Link2 className="w-4 h-4 mr-2" /> 
    },
    secondaryAction: { 
      label: 'Importar contatos', 
      icon: <Upload className="w-4 h-4 mr-2" /> 
    },
    tertiaryAction: { 
      label: 'Ver como funciona', 
      icon: <HelpCircle className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Após conectar, as mensagens aparecerão automaticamente aqui.'
  },
  contacts: {
    icon: Users,
    title: 'Nenhum contato cadastrado',
    description: 'Adicione contatos manualmente ou importe de uma planilha.',
    primaryAction: { 
      label: 'Adicionar contato', 
      icon: <UserPlus className="w-4 h-4 mr-2" /> 
    },
    secondaryAction: { 
      label: 'Importar planilha', 
      icon: <Upload className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Contatos também são criados automaticamente ao receber mensagens.'
  },
  queues: {
    icon: Inbox,
    title: 'Nenhuma fila criada',
    description: 'Crie filas para organizar o atendimento por departamento ou assunto.',
    primaryAction: { 
      label: 'Criar primeira fila', 
      icon: <Plus className="w-4 h-4 mr-2" /> 
    },
    secondaryAction: { 
      label: 'Usar wizard', 
      icon: <Wand2 className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Filas ajudam a distribuir conversas entre agentes de forma organizada.'
  },
  agents: {
    icon: Users,
    title: 'Nenhum agente na equipe',
    description: 'Convide membros da sua equipe para atender conversas.',
    primaryAction: { 
      label: 'Convidar agente', 
      icon: <UserPlus className="w-4 h-4 mr-2" /> 
    },
    secondaryAction: { 
      label: 'Configurar permissões', 
      icon: <Settings className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Agentes podem atender conversas nas filas que você atribuir.'
  },
  tags: {
    icon: Tag,
    title: 'Nenhuma etiqueta criada',
    description: 'Etiquetas ajudam a organizar e filtrar conversas rapidamente.',
    primaryAction: { 
      label: 'Criar etiqueta', 
      icon: <Plus className="w-4 h-4 mr-2" /> 
    },
    secondaryAction: { 
      label: 'Importar etiquetas', 
      icon: <Upload className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Use cores diferentes para identificar categorias visualmente.'
  },
  transcriptions: {
    icon: FileText,
    title: 'Nenhuma transcrição disponível',
    description: 'Transcrições são geradas automaticamente para áudios recebidos.',
    primaryAction: { 
      label: 'Ativar transcrição automática', 
      icon: <Zap className="w-4 h-4 mr-2" /> 
    },
    secondaryAction: { 
      label: 'Configurações', 
      icon: <Settings className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Habilite nas configurações para transcrever áudios automaticamente.'
  },
  dashboard: {
    icon: BarChart3,
    title: 'Sem dados para exibir',
    description: 'Comece a atender para ver métricas e insights sobre seu desempenho.',
    primaryAction: { 
      label: 'Ir para Inbox', 
      icon: <Inbox className="w-4 h-4 mr-2" /> 
    },
    secondaryAction: { 
      label: 'Configurar metas', 
      icon: <Settings className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Métricas são calculadas com base nas conversas atendidas.'
  },
  search: {
    icon: Search,
    title: 'Nenhum resultado encontrado',
    description: 'Tente usar termos diferentes ou verificar a ortografia.',
    primaryAction: { 
      label: 'Limpar filtros', 
      icon: <RefreshCw className="w-4 h-4 mr-2" /> 
    },
    secondaryAction: { 
      label: 'Busca avançada', 
      icon: <Filter className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Você pode buscar por nome, telefone, email ou conteúdo de mensagens.'
  },
  notifications: {
    icon: Bell,
    title: 'Você está em dia!',
    description: 'Nenhuma notificação no momento.',
    primaryAction: { 
      label: 'Configurar alertas', 
      icon: <Settings className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Configure quais notificações você deseja receber.'
  },
  calls: {
    icon: Phone,
    title: 'Nenhuma ligação registrada',
    description: 'O histórico de chamadas aparecerá aqui.',
    primaryAction: { 
      label: 'Configurar VoIP', 
      icon: <Settings className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Integre com seu sistema de telefonia para registrar chamadas.'
  },
  wallet: {
    icon: Users,
    title: 'Nenhum cliente na carteira',
    description: 'Configure regras para distribuir clientes entre agentes.',
    primaryAction: { 
      label: 'Criar regra', 
      icon: <Plus className="w-4 h-4 mr-2" /> 
    },
    secondaryAction: { 
      label: 'Importar distribuição', 
      icon: <Upload className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Carteiras garantem que cada cliente seja atendido pelo mesmo agente.'
  },
  messages: {
    icon: MessageSquare,
    title: 'Selecione uma conversa',
    description: 'Escolha uma conversa ao lado para ver as mensagens.',
    primaryAction: { 
      label: 'Ver todas conversas', 
      icon: <Inbox className="w-4 h-4 mr-2" /> 
    },
    helpText: 'Use os filtros para encontrar conversas específicas.'
  },
};

// Animated illustrations (simplified for this component)
function EmptyIllustration({ context }: { context: string }) {
  const Icon = contextConfigs[context]?.icon || Inbox;
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      className="relative mb-6"
    >
      {/* Background glow */}
      <div className="absolute inset-0 blur-3xl">
        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 rounded-full" />
      </div>
      
      {/* Icon container */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-24 h-24 mx-auto"
      >
        <div 
          className="w-full h-full rounded-3xl flex items-center justify-center"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Icon className="w-12 h-12 text-primary-foreground" />
        </div>
        
        {/* Decorative rings */}
        <motion.div
          className="absolute inset-0 rounded-3xl border-2 border-primary/30"
          animate={{ scale: [1, 1.2], opacity: [0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 rounded-3xl border-2 border-primary/20"
          animate={{ scale: [1, 1.4], opacity: [0.2, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        />
      </motion.div>
    </motion.div>
  );
}

export function ContextualEmptyState({
  context,
  title,
  description,
  onPrimaryAction,
  onSecondaryAction,
  onTertiaryAction,
  searchQuery,
  compact = false,
  showHelp = true,
  className,
}: ContextualEmptyStateProps) {
  const config = contextConfigs[context] || contextConfigs.messages;
  
  // Handle search context specially
  const displayTitle = context === 'search' && searchQuery
    ? `Nenhum resultado para "${searchQuery}"`
    : (title || config.title);
    
  const displayDescription = context === 'search' && !searchQuery
    ? 'Digite palavras-chave para encontrar conversas, contatos ou mensagens.'
    : (description || config.description);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'p-6' : 'p-8 md:p-12',
        className
      )}
    >
      {/* Illustration */}
      {!compact && <EmptyIllustration context={context} />}
      
      {/* Compact icon */}
      {compact && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'var(--gradient-primary)' }}
        >
          {React.createElement(config.icon, { className: 'w-6 h-6 text-primary-foreground' })}
        </motion.div>
      )}

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          'font-display font-semibold text-foreground mb-2',
          compact ? 'text-lg' : 'text-xl md:text-2xl'
        )}
      >
        {displayTitle}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn(
          'text-muted-foreground max-w-md mb-6',
          compact ? 'text-sm' : 'text-base'
        )}
      >
        {displayDescription}
      </motion.p>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row items-center gap-3 flex-wrap justify-center"
      >
        {/* Primary Action */}
        {onPrimaryAction && (
          <Button
            onClick={onPrimaryAction}
            className="group shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            style={{ background: 'var(--gradient-primary)' }}
          >
            {config.primaryAction.icon}
            {config.primaryAction.label}
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        )}
        
        {/* Secondary Action */}
        {onSecondaryAction && config.secondaryAction && (
          <Button
            variant="outline"
            onClick={onSecondaryAction}
            className="group"
          >
            {config.secondaryAction.icon}
            {config.secondaryAction.label}
          </Button>
        )}
        
        {/* Tertiary Action */}
        {onTertiaryAction && config.tertiaryAction && (
          <Button
            variant="ghost"
            onClick={onTertiaryAction}
            className="text-muted-foreground hover:text-foreground"
          >
            {config.tertiaryAction.icon}
            {config.tertiaryAction.label}
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        )}
      </motion.div>

      {/* Help text */}
      {showHelp && config.helpText && !compact && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xs text-muted-foreground/60 mt-6 flex items-center gap-1"
        >
          <HelpCircle className="w-3 h-3" />
          {config.helpText}
        </motion.p>
      )}
    </motion.div>
  );
}

// Convenience exports for specific contexts with pre-configured callbacks
export function InboxEmptyState(props: {
  onConnectWhatsApp?: () => void;
  onImportContacts?: () => void;
  onLearnMore?: () => void;
}) {
  return (
    <ContextualEmptyState
      context="inbox"
      onPrimaryAction={props.onConnectWhatsApp}
      onSecondaryAction={props.onImportContacts}
      onTertiaryAction={props.onLearnMore}
    />
  );
}

export function ContactsEmptyState(props: {
  onAddContact?: () => void;
  onImportSpreadsheet?: () => void;
}) {
  return (
    <ContextualEmptyState
      context="contacts"
      onPrimaryAction={props.onAddContact}
      onSecondaryAction={props.onImportSpreadsheet}
    />
  );
}

export function QueuesEmptyState(props: {
  onCreateQueue?: () => void;
  onUseWizard?: () => void;
}) {
  return (
    <ContextualEmptyState
      context="queues"
      onPrimaryAction={props.onCreateQueue}
      onSecondaryAction={props.onUseWizard}
    />
  );
}

export function AgentsEmptyState(props: {
  onInviteAgent?: () => void;
  onConfigurePermissions?: () => void;
}) {
  return (
    <ContextualEmptyState
      context="agents"
      onPrimaryAction={props.onInviteAgent}
      onSecondaryAction={props.onConfigurePermissions}
    />
  );
}

export function TagsEmptyState(props: {
  onCreateTag?: () => void;
  onImportTags?: () => void;
}) {
  return (
    <ContextualEmptyState
      context="tags"
      onPrimaryAction={props.onCreateTag}
      onSecondaryAction={props.onImportTags}
    />
  );
}

export function SearchEmptyState(props: {
  query?: string;
  onClearFilters?: () => void;
  onAdvancedSearch?: () => void;
}) {
  return (
    <ContextualEmptyState
      context="search"
      searchQuery={props.query}
      onPrimaryAction={props.onClearFilters}
      onSecondaryAction={props.onAdvancedSearch}
    />
  );
}

export function DashboardEmptyState(props: {
  onGoToInbox?: () => void;
  onConfigureGoals?: () => void;
}) {
  return (
    <ContextualEmptyState
      context="dashboard"
      onPrimaryAction={props.onGoToInbox}
      onSecondaryAction={props.onConfigureGoals}
    />
  );
}

export function NotificationsEmptyState(props: {
  onConfigureAlerts?: () => void;
}) {
  return (
    <ContextualEmptyState
      context="notifications"
      onPrimaryAction={props.onConfigureAlerts}
      compact
    />
  );
}

export function TranscriptionsEmptyState(props: {
  onEnableAutoTranscription?: () => void;
  onOpenSettings?: () => void;
}) {
  return (
    <ContextualEmptyState
      context="transcriptions"
      onPrimaryAction={props.onEnableAutoTranscription}
      onSecondaryAction={props.onOpenSettings}
    />
  );
}
