import { useState, useEffect, useMemo } from 'react';
import { useRealtimeMessages, ConversationWithMessages, RealtimeMessage } from '@/hooks/useRealtimeMessages';
import { ChatPanel } from './ChatPanel';
import { ContactDetails } from './ContactDetails';
import { NewMessageIndicator } from './NewMessageIndicator';
import { VirtualizedRealtimeList } from './VirtualizedRealtimeList';
import { MessageSquare, RefreshCw, Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react';
import { FloatingParticles } from '@/components/dashboard/FloatingParticles';
import { AuroraBorealis } from '@/components/effects/AuroraBorealis';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search } from 'lucide-react';
import { Conversation, Message } from '@/types/chat';
import { toast } from 'sonner';

export function RealtimeInboxView() {
  const { 
    conversations, 
    loading, 
    error, 
    sendMessage, 
    markAsRead, 
    refetch,
    newMessageNotification,
    dismissNotification,
    setSelectedContact,
    setSoundEnabled,
  } = useRealtimeMessages();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [search, setSearch] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const searchLower = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.contact.name.toLowerCase().includes(searchLower) ||
        c.contact.phone.includes(search) ||
        c.contact.email?.toLowerCase().includes(searchLower)
    );
  }, [conversations, search]);

  // Get selected conversation
  const selectedConversation = useMemo(
    () => conversations.find((c) => c.contact.id === selectedContactId) || null,
    [conversations, selectedContactId]
  );

  // Handle selecting a conversation
  const handleSelectConversation = (contactId: string) => {
    setSelectedContactId(contactId);
    setSelectedContact(contactId);
    markAsRead(contactId);
  };

  // Handle notification view click
  const handleNotificationView = () => {
    if (newMessageNotification) {
      handleSelectConversation(newMessageNotification.contactId);
      dismissNotification();
    }
  };

  // Toggle sound
  const toggleSound = () => {
    const newValue = !soundOn;
    setSoundOn(newValue);
    setSoundEnabled(newValue);
  };

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!selectedContactId) return;

    try {
      await sendMessage(selectedContactId, content);
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  // Convert to legacy format for ChatPanel compatibility
  const legacyConversation: Conversation | null = selectedConversation
    ? {
        id: selectedConversation.contact.id,
        contact: {
          id: selectedConversation.contact.id,
          name: selectedConversation.contact.name,
          phone: selectedConversation.contact.phone,
          email: selectedConversation.contact.email || undefined,
          avatar: selectedConversation.contact.avatar_url || undefined,
          tags: selectedConversation.contact.tags || [],
          createdAt: new Date(selectedConversation.contact.created_at),
        },
        lastMessage: selectedConversation.lastMessage
          ? {
              id: selectedConversation.lastMessage.id,
              conversationId: selectedConversation.contact.id,
              content: selectedConversation.lastMessage.content,
              type: selectedConversation.lastMessage.message_type as any,
              sender: selectedConversation.lastMessage.sender as any,
              timestamp: new Date(selectedConversation.lastMessage.created_at),
              status: 'read' as const,
            }
          : undefined,
        unreadCount: selectedConversation.unreadCount,
        status: 'open',
        priority: 'medium',
        tags: selectedConversation.contact.tags || [],
        createdAt: new Date(selectedConversation.contact.created_at),
        updatedAt: new Date(selectedConversation.contact.updated_at),
      }
    : null;

  const legacyMessages: Message[] =
    selectedConversation?.messages.map((m) => ({
      id: m.id,
      conversationId: selectedConversation.contact.id,
      content: m.content,
      type: m.message_type as any,
      sender: m.sender as any,
      agentId: m.agent_id || undefined,
      timestamp: new Date(m.created_at),
      status: m.is_read ? 'read' : 'delivered',
      mediaUrl: m.media_url || undefined,
      transcription: m.transcription || null,
      transcriptionStatus: m.transcription_status as any || null,
    })) || [];

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Erro de conexão</h3>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full relative bg-background">
      {/* New Message Notification Indicator */}
      <NewMessageIndicator
        show={!!newMessageNotification}
        contactName={newMessageNotification?.contactName || ''}
        contactAvatar={newMessageNotification?.contactAvatar}
        message={newMessageNotification?.message || ''}
        onView={handleNotificationView}
        onDismiss={dismissNotification}
      />

      <AuroraBorealis />
      <FloatingParticles />

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-secondary/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Conversation List */}
      <div className="w-96 flex-shrink-0 relative z-10 border-r border-border/20 bg-card/50 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
              <Badge variant="outline" className={cn(
                'text-xs gap-1',
                isOnline ? 'border-success text-success' : 'border-destructive text-destructive'
              )}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSound}
                className={cn(
                  'w-8 h-8',
                  soundOn ? 'text-primary' : 'text-muted-foreground'
                )}
                title={soundOn ? 'Som ativado' : 'Som desativado'}
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={refetch} disabled={loading}>
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/20"
            />
          </div>
        </div>

        {/* Virtualized Conversation List */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search ? 'Nenhuma conversa encontrada' : 'Sem conversas ainda'}
              </p>
            </div>
          ) : (
            <VirtualizedRealtimeList 
              conversations={filteredConversations}
              selectedContactId={selectedContactId}
              onSelectConversation={handleSelectConversation}
            />
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex relative z-10">
        {legacyConversation ? (
          <>
            <div className="flex-1 relative">
              <ChatPanel
                conversation={legacyConversation}
                messages={legacyMessages}
                onSendMessage={handleSendMessage}
              />
            </div>
            {showDetails && (
              <ContactDetails
                conversation={legacyConversation}
                onClose={() => setShowDetails(false)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-card/50">
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-primary" />
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
