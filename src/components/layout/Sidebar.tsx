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
  ShieldCheck,
  UsersRound,
  Sparkles,
  Package,
  AlertTriangle,
  Mic,
  FileBarChart,
  Globe,
  Contrast,
  ChevronDown,
  Search,
  Command,
  Link2,
  BookOpen,
  Megaphone,
  Bot,
  Kanban,
  Brain,
  CreditCard,
  Activity,
  Workflow,
} from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { AccessibilitySettings, HighContrastToggle } from '@/components/theme/HighContrastToggle';

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

// Menu consolidado em 4 grupos - Smart defaults: mais usados no topo
const menuGroups: Array<{
  title: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  items: Array<{ id: string; icon: React.ComponentType<{ className?: string }>; label: string; badge?: number }>;
}> = [
  {
    title: 'Principal',
    items: [
      { id: 'inbox', icon: MessageSquare, label: 'Inbox', badge: 12 },
      { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
      { id: 'contacts', icon: Users, label: 'Contatos' },
    ],
  },
  {
    title: 'Operações',
    items: [
      { id: 'agents', icon: Phone, label: 'Atendentes' },
      { id: 'queues', icon: Zap, label: 'Filas' },
      { id: 'connections', icon: Link2, label: 'Conexões' },
      { id: 'groups', icon: UsersRound, label: 'Grupos' },
      { id: 'campaigns', icon: Megaphone, label: 'Campanhas' },
      { id: 'chatbot', icon: Bot, label: 'Chatbot' },
    ],
  },
  {
    title: 'Recursos',
    items: [
      { id: 'pipeline', icon: Kanban, label: 'Pipeline' },
      { id: 'wallet', icon: Wallet, label: 'Carteira' },
      { id: 'catalog', icon: Package, label: 'Catálogo' },
      { id: 'payments', icon: CreditCard, label: 'Pagamentos' },
      { id: 'tags', icon: Tag, label: 'Etiquetas' },
      { id: 'transcriptions', icon: Mic, label: 'Transcrições' },
      { id: 'automations', icon: Zap, label: 'Automações' },
      { id: 'integrations', icon: Globe, label: 'Integrações' },
      { id: 'knowledge', icon: Brain, label: 'Base de Conhecimento' },
      { id: 'wa-flows', icon: Workflow, label: 'WhatsApp Flows' },
    ],
  },
  {
    title: 'Sistema',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { id: 'reports', icon: FileBarChart, label: 'Relatórios' },
      { id: 'sentiment', icon: AlertTriangle, label: 'Alertas' },
      { id: 'meta-capi', icon: Activity, label: 'Meta CAPI' },
      { id: 'security', icon: Shield, label: 'Segurança' },
      { id: 'privacy', icon: ShieldCheck, label: 'Privacidade' },
      { id: 'admin', icon: ShieldCheck, label: 'Admin' },
      { id: 'docs', icon: BookOpen, label: 'Documentação' },
      { id: 'settings', icon: Settings, label: 'Configurações' },
    ],
  },
];

