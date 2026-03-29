import { useState, useEffect, Suspense, useCallback, useRef, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/CommandPalette';
import { SLANotificationProvider } from '@/components/notifications/SLANotificationProvider';
import { GoalNotificationProvider } from '@/components/notifications/GoalNotificationProvider';
import { PageTransition } from '@/components/ui/motion';
import { TourProvider, DEFAULT_ONBOARDING_STEPS, useTour } from '@/components/onboarding/OnboardingTour';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { BottomNavigation } from '@/components/ui/mobile-components';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { MobileDrawerMenu } from '@/components/mobile/MobileDrawerMenu';
import { NotificationsPanel, Notification } from '@/components/mobile/NotificationsPanel';
import { MobileFAB } from '@/components/mobile/MobileFAB';
import { InAppNotification, InAppNotificationData } from '@/components/mobile/InAppNotification';
import { CommandPaletteButton } from '@/components/ui/command-palette-button';
import { useGlobalKeyboard } from '@/components/keyboard/GlobalKeyboardProvider';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useOnboardingChecklist } from '@/hooks/useOnboardingChecklist';
import { useTranscriptionNotifications } from '@/hooks/useTranscriptionNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { logAudit } from '@/lib/audit';
import { Sparkles, MessageSquare, Users, BarChart3, Settings, Menu, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewRouter } from './ViewRouter';
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/ui/skeleton';
import { OfflineIndicator, ConnectionToast } from '@/components/ui/offline-indicator';
import { EvolutionDisconnectBanner } from '@/components/alerts/EvolutionDisconnectBanner';
import { RouteLoadingBar } from '@/components/ui/route-loading-bar';

function ViewLoadingFallback() {
  return (
    <div className="flex flex-col h-full p-6 gap-6 animate-fade-in" role="status" aria-busy="true" aria-label="Carregando módulo">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} className="p-4">
            <Skeleton className="h-3 w-20 mb-3" delay={i * 80} />
            <Skeleton className="h-7 w-16 mb-1" delay={i * 80 + 40} />
            <Skeleton className="h-3 w-12" delay={i * 80 + 80} />
          </SkeletonCard>
        ))}
      </div>

      {/* Content skeleton */}
      <SkeletonCard className="flex-1 p-5">
        <SkeletonText lines={4} />
      </SkeletonCard>
      <span className="sr-only">Carregando conteúdo do módulo...</span>
    </div>
  );
}

