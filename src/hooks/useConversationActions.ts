import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addHours, startOfTomorrow, addDays, setHours } from 'date-fns';

interface PinnedConversation {
  contact_id: string;
  position: number;
}

interface SnoozedConversation {
  id: string;
  contact_id: string;
  snooze_until: string;
}

interface FavoriteContact {
  contact_id: string;
}

export function useConversationActions() {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profileId) {
      loadPinned();
      loadFavorites();
      loadSnoozed();
    }
  }, [profileId]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (data) setProfileId(data.id);
  };

  const loadPinned = async () => {
    if (!profileId) return;
    const { data } = await supabase
      .from('pinned_conversations')
      .select('contact_id')
      .eq('pinned_by', profileId);
    if (data) setPinnedIds(new Set(data.map((p) => p.contact_id)));
  };

  const loadFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('favorite_contacts')
      .select('contact_id')
      .eq('user_id', user.id);
    if (data) setFavoriteIds(new Set(data.map((f: FavoriteContact) => f.contact_id)));
  };

  const loadSnoozed = async () => {
    if (!profileId) return;
    const { data } = await supabase
      .from('conversation_snoozes')
      .select('contact_id')
      .eq('snoozed_by', profileId)
      .gt('snooze_until', new Date().toISOString());
    if (data) setSnoozedIds(new Set(data.map((s) => s.contact_id)));
  };

  const pinConversation = useCallback(async (contactId: string) => {
    if (!profileId) return;
    const { error } = await supabase
      .from('pinned_conversations')
      .insert({ contact_id: contactId, pinned_by: profileId, position: 0 });
    if (!error) {
      setPinnedIds(prev => new Set([...prev, contactId]));
      toast.success('Conversa fixada');
    }
  }, [profileId]);

  const unpinConversation = useCallback(async (contactId: string) => {
    if (!profileId) return;
    const { error } = await supabase
      .from('pinned_conversations')
      .delete()
      .eq('contact_id', contactId)
      .eq('pinned_by', profileId);
    if (!error) {
      setPinnedIds(prev => { const n = new Set(prev); n.delete(contactId); return n; });
      toast.success('Conversa desafixada');
    }
  }, [profileId]);

  const favoriteContact = useCallback(async (contactId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('favorite_contacts')
      .insert({ contact_id: contactId, user_id: user.id });
    if (!error) {
      setFavoriteIds(prev => new Set([...prev, contactId]));
      toast.success('Contato favoritado');
    }
  }, []);

  const unfavoriteContact = useCallback(async (contactId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('favorite_contacts')
      .delete()
      .eq('contact_id', contactId)
      .eq('user_id', user.id);
    if (!error) {
      setFavoriteIds(prev => { const n = new Set(prev); n.delete(contactId); return n; });
      toast.success('Favorito removido');
    }
  }, []);

  const snoozeConversation = useCallback(async (contactId: string, duration: string) => {
    if (!profileId) return;
    let snoozeUntil: Date;
    const now = new Date();
    switch (duration) {
      case '1h': snoozeUntil = addHours(now, 1); break;
      case '3h': snoozeUntil = addHours(now, 3); break;
      case 'tomorrow': snoozeUntil = setHours(startOfTomorrow(), 9); break;
      case 'nextweek': snoozeUntil = setHours(addDays(now, 7 - now.getDay() + 1), 9); break;
      default: snoozeUntil = addHours(now, 1);
    }

    // Remove existing snooze first
    await supabase
      .from('conversation_snoozes')
      .delete()
      .eq('contact_id', contactId)
      .eq('snoozed_by', profileId);

    const { error } = await supabase
      .from('conversation_snoozes')
      .insert({
        contact_id: contactId,
        snoozed_by: profileId,
        snooze_until: snoozeUntil.toISOString(),
      });
    if (!error) {
      setSnoozedIds(prev => new Set([...prev, contactId]));
      toast.success('Conversa adiada');
    }
  }, [profileId]);

  const isPinned = useCallback((contactId: string) => pinnedIds.has(contactId), [pinnedIds]);
  const isFavorite = useCallback((contactId: string) => favoriteIds.has(contactId), [favoriteIds]);
  const isSnoozed = useCallback((contactId: string) => snoozedIds.has(contactId), [snoozedIds]);

  return {
    pinnedIds,
    favoriteIds,
    snoozedIds,
    isPinned,
    isFavorite,
    isSnoozed,
    pinConversation,
    unpinConversation,
    favoriteContact,
    unfavoriteContact,
    snoozeConversation,
    profileId,
  };
}
