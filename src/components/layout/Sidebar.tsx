import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  Phone,
  Tag,
  Zap,
  LogOut,
  Wallet,
  UsersRound,
  Package,
  Mic,
  FileBarChart,
  Globe,
  Link2,
  BookOpen,
  Megaphone,
  Bot,
  Kanban,
  Brain,
  CreditCard,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/useTheme';

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

// Primary nav — DreamsChat order: Chat, Contacts, Groups, Status, Calls, Profile, Settings
const primaryNav: Array<{ id: string; icon: React.ComponentType<{ className?: string }>; label: string; badge?: number }> = [
  { id: 'inbox', icon: MessageSquare, label: 'Chat', badge: 12 },
  { id: 'contacts', icon: Users, label: 'Contatos' },
  { id: 'groups', icon: UsersRound, label: 'Grupos' },
  { id: 'dashboard', icon: Globe, label: 'Status' },
  { id: 'agents', icon: Phone, label: 'Chamadas' },
  { id: 'profile', icon: User, label: 'Perfil' },
  { id: 'settings', icon: Settings, label: 'Configurações' },
];

// Secondary nav — extra features
const secondaryNav: Array<{ id: string; icon: React.ComponentType<{ className?: string }>; label: string }> = [
  { id: 'queues', icon: Zap, label: 'Filas' },
  { id: 'connections', icon: Link2, label: 'Conexões' },
  { id: 'campaigns', icon: Megaphone, label: 'Campanhas' },
  { id: 'chatbot', icon: Bot, label: 'Chatbot' },
  { id: 'pipeline', icon: Kanban, label: 'Pipeline' },
  { id: 'wallet', icon: Wallet, label: 'Carteira' },
  { id: 'catalog', icon: Package, label: 'Catálogo' },
  { id: 'payments', icon: CreditCard, label: 'Pagamentos' },
  { id: 'tags', icon: Tag, label: 'Etiquetas' },
  { id: 'knowledge', icon: Brain, label: 'Conhecimento' },
  { id: 'automations', icon: Zap, label: 'Automações' },
  { id: 'reports', icon: FileBarChart, label: 'Relatórios' },
];

function NavIcon({ item, currentView, onViewChange }: { item: typeof primaryNav[0]; currentView: string; onViewChange: (v: string) => void }) {
  const Icon = item.icon;
  const isActive = currentView === item.id;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          data-tour={item.id}
          onClick={() => onViewChange(item.id)}
          aria-label={item.badge ? `${item.label} - ${item.badge} notificações` : item.label}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'relative w-[42px] h-[42px] rounded-lg flex items-center justify-center transition-all duration-200',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="w-[20px] h-[20px]" />
          
          {/* Unread badge */}
          {item.badge && item.badge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground">
              {item.badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-popover border-border">
        <span className="font-medium">{item.label}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ currentView, onViewChange, currentAgent, onLogout }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <aside
      id="main-navigation"
      role="navigation"
      aria-label="Menu de navegação principal"
      className="flex flex-col h-screen w-[60px] border-r border-border bg-sidebar shrink-0"
    >
      {/* Logo — DreamsChat style */}
      <div className="flex items-center justify-center py-4">
        <button
          onClick={() => onViewChange('inbox')}
          className="w-[42px] h-[42px] rounded-xl flex items-center justify-center bg-primary hover:bg-primary/90 transition-colors"
          aria-label="ZAPP - Ir para Inbox"
        >
          <MessageSquare className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>

      {/* Primary Navigation — DreamsChat core icons */}
      <nav className="flex flex-col items-center gap-1 py-2" aria-label="Menu principal">
        {primaryNav.map((item) => (
          <NavIcon key={item.id} item={item} currentView={currentView} onViewChange={onViewChange} />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-border my-1" />

      {/* Secondary Navigation — scrollable */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2" aria-label="Menu secundário">
        <div className="flex flex-col items-center gap-1">
          {secondaryNav.map((item) => (
            <NavIcon key={item.id} item={item} currentView={currentView} onViewChange={onViewChange} />
          ))}
        </div>
      </nav>

      {/* Bottom section: Dark mode toggle + Avatar + Logout */}
      <div className="flex flex-col items-center gap-2 py-3 border-t border-border">
        {/* Dark mode toggle — DreamsChat style */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={cn(
                "w-[42px] h-[42px] rounded-lg flex items-center justify-center transition-all duration-200",
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                isDark && "bg-primary/10 text-primary"
              )}
              aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun className="w-[20px] h-[20px]" /> : <Moon className="w-[20px] h-[20px]" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isDark ? 'Modo claro' : 'Modo escuro'}
          </TooltipContent>
        </Tooltip>

        {/* User Avatar */}
        {currentAgent && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="relative cursor-pointer">
                <Avatar className="w-[36px] h-[36px]">
                  <AvatarImage src={currentAgent.avatar} alt={currentAgent.name} />
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {currentAgent.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sidebar',
                    currentAgent.status === 'online' && 'bg-[hsl(var(--online))]',
                    currentAgent.status === 'away' && 'bg-[hsl(var(--away))]',
                    currentAgent.status === 'offline' && 'bg-[hsl(var(--offline))]'
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">{currentAgent.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {currentAgent.status === 'online' ? 'Online' : currentAgent.status === 'away' ? 'Ausente' : 'Offline'}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Logout */}
        {onLogout && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onLogout}
                className="w-[36px] h-[36px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sair</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
