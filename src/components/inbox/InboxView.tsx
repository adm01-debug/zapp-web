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
    <div className="flex h-full">
      {/* Conversation List */}
      <div className="w-96 flex-shrink-0">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?.id}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex">
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
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
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
