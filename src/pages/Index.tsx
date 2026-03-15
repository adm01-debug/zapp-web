import { useState, useEffect, useCallback, useRef } from 'react';
import { useDeepLinks } from '@/hooks/useDeepLinks';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { RealtimeInboxView } from '@/components/inbox/RealtimeInboxView';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { SentimentAlertsDashboard } from '@/components/dashboard/SentimentAlertsDashboard';
import { AgentsView } from '@/components/agents/AgentsView';
import { QueuesView } from '@/components/queues/QueuesView';
import { ContactsView } from '@/components/contacts/ContactsView';
import { ConnectionsView } from '@/components/connections/ConnectionsView';
import { TagsView } from '@/components/tags/TagsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { ClientWalletView } from '@/components/wallet/ClientWalletView';
import { AdminView } from '@/components/admin/AdminView';
import { ProductManagement } from '@/components/catalog/ProductManagement';
import { GroupsView } from '@/components/groups/GroupsView';
import { TranscriptionsHistoryView } from '@/components/transcriptions/TranscriptionsHistoryView';
import { AdvancedReportsView } from '@/components/reports/AdvancedReportsView';
import { SecurityView } from '@/components/security/SecurityView';
import { SystemFeaturesView } from '@/components/docs/SystemFeaturesView';
import { CampaignsView } from '@/components/campaigns/CampaignsView';
import { ChatbotFlowsView } from '@/components/chatbot/ChatbotFlowsView';
import { AutomationsManager } from '@/components/automations/AutomationsManager';
import { IntegrationsHub } from '@/components/integrations/IntegrationsHub';
import { SLANotificationProvider } from '@/components/notifications/SLANotificationProvider';
import { GoalNotificationProvider } from '@/components/notifications/GoalNotificationProvider';
import { PageTransition } from '@/components/ui/motion';
import { TourProvider, DEFAULT_ONBOARDING_STEPS, useTour } from '@/components/onboarding/OnboardingTour';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { BottomNavigation, MobileDrawer } from '@/components/ui/mobile-components';
import { CommandPaletteButton } from '@/components/ui/command-palette-button';
import { useGlobalKeyboard } from '@/components/keyboard/GlobalKeyboardProvider';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useOnboardingChecklist } from '@/hooks/useOnboardingChecklist';
import { useTranscriptionNotifications } from '@/hooks/useTranscriptionNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { logAudit } from '@/lib/audit';
import { Sparkles, MessageSquare, Users, BarChart3, Settings, Menu, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

function IndexContent() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const { hasCompletedOnboarding, loading: loadingOnboarding, completeOnboarding } = useOnboarding();
  const { isComplete: checklistComplete, isDismissed: checklistDismissed } = useOnboardingChecklist();
  const { currentView, setCurrentView } = useDeepLinks('inbox');
  const [showWelcome, setShowWelcome] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Import and use global keyboard context for Command Palette navigation
  const { registerNavigationHandler, unregisterNavigationHandler } = useGlobalKeyboard();
  
  // Register navigation handler for Command Palette
  useEffect(() => {
    registerNavigationHandler(setCurrentView);
    return () => unregisterNavigationHandler();
  }, [registerNavigationHandler, unregisterNavigationHandler]);
  
  // Enable transcription notifications globally
  useTranscriptionNotifications({ enabled: !!user });

  // Show checklist on dashboard if not complete
  const showChecklist = !checklistComplete && !checklistDismissed && currentView === 'dashboard';

  // Mobile navigation items - 5 items com "More" para acessar todas as seções
  const mobileNavItems = [
    { id: 'inbox', icon: <MessageSquare className="w-5 h-5" />, label: 'Inbox', badge: 12 },
    { id: 'dashboard', icon: <BarChart3 className="w-5 h-5" />, label: 'Dashboard' },
    { id: 'contacts', icon: <Users className="w-5 h-5" />, label: 'Contatos' },
    { id: 'agents', icon: <Phone className="w-5 h-5" />, label: 'Equipe' },
    { id: 'more', icon: <Menu className="w-5 h-5" />, label: 'Mais' },
  ];

  const hasLoggedAudit = useRef(false);
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user && !loading && !hasLoggedAudit.current) {
      hasLoggedAudit.current = true;
      logAudit({ action: 'login', details: { email: user.email } });
    }
  }, [user, loading, navigate]);

  // Show welcome modal for new users
  useEffect(() => {
    if (!loadingOnboarding && hasCompletedOnboarding === false && user) {
      setShowWelcome(true);
    }
  }, [loadingOnboarding, hasCompletedOnboarding, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative z-10"
        >
          <motion.div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
            style={{ background: 'var(--gradient-primary)' }}
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 text-primary-foreground" />
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{ background: 'var(--gradient-primary)' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">Carregando</h2>
            <p className="text-muted-foreground text-sm">Preparando sua experiência...</p>
          </motion.div>
          
          {/* Loading dots */}
          <motion.div 
            className="flex gap-1.5 justify-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity,
                  delay: i * 0.15
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderView = () => {
    switch (currentView) {
      case 'inbox':
        return <RealtimeInboxView />;
      case 'dashboard':
        return <DashboardView />;
      case 'agents':
        return <AgentsView />;
      case 'queues':
        return <QueuesView />;
      case 'contacts':
        return <ContactsView />;
      case 'groups':
        return <GroupsView />;
      case 'connections':
        return <ConnectionsView />;
      case 'wallet':
        return <ClientWalletView />;
      case 'catalog':
        return <ProductManagement />;
      case 'transcriptions':
        return <TranscriptionsHistoryView />;
      case 'admin':
        return <AdminView />;
      case 'tags':
        return <TagsView />;
      case 'sentiment':
        return <SentimentAlertsDashboard />;
      case 'reports':
        return <AdvancedReportsView />;
      case 'security':
        return <SecurityView />;
      case 'settings':
        return <SettingsView />;
      case 'docs':
        return <SystemFeaturesView />;
      case 'campaigns':
        return <CampaignsView />;
      case 'chatbot':
        return <ChatbotFlowsView />;
      case 'automations':
        return <AutomationsManager />;
        return (
          <div className="flex items-center justify-center h-full">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
              </h2>
              <p className="text-muted-foreground">
                Esta seção está em desenvolvimento
              </p>
            </motion.div>
          </div>
        );
    }
  };

  return (
    <SLANotificationProvider>
      <GoalNotificationProvider>
        <div className="flex h-screen bg-background overflow-hidden relative">
          {/* Subtle background gradients */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-primary-glow/5 rounded-full blur-3xl" />
          </div>
          
          {/* Mobile Header */}
          {isMobile && (
            <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-card/95 backdrop-blur-lg border-b border-border safe-area-top">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-display font-bold">MultiChat</span>
              </div>
              <div className="w-10" /> {/* Spacer */}
            </div>
          )}

          {/* Mobile Drawer */}
          <MobileDrawer 
            isOpen={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)}
            side="left"
          >
            <div className="pt-16 px-4">
              <Sidebar
                currentView={currentView}
                onViewChange={(view) => {
                  setCurrentView(view);
                  setMobileMenuOpen(false);
                }}
                currentAgent={{
                  name: profile?.name || user.email || 'Usuário',
                  avatar: profile?.avatar_url || undefined,
                  status: 'online',
                }}
                onLogout={signOut}
              />
            </div>
          </MobileDrawer>
          
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Sidebar
              currentView={currentView}
              onViewChange={setCurrentView}
              currentAgent={{
                name: profile?.name || user.email || 'Usuário',
                avatar: profile?.avatar_url || undefined,
                status: 'online',
              }}
              onLogout={signOut}
            />
          )}
          
          <main 
            id="main-content" 
            className={`flex-1 overflow-hidden relative ${isMobile ? 'pt-14 pb-16' : ''}`}
          >
            {/* Onboarding Checklist - shown on dashboard */}
            {showChecklist && currentView === 'dashboard' && (
              <div className="absolute top-4 right-4 z-20 w-96 max-w-[calc(100%-2rem)]">
                <OnboardingChecklist onNavigate={setCurrentView} />
              </div>
            )}
            
            <AnimatePresence mode="wait">
              <PageTransition key={currentView}>
                {renderView()}
              </PageTransition>
            </AnimatePresence>
          </main>

          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <BottomNavigation
              items={mobileNavItems}
              activeId={currentView}
              onChange={(id) => {
                if (id === 'more') {
                  setMobileMenuOpen(true);
                } else {
                  setCurrentView(id);
                }
              }}
            />
          )}
        </div>

        {/* Welcome Modal for new users */}
        <WelcomeModal
          isOpen={showWelcome}
          onClose={() => {
            setShowWelcome(false);
            completeOnboarding();
          }}
          onStartTour={() => {
            setShowWelcome(false);
            completeOnboarding();
          }}
          userName={profile?.name}
        />
      </GoalNotificationProvider>
    </SLANotificationProvider>
  );
}

// Wrapper component with TourProvider
const Index = () => {
  const { user, loading } = useAuth();
  const { completeOnboarding } = useOnboarding();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground">Carregando...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <TourProvider onComplete={completeOnboarding}>
      <IndexContent />
    </TourProvider>
  );
};

export default Index;
