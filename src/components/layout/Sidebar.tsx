import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  Phone,
  Tag,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Shield,
  UsersRound,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  currentAgent?: {
    name: string;
    avatar?: string;
    status: 'online' | 'away' | 'offline';
  };
  onLogout?: () => void;
}

const menuItems = [
  { id: 'inbox', icon: MessageSquare, label: 'Inbox', badge: 12 },
  { id: 'contacts', icon: Users, label: 'Contatos' },
  { id: 'groups', icon: UsersRound, label: 'Grupos' },
  { id: 'agents', icon: Phone, label: 'Atendentes' },
  { id: 'queues', icon: Tag, label: 'Filas' },
  { id: 'connections', icon: Zap, label: 'Conexões' },
  { id: 'wallet', icon: Wallet, label: 'Carteira' },
  { id: 'tags', icon: Tag, label: 'Etiquetas' },
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { id: 'admin', icon: Shield, label: 'Admin' },
  { id: 'settings', icon: Settings, label: 'Configurações' },
];

export function Sidebar({ currentView, onViewChange, currentAgent, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-screen glass-strong border-r border-border/50 relative"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--sidebar-background)), hsl(var(--background)))',
      }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Logo */}
      <div className="relative flex items-center justify-between p-4 border-b border-border/30">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <motion.div 
                className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
                style={{ background: 'var(--gradient-primary)' }}
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Sparkles className="w-5 h-5 text-primary-foreground relative z-10" />
                <motion.div
                  className="absolute inset-0 bg-primary-glow/30"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <div>
                <span className="font-display font-bold text-lg text-foreground">MultiChat</span>
                <p className="text-xs text-muted-foreground">Omnichannel</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div 
          whileHover={{ scale: 1.1 }} 
          whileTap={{ scale: 0.9 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          const button = (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              whileHover={{ x: 4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group',
                'text-muted-foreground hover:text-foreground',
                isActive 
                  ? 'text-primary-foreground' 
                  : 'hover:bg-accent/50'
              )}
            >
              {/* Active background with gradient */}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'var(--gradient-primary)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              {/* Hover glow effect */}
              {!isActive && (
                <motion.div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ 
                    background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), transparent)',
                  }}
                />
              )}
              
              <Icon className={cn(
                "w-5 h-5 flex-shrink-0 relative z-10 transition-colors duration-200",
                isActive && "text-primary-foreground"
              )} />
              
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center flex-1 overflow-hidden relative z-10"
                  >
                    <span className={cn(
                      "flex-1 text-left text-sm font-medium whitespace-nowrap",
                      isActive && "text-primary-foreground"
                    )}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          "min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-bold",
                          isActive 
                            ? "bg-primary-foreground/20 text-primary-foreground" 
                            : "bg-primary text-primary-foreground animate-pulse-soft"
                        )}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.id} delayDuration={0}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="glass border-border/50 bg-popover/95 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.label}</p>
                    {item.badge && (
                      <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </nav>

      {/* User Profile */}
      {currentAgent && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative p-3 border-t border-border/30"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200',
              'bg-accent/30 hover:bg-accent/50 border border-transparent hover:border-border/50',
              isCollapsed && 'justify-center'
            )}
          >
            <div className="relative">
              <Avatar className="w-10 h-10 ring-2 ring-border/50">
                <AvatarImage src={currentAgent.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-display font-semibold">
                  {currentAgent.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <motion.span
                animate={{ 
                  scale: currentAgent.status === 'online' ? [1, 1.2, 1] : 1,
                  boxShadow: currentAgent.status === 'online' 
                    ? ['0 0 0 0 hsl(var(--success) / 0.4)', '0 0 0 4px hsl(var(--success) / 0)', '0 0 0 0 hsl(var(--success) / 0.4)']
                    : 'none'
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background',
                  currentAgent.status === 'online' && 'bg-success',
                  currentAgent.status === 'away' && 'bg-warning',
                  currentAgent.status === 'offline' && 'bg-muted-foreground'
                )}
              />
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-sm font-semibold text-foreground truncate">
                    {currentAgent.name}
                  </p>
                  <p className={cn(
                    "text-xs font-medium capitalize",
                    currentAgent.status === 'online' && 'text-success',
                    currentAgent.status === 'away' && 'text-warning',
                    currentAgent.status === 'offline' && 'text-muted-foreground'
                  )}>
                    {currentAgent.status === 'online' ? 'Online' : currentAgent.status === 'away' ? 'Ausente' : 'Offline'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
                    onClick={onLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </motion.aside>
  );
}
