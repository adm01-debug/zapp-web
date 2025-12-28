import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { GamificationProvider } from "@/components/gamification/GamificationProvider";
import { RealtimeSentimentAlertProvider } from "@/components/notifications/RealtimeSentimentAlertProvider";
import { GlobalKeyboardProvider } from "@/components/keyboard/GlobalKeyboardProvider";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import QueueDetails from "./pages/QueueDetails";
import QueuesComparison from "./pages/QueuesComparison";
import SLADashboard from "./pages/SLADashboard";
import SLAHistory from "./pages/SLAHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  // Register service worker for push notifications
  useServiceWorker();

  return (
    <BrowserRouter>
      <GlobalKeyboardProvider>
        <RealtimeSentimentAlertProvider />
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/queue/:id" element={<QueueDetails />} />
          <Route path="/queues/comparison" element={<QueuesComparison />} />
          <Route path="/sla" element={<SLADashboard />} />
          <Route path="/sla/history" element={<SLAHistory />} />
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
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </GamificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
