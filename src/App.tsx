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
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { SkipLink } from "@/components/ui/skip-link";
import { VisuallyHidden, LiveRegion } from "@/components/ui/visually-hidden";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import SSOCallback from "./pages/SSOCallback";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import QueueDetails from "./pages/QueueDetails";
import QueuesComparison from "./pages/QueuesComparison";
import SLADashboard from "./pages/SLADashboard";
import SLAHistory from "./pages/SLAHistory";
import RolesPage from "./pages/admin/RolesPage";
import RateLimitDashboard from "./pages/admin/RateLimitDashboard";
import NotFound from "./pages/NotFound";

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

  return (
    <BrowserRouter>
      {/* Skip links for accessibility */}
      <SkipLink href="#main-content">Pular para conteúdo principal</SkipLink>
      <SkipLink href="#main-navigation">Pular para navegação</SkipLink>
      
      {/* Live region for announcements */}
      <LiveRegion />
      
      <GlobalKeyboardProvider>
        <RealtimeSentimentAlertProvider />
        <Toaster />
        <Sonner />
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
      </GlobalKeyboardProvider>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GamificationProvider>
        <AccessibleToastProvider>
          <TooltipProvider delayDuration={300}>
            <AppContent />
          </TooltipProvider>
        </AccessibleToastProvider>
      </GamificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
