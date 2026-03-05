import { lazy, Suspense, useEffect, useState } from "react";
import { getLogger } from "@/lib/logger";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { GamificationProvider } from "@/components/gamification/GamificationProvider";
import { RealtimeSentimentAlertProvider } from "@/components/notifications/RealtimeSentimentAlertProvider";
import { GlobalKeyboardProvider } from "@/components/keyboard/GlobalKeyboardProvider";
import { AccessibleToastProvider } from "@/components/ui/accessible-toast";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { SkipLinks } from "@/components/ui/skip-link";
import { VisuallyHidden, LiveRegion } from "@/components/ui/visually-hidden";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { EasterEggsProvider } from "@/components/effects/EasterEggs";
import { HighContrastProvider } from "@/components/theme/HighContrastToggle";

// Critical routes - load immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes for better initial load performance
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const SSOCallback = lazy(() => import("./pages/SSOCallback"));
const TwoFactorAuth = lazy(() => import("./pages/TwoFactorAuth"));
const QueueDetails = lazy(() => import("./pages/QueueDetails"));
const QueuesComparison = lazy(() => import("./pages/QueuesComparison"));
const SLADashboard = lazy(() => import("./pages/SLADashboard"));
const SLAHistory = lazy(() => import("./pages/SLAHistory"));
const RolesPage = lazy(() => import("./pages/admin/RolesPage"));
const RateLimitDashboard = lazy(() => import("./pages/admin/RateLimitDashboard"));

// Route loading fallback component
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  // Register service worker for push notifications
  useServiceWorker();

  // Global unhandled rejection handler
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      log.error("Unhandled promise rejection:", event.reason);
      event.preventDefault();
    };
    const errorHandler = (event: ErrorEvent) => {
      log.error("Uncaught error:", event.error);
    };
    window.addEventListener("unhandledrejection", handler);
    window.addEventListener("error", errorHandler);
    return () => {
      window.removeEventListener("unhandledrejection", handler);
      window.removeEventListener("error", errorHandler);
    };
  }, []);

  return (
    <BrowserRouter>
      {/* Enhanced skip links for accessibility */}
      <SkipLinks />
      
      {/* Live region for announcements */}
      <LiveRegion />
      
      <GlobalKeyboardProvider>
        <RealtimeSentimentAlertProvider />
        <Toaster />
        <Sonner />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/callback" element={<SSOCallback />} />
            <Route path="/2fa" element={<TwoFactorAuth />} />
            
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/queue/:id" element={<ProtectedRoute><QueueDetails /></ProtectedRoute>} />
            <Route path="/queues/comparison" element={<ProtectedRoute><QueuesComparison /></ProtectedRoute>} />
            <Route path="/sla" element={<ProtectedRoute><SLADashboard /></ProtectedRoute>} />
            <Route path="/sla/history" element={<ProtectedRoute><SLAHistory /></ProtectedRoute>} />
            
            {/* Admin routes */}
            <Route path="/admin/roles" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <RolesPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/rate-limit" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <RateLimitDashboard />
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </GlobalKeyboardProvider>
    </BrowserRouter>
  );
}

function AppWithErrorRecovery() {
  const [errorKey, setErrorKey] = useState(0);

  // Auto-recover from stale errors on mount
  useEffect(() => {
    setErrorKey(prev => prev + 1);
  }, []);

  return (
    <ErrorBoundary
      resetKey={errorKey}
      onError={(error) => {
        log.error('ErrorBoundary caught:', error.message, error.stack);
        // Auto-retry after 2 seconds
        setTimeout(() => setErrorKey(prev => prev + 1), 2000);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HighContrastProvider>
            <GamificationProvider>
              <EasterEggsProvider>
                <AccessibleToastProvider>
                  <TooltipProvider delayDuration={300}>
                    <AppContent />
                  </TooltipProvider>
                </AccessibleToastProvider>
              </EasterEggsProvider>
            </GamificationProvider>
          </HighContrastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const log = getLogger('App');

const App = () => <AppWithErrorRecovery />;


export default App;
