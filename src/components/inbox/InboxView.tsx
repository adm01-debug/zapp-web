import { useState } from 'react';
import { Conversation, Message } from '@/types/chat';
import { ConversationList } from './ConversationList';
import { ChatPanel } from './ChatPanel';
import { ContactDetails } from './ContactDetails';
import { mockConversations, mockMessages } from '@/data/mockData';
import { MessageSquare } from 'lucide-react';

export function InboxView() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>(mockMessages);
  const [showDetails, setShowDetails] = useState(true);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Clear unread count when selecting
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversation.id ? { ...c, unreadCount: 0 } : c
      )
    );
  };

  const handleSendMessage = (content: string) => {
    if (!selectedConversation) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConversation.id,
      content,
      type: 'text',
      sender: 'agent',
      agentId: '1',
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [selectedConversation.id]: [
        ...(prev[selectedConversation.id] || []),
        newMessage,
      ],
    }));

    // Update conversation's last message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? { ...c, lastMessage: newMessage, updatedAt: new Date() }
          : c
      )
    );
  };

  const currentMessages = selectedConversation
    ? messages[selectedConversation.id] || []
    : [];

  return (
    <div className="flex h-full relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-glow/5 rounded-full blur-3xl" />
      </div>

      {/* Conversation List */}
      <div className="w-96 flex-shrink-0 relative z-10">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?.id}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex relative z-10">
        {selectedConversation ? (
          <>
            <div className="flex-1 relative">
              <ChatPanel
                conversation={selectedConversation}
                messages={currentMessages}
                onSendMessage={handleSendMessage}
              />
            </div>
            {showDetails && (
              <ContactDetails
                conversation={selectedConversation}
                onClose={() => setShowDetails(false)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-muted/30 via-background to-muted/20">
            <div className="text-center glass-soft p-8 rounded-2xl">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--gradient-primary)' }}
              >
                <MessageSquare className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Escolha uma conversa na lista ao lado para começar a atender
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
