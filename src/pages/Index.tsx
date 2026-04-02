import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/CommandPalette';
import { SLANotificationProvider } from '@/components/notifications/SLANotificationProvider';
import { GoalNotificationProvider } from '@/components/notifications/GoalNotificationProvider';
import { TourProvider, DEFAULT_ONBOARDING_STEPS, useTour } from '@/components/onboarding/OnboardingTour';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { useGlobalKeyboard } from '@/components/keyboard/GlobalKeyboardProvider';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useOnboardingChecklist } from '@/hooks/useOnboardingChecklist';
import { useTranscriptionNotifications } from '@/hooks/useTranscriptionNotifications';
import { logAudit } from '@/lib/audit';
import { Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { OfflineIndicator, ConnectionToast } from '@/components/ui/offline-indicator';
import { EvolutionDisconnectBanner } from '@/components/alerts/EvolutionDisconnectBanner';

function IndexContent() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const { hasCompletedOnboarding, loading: loadingOnboarding, completeOnboarding } = useOnboarding();
  const { startTour } = useTour();
  const { currentView, navigateTo: rawNavigateTo, goBack: rawGoBack, goForward: rawGoForward, canGoBack, canGoForward, breadcrumbTrail } = useNavigationHistory('inbox');
  const navDirectionRef = useRef<'forward' | 'back'>('forward');

  // Only run checklist queries when on dashboard view
  const { isComplete: checklistComplete, isDismissed: checklistDismissed } = useOnboardingChecklist({
    enabled: currentView === 'dashboard',
  });

  const setCurrentView = useCallback((viewId: string) => {
    navDirectionRef.current = 'forward';
    rawNavigateTo(viewId);
  }, [rawNavigateTo]);

  const goBack = useCallback(() => {
    navDirectionRef.current = 'back';
    rawGoBack();
  }, [rawGoBack]);

  const goForward = useCallback(() => {
    navDirectionRef.current = 'forward';
    rawGoForward();
  }, [rawGoForward]);

  const [showWelcome, setShowWelcome] = useState(false);

  const { registerNavigationHandler, unregisterNavigationHandler } = useGlobalKeyboard();

  useEffect(() => {
    registerNavigationHandler(setCurrentView);
    return () => unregisterNavigationHandler();
  }, [registerNavigationHandler, unregisterNavigationHandler, setCurrentView]);

  // Keyboard navigation: Alt+←/→, Escape, Alt+Home
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      } else if (e.key === 'Escape' && !isInput) {
        const hasOpenDialog = document.querySelector('[data-state="open"][role="dialog"]');
        if (!hasOpenDialog && canGoBack) {
          goBack();
        }
      } else if (e.altKey && e.key === 'Home') {
        e.preventDefault();
        setCurrentView('inbox');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBack, goForward, canGoBack, setCurrentView]);

  // Defer transcription notifications by 2s after mount to not block first paint
  const [notifReady, setNotifReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setNotifReady(true), 2000);
    return () => clearTimeout(t);
  }, []);
  useTranscriptionNotifications({ enabled: !!user && notifReady });

  const showChecklist = !checklistComplete && !checklistDismissed && currentView === 'dashboard';

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
    return <LoadingSplash />;
  }

  if (!user) return null;

  return (
    <SLANotificationProvider>
      <GoalNotificationProvider>
        <AppShell
          currentView={currentView}
          setCurrentView={setCurrentView}
          userId={user.id}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          goBack={goBack}
          goForward={goForward}
          breadcrumbTrail={breadcrumbTrail}
          navDirectionRef={navDirectionRef}
          profile={profile}
          userEmail={user.email || ''}
          signOut={signOut}
          unreadNotifications={0}
          showChecklist={showChecklist}
          loading={loading}
        />

        <CommandPalette onNavigate={setCurrentView} />

        <OfflineIndicator />
        <ConnectionToast />
        <EvolutionDisconnectBanner />

        <WelcomeModal
          isOpen={showWelcome}
          onClose={() => { setShowWelcome(false); completeOnboarding(); }}
          onStartTour={() => {
            setShowWelcome(false);
            setTimeout(() => startTour(DEFAULT_ONBOARDING_STEPS), 400);
          }}
          userName={profile?.name}
        />
      </GoalNotificationProvider>
    </SLANotificationProvider>
  );
}

function LoadingSplash() {
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
      <div className="text-center relative z-10 animate-fade-in">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 relative animate-pulse"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Sparkles className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-2">Carregando</h2>
        <p className="text-muted-foreground text-sm">Preparando sua experiência...</p>
        <div className="flex gap-1.5 justify-center mt-6" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const Index = () => {
  const { user, loading } = useAuth();
  const { completeOnboarding } = useOnboarding();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
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