function IndexContent() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const { hasCompletedOnboarding, loading: loadingOnboarding, completeOnboarding } = useOnboarding();
  const { startTour } = useTour();
  const { isComplete: checklistComplete, isDismissed: checklistDismissed } = useOnboardingChecklist();
  const { currentView, navigateTo: setCurrentView, goBack, goForward, canGoBack, canGoForward, breadcrumbTrail } = useNavigationHistory('inbox');
  const [showWelcome, setShowWelcome] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const isMobile = useIsMobile();

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleMarkAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  
  const { registerNavigationHandler, unregisterNavigationHandler } = useGlobalKeyboard();
  
  useEffect(() => {
    registerNavigationHandler(setCurrentView);
    return () => unregisterNavigationHandler();
  }, [registerNavigationHandler, unregisterNavigationHandler]);

  // Alt+← / Alt+→ for back/forward navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBack, goForward]);
  
  useTranscriptionNotifications({ enabled: !!user });

  const showChecklist = !checklistComplete && !checklistDismissed && currentView === 'dashboard';

  const mobileNavItems = [
    { id: 'inbox', icon: <MessageSquare className="w-5 h-5" />, label: 'Inbox', badge: unreadNotifications || undefined },
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

  useEffect(() => {
    if (!loadingOnboarding && hasCompletedOnboarding === false && user) {
      setShowWelcome(true);
    }
  }, [loadingOnboarding, hasCompletedOnboarding, user]);

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center h-screen bg-background relative overflow-hidden"
        role="status"
        aria-busy="true"
        aria-label="Carregando aplicação"
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center relative z-10">
          <motion.div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
            style={{ background: 'var(--gradient-primary)' }}
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">Carregando</h2>
          <p className="text-muted-foreground text-sm">Preparando sua experiência...</p>
          <div className="flex gap-1.5 justify-center mt-6" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-primary" animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SLANotificationProvider>
      <GoalNotificationProvider>
        <div className="flex h-screen max-h-screen min-h-screen bg-background overflow-hidden relative">
          {/* Route loading bar */}
          <RouteLoadingBar isLoading={loading} />
          {/* Skip to content — a11y */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
          >
            Pular para o conteúdo
          </a>

          {/* Mobile Header */}
          {isMobile && (
            <MobileHeader
              onMenuOpen={() => setMobileMenuOpen(true)}
              onSearchOpen={() => setMobileSearchOpen(true)}
              onNotificationsOpen={() => setNotificationsOpen(true)}
              currentView={currentView}
              agentName={profile?.name || user.email || 'Usuário'}
              agentAvatar={profile?.avatar_url || undefined}
              agentStatus="online"
              unreadCount={unreadNotifications}
            />
          )}

          <NotificationsPanel
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            notifications={notifications}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onNotificationClick={(n) => {
              setNotificationsOpen(false);
              if (n.type === 'message' || n.type === 'assignment') setCurrentView('inbox');
            }}
          />

          <MobileDrawerMenu
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            currentView={currentView}
            onViewChange={setCurrentView}
            agentName={profile?.name || user.email || 'Usuário'}
            agentAvatar={profile?.avatar_url || undefined}
            agentStatus="online"
            onLogout={signOut}
          />

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
              inboxBadge={unreadNotifications || undefined}
            />
          )}
          
          <main 
            id="main-content" 
            role="main"
            aria-label="Conteúdo principal"
            tabIndex={-1}
            className={cn(
              'flex flex-1 overflow-hidden relative min-w-0 min-h-0 h-full max-h-full focus:outline-none',
              isMobile && 'pt-12 pb-[56px]'
            )}
          >
            {showChecklist && currentView === 'dashboard' && (
              <div className="absolute top-4 right-4 z-20 w-96 max-w-[calc(100%-2rem)]">
                <OnboardingChecklist onNavigate={setCurrentView} />
              </div>
            )}
            
            <Suspense fallback={<ViewLoadingFallback />}>
              <AnimatePresence mode="wait">
                <PageTransition key={currentView} className="flex-1 h-full max-h-full min-h-0 overflow-hidden">
                  <ViewRouter
                    currentView={currentView}
                    userId={user?.id}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    onGoBack={goBack}
                    onGoForward={goForward}
                    breadcrumbTrail={breadcrumbTrail}
                    onNavigateTo={setCurrentView}
                  />
                </PageTransition>
              </AnimatePresence>
            </Suspense>
          </main>

          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <>
              <MobileFAB
                onNewConversation={() => setCurrentView('inbox')}
                onNewContact={() => setCurrentView('contacts')}
                onNewCampaign={() => setCurrentView('campaigns')}
              />
              <BottomNavigation
                items={mobileNavItems}
                activeId={currentView}
                onChange={(id) => {
                  if (id === 'more') setMobileMenuOpen(true);
                  else setCurrentView(id);
                }}
              />
            </>
          )}
        </div>

        <CommandPalette onNavigate={setCurrentView} />

        {/* Network status indicators */}
        <OfflineIndicator />
        <ConnectionToast />
        <EvolutionDisconnectBanner />

        <WelcomeModal
          isOpen={showWelcome}
          onClose={() => { setShowWelcome(false); completeOnboarding(); }}
          onStartTour={() => {
            setShowWelcome(false);
            // Small delay to let modal close before tour spotlight renders
            setTimeout(() => startTour(DEFAULT_ONBOARDING_STEPS), 400);
          }}
          userName={profile?.name}
        />
      </GoalNotificationProvider>
    </SLANotificationProvider>
  );
}

const Index = () => {
  const { user, loading } = useAuth();
  const { completeOnboarding } = useOnboarding();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
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
