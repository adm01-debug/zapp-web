import { useState, useEffect, useCallback } from 'react';

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
};

const STORAGE_KEY = 'notification_settings';

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }
    return DEFAULT_SETTINGS;
  });

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

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
  };
};
