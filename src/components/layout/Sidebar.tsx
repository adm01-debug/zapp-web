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
import { ThemeToggle } from '@/components/theme/ThemeToggle';

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
      className="flex flex-col h-screen border-r border-border/30 relative bg-sidebar"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent pointer-events-none" />
      
      {/* Logo */}
      <div className="relative flex items-center justify-between p-4 border-b border-border/20">
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
                className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center relative overflow-hidden"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Sparkles className="w-5 h-5 text-primary relative z-10" />
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
            className="text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg"
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
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group',
                isActive 
                  ? 'text-primary bg-primary/15' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              <Icon className={cn(
                "w-5 h-5 flex-shrink-0 transition-colors duration-200",
                isActive ? "text-primary" : "group-hover:text-foreground"
              )} />
              
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center flex-1 overflow-hidden"
                  >
                    <span className={cn(
                      "flex-1 text-left text-sm font-medium whitespace-nowrap",
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-bold bg-primary text-primary-foreground"
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
                  className="border-border/30 bg-card"
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
        {/* Theme Toggle */}
        <div className="mt-2 pt-2 border-t border-border/20">
          <ThemeToggle collapsed={isCollapsed} />
        </div>
      </nav>

      {/* User Profile */}
      {currentAgent && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative p-3 border-t border-border/20"
        >
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200',
              'bg-muted/20 hover:bg-muted/40 border border-border/20',
              isCollapsed && 'justify-center'
            )}
          >
            <div className="relative">
              <Avatar className="w-10 h-10 ring-2 ring-border/30">
                <AvatarImage src={currentAgent.avatar} />
                <AvatarFallback className="bg-primary/15 text-primary font-display font-semibold">
                  {currentAgent.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <motion.span
                animate={{ 
                  scale: currentAgent.status === 'online' ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-sidebar',
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
