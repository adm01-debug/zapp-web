import { Suspense, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageTransition } from '@/components/ui/motion';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { ViewRouter } from '@/pages/ViewRouter';
import { ViewLoadingFallback } from '@/components/layout/ViewLoadingFallback';
import { RouteLoadingBar } from '@/components/ui/route-loading-bar';
import { MobileShell } from '@/components/mobile/MobileShell';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

interface AppShellProps {
  currentView: string;
  setCurrentView: (viewId: string) => void;
  userId?: string;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  breadcrumbTrail: string[];
  navDirectionRef: React.MutableRefObject<'forward' | 'back'>;
  profile: { name?: string | null; avatar_url?: string | null } | null;
  userEmail: string;
  signOut: () => void;
  unreadNotifications: number;
  showChecklist: boolean;
  loading: boolean;
}

export function AppShell({
  currentView,
  setCurrentView,
  userId,
  canGoBack,
  canGoForward,
  goBack,
  goForward,
  breadcrumbTrail,
  navDirectionRef,
  profile,
  userEmail,
  signOut,
  unreadNotifications,
  showChecklist,
  loading,
}: AppShellProps) {
  const isMobile = useIsMobile();

  // Mobile edge-swipe navigation
  useSwipeNavigation({
    onSwipeBack: goBack,
    onSwipeForward: goForward,
    canGoBack,
    canGoForward,
    enabled: isMobile,
    edgeWidth: 20,
    threshold: 60,
  });

  return (
    <div className="flex h-screen max-h-screen min-h-screen bg-background overflow-hidden relative">
      <RouteLoadingBar isLoading={loading} />

      {/* Skip to content — a11y */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Pular para o conteúdo
      </a>

      {/* Mobile wrapper */}
      {isMobile && (
        <MobileShell
          currentView={currentView}
          setCurrentView={setCurrentView}
          profile={profile}
          userEmail={userEmail}
          signOut={signOut}
          unreadNotifications={unreadNotifications}
        />
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          currentAgent={{
            name: profile?.name || userEmail || 'Usuário',
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
            <PageTransition
              key={currentView}
              direction={navDirectionRef.current}
              className="flex-1 h-full max-h-full min-h-0 overflow-hidden"
            >
              <ViewRouter
                currentView={currentView}
                userId={userId}
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
    </div>
  );
}
