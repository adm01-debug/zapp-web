import { useState, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  Filter,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingDown,
  Target,
  MailOpen,
  Mail
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const typeConfig: Record<Notification['type'], { icon: typeof Bell; color: string; label: string }> = {
  info: { icon: Info, color: 'text-blue-500', label: 'Informação' },
  success: { icon: CheckCircle, color: 'text-green-500', label: 'Sucesso' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', label: 'Aviso' },
  error: { icon: AlertCircle, color: 'text-red-500', label: 'Erro' },
  sla: { icon: Clock, color: 'text-orange-500', label: 'SLA' },
  sentiment: { icon: TrendingDown, color: 'text-purple-500', label: 'Sentimento' },
  goal: { icon: Target, color: 'text-emerald-500', label: 'Meta' },
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const config = typeConfig[notification.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'p-4 border-b border-border/50 hover:bg-muted/50 transition-colors relative group',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className="flex gap-3">
        <div className={cn('mt-0.5', config.color)}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn(
                'text-sm font-medium truncate',
                !notification.is_read && 'font-semibold'
              )}>
                {notification.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>
            
            {!notification.is_read && (
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
        </div>
      </div>
      
      {/* Action buttons on hover */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {!notification.is_read && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onMarkAsRead(notification.id)}
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(notification.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export const NotificationCenter = forwardRef<HTMLDivElement>((_, ref) => {
  const { 
    notifications, 
    loading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAll 
  } = useNotifications();
  
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [typeFilters, setTypeFilters] = useState<Notification['type'][]>([]);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    // Filter by read status
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    }
    
    // Filter by type
    if (typeFilters.length > 0) {
      filtered = filtered.filter(n => typeFilters.includes(n.type));
    }
    
    return filtered;
  }, [notifications, activeTab, typeFilters]);

  const toggleTypeFilter = (type: Notification['type']) => {
    setTypeFilters(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} não lidas</Badge>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>
        
        {/* Actions bar */}
        <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/30">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')} className="w-auto">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-6">
                <Mail className="w-3 h-3 mr-1" />
                Todas
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs px-3 h-6">
                <MailOpen className="w-3 h-3 mr-1" />
                Não lidas
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  Filtros
                  {typeFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {typeFilters.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Tipo de Notificação</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(typeConfig).map(([type, config]) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={typeFilters.includes(type as Notification['type'])}
                    onCheckedChange={() => toggleTypeFilter(type as Notification['type'])}
                  >
                    <config.icon className={cn('w-4 h-4 mr-2', config.color)} />
                    {config.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <CheckCheck className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Marcar todas como lidas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={clearAll}
                  disabled={notifications.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar todas
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Notifications list */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">
                {activeTab === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'unread' 
                  ? 'Você está em dia com todas as notificações!'
                  : 'Quando você receber notificações, elas aparecerão aqui.'
                }
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </AnimatePresence>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});

NotificationCenter.displayName = 'NotificationCenter';
