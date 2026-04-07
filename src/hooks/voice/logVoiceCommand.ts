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

      // voice_command_logs is not in the generated types yet, use unknown cast
      await (supabase as unknown as { from: (table: string) => { insert: (row: Record<string, unknown>) => Promise<unknown> } })
        .from('voice_command_logs')
        .insert({
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
