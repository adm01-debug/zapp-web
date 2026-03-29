import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { useMessages } from '@/hooks/useMessages';
import { MobilePullToRefreshIndicator } from '@/components/mobile/MobilePullToRefresh';
import { MiniChatPiP } from '@/components/mobile/MiniChatPiP';
import { useRealtimeMessages, ConversationWithMessages, ConversationContact, RealtimeMessage } from '@/hooks/useRealtimeMessages';
import { NewMessageIndicator } from './NewMessageIndicator';
import { VirtualizedRealtimeList } from './VirtualizedRealtimeList';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { InboxFilters, InboxFiltersState } from './InboxFilters';
import { useGlobalSearchShortcut } from '@/hooks/useGlobalSearchShortcut';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useUndoableAction } from '@/hooks/useUndoableAction';
import { MessageSquare, RefreshCw, Wifi, WifiOff, Volume2, VolumeX, CheckSquare, Search as SearchIcon, MessageSquarePlus, Loader2, ImagePlus, Users, Truck, Wrench, UserCheck, UsersRound, FileText, ShieldCheck, ClipboardList, Handshake } from 'lucide-react';
import { ContactTypeFilter, filterByContactType, FILTER_OPTIONS } from './ContactTypeFilter';
import { TicketTabs, MainTab, SubTab } from './TicketTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Conversation, Message } from '@/types/chat';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

// Lazy-load heavy sub-components (only loaded when needed)
const ChatPanel = lazy(() => import('./ChatPanel').then(m => ({ default: m.ChatPanel })));
const ContactDetails = lazy(() => import('./ContactDetails').then(m => ({ default: m.ContactDetails })));
const GlobalSearch = lazy(() => import('./GlobalSearch').then(m => ({ default: m.GlobalSearch })));
const NewConversationModal = lazy(() => import('./NewConversationModal').then(m => ({ default: m.NewConversationModal })));

const ChatFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="w-6 h-6 text-primary animate-spin" />
  </div>
);

const log = getLogger('RealtimeInboxView');

interface SearchResult {
  id: string;
  type: 'message' | 'contact' | 'transcription';
  title: string;
  preview: string;
  timestamp: Date;
  contactId?: string;
}

