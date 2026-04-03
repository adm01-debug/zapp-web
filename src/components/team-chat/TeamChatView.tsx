import { useState } from 'react';
import { useTeamConversations } from '@/hooks/useTeamChat';
import { TeamConversationList } from './TeamConversationList';
import { TeamChatPanel } from './TeamChatPanel';
import { TeamMemberDetails } from './TeamMemberDetails';
import { NewConversationDialog } from './NewConversationDialog';
import { MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useTeamChatNotifications } from '@/hooks/useTeamChatNotifications';

export function TeamChatView() {
  const { data: conversations = [], isLoading } = useTeamConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Enable differentiated notifications for team chat
  useTeamChatNotifications(selectedId);

  const selectedConversation = conversations.find(c => c.id === selectedId) || null;

  return (
    <div className="flex h-full w-full bg-background">
      {/* Sidebar */}
      <div className={cn(
        "w-80 border-r border-border flex flex-col shrink-0",
        selectedId && "hidden md:flex"
      )}>
        <TeamConversationList
          conversations={conversations}
          isLoading={isLoading}
          selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); setShowDetails(false); }}
          onNewConversation={() => setShowNewDialog(true)}
        />
      </div>

      {/* Chat area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 w-0",
        !selectedId && "hidden md:flex"
      )}>
        {selectedConversation ? (
          <TeamChatPanel
            conversation={selectedConversation}
            onBack={() => setSelectedId(null)}
            onToggleDetails={() => setShowDetails(prev => !prev)}
            showDetails={showDetails}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={MessageSquare}
              title="Chat da Equipe"
              description="Selecione uma conversa ou inicie uma nova para conversar com seus colegas"
              illustration="messages"
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Details panel */}
      {showDetails && selectedConversation && (
        <TeamMemberDetails
          conversation={selectedConversation}
          onClose={() => setShowDetails(false)}
        />
      )}

      <NewConversationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreated={(id) => {
          setSelectedId(id);
          setShowNewDialog(false);
        }}
      />
    </div>
  );
}
