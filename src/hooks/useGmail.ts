import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createGmailOAuthState, storeGmailOAuthReturnContext } from '@/lib/gmailOAuth';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GmailAccount {
  id: string;
  email_address: string;
  is_active: boolean;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
  last_sync_at: string | null;
  created_at: string;
}

export interface EmailThread {
  id: string;
  gmail_account_id: string;
  gmail_thread_id: string;
  contact_id: string | null;
  subject: string;
  snippet: string;
  label_ids: string[];
  message_count: number;
  is_unread: boolean;
  is_starred: boolean;
  is_important: boolean;
  last_message_at: string;
  assigned_to: string | null;
  status: 'open' | 'pending' | 'resolved' | 'archived';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: { id: string; name: string; email: string; avatar_url: string | null };
}

export interface EmailMessage {
  id: string;
  thread_id: string;
  gmail_message_id: string;
  gmail_account_id: string;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  reply_to_address: string | null;
  subject: string;
  body_text: string;
  body_html: string;
  snippet: string;
  label_ids: string[];
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  in_reply_to: string | null;
  references_header: string | null;
  internal_date: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
}

export interface EmailAttachment {
  id: string;
  email_message_id: string;
  gmail_attachment_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string | null;
}

export interface EmailLabel {
  id: string;
  gmail_label_id: string;
  name: string;
  label_type: 'system' | 'user';
  color: string | null;
  message_count: number;
  unread_count: number;
}

// ─── Edge Function Caller ───────────────────────────────────────────────────

