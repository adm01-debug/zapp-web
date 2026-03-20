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
  Brain,
  Megaphone,
  Bot,
  Kanban,
  CreditCard,
  Moon,
  Sun,
  User,
  Shield,
  BookOpen,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  Calendar,
  CalendarClock,
  Palette,
  Trophy,
  Plug,
  ShieldCheck,
  Workflow,
  Activity,
  Gauge,
  UserCog,
  ClipboardList,
  AlertTriangle,
  FileText,
  TrendingDown,
  Cpu,
  Inbox,
  Tags,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/useTheme';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';
import { ScreenProtectionToggle } from '@/components/notifications/ScreenProtectionToggle';
import { SoundMuteToggle } from '@/components/notifications/SoundMuteToggle';

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

const primaryNav = [
  { id: 'inbox', icon: MessageSquare, label: 'Chat' },
  { id: 'contacts', icon: Users, label: 'Contatos' },
  { id: 'groups', icon: UsersRound, label: 'Grupos' },
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { id: 'agents', icon: Phone, label: 'Equipe' },
] as const;

const toolsNav = [
  { id: 'queues', icon: Zap, label: 'Filas' },
  { id: 'connections', icon: Link2, label: 'Conexões' },
  { id: 'campaigns', icon: Megaphone, label: 'Campanhas' },
  { id: 'chatbot', icon: Bot, label: 'Chatbot' },
  { id: 'pipeline', icon: Kanban, label: 'Pipeline' },
  { id: 'wallet', icon: Wallet, label: 'Carteira' },
  { id: 'catalog', icon: Package, label: 'Catálogo' },
  { id: 'payments', icon: CreditCard, label: 'Pagamentos' },
  { id: 'tags', icon: Tag, label: 'Etiquetas' },
  { id: 'knowledge', icon: Brain, label: 'Base de Conhecimento' },
  { id: 'automations', icon: Zap, label: 'Automações' },
  { id: 'wa-flows', icon: Workflow, label: 'WhatsApp Flows' },
  { id: 'integrations', icon: Plug, label: 'Integrações' },
  { id: 'meta-capi', icon: Activity, label: 'Meta CAPI' },
  { id: 'voip', icon: PhoneCall, label: 'VoIP' },
  { id: 'google-calendar', icon: Calendar, label: 'Calendário' },
  { id: 'schedule', icon: CalendarClock, label: 'Agendamentos' },
  { id: 'wa-templates', icon: FileText, label: 'Templates WA' },
  { id: 'omnichannel', icon: Globe, label: 'Omnichannel' },
  { id: 'omni-inbox', icon: Inbox, label: 'Inbox Omni' },
] as const;

const systemNav = [
  { id: 'reports', icon: FileBarChart, label: 'Relatórios' },
  { id: 'auto-export', icon: ClipboardList, label: 'Export Auto' },
  { id: 'warroom', icon: AlertTriangle, label: 'War Room' },
  { id: 'sentiment', icon: Gauge, label: 'Sentimento' },
  { id: 'transcriptions', icon: Mic, label: 'Transcrições' },
  { id: 'achievements', icon: Trophy, label: 'Conquistas' },
  { id: 'diagnostics', icon: Globe, label: 'Diagnóstico' },
  { id: 'churn', icon: TrendingDown, label: 'Previsão Churn' },
  { id: 'ticket-classifier', icon: Tags, label: 'Classificador IA' },
  { id: 'performance', icon: Cpu, label: 'Performance' },
  { id: 'audit-logs', icon: FileBarChart, label: 'Auditoria' },
  { id: 'privacy', icon: ShieldCheck, label: 'LGPD' },
  { id: 'security', icon: Shield, label: 'Segurança' },
  { id: 'admin', icon: UserCog, label: 'Admin' },
  { id: 'themes', icon: Palette, label: 'Temas' },
  { id: 'docs', icon: BookOpen, label: 'Documentação' },
  { id: 'settings', icon: Settings, label: 'Configurações' },
] as const;

