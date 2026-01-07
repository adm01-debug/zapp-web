import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

export interface ChecklistStatus {
  profile: boolean;
  connection: boolean;
  hours: boolean;
  templates: boolean;
  notifications: boolean;
  theme: boolean;
}

export function useOnboardingChecklist() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ChecklistStatus>({
    profile: false,
    connection: false,
    hours: false,
    templates: false,
    notifications: false,
    theme: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    const newStatus: ChecklistStatus = {
      profile: false,
      connection: false,
      hours: false,
      templates: false,
      notifications: false,
      theme: false,
    };

    try {
      // Check profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      newStatus.profile = !!(profile?.name && profile.name.length > 2);

      // Check WhatsApp connection
      const { data: connections } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('status', 'connected')
        .limit(1);
      newStatus.connection = (connections?.length || 0) > 0;

      // Check user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('business_hours_enabled, browser_notifications_enabled, sound_enabled, theme')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        newStatus.hours = settings.business_hours_enabled === true;
        newStatus.notifications = settings.browser_notifications_enabled === true || settings.sound_enabled === true;
        newStatus.theme = settings.theme !== null && settings.theme !== 'system';
      }

      // Check templates
      const { data: templates } = await supabase
        .from('message_templates')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      newStatus.templates = (templates?.length || 0) > 0;

      setStatus(newStatus);
    } catch (error) {
      log.error('Error checking checklist status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const dismissed = localStorage.getItem(`checklist_dismissed_${user.id}`);
      setIsDismissed(dismissed === 'true');
      checkStatus();
    }
  }, [user, checkStatus]);

  const dismiss = useCallback(() => {
    if (user) {
      localStorage.setItem(`checklist_dismissed_${user.id}`, 'true');
      setIsDismissed(true);
    }
  }, [user]);

  const reset = useCallback(() => {
    if (user) {
      localStorage.removeItem(`checklist_dismissed_${user.id}`);
      setIsDismissed(false);
    }
  }, [user]);

  const completedCount = Object.values(status).filter(Boolean).length;
  const totalCount = Object.keys(status).length;
  const progress = (completedCount / totalCount) * 100;
  const isComplete = completedCount === totalCount;

  return {
    status,
    isLoading,
    isDismissed,
    completedCount,
    totalCount,
    progress,
    isComplete,
    checkStatus,
    dismiss,
    reset,
  };
}
