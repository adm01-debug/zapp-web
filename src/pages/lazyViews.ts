import { lazy } from 'react';

// Lazy-loaded views - only the active view is loaded
export const RealtimeInboxView = lazy(() => import('@/components/inbox/RealtimeInboxView').then(m => ({ default: m.RealtimeInboxView })));
export const DashboardView = lazy(() => import('@/components/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
export const SentimentAlertsDashboard = lazy(() => import('@/components/dashboard/SentimentAlertsDashboard').then(m => ({ default: m.SentimentAlertsDashboard })));
export const AgentsView = lazy(() => import('@/components/agents/AgentsView').then(m => ({ default: m.AgentsView })));
export const QueuesView = lazy(() => import('@/components/queues/QueuesView').then(m => ({ default: m.QueuesView })));
export const ContactsView = lazy(() => import('@/components/contacts/ContactsView').then(m => ({ default: m.ContactsView })));
export const ConnectionsView = lazy(() => import('@/components/connections/ConnectionsView').then(m => ({ default: m.ConnectionsView })));
export const TagsView = lazy(() => import('@/components/tags/TagsView').then(m => ({ default: m.TagsView })));
export const SettingsView = lazy(() => import('@/components/settings/SettingsView').then(m => ({ default: m.SettingsView })));
export const ClientWalletView = lazy(() => import('@/components/wallet/ClientWalletView').then(m => ({ default: m.ClientWalletView })));
export const AdminView = lazy(() => import('@/components/admin/AdminView').then(m => ({ default: m.AdminView })));
export const ProductManagement = lazy(() => import('@/components/catalog/ProductManagement').then(m => ({ default: m.ProductManagement })));
export const GroupsView = lazy(() => import('@/components/groups/GroupsView').then(m => ({ default: m.GroupsView })));
export const TranscriptionsHistoryView = lazy(() => import('@/components/transcriptions/TranscriptionsHistoryView').then(m => ({ default: m.TranscriptionsHistoryView })));
export const AdvancedReportsView = lazy(() => import('@/components/reports/AdvancedReportsView').then(m => ({ default: m.AdvancedReportsView })));
export const SecurityView = lazy(() => import('@/components/security/SecurityView').then(m => ({ default: m.SecurityView })));
export const SystemFeaturesView = lazy(() => import('@/components/docs/SystemFeaturesView').then(m => ({ default: m.SystemFeaturesView })));
export const CampaignsView = lazy(() => import('@/components/campaigns/CampaignsView').then(m => ({ default: m.CampaignsView })));
export const ChatbotFlowsView = lazy(() => import('@/components/chatbot/ChatbotFlowsView').then(m => ({ default: m.ChatbotFlowsView })));
export const AutomationsManager = lazy(() => import('@/components/automations/AutomationsManager').then(m => ({ default: m.AutomationsManager })));
export const IntegrationsHub = lazy(() => import('@/components/integrations/IntegrationsHub').then(m => ({ default: m.IntegrationsHub })));
export const LGPDComplianceView = lazy(() => import('@/components/compliance/LGPDComplianceView').then(m => ({ default: m.LGPDComplianceView })));
export const SalesPipelineView = lazy(() => import('@/components/pipeline/SalesPipelineView').then(m => ({ default: m.SalesPipelineView })));
export const KnowledgeBaseView = lazy(() => import('@/components/knowledge/KnowledgeBaseView').then(m => ({ default: m.KnowledgeBaseView })));
export const PaymentLinksView = lazy(() => import('@/components/payments/PaymentLinksView').then(m => ({ default: m.PaymentLinksView })));
export const WhatsAppFlowsBuilder = lazy(() => import('@/components/whatsapp-flows/WhatsAppFlowsBuilder').then(m => ({ default: m.WhatsAppFlowsBuilder })));
export const MetaCAPIView = lazy(() => import('@/components/meta-capi/MetaCAPIView').then(m => ({ default: m.MetaCAPIView })));
export const DiagnosticsView = lazy(() => import('@/components/diagnostics/DiagnosticsView').then(m => ({ default: m.DiagnosticsView })));
export const VoIPPanel = lazy(() => import('@/components/calls/VoIPPanel').then(m => ({ default: m.VoIPPanel })));
export const AutoExportManager = lazy(() => import('@/components/reports/AutoExportManager').then(m => ({ default: m.AutoExportManager })));
export const GoogleCalendarIntegration = lazy(() => import('@/components/integrations/GoogleCalendarIntegration').then(m => ({ default: m.GoogleCalendarIntegration })));
export const ThemeCustomizer = lazy(() => import('@/components/settings/ThemeCustomizer').then(m => ({ default: m.ThemeCustomizer })));
export const ScheduleCalendarView = lazy(() => import('@/components/schedule/ScheduleCalendarView').then(m => ({ default: m.ScheduleCalendarView })));
export const WarRoomDashboard = lazy(() => import('@/components/dashboard/WarRoomDashboard').then(m => ({ default: m.WarRoomDashboard })));
export const WhatsAppTemplatesManager = lazy(() => import('@/components/catalog/WhatsAppTemplatesManager').then(m => ({ default: m.WhatsAppTemplatesManager })));
export const OmnichannelManager = lazy(() => import('@/components/omnichannel/OmnichannelManager').then(m => ({ default: m.OmnichannelManager })));
export const ChurnPredictionDashboard = lazy(() => import('@/components/ai/ChurnPredictionDashboard').then(m => ({ default: m.ChurnPredictionDashboard })));
export const AutoTicketClassifier = lazy(() => import('@/components/ai/AutoTicketClassifier').then(m => ({ default: m.AutoTicketClassifier })));
export const PerformanceMonitor = lazy(() => import('@/components/performance/PerformanceMonitor').then(m => ({ default: m.PerformanceMonitor })));
export const OmnichannelInbox = lazy(() => import('@/components/omnichannel/OmnichannelInbox').then(m => ({ default: m.OmnichannelInbox })));
export const AuditLogDashboard = lazy(() => import('@/components/security/AuditLogDashboard').then(m => ({ default: m.AuditLogDashboard })));

export const AchievementsSystemLazy = lazy(async () => {
  const m = await import('@/components/gamification/AchievementsSystem');
  return { default: m.AchievementsSystem };
}) as React.LazyExoticComponent<React.ComponentType<{ userId?: string; showCompact?: boolean }>>;
