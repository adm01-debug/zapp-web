import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { log } from '@/lib/logger';

export type SoundTypeOption = 'beep' | 'chime' | 'bell' | 'alert' | 'soft';

export interface NotificationSettings {
  soundEnabled: boolean;
  soundVolume: number; // 0-100
  soundType: SoundTypeOption;
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
  // Individual sound types for each notification
  messageSoundType: SoundTypeOption;
  mentionSoundType: SoundTypeOption;
  slaSoundType: SoundTypeOption;
  goalSoundType: SoundTypeOption;
  transcriptionSoundType: SoundTypeOption;
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
  messageSoundType: 'chime',
  mentionSoundType: 'bell',
  slaSoundType: 'alert',
  goalSoundType: 'chime',
  transcriptionSoundType: 'soft',
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
          .select('sound_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, browser_notifications_enabled, sentiment_alert_enabled, sentiment_alert_threshold, sentiment_consecutive_count, transcription_notification_enabled, message_sound_type, mention_sound_type, sla_sound_type, goal_sound_type, transcription_sound_type')
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
            messageSoundType: (data.message_sound_type as SoundTypeOption) ?? DEFAULT_SETTINGS.messageSoundType,
            mentionSoundType: (data.mention_sound_type as SoundTypeOption) ?? DEFAULT_SETTINGS.mentionSoundType,
            slaSoundType: (data.sla_sound_type as SoundTypeOption) ?? DEFAULT_SETTINGS.slaSoundType,
            goalSoundType: (data.goal_sound_type as SoundTypeOption) ?? DEFAULT_SETTINGS.goalSoundType,
            transcriptionSoundType: (data.transcription_sound_type as SoundTypeOption) ?? DEFAULT_SETTINGS.transcriptionSoundType,
          }));
        }
      } catch (error) {
        log.warn('Failed to load notification settings:', error);
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
      if ('messageSoundType' in updates) {
        dbUpdates.message_sound_type = updates.messageSoundType;
      }
      if ('mentionSoundType' in updates) {
        dbUpdates.mention_sound_type = updates.mentionSoundType;
      }
      if ('slaSoundType' in updates) {
        dbUpdates.sla_sound_type = updates.slaSoundType;
      }
      if ('goalSoundType' in updates) {
        dbUpdates.goal_sound_type = updates.goalSoundType;
      }
      if ('transcriptionSoundType' in updates) {
        dbUpdates.transcription_sound_type = updates.transcriptionSoundType;
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
      log.warn('Failed to save notification settings:', error);
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
          message_sound_type: DEFAULT_SETTINGS.messageSoundType,
          mention_sound_type: DEFAULT_SETTINGS.mentionSoundType,
          sla_sound_type: DEFAULT_SETTINGS.slaSoundType,
          goal_sound_type: DEFAULT_SETTINGS.goalSoundType,
          transcription_sound_type: DEFAULT_SETTINGS.transcriptionSoundType,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
    } catch (error) {
      log.warn('Failed to reset notification settings:', error);
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
