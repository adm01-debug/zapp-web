import { Sparkles, Construction, ArrowLeft, AlertCircle } from 'lucide-react';
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

// Declarative route map — easier to maintain than switch/case
const VIEW_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'inbox': Views.RealtimeInboxView,
  'dashboard': Views.DashboardView,
  'agents': Views.AgentsView,
  'queues': Views.QueuesView,
  'contacts': Views.ContactsView,
  'groups': Views.GroupsView,
  'connections': Views.ConnectionsView,
  'wallet': Views.ClientWalletView,
  'catalog': Views.ProductManagement,
  'transcriptions': Views.TranscriptionsHistoryView,
  'admin': Views.AdminView,
  'tags': Views.TagsView,
  'sentiment': Views.SentimentAlertsDashboard,
  'reports': Views.AdvancedReportsView,
  'security': Views.SecurityView,
  'settings': Views.SettingsView,
  'docs': Views.SystemFeaturesView,
  'campaigns': Views.CampaignsView,
  'chatbot': Views.ChatbotFlowsView,
  'automations': Views.AutomationsManager,
  'integrations': Views.IntegrationsHub,
  'privacy': Views.LGPDComplianceView,
  'pipeline': Views.SalesPipelineView,
  'knowledge': Views.KnowledgeBaseView,
  'payments': Views.PaymentLinksView,
  'wa-flows': Views.WhatsAppFlowsBuilder,
  'meta-capi': Views.MetaCAPIView,
  'diagnostics': Views.DiagnosticsView,
  'voip': Views.VoIPPanel,
  'auto-export': Views.AutoExportManager,
  'google-calendar': Views.GoogleCalendarIntegration,
  'themes': Views.ThemeCustomizer,
  'schedule': Views.ScheduleCalendarView,
  'warroom': Views.WarRoomDashboard,
  'wa-templates': Views.WhatsAppTemplatesManager,
  'omnichannel': Views.OmnichannelManager,
  'churn': Views.ChurnPredictionDashboard,
  'ticket-classifier': Views.AutoTicketClassifier,
  'performance': Views.PerformanceMonitor,
  'omni-inbox': Views.OmnichannelInbox,
  'audit-logs': Views.AuditLogDashboard,
  'telemetry': Views.AdminTelemetriaPage,
};

// Views that need custom props
const SPECIAL_VIEWS: Record<string, (props: ViewRouterProps) => React.ReactNode> = {
  'achievements': (props) => <Views.AchievementsSystemLazy userId={props.userId} />,
};

export function ViewRouter({ currentView, userId, canGoBack, canGoForward, onGoBack, onGoForward, breadcrumbTrail, onNavigateTo }: ViewRouterProps) {
  const content = (() => {
    // Check special views first (those needing props)
    if (SPECIAL_VIEWS[currentView]) {
      return SPECIAL_VIEWS[currentView]({ currentView, userId, canGoBack, canGoForward, onGoBack, onGoForward, breadcrumbTrail, onNavigateTo });
    }
    // Standard views from map
    const ViewComponent = VIEW_MAP[currentView];
    if (ViewComponent) {
      return <ViewComponent />;
    }
    return <FallbackView currentView={currentView} />;
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
