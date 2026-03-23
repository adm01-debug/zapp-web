import { Sparkles, Construction, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrentModule } from '@/hooks/useCurrentModule';
import { ViewHeader } from '@/components/layout/ViewHeader';
import * as Views from './lazyViews';

interface ViewRouterProps {
  currentView: string;
  userId?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  breadcrumbTrail?: string[];
  onNavigateTo?: (viewId: string) => void;
}

// Views that manage their own full-screen layout (no header)
const FULL_SCREEN_VIEWS = new Set(['inbox', 'pipeline', 'omni-inbox']);

interface WithHeaderProps {
  viewId: string;
  children: React.ReactNode;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  breadcrumbTrail?: string[];
  onNavigateTo?: (viewId: string) => void;
}

function WithHeader({ viewId, children, canGoBack, canGoForward, onGoBack, onGoForward, breadcrumbTrail, onNavigateTo }: WithHeaderProps) {
  if (FULL_SCREEN_VIEWS.has(viewId)) return <>{children}</>;
  return (
    <div className="flex flex-col h-full">
      <ViewHeader
        viewId={viewId}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onGoBack={onGoBack}
        onGoForward={onGoForward}
        breadcrumbTrail={breadcrumbTrail}
        onNavigateTo={onNavigateTo}
      />
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}

export function ViewRouter({ currentView, userId, canGoBack, canGoForward, onGoBack, onGoForward, breadcrumbTrail, onNavigateTo }: ViewRouterProps) {
  const content = (() => {
    switch (currentView) {
      case 'inbox': return <Views.RealtimeInboxView />;
      case 'dashboard': return <Views.DashboardView />;
      case 'agents': return <Views.AgentsView />;
      case 'queues': return <Views.QueuesView />;
      case 'contacts': return <Views.ContactsView />;
      case 'groups': return <Views.GroupsView />;
      case 'connections': return <Views.ConnectionsView />;
      case 'wallet': return <Views.ClientWalletView />;
      case 'catalog': return <Views.ProductManagement />;
      case 'transcriptions': return <Views.TranscriptionsHistoryView />;
      case 'admin': return <Views.AdminView />;
      case 'tags': return <Views.TagsView />;
      case 'sentiment': return <Views.SentimentAlertsDashboard />;
      case 'reports': return <Views.AdvancedReportsView />;
      case 'security': return <Views.SecurityView />;
      case 'settings': return <Views.SettingsView />;
      case 'docs': return <Views.SystemFeaturesView />;
      case 'campaigns': return <Views.CampaignsView />;
      case 'chatbot': return <Views.ChatbotFlowsView />;
      case 'automations': return <Views.AutomationsManager />;
      case 'integrations': return <Views.IntegrationsHub />;
      case 'privacy': return <Views.LGPDComplianceView />;
      case 'pipeline': return <Views.SalesPipelineView />;
      case 'knowledge': return <Views.KnowledgeBaseView />;
      case 'payments': return <Views.PaymentLinksView />;
      case 'wa-flows': return <Views.WhatsAppFlowsBuilder />;
      case 'meta-capi': return <Views.MetaCAPIView />;
      case 'diagnostics': return <Views.DiagnosticsView />;
      case 'voip': return <Views.VoIPPanel />;
      case 'auto-export': return <Views.AutoExportManager />;
      case 'google-calendar': return <Views.GoogleCalendarIntegration />;
      case 'themes': return <Views.ThemeCustomizer />;
      case 'achievements': return <Views.AchievementsSystemLazy userId={userId} />;
      case 'schedule': return <Views.ScheduleCalendarView />;
      case 'warroom': return <Views.WarRoomDashboard />;
      case 'wa-templates': return <Views.WhatsAppTemplatesManager />;
      case 'omnichannel': return <Views.OmnichannelManager />;
      case 'churn': return <Views.ChurnPredictionDashboard />;
      case 'ticket-classifier': return <Views.AutoTicketClassifier />;
      case 'performance': return <Views.PerformanceMonitor />;
      case 'omni-inbox': return <Views.OmnichannelInbox />;
      case 'audit-logs': return <Views.AuditLogDashboard />;
      case 'telemetry': return <Views.AdminTelemetriaPage />;
      default: return <FallbackView currentView={currentView} />;
    }
  })();

  return (
    <WithHeader
      viewId={currentView}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      onGoBack={onGoBack}
      onGoForward={onGoForward}
      breadcrumbTrail={breadcrumbTrail}
      onNavigateTo={onNavigateTo}
    >
      {content}
    </WithHeader>
  );
}

function FallbackView({ currentView }: { currentView: string }) {
  const mod = useCurrentModule(currentView);
  const Icon = mod.icon || Construction;

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-b from-background to-muted/20">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="text-center max-w-sm px-6"
      >
        <motion.div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20"
          style={{ background: 'var(--gradient-primary)' }}
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon className="w-9 h-9 text-primary-foreground" />
        </motion.div>

        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          {mod.label}
        </h2>

        {mod.group && (
          <span className="inline-block text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mb-3">
            {mod.group}
          </span>
        )}

        <p className="text-muted-foreground text-sm leading-relaxed">
          Este módulo está em desenvolvimento e será disponibilizado em breve.
        </p>

        <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-muted-foreground/60">
          <Construction className="w-3.5 h-3.5" />
          <span>Em construção</span>
        </div>
      </motion.div>
    </div>
  );
}
