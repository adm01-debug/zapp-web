import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { InboxView } from '@/components/inbox/InboxView';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { AgentsView } from '@/components/agents/AgentsView';
import { QueuesView } from '@/components/queues/QueuesView';
import { mockAgents } from '@/data/mockData';

const Index = () => {
  const [currentView, setCurrentView] = useState('inbox');
  const currentAgent = mockAgents[0]; // Simulating logged in agent

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
          name: currentAgent.name,
          avatar: currentAgent.avatar,
          status: currentAgent.status,
        }}
      />
      <main className="flex-1 overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default Index;