function NavIcon({ item, currentView, onViewChange }: { 
  item: { id: string; icon: React.ComponentType<{ className?: string }>; label: string };
  currentView: string; 
  onViewChange: (v: string) => void;
}) {
  const Icon = item.icon;
  const isActive = currentView === item.id;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          data-tour={item.id}
          onClick={() => onViewChange(item.id)}
          aria-label={item.label}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'relative w-[40px] h-[40px] rounded-[10px] flex items-center justify-center transition-all duration-200',
            isActive
              ? 'bg-primary text-primary-foreground shadow-[var(--shadow-glow-primary)]'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="w-[18px] h-[18px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="bg-popover border-border text-xs font-medium">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ currentView, onViewChange, currentAgent, onLogout }: SidebarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <aside
      id="main-navigation"
      role="navigation"
      aria-label="Menu de navegação principal"
      className="flex flex-col h-screen w-[62px] border-r border-border bg-sidebar shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-[56px] shrink-0">
        <button
          onClick={() => onViewChange('inbox')}
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center bg-primary hover:bg-primary/90 transition-colors"
          aria-label="ZAPP — Ir para Inbox"
        >
          <span className="text-primary-foreground font-bold text-sm tracking-tight">Z</span>
        </button>
      </div>

      {/* Primary Nav */}
      <nav className="flex flex-col items-center gap-1 px-[11px]" aria-label="Menu principal">
        {primaryNav.map((item) => (
          <NavIcon key={item.id} item={item} currentView={currentView} onViewChange={onViewChange} />
        ))}
      </nav>

      {/* Separator */}
      <div className="mx-3 my-1 h-px bg-border/60" />

      {/* Scrollable navigation area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-[11px]">
        <nav className="flex flex-col items-center gap-1" aria-label="Ferramentas">
          {toolsNav.map((item) => (
            <NavIcon key={item.id} item={item} currentView={currentView} onViewChange={onViewChange} />
          ))}
        </nav>

        <div className="mx-1 my-1 h-px bg-border/60" />

        <nav className="flex flex-col items-center gap-1 pb-2" aria-label="Sistema">
          {systemNav.map((item) => (
            <NavIcon key={item.id} item={item} currentView={currentView} onViewChange={onViewChange} />
          ))}
        </nav>
      </div>

      {/* Bottom: Theme toggle + Avatar + Logout */}
      <div className="flex flex-col items-center gap-1 pt-1.5 pb-3 shrink-0">
        <div className="mx-3 mb-1 h-px bg-border/60 self-stretch" />

        <div className="flex flex-col items-center gap-1 rounded-xl border border-border/70 bg-muted/35 px-1 py-1.5 shadow-sm">
          {/* Screen protection toggle */}
          <ScreenProtectionToggle className="w-[36px] h-[36px]" />

          {/* Push notification toggle */}
          <PushNotificationToggle className="w-[36px] h-[36px]" />

          {/* Sound mute toggle */}
          <SoundMuteToggle className="w-[36px] h-[36px]" />

          {/* Dark mode toggle */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={cn(
                  "w-[36px] h-[36px] rounded-lg flex items-center justify-center transition-all duration-200",
                  "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isDark && "text-primary"
                )}
                aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
              >
                {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* User Avatar */}
        {currentAgent && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onViewChange('settings')}
                className="relative group"
              >
                <Avatar className="w-[34px] h-[34px] ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                  <AvatarImage src={currentAgent.avatar} alt={currentAgent.name} />
                  <AvatarFallback className="bg-primary/15 text-primary text-[11px] font-semibold">
                    {currentAgent.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar',
                    currentAgent.status === 'online' && 'bg-[hsl(var(--online))]',
                    currentAgent.status === 'away' && 'bg-[hsl(var(--away))]',
                    currentAgent.status === 'offline' && 'bg-[hsl(var(--offline))]'
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p className="font-medium text-xs">{currentAgent.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">
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
                className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">Sair</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
