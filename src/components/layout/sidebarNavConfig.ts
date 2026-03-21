import {
  MessageSquare,
  User,
  UsersRound,
  BarChart3,
  Phone,
  Zap,
  Link2,
  Megaphone,
  Bot,
  Kanban,
  Wallet,
  Package,
  CreditCard,
  Tag,
  Brain,
  Workflow,
  Plug,
  Activity,
  PhoneCall,
  Calendar,
  CalendarClock,
  FileText,
  Globe,
  Inbox,
  FileBarChart,
  ClipboardList,
  AlertTriangle,
  Gauge,
  Mic,
  Trophy,
  TrendingDown,
  Tags,
  Cpu,
  ShieldCheck,
  Shield,
  UserCog,
  Palette,
  BookOpen,
  Settings,
  Compass,
  Wrench,
  LayoutDashboard,
  Lock,
} from 'lucide-react';
import type { NavItemConfig } from './SidebarNavItem';

// ── Primary (always visible) ──────────────────────────────
export const primaryNav: readonly NavItemConfig[] = [
  { id: 'inbox', icon: MessageSquare, label: 'Chat' },
  { id: 'contacts', icon: User, label: 'Contatos' },
  { id: 'groups', icon: UsersRound, label: 'Grupos' },
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { id: 'agents', icon: Phone, label: 'Equipe' },
] as const;

// ── Communication & Engagement ────────────────────────────
export const communicationNav: readonly NavItemConfig[] = [
  { id: 'campaigns', icon: Megaphone, label: 'Campanhas' },
  { id: 'wa-templates', icon: FileText, label: 'Templates WA' },
  { id: 'omnichannel', icon: Globe, label: 'Omnichannel' },
  { id: 'omni-inbox', icon: Inbox, label: 'Inbox Omni' },
  { id: 'voip', icon: PhoneCall, label: 'VoIP' },
] as const;

// ── Automation & AI ───────────────────────────────────────
export const automationNav: readonly NavItemConfig[] = [
  { id: 'chatbot', icon: Bot, label: 'Chatbot' },
  { id: 'automations', icon: Zap, label: 'Automações' },
  { id: 'wa-flows', icon: Workflow, label: 'WhatsApp Flows' },
  { id: 'knowledge', icon: Brain, label: 'Base de Conhecimento' },
  { id: 'churn', icon: TrendingDown, label: 'Previsão Churn' },
  { id: 'ticket-classifier', icon: Tags, label: 'Classificador IA' },
] as const;

// ── Sales & CRM ───────────────────────────────────────────
export const salesNav: readonly NavItemConfig[] = [
  { id: 'pipeline', icon: Kanban, label: 'Pipeline' },
  { id: 'wallet', icon: Wallet, label: 'Carteira' },
  { id: 'catalog', icon: Package, label: 'Catálogo' },
  { id: 'payments', icon: CreditCard, label: 'Pagamentos' },
  { id: 'tags', icon: Tag, label: 'Etiquetas' },
  { id: 'queues', icon: LayoutDashboard, label: 'Filas' },
  { id: 'schedule', icon: CalendarClock, label: 'Agendamentos' },
] as const;

// ── Connections & Integrations ────────────────────────────
export const connectionsNav: readonly NavItemConfig[] = [
  { id: 'connections', icon: Link2, label: 'Conexões' },
  { id: 'integrations', icon: Plug, label: 'Integrações' },
  { id: 'meta-capi', icon: Activity, label: 'Meta CAPI' },
  { id: 'google-calendar', icon: Calendar, label: 'Calendário' },
] as const;

// ── Analytics & Reports ───────────────────────────────────
export const analyticsNav: readonly NavItemConfig[] = [
  { id: 'reports', icon: FileBarChart, label: 'Relatórios' },
  { id: 'auto-export', icon: ClipboardList, label: 'Export Auto' },
  { id: 'warroom', icon: AlertTriangle, label: 'War Room' },
  { id: 'sentiment', icon: Gauge, label: 'Sentimento' },
  { id: 'transcriptions', icon: Mic, label: 'Transcrições' },
  { id: 'achievements', icon: Trophy, label: 'Conquistas' },
  { id: 'diagnostics', icon: Compass, label: 'Diagnóstico' },
  { id: 'performance', icon: Cpu, label: 'Performance' },
] as const;

// ── System & Admin ────────────────────────────────────────
export const systemNav: readonly NavItemConfig[] = [
  { id: 'audit-logs', icon: FileBarChart, label: 'Auditoria' },
  { id: 'privacy', icon: ShieldCheck, label: 'LGPD' },
  { id: 'security', icon: Shield, label: 'Segurança' },
  { id: 'admin', icon: UserCog, label: 'Admin' },
  { id: 'themes', icon: Palette, label: 'Temas' },
  { id: 'docs', icon: BookOpen, label: 'Documentação' },
  { id: 'settings', icon: Settings, label: 'Configurações' },
] as const;

// ── Group definitions for collapsible sidebar ─────────────
export const sidebarGroups = [
  { label: 'Comunicação', icon: Megaphone, items: communicationNav },
  { label: 'Automação & IA', icon: Bot, items: automationNav },
  { label: 'Vendas & CRM', icon: Kanban, items: salesNav },
  { label: 'Conexões', icon: Plug, items: connectionsNav },
  { label: 'Analytics', icon: BarChart3, items: analyticsNav },
  { label: 'Sistema', icon: Lock, items: systemNav },
] as const;
