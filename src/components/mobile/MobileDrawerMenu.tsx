import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, Search, Moon, Sun, LogOut, ChevronRight } from 'lucide-react';
import {
  MessageSquare, Users, UsersRound, BarChart3, Phone,
  Zap, Link2, Megaphone, Bot, Kanban, Wallet, Package,
  CreditCard, Tag, Brain, Workflow, Plug, Activity,
  PhoneCall, Calendar, CalendarClock, FileText, Globe,
  FileBarChart, ClipboardList, AlertTriangle, Gauge,
  Mic, Trophy, ShieldCheck, Shield, UserCog, Palette,
  BookOpen, Settings,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/useTheme';
import { IconButton } from '@/components/ui/icon-button';

interface MobileDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
  agentName?: string;
  agentAvatar?: string;
  agentStatus?: 'online' | 'away' | 'offline';
  onLogout?: () => void;
}

interface NavSection {
  title: string;
  items: { id: string; icon: React.ComponentType<{ className?: string }>; label: string }[];
}

const sections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'inbox', icon: MessageSquare, label: 'Conversas' },
      { id: 'contacts', icon: Users, label: 'Contatos' },
      { id: 'groups', icon: UsersRound, label: 'Grupos' },
      { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
      { id: 'agents', icon: Phone, label: 'Equipe' },
    ],
  },
  {
    title: 'Ferramentas',
    items: [
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
      { id: 'omnichannel', icon: Globe, label: 'Omnichannel' },
      { id: 'voip', icon: PhoneCall, label: 'VoIP' },
      { id: 'schedule', icon: CalendarClock, label: 'Agendamentos' },
      { id: 'wa-templates', icon: FileText, label: 'Templates WA' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { id: 'reports', icon: FileBarChart, label: 'Relatórios' },
      { id: 'warroom', icon: AlertTriangle, label: 'War Room' },
      { id: 'sentiment', icon: Gauge, label: 'Sentimento' },
      { id: 'transcriptions', icon: Mic, label: 'Transcrições' },
      { id: 'achievements', icon: Trophy, label: 'Conquistas' },
      { id: 'diagnostics', icon: Globe, label: 'Diagnóstico' },
      { id: 'privacy', icon: ShieldCheck, label: 'LGPD' },
      { id: 'security', icon: Shield, label: 'Segurança' },
      { id: 'admin', icon: UserCog, label: 'Admin' },
      { id: 'themes', icon: Palette, label: 'Temas' },
      { id: 'settings', icon: Settings, label: 'Configurações' },
    ],
  },
];

export function MobileDrawerMenu({
  isOpen,
  onClose,
  currentView,
  onViewChange,
  agentName,
  agentAvatar,
  agentStatus = 'online',
  onLogout,
}: MobileDrawerMenuProps) {
  const [search, setSearch] = useState('');
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const initials = agentName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) || 'U';

  const filteredSections = search.trim()
    ? sections.map((s) => ({
        ...s,
        items: s.items.filter((i) =>
          i.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((s) => s.items.length > 0)
    : sections;

  const handleNav = (id: string) => {
    onViewChange(id);
    onClose();
    setSearch('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed top-0 left-0 z-[101] h-full w-[85%] max-w-[320px] bg-card border-r border-border shadow-2xl flex flex-col safe-area-top"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                    <AvatarImage src={agentAvatar} alt={agentName} />
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
                      agentStatus === 'online' && 'bg-[hsl(var(--online,142_71%_45%))]',
                      agentStatus === 'away' && 'bg-[hsl(var(--away,38_92%_50%))]',
                      agentStatus === 'offline' && 'bg-muted-foreground/50'
                    )}
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground leading-tight">{agentName || 'Usuário'}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {agentStatus === 'online' ? '🟢 Online' : agentStatus === 'away' ? '🟡 Ausente' : '⚫ Offline'}
                  </p>
                </div>
              </div>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Fechar menu"
                className="rounded-xl"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>

            {/* Search */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar seção..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 rounded-xl bg-muted/50 border-0 text-sm"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 overscroll-contain">
              {filteredSections.map((section) => (
                <div key={section.title} className="mb-3">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all touch-manipulation',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground/80 hover:bg-muted active:bg-muted/80'
                        )}
                      >
                        <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isActive && <ChevronRight className="w-4 h-4 text-primary/50" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-3 py-3 flex items-center gap-2 shrink-0 safe-area-bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="flex-1 h-10 rounded-xl gap-2 text-sm touch-manipulation"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDark ? 'Modo Claro' : 'Modo Escuro'}
              </Button>
              {onLogout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="h-10 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
