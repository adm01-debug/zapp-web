import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playNotificationSound } from '@/utils/notificationSound';
import { showBrowserNotification, requestNotificationPermission } from '@/utils/notificationSound';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';

const SENTIMENT_THRESHOLD = 30; // Below 30% triggers alert

interface SentimentAlertData {
  contactId: string;
  contactName: string;
  sentimentScore: number;
  previousScore?: number;
  analysisId: string;
}

export function useSentimentAlerts() {
  const { settings, isQuietHours } = useNotificationSettings();

  const checkAndTriggerAlert = useCallback(async (data: SentimentAlertData) => {
    const { contactId, contactName, sentimentScore, previousScore, analysisId } = data;

    // Only check if sentiment is below threshold
    if (sentimentScore >= SENTIMENT_THRESHOLD) {
      return { triggered: false, reason: 'Sentiment above threshold' };
    }

    console.log('Checking sentiment alert for:', { contactName, sentimentScore });

    try {
      // Call edge function to check consecutive analyses and send alerts
      const { data: alertResult, error } = await supabase.functions.invoke('sentiment-alert', {
        body: {
          contactId,
          contactName,
          sentimentScore,
          previousScore,
          analysisId,
        },
      });

      if (error) {
        console.error('Error invoking sentiment alert:', error);
        return { triggered: false, error: error.message };
      }

      // If alert was triggered, show local notification
      if (alertResult?.alerted) {
        // Show toast notification
        toast.error(
          `⚠️ Alerta de Sentimento: ${contactName}`,
          {
            description: `Sentimento negativo (${sentimentScore}%) detectado em ${alertResult.consecutiveLow} análises consecutivas`,
            duration: 10000,
            action: {
              label: 'Ver conversa',
              onClick: () => {
                // User can click to see the conversation
                console.log('Navigate to conversation:', contactId);
              },
            },
          }
        );

        // Play alert sound if not in quiet hours
        if (!isQuietHours() && settings.soundEnabled && settings.slaBreachSound) {
          playNotificationSound('alert');
        }

        // Show browser notification
        if (settings.browserNotifications) {
          await requestNotificationPermission();
          showBrowserNotification(
            '⚠️ Alerta de Sentimento Negativo',
            `${contactName}: Sentimento em ${sentimentScore}% (${alertResult.consecutiveLow} análises consecutivas)`,
            '/favicon.ico'
          );
        }

        return { 
          triggered: true, 
          consecutiveLow: alertResult.consecutiveLow,
          emailSent: alertResult.emailSent,
        };
      }

      return { triggered: false, reason: alertResult?.reason };
    } catch (err) {
      console.error('Failed to check sentiment alert:', err);
      return { triggered: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [settings, isQuietHours]);

  const getRecentAlerts = useCallback(async (limit = 10) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'sentiment_alert')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(log => ({
        id: log.id,
        contactId: log.entity_id,
        createdAt: log.created_at,
        ...((log.details || {}) as Record<string, unknown>),
      })) || [];
    } catch (err) {
      console.error('Failed to fetch recent alerts:', err);
      return [];
    }
  }, []);

  return {
    checkAndTriggerAlert,
    getRecentAlerts,
    SENTIMENT_THRESHOLD,
  };
}
