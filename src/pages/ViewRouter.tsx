import { Sparkles, Construction, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrentModule } from '@/hooks/useCurrentModule';
import * as Views from './lazyViews';

interface ViewRouterProps {
  currentView: string;
  userId?: string;
}

export function ViewRouter({ currentView, userId }: ViewRouterProps) {
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
    default:
      return (
        <div className="flex items-center justify-center h-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--gradient-primary)' }}>
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </h2>
            <p className="text-muted-foreground">Esta seção está em desenvolvimento</p>
          </motion.div>
        </div>
      );
  }
}
