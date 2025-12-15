import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
import { GroupsView } from '@/components/groups/GroupsView';
import { PageTransition } from '@/components/ui/motion';
import { useAuth } from '@/hooks/useAuth';
import { logAudit } from '@/lib/audit';
import { Sparkles } from 'lucide-react';

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
        return <InboxView />;
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
      case 'admin':
        return <AdminView />;
      case 'tags':
        return <TagsView />;
      case 'settings':
        return <SettingsView />;
      default:
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
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Subtle background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-primary-glow/5 rounded-full blur-3xl" />
      </div>
      
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
      
      <main className="flex-1 overflow-hidden relative">
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