export function Sidebar({ currentView, onViewChange, currentAgent, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [systemGroupOpen, setSystemGroupOpen] = useState(false);

  return (
    <motion.aside
      id="main-navigation"
      role="navigation"
      aria-label="Menu de navegação principal"
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-screen border-r border-border relative bg-sidebar"
    >
      {/* Subtle top gradient */}
      <div className="absolute inset-x-0 top-0 h-28 bg-primary pointer-events-none" aria-hidden="true" />
      
      {/* Logo */}
      <div className="relative flex items-center justify-between p-4 border-b border-border z-10">
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
                className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center relative overflow-hidden"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400 }}
                aria-hidden="true"
              >
                <Sparkles className="w-5 h-5 text-primary-foreground relative z-10" />
              </motion.div>
              <div>
                <span className="font-display font-bold text-lg text-primary-foreground">MultiChat</span>
                <p className="text-xs text-primary-foreground/70">Omnichannel</p>
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
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            )}
          </Button>
        </motion.div>
      </div>

      {/* Search / Command Palette Button */}
      <div className="relative px-3 py-2">
        <motion.button
          onClick={() => document.dispatchEvent(new Event('open-command-palette'))}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "bg-muted/30 hover:bg-muted/50 border border-border hover:border-primary/30",
            "text-muted-foreground hover:text-foreground group"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Abrir busca universal (Ctrl+K ou ⌘K)"
        >
          <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-sm">Buscar...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-background/80 rounded text-[10px] font-mono text-muted-foreground border border-border/50">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </>
          )}
        </motion.button>
      </div>

      {/* Navigation */}
      <nav 
        className="relative flex-1 p-3 space-y-4 overflow-y-auto scrollbar-thin z-10"
        aria-label="Menu principal"
      >
        {menuGroups.map((group, groupIndex) => {
          const isCollapsibleGroup = group.collapsible === true;
          const isSystemGroup = group.title === 'Sistema';
          
          // Check if any item in this group is active
          const hasActiveItem = group.items.some(item => currentView === item.id);
          
          // Auto-open if active item is in collapsible group
          const shouldBeOpen = isSystemGroup ? (systemGroupOpen || hasActiveItem) : true;
          
          const groupContent = (
            <>
              {/* Group Items */}
              {group.items.map((item, itemIndex) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const globalIndex = menuGroups
                  .slice(0, groupIndex)
                  .reduce((acc, g) => acc + g.items.length, 0) + itemIndex;

                const button = (
                  <motion.button
                    key={item.id}
                    data-tour={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: globalIndex * 0.03 }}
                    whileHover={{ x: 4, transition: { duration: 0.15 } }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onViewChange(item.id)}
                    aria-label={item.badge ? `${item.label} - ${item.badge} notificações` : item.label}
                    aria-current={isActive ? 'page' : undefined}
                    role="menuitem"
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group',
                      isActive 
                        ? 'text-primary bg-primary/10' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {/* Active indicator bar with neon effect */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full nav-indicator-neon"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    
                    <motion.div
                      whileHover={{ rotate: isActive ? 0 : 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Icon className={cn(
                        "w-5 h-5 flex-shrink-0 transition-all duration-300",
                        isActive ? "text-secondary drop-shadow-[0_0_8px_hsl(var(--secondary)/0.6)]" : "group-hover:text-secondary"
                      )} />
                    </motion.div>
                    
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
                            "flex-1 text-left text-sm font-medium whitespace-nowrap transition-all duration-300",
                            isActive ? "text-secondary" : "text-foreground group-hover:text-secondary"
                          )}>
                            {item.label}
                          </span>
                          {/* Keyboard hints for main items */}
                          {item.id === 'inbox' && !item.badge && (
                            <kbd className="hidden lg:inline text-[9px] font-mono text-muted-foreground bg-muted/50 px-1 rounded border border-border/30">G I</kbd>
                          )}
                          {item.id === 'dashboard' && (
                            <kbd className="hidden lg:inline text-[9px] font-mono text-muted-foreground bg-muted/50 px-1 rounded border border-border/30">G D</kbd>
                          )}
                          {item.id === 'contacts' && (
                            <kbd className="hidden lg:inline text-[9px] font-mono text-muted-foreground bg-muted/50 px-1 rounded border border-border/30">G C</kbd>
                          )}
                          {item.id === 'settings' && (
                            <kbd className="hidden lg:inline text-[9px] font-mono text-muted-foreground bg-muted/50 px-1 rounded border border-border/30">G S</kbd>
                          )}
                          {item.badge && (
                            <motion.span 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-bold badge-neon text-white"
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
            </>
          );

          // Render collapsible group (Sistema)
          if (isCollapsibleGroup && !isCollapsed) {
            return (
              <Collapsible 
                key={group.title} 
                open={shouldBeOpen} 
                onOpenChange={setSystemGroupOpen}
                className="space-y-1"
              >
                <CollapsibleTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: groupIndex * 0.05 }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 group-hover:text-muted-foreground">
                      {group.title}
                    </span>
                    <motion.div
                      animate={{ rotate: shouldBeOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
                    </motion.div>
                  </motion.button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {groupContent}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          // Render normal group
          return (
            <div key={group.title} className="space-y-1" role="group" aria-labelledby={`group-${group.title.toLowerCase()}`}>
              {/* Group Label */}
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.div
                    id={`group-${group.title.toLowerCase()}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, delay: groupIndex * 0.05 }}
                    className="px-3 py-1.5"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {group.title}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              {groupContent}
            </div>
          );
        })}
        {/* Theme Toggle, Accessibility & Notifications */}
        <div className="mt-2 pt-2 border-t border-border/20 space-y-1">
          <div 
            data-tour="notifications"
            className={cn(
              "flex items-center",
              isCollapsed ? "justify-center" : "px-3 py-2"
            )}
          >
            <NotificationCenter />
            {!isCollapsed && (
              <span className="ml-3 text-sm text-muted-foreground">Notificações</span>
            )}
          </div>
          <div data-tour="theme">
            <ThemeToggle collapsed={isCollapsed} />
          </div>
          
          {/* Language Selector */}
          <div 
            className={cn(
              "flex items-center",
              isCollapsed ? "justify-center" : "px-3 py-2"
            )}
          >
            {isCollapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-secondary">
                    <Globe className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Idioma</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div className="ml-3 flex-1">
                  <LanguageSelector />
                </div>
              </>
            )}
          </div>

          {/* Accessibility Settings */}
          <div 
            className={cn(
              "flex items-center",
              isCollapsed ? "justify-center" : "px-3 py-2"
            )}
          >
            {isCollapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <HighContrastToggle />
                </TooltipTrigger>
                <TooltipContent side="right">Acessibilidade</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Contrast className="h-5 w-5 text-muted-foreground" />
                <span className="ml-3 text-sm text-muted-foreground flex-1">Acessibilidade</span>
                <AccessibilitySettings />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* User Profile */}
      {currentAgent && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative p-3 border-t border-secondary/20"
          role="region"
          aria-label="Perfil do usuário"
        >
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-300',
              'profile-card-neon bg-secondary/5 hover:bg-secondary/10',
              isCollapsed && 'justify-center'
            )}
            role="status"
            aria-live="polite"
            aria-label={`${currentAgent.name} - ${currentAgent.status === 'online' ? 'Online' : currentAgent.status === 'away' ? 'Ausente' : 'Offline'}`}
          >
            <div className="relative">
              <Avatar className={cn(
                "w-10 h-10 ring-2 transition-all duration-300",
                currentAgent.status === 'online' ? "ring-secondary/50 avatar-neon-online" : "ring-border/30"
              )}>
                <AvatarImage src={currentAgent.avatar} alt={`Avatar de ${currentAgent.name}`} />
                <AvatarFallback className="bg-secondary/15 text-secondary font-display font-semibold">
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
                  currentAgent.status === 'online' && 'bg-success shadow-[0_0_8px_hsl(var(--success)/0.6)]',
                  currentAgent.status === 'away' && 'bg-warning',
                  currentAgent.status === 'offline' && 'bg-muted-foreground'
                )}
                aria-hidden="true"
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
                    aria-label="Sair da conta"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
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