async function callGmailFunction(functionName: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await supabase.functions.invoke(functionName, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (response.error) throw new Error(response.error.message);
  return response.data;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useGmail(accountId?: string) {
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // ── Accounts ────────────────────────────────────────────────────────────

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['gmail-accounts'],
    queryFn: async () => {
      // Try edge function first (includes OAuth validation)
      try {
        const result = await callGmailFunction('gmail-oauth', { action: 'list-accounts' });
        return (result.accounts || []) as GmailAccount[];
      } catch {
        // Fallback: read via secure RPC function (hides OAuth tokens)
        const { data, error } = await supabase
          .rpc('get_own_gmail_accounts');
        if (error) throw error;
        return (data || []).map((a: any) => ({
          id: a.id,
          email_address: a.email_address,
          is_active: a.is_active,
          sync_status: a.sync_status || 'pending',
          last_sync_at: a.last_sync_at,
          created_at: a.created_at,
        })) as GmailAccount[];
      }
    },
  });

  const activeAccount = accountId
    ? accounts.find(a => a.id === accountId)
    : accounts[0];

  // ── OAuth ───────────────────────────────────────────────────────────────

  const connectGmail = useMutation({
    mutationFn: async () => {
      const returnView = window.location.hash.replace('#', '') || 'integrations';
      const state = createGmailOAuthState({ view: returnView, integrationView: 'gmail' });
      const result = await callGmailFunction('gmail-oauth', { action: 'get-auth-url', state });
      return result.url as string;
    },
    onSuccess: (url) => {
      const returnView = window.location.hash.replace('#', '') || 'integrations';
      storeGmailOAuthReturnContext(returnView, 'gmail');
      window.location.assign(url);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao conectar Gmail: ${error.message}`);
    },
  });

  const exchangeCode = useMutation({
    mutationFn: async (code: string) => {
      return callGmailFunction('gmail-oauth', { action: 'exchange-code', code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-accounts'] });
      toast.success('Gmail conectado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro na autenticação: ${error.message}`);
    },
  });

  const disconnectGmail = useMutation({
    mutationFn: async (accId: string) => {
      return callGmailFunction('gmail-oauth', { action: 'disconnect', account_id: accId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['gmail-threads'] });
      toast.success('Gmail desconectado');
    },
  });

  // ── Threads ─────────────────────────────────────────────────────────────

  const { data: threads = [], isLoading: threadsLoading, refetch: refetchThreads } = useQuery({
    queryKey: ['gmail-threads', activeAccount?.id],
    queryFn: async () => {
      if (!activeAccount) return [];
      const { data, error } = await supabase
        .from('email_threads')
        .select('*, contact:contacts(id, name, email, avatar_url)')
        .eq('gmail_account_id', activeAccount.id)
        .order('last_message_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as EmailThread[];
    },
    enabled: !!activeAccount,
  });

  // ── Messages for selected thread ────────────────────────────────────────

  const { data: threadMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['gmail-messages', selectedThreadId],
    queryFn: async () => {
      if (!selectedThreadId) return [];
      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('thread_id', selectedThreadId)
        .order('internal_date', { ascending: true });

      if (error) throw error;
      return (data || []) as EmailMessage[];
    },
    enabled: !!selectedThreadId,
  });

  // ── Labels ──────────────────────────────────────────────────────────────

  const { data: labels = [] } = useQuery({
    queryKey: ['gmail-labels', activeAccount?.id],
    queryFn: async () => {
      if (!activeAccount) return [];
      const { data, error } = await supabase
        .from('email_labels')
        .select('*')
        .eq('gmail_account_id', activeAccount.id)
        .order('name');

      if (error) throw error;
      return (data || []) as EmailLabel[];
    },
    enabled: !!activeAccount,
  });

  // ── Sync ────────────────────────────────────────────────────────────────

  const syncInbox = useMutation({
    mutationFn: async (options?: { query?: string; maxResults?: number }) => {
      if (!activeAccount) throw new Error('No active Gmail account');
      return callGmailFunction('gmail-sync', {
        action: 'sync-inbox',
        account_id: activeAccount.id,
        ...options,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gmail-threads'] });
      queryClient.invalidateQueries({ queryKey: ['gmail-labels'] });
      toast.success(`${data.synced} emails sincronizados`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  const syncLabels = useMutation({
    mutationFn: async () => {
      if (!activeAccount) throw new Error('No active Gmail account');
      return callGmailFunction('gmail-sync', {
        action: 'sync-labels',
        account_id: activeAccount.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-labels'] });
    },
  });

  // ── Send / Reply ────────────────────────────────────────────────────────

  const sendEmail = useMutation({
    mutationFn: async (params: {
      to: string | string[];
      subject: string;
      text_body?: string;
      html_body?: string;
      cc?: string[];
      bcc?: string[];
      attachments?: Array<{ filename: string; mimeType: string; content: string }>;
    }) => {
      if (!activeAccount) throw new Error('No active Gmail account');
      return callGmailFunction('gmail-send', {
        action: 'send',
        account_id: activeAccount.id,
        ...params,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-threads'] });
      toast.success('Email enviado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const replyEmail = useMutation({
    mutationFn: async (params: {
      thread_id: string;
      message_id: string;
      to: string | string[];
      subject?: string;
      text_body?: string;
      html_body?: string;
      cc?: string[];
      bcc?: string[];
    }) => {
      if (!activeAccount) throw new Error('No active Gmail account');
      return callGmailFunction('gmail-send', {
        action: 'reply',
        account_id: activeAccount.id,
        ...params,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-threads'] });
      queryClient.invalidateQueries({ queryKey: ['gmail-messages'] });
      toast.success('Resposta enviada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao responder: ${error.message}`);
    },
  });

  // ── Actions ─────────────────────────────────────────────────────────────

  const markAsRead = useMutation({
    mutationFn: async (messageIds: string[]) => {
      if (!activeAccount) throw new Error('No active Gmail account');
      return callGmailFunction('gmail-send', {
        action: 'mark-read',
        account_id: activeAccount.id,
        message_ids: messageIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-threads'] });
      queryClient.invalidateQueries({ queryKey: ['gmail-messages'] });
    },
  });

  const trashMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!activeAccount) throw new Error('No active Gmail account');
      return callGmailFunction('gmail-send', {
        action: 'trash',
        account_id: activeAccount.id,
        message_id: messageId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-threads'] });
      toast.success('Email movido para lixeira');
    },
  });

  const modifyLabels = useMutation({
    mutationFn: async (params: { message_id: string; add_labels?: string[]; remove_labels?: string[] }) => {
      if (!activeAccount) throw new Error('No active Gmail account');
      return callGmailFunction('gmail-send', {
        action: 'modify-labels',
        account_id: activeAccount.id,
        ...params,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-threads'] });
      queryClient.invalidateQueries({ queryKey: ['gmail-messages'] });
    },
  });

  // ── Realtime subscription ───────────────────────────────────────────────

  const subscribeToThreads = useCallback(() => {
    if (!activeAccount) return () => {};

    const channel = supabase
      .channel('gmail-threads-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'email_threads',
        filter: `gmail_account_id=eq.${activeAccount.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['gmail-threads'] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'email_messages',
        filter: `gmail_account_id=eq.${activeAccount.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['gmail-messages'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAccount, queryClient]);

  // ── Stats ───────────────────────────────────────────────────────────────

  const unreadCount = threads.filter(t => t.is_unread).length;
  const starredCount = threads.filter(t => t.is_starred).length;

  return {
    // Accounts
    accounts,
    activeAccount,
    accountsLoading,
    connectGmail,
    exchangeCode,
    disconnectGmail,

    // Threads
    threads,
    threadsLoading,
    selectedThreadId,
    setSelectedThreadId,
    refetchThreads,

    // Messages
    threadMessages,
    messagesLoading,

    // Labels
    labels,

    // Sync
    syncInbox,
    syncLabels,

    // Send
    sendEmail,
    replyEmail,

    // Actions
    markAsRead,
    trashMessage,
    modifyLabels,

    // Realtime
    subscribeToThreads,

    // Stats
    unreadCount,
    starredCount,
  };
}
