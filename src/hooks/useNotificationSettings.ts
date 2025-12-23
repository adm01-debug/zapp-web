import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationSettings {
  soundEnabled: boolean;
  soundVolume: number; // 0-100
  soundType: 'beep' | 'chime' | 'bell' | 'alert' | 'soft';
  browserNotifications: boolean;
  slaBreachSound: boolean;
  newMessageSound: boolean;
  mentionSound: boolean;
  desktopAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string; // HH:mm
  // Sentiment alert settings
  sentimentAlertEnabled: boolean;
  sentimentAlertThreshold: number; // 0-100
  sentimentConsecutiveCount: number; // number of consecutive analyses
  // Transcription notification settings
  transcriptionNotificationEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundVolume: 70,
  soundType: 'chime',
  browserNotifications: true,
  slaBreachSound: true,
  newMessageSound: true,
  mentionSound: true,
  desktopAlerts: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  sentimentAlertEnabled: true,
  sentimentAlertThreshold: 30,
  sentimentConsecutiveCount: 2,
  transcriptionNotificationEnabled: true,
};

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings from DB
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('sound_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, browser_notifications_enabled, sentiment_alert_enabled, sentiment_alert_threshold, sentiment_consecutive_count, transcription_notification_enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings(prev => ({
            ...prev,
            soundEnabled: data.sound_enabled ?? DEFAULT_SETTINGS.soundEnabled,
            quietHoursEnabled: data.quiet_hours_enabled ?? DEFAULT_SETTINGS.quietHoursEnabled,
            quietHoursStart: data.quiet_hours_start ?? DEFAULT_SETTINGS.quietHoursStart,
            quietHoursEnd: data.quiet_hours_end ?? DEFAULT_SETTINGS.quietHoursEnd,
            browserNotifications: data.browser_notifications_enabled ?? DEFAULT_SETTINGS.browserNotifications,
            sentimentAlertEnabled: data.sentiment_alert_enabled ?? DEFAULT_SETTINGS.sentimentAlertEnabled,
            sentimentAlertThreshold: data.sentiment_alert_threshold ?? DEFAULT_SETTINGS.sentimentAlertThreshold,
            sentimentConsecutiveCount: data.sentiment_consecutive_count ?? DEFAULT_SETTINGS.sentimentConsecutiveCount,
            transcriptionNotificationEnabled: data.transcription_notification_enabled ?? DEFAULT_SETTINGS.transcriptionNotificationEnabled,
          }));
        }
      } catch (error) {
        console.warn('Failed to load notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    if (!user) return;

    // Update local state immediately
    setSettings(prev => ({ ...prev, ...updates }));
    setIsSaving(true);

    try {
      // Map to DB columns
      const dbUpdates: Record<string, unknown> = {};
      
      if ('soundEnabled' in updates) {
        dbUpdates.sound_enabled = updates.soundEnabled;
      }
      if ('quietHoursEnabled' in updates) {
        dbUpdates.quiet_hours_enabled = updates.quietHoursEnabled;
      }
      if ('quietHoursStart' in updates) {
        dbUpdates.quiet_hours_start = updates.quietHoursStart;
      }
      if ('quietHoursEnd' in updates) {
        dbUpdates.quiet_hours_end = updates.quietHoursEnd;
      }
      if ('browserNotifications' in updates) {
        dbUpdates.browser_notifications_enabled = updates.browserNotifications;
      }
      if ('sentimentAlertEnabled' in updates) {
        dbUpdates.sentiment_alert_enabled = updates.sentimentAlertEnabled;
      }
      if ('sentimentAlertThreshold' in updates) {
        dbUpdates.sentiment_alert_threshold = updates.sentimentAlertThreshold;
      }
      if ('sentimentConsecutiveCount' in updates) {
        dbUpdates.sentiment_consecutive_count = updates.sentimentConsecutiveCount;
      }
      if ('transcriptionNotificationEnabled' in updates) {
        dbUpdates.transcription_notification_enabled = updates.transcriptionNotificationEnabled;
      }

      // Only save to DB if we have DB-mappable fields
      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            ...dbUpdates,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (error) throw error;
      }
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    
    if (!user) return;

    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          sound_enabled: DEFAULT_SETTINGS.soundEnabled,
          quiet_hours_enabled: DEFAULT_SETTINGS.quietHoursEnabled,
          quiet_hours_start: DEFAULT_SETTINGS.quietHoursStart,
          quiet_hours_end: DEFAULT_SETTINGS.quietHoursEnd,
          browser_notifications_enabled: DEFAULT_SETTINGS.browserNotifications,
          sentiment_alert_enabled: DEFAULT_SETTINGS.sentimentAlertEnabled,
          sentiment_alert_threshold: DEFAULT_SETTINGS.sentimentAlertThreshold,
          transcription_notification_enabled: DEFAULT_SETTINGS.transcriptionNotificationEnabled,
          sentiment_consecutive_count: DEFAULT_SETTINGS.sentimentConsecutiveCount,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
    } catch (error) {
      console.warn('Failed to reset notification settings:', error);
    }
  }, [user]);

  // Check if currently in quiet hours
  const isQuietHours = useCallback(() => {
    if (!settings.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
    const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentTime >= startMinutes || currentTime < endMinutes;
    }
    
    return currentTime >= startMinutes && currentTime < endMinutes;
  }, [settings.quietHoursEnabled, settings.quietHoursStart, settings.quietHoursEnd]);

  return {
    settings,
    updateSettings,
    resetSettings,
    isQuietHours,
    isLoading,
    isSaving,
  };
};
