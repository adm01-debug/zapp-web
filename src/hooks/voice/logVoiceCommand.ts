import { supabase } from '@/integrations/supabase/client';

interface VoiceCommandLogParams {
  transcript: string;
  action: string;
  response: string;
  data?: Record<string, unknown>;
  durationMs?: number;
  success?: boolean;
}

export function logVoiceCommand(params: VoiceCommandLogParams) {
  // Fire-and-forget — never block UI
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase.from('voice_command_logs') as ReturnType<typeof supabase.from>).insert({
        user_id: user.id,
        transcript: params.transcript,
        action: params.action,
        response: params.response,
        data: params.data || {},
        duration_ms: params.durationMs,
        success: params.success ?? true,
      });
    } catch {
      // Silently fail — analytics should never break UX
    }
  })();
}