export function RealtimeInboxView() {
  const isMobile = useIsMobile();
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
  const [selectedContactFallback, setSelectedContactFallback] = useState<ConversationContact | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pipContact, setPipContact] = useState<{ name: string; avatar?: string; lastMessage?: string; contactId: string } | null>(null);

  // Listen for open-contact-chat events from other views (e.g. Contacts)
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);

  useEffect(() => {
    const appWindow = window as Window & { __pendingOpenContactId?: string };

    if (appWindow.__pendingOpenContactId) {
      setPendingContactId(appWindow.__pendingOpenContactId);
      appWindow.__pendingOpenContactId = undefined;
    }

    const handler = (e: Event) => {
      const contactId = (e as CustomEvent).detail?.contactId;
      if (contactId) {
        appWindow.__pendingOpenContactId = undefined;
        setPendingContactId(contactId);
      }
    };

    window.addEventListener('open-contact-chat', handler);
    return () => window.removeEventListener('open-contact-chat', handler);
  }, []);

  // Process pending contact selection once conversations are loaded
  useEffect(() => {
    if (!pendingContactId || loading) return;
    
    // Switch to search tab so the contact is visible regardless of current filters
    setMainTab('search');
    setSubTab('attending');
    
    // Find conversation or still select it (chat panel will handle missing conversation)
    setSelectedContactId(pendingContactId);
    setSelectedContact(pendingContactId);
    markAsRead(pendingContactId);
    setPendingContactId(null);
  }, [pendingContactId, loading, conversations, setSelectedContact, markAsRead]);

  const { conversations: cachedConversations, isOffline, usingCache } = useOfflineCache(conversations, loading);


  // Pull-to-refresh for mobile
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => { await refetch(); },
    disabled: !isMobile || !!selectedContactId,
  });
  const [soundOn, setSoundOn] = useState(true);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [fetchingAvatars, setFetchingAvatars] = useState(false);

  // Whaticket-style ticket tabs state
  const [mainTab, setMainTab] = useState<MainTab>('open');
  const [subTab, setSubTab] = useState<SubTab>('attending');
  const [showAll, setShowAll] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [selectedContactType, setSelectedContactType] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const {
    messages: selectedMessages,
    loading: selectedMessagesLoading,
  } = useMessages({
    contactId: selectedContactId,
    enabled: Boolean(selectedContactId),
  });

  // URL-persisted filters (including contactType)
  const { filters: urlFilters, setFilters: setUrlFilters, clearFilters: clearUrlFilters } = useUrlFilters();

  // Sync selectedContactType with URL
  useEffect(() => {
    const typeFromUrl = new URLSearchParams(window.location.search).get('type');
    if (typeFromUrl && typeFromUrl !== 'all') {
      setSelectedContactType(typeFromUrl);
    }
  }, []);

  const handleContactTypeChange = useCallback((value: string | null) => {
    setSelectedContactType(value);
    const params = new URLSearchParams(window.location.search);
    if (value && value !== 'all') {
      params.set('type', value);
    } else {
      params.delete('type');
    }
    window.history.replaceState(null, '', params.toString() ? `?${params}` : window.location.pathname + window.location.hash);
  }, []);

  // Load contact_tags mapping for tag-based filtering
  const { data: contactTagsMap = {} } = useQuery({
    queryKey: ['contact-tags-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_tags')
        .select('contact_id, tag_id');
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data || []).forEach(ct => {
        if (!map[ct.contact_id]) map[ct.contact_id] = [];
        map[ct.contact_id].push(ct.tag_id);
      });
      return map;
    },
    staleTime: 30_000,
  });
  
  // Undoable action hook for bulk operations
  const { execute: executeUndoable } = useUndoableAction();

  // Global search shortcut Ctrl+K
  useGlobalSearchShortcut({ onOpen: () => setGlobalSearchOpen(true) });

  // Convert URL filters to InboxFiltersState
  const filters = useMemo<InboxFiltersState>(() => ({
    status: urlFilters.status,
    tags: urlFilters.tags,
    agentId: urlFilters.agentId,
    dateRange: {
      from: urlFilters.dateFrom ? parseISO(urlFilters.dateFrom) : null,
      to: urlFilters.dateTo ? parseISO(urlFilters.dateTo) : null,
    },
  }), [urlFilters]);

  // Sync search from URL
  const search = urlFilters.search;
  const setSearch = useCallback((value: string) => {
    setUrlFilters({ search: value });
  }, [setUrlFilters]);

  // Update filters and sync to URL
  const setFilters = useCallback((newFilters: InboxFiltersState) => {
    setUrlFilters({
      status: newFilters.status,
      tags: newFilters.tags,
      agentId: newFilters.agentId,
      dateFrom: newFilters.dateRange.from?.toISOString().split('T')[0] || null,
      dateTo: newFilters.dateRange.to?.toISOString().split('T')[0] || null,
    });
  }, [setUrlFilters]);

  // Filter conversations by tabs, search and advanced filters
  const filteredConversations = useMemo(() => {
    // Safety: filter out any conversations with missing contact data
    let result = cachedConversations.filter(c => c && c.contact && c.contact.id);

    // === Tab-based filtering (Whaticket style) ===
    if (mainTab === 'open') {
      // Only conversations with messages (active)
      result = result.filter(c => c.messages.length > 0);
      
      // Sub-tab filtering
      if (subTab === 'attending') {
        // "Atendendo" = assigned to current user (compare with profile.id, not auth user.id)
        if (!showAll) {
          result = result.filter(c => c.contact.assigned_to === profile?.id);
        }
        // If showAll is true, show all assigned conversations
      } else if (subTab === 'waiting') {
        // "Aguardando" = not assigned to anyone (waiting in queue)
        result = result.filter(c => !c.contact.assigned_to);
      }

      // Queue filter
      if (selectedQueueId) {
        result = result.filter(c => c.contact.queue_id === selectedQueueId);
      }
    } else if (mainTab === 'resolved') {
      // Show contacts with no recent messages or no messages at all
      result = result.filter(c => c.messages.length === 0);
    }
    // 'search' tab: show all, filtered by search below

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.contact.name.toLowerCase().includes(searchLower) ||
          c.contact.phone.includes(search) ||
          c.contact.email?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((c) => {
        const hasUnread = c.unreadCount > 0;
        const isAssigned = !!c.contact.assigned_to;
        if (filters.status.includes('unread') && hasUnread) return true;
        if (filters.status.includes('read') && !hasUnread && isAssigned) return true;
        if (filters.status.includes('pending') && !isAssigned && c.messages.length > 0) return true;
        if (filters.status.includes('resolved') && c.messages.length === 0) return true;
        return false;
      });
    }

    // Tags filter (uses contact_tags junction table)
    if (filters.tags.length > 0) {
      result = result.filter((c) => {
        const tagIds = contactTagsMap[c.contact.id] || [];
        return filters.tags.some(filterTagId => tagIds.includes(filterTagId));
      });
    }

    // Agent filter
    if (filters.agentId) {
      result = result.filter((c) => c.contact.assigned_to === filters.agentId);
    }

    // Date range filter
    if (filters.dateRange.from) {
      result = result.filter((c) => {
        const lastMessageDate = c.lastMessage 
          ? new Date(c.lastMessage.created_at)
          : new Date(c.contact.created_at);
        
        if (filters.dateRange.from && isBefore(lastMessageDate, startOfDay(filters.dateRange.from))) {
          return false;
        }
        if (filters.dateRange.to && isAfter(lastMessageDate, endOfDay(filters.dateRange.to))) {
          return false;
        }
        return true;
      });
    }

    // Contact type filter (using centralized filter)
    result = filterByContactType(result, selectedContactType);

    // Smart sorting: unread first → most recent → oldest
    result.sort((a, b) => {
      // Unread first
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      // Then by most recent message
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.contact.updated_at).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.contact.updated_at).getTime();
      return bTime - aTime;
    });

    return result;
  }, [cachedConversations, search, filters, mainTab, subTab, showAll, selectedQueueId, selectedContactType, profile?.id, contactTagsMap]);

  // Get selected conversation
  const selectedConversation = useMemo(
    () => cachedConversations.find((c) => c.contact.id === selectedContactId) || null,
    [cachedConversations, selectedContactId]
  );

  useEffect(() => {
    if (!selectedContactId) {
      setSelectedContactFallback(null);
      return;
    }

    if (selectedConversation) {
      setSelectedContactFallback(null);
      return;
    }

    let cancelled = false;

    const loadSelectedContact = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', selectedContactId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        log.error('Error loading selected fallback contact:', error);
        setSelectedContactFallback(null);
        return;
      }

      setSelectedContactFallback(data || null);
    };

    loadSelectedContact();

    return () => {
      cancelled = true;
    };
  }, [selectedContactId, selectedConversation]);

  const resolvedSelectedConversation = useMemo<ConversationWithMessages | null>(() => {
    if (selectedConversation) return selectedConversation;
    if (!selectedContactFallback) return null;

    return {
      contact: selectedContactFallback,
      messages: [],
      unreadCount: 0,
      lastMessage: null,
    };
  }, [selectedConversation, selectedContactFallback]);

  // Handle selecting a conversation
  const handleSelectConversation = (contactId: string) => {
    setSelectedContactId(contactId);
    setSelectedContact(contactId);
    markAsRead(contactId);
  };

  // Handle global search result
  const handleGlobalSearchResult = (result: SearchResult) => {
    if (result.contactId) {
      handleSelectConversation(result.contactId);
    }
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

  // Handle sending an audio message
  const handleSendAudio = async (blob: Blob) => {
    if (!selectedContactId) {
      toast.error('Selecione uma conversa primeiro');
      return;
    }

    try {
      const fileName = `${selectedContactId}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('audio-messages')
        .upload(fileName, blob, { contentType: 'audio/webm' });

      if (uploadError) {
        log.error('Error uploading audio:', uploadError);
        toast.error('Erro ao fazer upload do áudio');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('audio-messages')
        .getPublicUrl(fileName);

      // Send via public URL — Evolution API converts WebM to OGG/Opus automatically
      await sendMessage(selectedContactId, '[Áudio]', 'audio', urlData.publicUrl);
    } catch (err) {
      log.error('Error in handleSendAudio:', err);
      toast.error('Erro ao enviar áudio. Tente novamente.');
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedIds(new Set());
    }
  };

  // Toggle item selection
  const toggleSelection = useCallback((contactId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  // Bulk mark as read
  const bulkMarkAsRead = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    setBulkLoading(true);
    try {
      const contactIds = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('contact_id', contactIds)
        .eq('is_read', false);
      
      if (error) throw error;
      
      toast.success(`${contactIds.length} conversa(s) marcada(s) como lida(s)`);
      clearSelection();
      refetch();
    } catch (err) {
      toast.error('Erro ao marcar como lido');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, refetch]);

  // Bulk transfer
  const bulkTransfer = useCallback(async (type: 'agent' | 'queue', targetId: string, message?: string) => {
    if (selectedIds.size === 0) return;
    
    setBulkLoading(true);
    try {
      const contactIds = Array.from(selectedIds);
      
      const updateData: { assigned_to?: string; queue_id?: string } = {};
      if (type === 'agent') {
        updateData.assigned_to = targetId;
      } else {
        updateData.queue_id = targetId;
      }
      
      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .in('id', contactIds);
      
      if (error) throw error;
      
      toast.success(`${contactIds.length} contato(s) transferido(s)`);
      clearSelection();
      refetch();
    } catch (err) {
      toast.error('Erro ao transferir contatos');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, refetch]);

  // Bulk archive with undo capability
  const bulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    setBulkLoading(true);
    const contactIds = Array.from(selectedIds);
    
    // Store original assignments for undo
    const { data: originalContacts } = await supabase
      .from('contacts')
      .select('id, assigned_to')
      .in('id', contactIds);
    
    try {
      await executeUndoable({
        successMessage: `${contactIds.length} contato(s) arquivado(s)`,
        undoMessage: 'Arquivamento desfeito',
        action: async () => {
          const { error } = await supabase
            .from('contacts')
            .update({ assigned_to: null })
            .in('id', contactIds);
          
          if (error) throw error;
          clearSelection();
          refetch();
        },
        undoAction: async () => {
          // Restore original assignments
          if (originalContacts) {
            for (const contact of originalContacts) {
              await supabase
                .from('contacts')
                .update({ assigned_to: contact.assigned_to })
                .eq('id', contact.id);
            }
          }
          refetch();
        },
        onCommit: () => {
          // Action committed after undo period
        },
      });
    } catch (err) {
      toast.error('Erro ao arquivar contatos');
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, clearSelection, refetch, executeUndoable]);

  // Select all conversations
  const selectAll = useCallback(() => {
    if (!selectionMode) {
      setSelectionMode(true);
    }
    const allIds = new Set(filteredConversations.map(c => c.contact.id));
    setSelectedIds(allIds);
    toast.success(`${allIds.size} conversa(s) selecionada(s)`);
  }, [filteredConversations, selectionMode]);

  // Keyboard shortcuts for bulk actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isInputField = activeElement?.tagName === 'INPUT' || 
                          activeElement?.tagName === 'TEXTAREA' ||
                          activeElement?.getAttribute('contenteditable') === 'true';
      
      if (isInputField) return;

      // Ctrl+A or Cmd+A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }

      // Delete or Backspace: Archive selected (only when in selection mode with items selected)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectionMode && selectedIds.size > 0) {
        e.preventDefault();
        bulkArchive();
      }

      // Escape: Clear selection
      if (e.key === 'Escape' && selectionMode) {
        e.preventDefault();
        clearSelection();
      }

      // R: Mark as read (only when in selection mode with items selected)
      if (e.key === 'r' && selectionMode && selectedIds.size > 0 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        bulkMarkAsRead();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectAll, bulkArchive, bulkMarkAsRead, clearSelection, selectionMode, selectedIds.size]);

  // Convert to legacy format for ChatPanel compatibility
  const legacyConversation: Conversation | null = resolvedSelectedConversation
    ? {
        id: resolvedSelectedConversation.contact.id,
        contact: {
          id: resolvedSelectedConversation.contact.id,
          name: resolvedSelectedConversation.contact.name,
          phone: resolvedSelectedConversation.contact.phone,
          email: resolvedSelectedConversation.contact.email || undefined,
          avatar: resolvedSelectedConversation.contact.avatar_url || undefined,
          tags: resolvedSelectedConversation.contact.tags || [],
          createdAt: new Date(resolvedSelectedConversation.contact.created_at),
        },
        lastMessage: resolvedSelectedConversation.lastMessage
          ? {
              id: resolvedSelectedConversation.lastMessage.id,
              conversationId: resolvedSelectedConversation.contact.id,
              content: resolvedSelectedConversation.lastMessage.content,
              type: resolvedSelectedConversation.lastMessage.message_type as Message['type'],
              sender: resolvedSelectedConversation.lastMessage.sender as Message['sender'],
              timestamp: new Date(resolvedSelectedConversation.lastMessage.created_at),
              status: 'read' as const,
            }
          : undefined,
        unreadCount: resolvedSelectedConversation.unreadCount,
        status: 'open',
        priority: 'medium',
        tags: resolvedSelectedConversation.contact.tags || [],
        createdAt: new Date(resolvedSelectedConversation.contact.created_at),
        updatedAt: new Date(resolvedSelectedConversation.contact.updated_at),
      }
    : null;

  const messageSource = selectedContactId
    ? selectedMessages
    : resolvedSelectedConversation?.messages || [];

  const legacyMessages: Message[] = messageSource.map((m) => ({
    id: m.id,
    conversationId: resolvedSelectedConversation?.contact.id || selectedContactId || '',
    content: m.content,
    type: m.message_type as Message['type'],
    sender: m.sender as Message['sender'],
    agentId: m.agent_id || undefined,
    timestamp: new Date(m.created_at),
    status:
      (m.status as Message['status'] | null) ||
      (m.is_read ? 'read' : 'delivered'),
    mediaUrl: m.media_url || undefined,
    transcription: m.transcription || null,
    transcriptionStatus: m.transcription_status as Message['transcriptionStatus'] || null,
  }));

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

  const handleBatchFetchAvatars = useCallback(async () => {
    setFetchingAvatars(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('batch-fetch-avatars');
      if (fnError) throw fnError;
      toast.success(`${data?.updated || 0} avatares atualizados de ${data?.processed || 0} contatos.`);
      refetch();
    } catch (err: any) {
      log.error('Batch avatar fetch error:', err);
      toast.error('Erro ao buscar avatares: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setFetchingAvatars(false);
    }
  }, [refetch]);

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
    <div className="flex h-full min-h-0 w-full relative bg-background overflow-hidden">
      {/* Global Search Modal - lazy */}
      {globalSearchOpen && (
        <Suspense fallback={null}>
          <GlobalSearch 
            open={globalSearchOpen} 
            onOpenChange={setGlobalSearchOpen} 
            onSelectResult={handleGlobalSearchResult}
          />
        </Suspense>
      )}

      {/* New Message Notification Indicator */}
      <NewMessageIndicator
        show={!!newMessageNotification}
        contactName={newMessageNotification?.contactName || ''}
        contactAvatar={newMessageNotification?.contactAvatar}
        message={newMessageNotification?.message || ''}
        onView={handleNotificationView}
        onDismiss={dismissNotification}
      />

      {/* New Conversation Modal - lazy */}
      {showNewConversation && (
        <Suspense fallback={null}>
          <NewConversationModal
            open={showNewConversation}
            onOpenChange={setShowNewConversation}
            onConversationStarted={(contactId) => {
              setSelectedContactId(contactId);
              refetch();
            }}
          />
        </Suspense>
      )}

      {/* Conversation List — DreamsChat: 320px fixed */}
      <div className={cn(
        'h-full min-h-0 flex-shrink-0 relative z-10 border-r border-border bg-card flex flex-col overflow-hidden',
        isMobile
          ? selectedContactId ? 'hidden' : 'w-full'
          : 'w-[320px] min-w-[320px] max-w-[320px]'
      )}>
        {/* Bulk Actions Toolbar */}
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onMarkAsRead={bulkMarkAsRead}
          onTransfer={bulkTransfer}
          onArchive={bulkArchive}
          onClearSelection={clearSelection}
          isLoading={bulkLoading}
        />

        {/* Header — Compact DreamsChat style */}
        <div className="px-4 pt-4 pb-3 border-b border-border space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Conversas</h2>
              <span className={cn(
                'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                isOnline 
                  ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]' 
                  : 'bg-destructive/15 text-destructive'
              )}>
                {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                {isOnline ? 'Live' : 'Off'}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleSelectionMode}
                    className={cn(
                      'w-7 h-7',
                      selectionMode ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                    )}
                    aria-label={selectionMode ? 'Sair do modo seleção' : 'Selecionar múltiplos'}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {selectionMode ? 'Sair seleção' : 'Selecionar'}
                </TooltipContent>
              </Tooltip>
              
              
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={refetch} 
                    disabled={loading}
                    className="w-7 h-7"
                    aria-label="Atualizar"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Atualizar</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleBatchFetchAvatars}
                    disabled={fetchingAvatars}
                    className="w-7 h-7"
                    aria-label="Buscar avatares"
                  >
                    <ImagePlus className={cn('w-3.5 h-3.5', fetchingAvatars && 'animate-pulse text-primary')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Buscar Avatares</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowNewConversation(true)}
                    className="w-7 h-7 text-primary hover:bg-primary/10"
                    aria-label="Nova conversa"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Nova Conversa</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Search bar — DreamsChat rounded pill */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={() => setGlobalSearchOpen(true)}
              className="pl-9 bg-muted/50 border-0 rounded-full h-8 text-xs cursor-pointer placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/30"
              readOnly
            />
          </div>

          {/* Contact Type Filter */}
          <ContactTypeFilter
            value={selectedContactType}
            onChange={handleContactTypeChange}
            conversations={cachedConversations}
          />

          {/* Whaticket-style Ticket Tabs */}
          <TicketTabs
            conversations={conversations}
            mainTab={mainTab}
            subTab={subTab}
            onMainTabChange={setMainTab}
            onSubTabChange={setSubTab}
            showAll={showAll}
            onShowAllChange={setShowAll}
            selectedQueueId={selectedQueueId}
            onQueueChange={setSelectedQueueId}
          />

          {/* Advanced Filters (below tabs) */}
          <InboxFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Pull to refresh indicator (mobile only) */}
        {isMobile && (
          <MobilePullToRefreshIndicator
            isRefreshing={pullToRefresh.isRefreshing}
            pullProgress={pullToRefresh.pullProgress}
            pullDistance={pullToRefresh.pullDistance}
          />
        )}

        {/* Conversation List */}
        <div
          ref={pullToRefresh.containerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          {...(isMobile ? pullToRefresh.handlers : {})}
        >
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'Nenhuma conversa encontrada' : 'Sem conversas'}
              </p>
            </div>
          ) : (
            <ErrorBoundary
              fallback={
                <div className="p-8 text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Erro ao carregar. Recarregue.</p>
                </div>
              }
              onError={(error, info) => {
                log.error('VirtualizedRealtimeList crashed:', error.message, error.stack, info);
              }}
            >
              <VirtualizedRealtimeList 
                conversations={filteredConversations}
                selectedContactId={selectedContactId}
                onSelectConversation={handleSelectConversation}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>

      {/* Chat Panel — flexible remaining space */}
      <div className={cn(
        'flex-1 flex min-w-0 min-h-0 relative z-10 bg-background h-full overflow-hidden',
        isMobile && !selectedContactId && 'hidden'
      )}>
        {legacyConversation ? (
          <Suspense fallback={<ChatFallback />}>
            <>
              <div className="flex-1 min-w-0 min-h-0 relative h-full overflow-hidden">
                {selectedContactId && selectedMessagesLoading ? (
                  <ChatFallback />
                ) : (
                  <ChatPanel
                    key={legacyConversation.id}
                    conversation={legacyConversation}
                    messages={legacyMessages}
                    onSendMessage={handleSendMessage}
                    onSendAudio={handleSendAudio}
                    showDetails={isMobile ? false : showDetails}
                    onToggleDetails={() => setShowDetails(!showDetails)}
                    onBack={isMobile ? () => {
                      // Show PiP when going back on mobile
                      if (legacyConversation) {
                        setPipContact({
                          name: legacyConversation.contact.name,
                          avatar: legacyConversation.contact.avatar,
                          lastMessage: legacyConversation.lastMessage?.content,
                          contactId: legacyConversation.id,
                        });
                      }
                      setSelectedContactId(null);
                    } : undefined}
                  />
                )}
              </div>
              {showDetails && !isMobile && (
                <div className="h-full shrink-0 overflow-hidden">
                  <ContactDetails
                    key={`details-${legacyConversation.id}`}
                    conversation={legacyConversation}
                    onClose={() => setShowDetails(false)}
                  />
                </div>
              )}
            </>
          </Suspense>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background min-h-0 overflow-hidden">
            <div className="text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7 text-primary/60" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Selecione uma conversa
              </h3>
              <p className="text-muted-foreground text-xs max-w-[200px]">
                Escolha uma conversa na lista ao lado para começar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Offline banner */}
      {usingCache && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-warning/90 text-warning-foreground text-xs text-center py-1.5 font-medium">
          📡 Modo offline — exibindo dados em cache
        </div>
      )}

      {/* Mini Chat PiP for mobile */}
      {isMobile && pipContact && !selectedContactId && (
        <MiniChatPiP
          contactName={pipContact.name}
          contactAvatar={pipContact.avatar}
          lastMessage={pipContact.lastMessage}
          isVisible={true}
          onExpand={() => {
            setSelectedContactId(pipContact.contactId);
            setPipContact(null);
          }}
          onDismiss={() => setPipContact(null)}
          onQuickReply={(text) => {
            sendMessage(pipContact.contactId, text);
            setPipContact(null);
          }}
        />
      )}
    </div>
  );
}
