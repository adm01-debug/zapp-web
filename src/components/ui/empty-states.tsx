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
  Sparkles
} from 'lucide-react';

// SVG Illustrations for each context
const illustrations = {
  inbox: (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      {/* Chat bubbles floating */}
      <motion.g
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="40" y="50" width="80" height="40" rx="12" className="fill-primary/20" />
        <rect x="50" y="60" width="40" height="4" rx="2" className="fill-primary/40" />
        <rect x="50" y="70" width="60" height="4" rx="2" className="fill-primary/30" />
      </motion.g>
      <motion.g
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <rect x="80" y="100" width="80" height="40" rx="12" className="fill-muted/60" />
        <rect x="90" y="110" width="50" height="4" rx="2" className="fill-muted-foreground/30" />
        <rect x="90" y="120" width="30" height="4" rx="2" className="fill-muted-foreground/20" />
      </motion.g>
      {/* Decorative dots */}
      <motion.circle
        cx="30" cy="40"
        r="4"
        className="fill-primary/30"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="170" cy="60"
        r="3"
        className="fill-secondary/40"
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
      />
      <motion.circle
        cx="150" cy="130"
        r="5"
        className="fill-primary/20"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.6 }}
      />
    </svg>
  ),
  contacts: (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      {/* Contact cards */}
      <motion.g
        animate={{ x: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="30" y="40" width="140" height="35" rx="10" className="fill-muted/50" />
        <circle cx="55" cy="57" r="12" className="fill-primary/30" />
        <rect x="75" y="50" width="60" height="5" rx="2" className="fill-foreground/20" />
        <rect x="75" y="60" width="40" height="4" rx="2" className="fill-muted-foreground/20" />
      </motion.g>
      <motion.g
        animate={{ x: [0, -5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <rect x="30" y="85" width="140" height="35" rx="10" className="fill-muted/30" />
        <circle cx="55" cy="102" r="12" className="fill-secondary/30" />
        <rect x="75" y="95" width="50" height="5" rx="2" className="fill-foreground/15" />
        <rect x="75" y="105" width="70" height="4" rx="2" className="fill-muted-foreground/15" />
      </motion.g>
      {/* Plus icon floating */}
      <motion.g
        animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="170" cy="35" r="15" className="fill-primary/20" />
        <rect x="165" y="30" width="10" height="2" rx="1" className="fill-primary" />
        <rect x="169" y="26" width="2" height="10" rx="1" className="fill-primary" />
      </motion.g>
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      {/* Chart bars */}
      <motion.rect
        x="30" y="100" width="25" height="40" rx="4"
        className="fill-primary/30"
        animate={{ height: [40, 50, 40], y: [100, 90, 100] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.rect
        x="65" y="80" width="25" height="60" rx="4"
        className="fill-primary/40"
        animate={{ height: [60, 70, 60], y: [80, 70, 80] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
      <motion.rect
        x="100" y="60" width="25" height="80" rx="4"
        className="fill-primary/50"
        animate={{ height: [80, 90, 80], y: [60, 50, 60] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      <motion.rect
        x="135" y="90" width="25" height="50" rx="4"
        className="fill-primary/35"
        animate={{ height: [50, 60, 50], y: [90, 80, 90] }}
        transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
      />
      {/* Trend line */}
      <motion.path
        d="M40 90 L80 70 L115 50 L150 65"
        className="stroke-secondary"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        animate={{ pathLength: [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      {/* Sparkle */}
      <motion.g
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{ transformOrigin: '170px 30px' }}
      >
        <polygon points="170,20 173,28 180,30 173,32 170,40 167,32 160,30 167,28" className="fill-primary/60" />
      </motion.g>
    </svg>
  ),
  calls: (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      {/* Phone icon */}
      <motion.g
        animate={{ rotate: [-5, 5, -5] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: '100px 80px' }}
      >
        <rect x="70" y="50" width="60" height="60" rx="15" className="fill-primary/20" />
        <path
          d="M90 70 C90 70 95 75 100 80 C105 85 110 90 110 90"
          className="stroke-primary"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </motion.g>
      {/* Wave rings */}
      <motion.circle
        cx="100" cy="80" r="40"
        className="stroke-primary/30"
        strokeWidth="2"
        fill="none"
        animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.circle
        cx="100" cy="80" r="40"
        className="stroke-primary/20"
        strokeWidth="2"
        fill="none"
        animate={{ scale: [1, 1.5], opacity: [0.2, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
    </svg>
  ),
  tags: (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      {/* Tags floating */}
      <motion.g
        animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="50" y="60" width="60" height="28" rx="14" className="fill-primary/30" />
        <circle cx="65" cy="74" r="5" className="fill-primary/50" />
        <rect x="75" y="70" width="25" height="4" rx="2" className="fill-primary/40" />
      </motion.g>
      <motion.g
        animate={{ y: [0, -8, 0], rotate: [3, -3, 3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <rect x="90" y="95" width="55" height="25" rx="12" className="fill-secondary/30" />
        <circle cx="103" cy="107" r="4" className="fill-secondary/50" />
        <rect x="112" y="104" width="20" height="4" rx="2" className="fill-secondary/40" />
      </motion.g>
      <motion.g
        animate={{ y: [0, -6, 0], rotate: [-2, 4, -2] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <rect x="70" y="30" width="50" height="22" rx="11" className="fill-muted/50" />
        <circle cx="82" cy="41" r="4" className="fill-muted-foreground/30" />
        <rect x="90" y="38" width="18" height="3" rx="1.5" className="fill-muted-foreground/20" />
      </motion.g>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      {/* Magnifying glass */}
      <motion.g
        animate={{ x: [0, 10, 0], y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="90" cy="70" r="30" className="stroke-primary/40" strokeWidth="4" fill="none" />
        <line x1="112" y1="92" x2="135" y2="115" className="stroke-primary/40" strokeWidth="6" strokeLinecap="round" />
      </motion.g>
      {/* Question marks floating */}
      <motion.text
        x="40" y="50"
        className="fill-muted-foreground/30 text-2xl font-bold"
        animate={{ opacity: [0.3, 0.6, 0.3], y: [50, 45, 50] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ?
      </motion.text>
      <motion.text
        x="150" y="90"
        className="fill-muted-foreground/20 text-xl font-bold"
        animate={{ opacity: [0.2, 0.5, 0.2], y: [90, 85, 90] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      >
        ?
      </motion.text>
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      {/* Bell */}
      <motion.g
        animate={{ rotate: [-10, 10, -10] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        style={{ transformOrigin: '100px 50px' }}
      >
        <path
          d="M100 30 C80 30 70 50 70 70 L70 90 L60 100 L140 100 L130 90 L130 70 C130 50 120 30 100 30 Z"
          className="fill-primary/30"
        />
        <ellipse cx="100" cy="110" rx="10" ry="5" className="fill-primary/40" />
      </motion.g>
      {/* Notification dots */}
      <motion.circle
        cx="125" cy="45"
        r="8"
        className="fill-destructive/60"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      {/* Z's for sleeping */}
      <motion.text
        x="150" y="60"
        className="fill-muted-foreground/40 text-sm font-bold"
        animate={{ opacity: [0, 1, 0], x: [150, 160, 170] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        z
      </motion.text>
      <motion.text
        x="160" y="45"
        className="fill-muted-foreground/30 text-base font-bold"
        animate={{ opacity: [0, 1, 0], x: [160, 170, 180] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      >
        z
      </motion.text>
    </svg>
  ),
  generic: (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-full">
      {/* Empty box */}
      <motion.g
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="60" y="50" width="80" height="60" rx="8" className="fill-muted/30" />
        <path d="M60 65 L100 85 L140 65" className="stroke-muted-foreground/20" strokeWidth="2" fill="none" />
        <line x1="100" y1="85" x2="100" y2="110" className="stroke-muted-foreground/20" strokeWidth="2" />
      </motion.g>
      {/* Floating particles */}
      <motion.circle
        cx="50" cy="80"
        r="4"
        className="fill-primary/20"
        animate={{ y: [80, 70, 80], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="150" cy="90"
        r="3"
        className="fill-secondary/30"
        animate={{ y: [90, 80, 90], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      />
    </svg>
  ),
};

// Icon mapping for fallback
const contextIcons = {
  inbox: MessageSquare,
  contacts: Users,
  dashboard: BarChart3,
  calls: Phone,
  tags: Tag,
  search: Search,
  notifications: Bell,
  generic: Inbox,
  transcriptions: FileText,
};

export type EmptyStateContext = keyof typeof illustrations;

interface EmptyStateProps {
  context?: EmptyStateContext;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  context = 'generic',
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  const Icon = contextIcons[context] || Inbox;
  const illustration = illustrations[context] || illustrations.generic;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'p-6' : 'p-8 md:p-12',
        className
      )}
    >
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className={cn(
          'relative mb-6',
          compact ? 'w-32 h-24' : 'w-48 h-36 md:w-56 md:h-44'
        )}
      >
        {illustration}
        
        {/* Subtle glow effect behind illustration */}
        <div className="absolute inset-0 -z-10 blur-3xl">
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 rounded-full" />
        </div>
      </motion.div>

      {/* Icon badge */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        className={cn(
          'flex items-center justify-center rounded-2xl mb-4',
          compact ? 'w-12 h-12' : 'w-14 h-14'
        )}
        style={{ background: 'var(--gradient-primary)' }}
      >
        <Icon className={cn(
          'text-primary-foreground',
          compact ? 'w-6 h-6' : 'w-7 h-7'
        )} />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={cn(
          'font-display font-semibold text-foreground mb-2',
          compact ? 'text-lg' : 'text-xl md:text-2xl'
        )}
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={cn(
          'text-muted-foreground max-w-md mb-6',
          compact ? 'text-sm' : 'text-base'
        )}
      >
        {description}
      </motion.p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          {action && (
            <Button
              onClick={action.onClick}
              className="group shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {action.icon || <Plus className="w-4 h-4 mr-2" />}
              {action.label}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              className="text-muted-foreground hover:text-foreground"
            >
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Preset empty states for common scenarios
export function InboxEmptyState({ onStartChat }: { onStartChat?: () => void }) {
  return (
    <EmptyState
      context="inbox"
      title="Nenhuma conversa ainda"
      description="Suas conversas aparecerão aqui. Comece a atender clientes ou aguarde novas mensagens."
      action={
        onStartChat
          ? {
              label: 'Iniciar conversa',
              onClick: onStartChat,
              icon: <MessageSquare className="w-4 h-4 mr-2" />,
            }
          : undefined
      }
    />
  );
}

export function ContactsEmptyState({ onAddContact }: { onAddContact?: () => void }) {
  return (
    <EmptyState
      context="contacts"
      title="Nenhum contato cadastrado"
      description="Adicione contatos para gerenciar suas conversas e manter o histórico organizado."
      action={
        onAddContact
          ? {
              label: 'Adicionar contato',
              onClick: onAddContact,
              icon: <Users className="w-4 h-4 mr-2" />,
            }
          : undefined
      }
    />
  );
}

export function DashboardEmptyState({ onExplore }: { onExplore?: () => void }) {
  return (
    <EmptyState
      context="dashboard"
      title="Sem dados para exibir"
      description="Comece a atender para ver métricas e insights sobre seu desempenho aqui."
      action={
        onExplore
          ? {
              label: 'Ir para Inbox',
              onClick: onExplore,
              icon: <Sparkles className="w-4 h-4 mr-2" />,
            }
          : undefined
      }
    />
  );
}

export function SearchEmptyState({ query }: { query?: string }) {
  return (
    <EmptyState
      context="search"
      title={query ? `Nenhum resultado para "${query}"` : 'Busque por algo'}
      description={
        query
          ? 'Tente usar termos diferentes ou verificar a ortografia.'
          : 'Digite palavras-chave para encontrar conversas, contatos ou mensagens.'
      }
    />
  );
}

export function NotificationsEmptyState() {
  return (
    <EmptyState
      context="notifications"
      title="Você está em dia!"
      description="Nenhuma notificação no momento. Novas atualizações aparecerão aqui."
      compact
    />
  );
}

export function TagsEmptyState({ onCreateTag }: { onCreateTag?: () => void }) {
  return (
    <EmptyState
      context="tags"
      title="Nenhuma etiqueta criada"
      description="Crie etiquetas para organizar e categorizar suas conversas e contatos."
      action={
        onCreateTag
          ? {
              label: 'Criar etiqueta',
              onClick: onCreateTag,
              icon: <Tag className="w-4 h-4 mr-2" />,
            }
          : undefined
      }
    />
  );
}

export function CallsEmptyState() {
  return (
    <EmptyState
      context="calls"
      title="Nenhuma ligação registrada"
      description="O histórico de chamadas aparecerá aqui quando você fizer ou receber ligações."
    />
  );
}

export function TranscriptionsEmptyState() {
  return (
    <EmptyState
      context="generic"
      title="Nenhuma transcrição disponível"
      description="Transcrições de áudios e chamadas serão exibidas aqui automaticamente."
    />
  );
}
