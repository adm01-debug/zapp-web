import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { InboxView } from '@/components/inbox/InboxView';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { AgentsView } from '@/components/agents/AgentsView';
import { QueuesView } from '@/components/queues/QueuesView';
import { ContactsView } from '@/components/contacts/ContactsView';
import { ConnectionsView } from '@/components/connections/ConnectionsView';
import { TagsView } from '@/components/tags/TagsView';
import { SettingsView } from '@/components/settings/SettingsView';
import { ClientWalletView } from '@/components/wallet/ClientWalletView';
import { AdminView } from '@/components/admin/AdminView';
import { PageTransition } from '@/components/ui/motion';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('inbox');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user && !loading) {
      logAudit({ action: 'login', details: { email: user.email } });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-whatsapp border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderView = () => {
    switch (currentView) {
      case 'inbox':
        return <InboxView />;
      case 'dashboard':
        return <DashboardView />;
      case 'agents':
        return <AgentsView />;
      case 'queues':
        return <QueuesView />;
      case 'contacts':
        return <ContactsView />;
      case 'connections':
        return <ConnectionsView />;
      case 'wallet':
        return <ClientWalletView />;
      case 'admin':
        return <AdminView />;
      case 'tags':
        return <TagsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
              </h2>
              <p className="text-muted-foreground">
                Esta seção está em desenvolvimento
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
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
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <PageTransition key={currentView}>
            {renderView()}
          </PageTransition>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
