import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  X,
  Settings,
  Volume2,
  VolumeX,
  Clock,
  Filter,
  MoreVertical,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Target,
  TrendingDown,
  Info,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'sla' | 'sentiment' | 'goal' | 'message';
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isArchived?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  groupId?: string;
}

interface NotificationGroup {
  id: string;
  title: string;
  notifications: Notification[];
  count: number;
  latestTimestamp: Date;
}

// Config
const typeConfig: Record<NotificationType, { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  info: { 
    icon: Info, 
    color: 'text-info', 
    bgColor: 'bg-info/10',
    label: 'Informação' 
  },
  success: { 
    icon: CheckCircle, 
    color: 'text-success', 
    bgColor: 'bg-success/10',
    label: 'Sucesso' 
  },
  warning: { 
    icon: AlertTriangle, 
    color: 'text-warning', 
    bgColor: 'bg-warning/10',
    label: 'Aviso' 
  },
  error: { 
    icon: AlertCircle, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    label: 'Erro' 
  },
  sla: { 
    icon: Clock, 
    color: 'text-warning', 
    bgColor: 'bg-warning/10',
    label: 'SLA' 
  },
  sentiment: { 
    icon: TrendingDown, 
    color: 'text-primary', 
    bgColor: 'bg-primary/10',
    label: 'Sentimento' 
  },
  goal: { 
    icon: Target, 
    color: 'text-emerald-500', 
    bgColor: 'bg-emerald-500/10',
    label: 'Meta' 
  },
  message: { 
    icon: MessageSquare, 
    color: 'text-primary', 
    bgColor: 'bg-primary/10',
    label: 'Mensagem' 
  },
};

const priorityConfig: Record<NotificationPriority, { color: string; label: string }> = {
  low: { color: 'text-muted-foreground', label: 'Baixa' },
  medium: { color: 'text-foreground', label: 'Média' },
  high: { color: 'text-warning', label: 'Alta' },
  urgent: { color: 'text-destructive', label: 'Urgente' },
};

// Format time intelligently
function formatNotificationTime(date: Date): string {
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return 'Ontem';
  }
  return format(date, 'dd/MM');
}

// Notification Item Component
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: (notification: Notification) => void;
  compact?: boolean;
}

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  onAction,
  compact = false 
}: NotificationItemProps) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;
  const priorityConf = priorityConfig[notification.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50, height: 0 }}
      className={cn(
        'group relative rounded-xl transition-all duration-200',
        'border border-transparent hover:border-border',
        compact ? 'p-2' : 'p-3',
        !notification.isRead && 'bg-primary/5',
        notification.priority === 'urgent' && !notification.isRead && 'border-l-2 border-l-destructive'
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 rounded-lg p-2',
          config.bgColor
        )}>
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  'text-sm truncate',
                  !notification.isRead ? 'font-semibold' : 'font-medium'
                )}>
                  {notification.title}
                </h4>
                {notification.priority === 'urgent' && (
                  <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                    Urgente
                  </Badge>
                )}
                {notification.priority === 'high' && (
                  <Badge variant="outline" className="h-4 px-1 text-[10px] border-warning text-warning">
                    Alta
                  </Badge>
                )}
              </div>
              <p className={cn(
                'text-muted-foreground mt-0.5',
                compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
              )}>
                {notification.message}
              </p>
            </div>

            {/* Unread dot */}
            {!notification.isRead && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5"
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatNotificationTime(notification.timestamp)}
              </span>
            </div>

            {/* Action button */}
            {notification.actionUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onAction?.(notification)}
              >
                {notification.actionLabel || 'Ver'}
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <Check className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Marcar como lida</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => onDelete(notification.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Excluir</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </motion.div>
  );
}

// Grouped Notification Component
interface GroupedNotificationProps {
  group: NotificationGroup;
  onExpand: (groupId: string) => void;
  isExpanded: boolean;
  onMarkGroupAsRead: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
}

function GroupedNotification({ 
  group, 
  onExpand, 
  isExpanded,
  onMarkGroupAsRead,
  onDeleteGroup
}: GroupedNotificationProps) {
  return (
    <motion.div
      layout
      className="rounded-xl border border-border overflow-hidden"
    >
      {/* Group header */}
      <button
        onClick={() => onExpand(group.id)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px]">
              {group.count}
            </Badge>
          </div>
          <div className="text-left">
            <h4 className="text-sm font-medium">{group.title}</h4>
            <p className="text-xs text-muted-foreground">
              {group.count} notificações • {formatNotificationTime(group.latestTimestamp)}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Separator />
            <div className="p-2 space-y-1 bg-muted/30">
              {group.notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className="p-2 rounded-lg bg-background hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm truncate">{notification.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                </div>
              ))}
              {group.notifications.length > 5 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  +{group.notifications.length - 5} mais
                </p>
              )}
            </div>
            <div className="flex gap-2 p-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => onMarkGroupAsRead(group.id)}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Marcar todas como lidas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive"
                onClick={() => onDeleteGroup(group.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Do Not Disturb Settings
interface DNDSettingsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  schedule?: { start: string; end: string };
  onScheduleChange?: (schedule: { start: string; end: string }) => void;
}

function DNDSettings({ enabled, onToggle }: DNDSettingsProps) {
  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            enabled ? 'bg-destructive/10' : 'bg-muted'
          )}>
            {enabled ? (
              <BellOff className="w-5 h-5 text-destructive" />
            ) : (
              <Bell className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium">Não Perturbe</h4>
            <p className="text-xs text-muted-foreground">
              {enabled ? 'Notificações silenciadas' : 'Receber notificações'}
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

// Main Notification Center Component
interface NotificationCenterEnhancedProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
  onAction?: (notification: Notification) => void;
}

export function NotificationCenterEnhanced({
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onAction,
}: NotificationCenterEnhancedProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'all' | 'unread'>('all');
  const [dndEnabled, setDndEnabled] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = React.useState<NotificationType | 'all'>('all');

  // Demo data
  const demoNotifications: Notification[] = React.useMemo(() => [
    {
      id: '1',
      type: 'message',
      priority: 'high',
      title: 'Nova mensagem de João Silva',
      message: 'Olá, preciso de ajuda com meu pedido...',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      isRead: false,
      actionUrl: '/inbox',
      actionLabel: 'Responder',
    },
    {
      id: '2',
      type: 'sla',
      priority: 'urgent',
      title: 'SLA próximo de vencer',
      message: 'Conversa com Maria Santos está há 25 minutos sem resposta',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      isRead: false,
    },
    {
      id: '3',
      type: 'goal',
      priority: 'medium',
      title: 'Meta atingida! 🎉',
      message: 'Você completou 10 atendimentos hoje',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      isRead: true,
    },
    {
      id: '4',
      type: 'sentiment',
      priority: 'high',
      title: 'Alerta de sentimento negativo',
      message: 'Cliente Pedro Oliveira demonstrou insatisfação',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      isRead: false,
      actionUrl: '/inbox',
    },
    {
      id: '5',
      type: 'success',
      priority: 'low',
      title: 'Integração sincronizada',
      message: 'WhatsApp Business conectado com sucesso',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isRead: true,
    },
  ], []);

  const allNotifications = notifications.length > 0 ? notifications : demoNotifications;
  
  const unreadCount = allNotifications.filter(n => !n.isRead).length;
  const urgentCount = allNotifications.filter(n => n.priority === 'urgent' && !n.isRead).length;

  const filteredNotifications = React.useMemo(() => {
    let filtered = allNotifications;
    
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === typeFilter);
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [allNotifications, activeTab, typeFilter]);

  const handleMarkAsRead = (id: string) => {
    onMarkAsRead?.(id);
  };

  const handleDelete = (id: string) => {
    onDelete?.(id);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {dndEnabled ? (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          
          {/* Badge */}
          {unreadCount > 0 && !dndEnabled && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full',
                'text-[10px] font-bold flex items-center justify-center',
                urgentCount > 0 
                  ? 'bg-destructive text-destructive-foreground animate-pulse' 
                  : 'bg-primary text-primary-foreground'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SheetTitle className="text-lg">Notificações</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {soundEnabled ? 'Desativar som' : 'Ativar som'}
                </TooltipContent>
              </Tooltip>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onMarkAllAsRead}>
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Marcar todas como lidas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onClearAll} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar todas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SheetHeader>

        {/* DND Settings */}
        <div className="px-4 py-3 border-b border-border">
          <DNDSettings enabled={dndEnabled} onToggle={setDndEnabled} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                activeTab === 'all' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                activeTab === 'unread' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Não lidas
            </button>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 ml-auto">
                <Filter className="w-3 h-3 mr-1" />
                {typeFilter === 'all' ? 'Tipo' : typeConfig[typeFilter].label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                Todos os tipos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {Object.entries(typeConfig).map(([type, config]) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => setTypeFilter(type as NotificationType)}
                >
                  <config.icon className={cn('w-4 h-4 mr-2', config.color)} />
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Notifications List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  {activeTab === 'unread' ? 'Tudo em dia!' : 'Nenhuma notificação'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                  {activeTab === 'unread' 
                    ? 'Você leu todas as suas notificações.'
                    : 'Quando você receber notificações, elas aparecerão aqui.'
                  }
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                    onAction={onAction}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
