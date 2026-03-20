import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, elevenlabs-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const eventType = body.type || body.event_type;

    console.log(`[ElevenLabs Webhook] Received event: ${eventType}`);
    console.log('[ElevenLabs Webhook] Payload:', JSON.stringify(body).substring(0, 500));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the webhook event
    await supabase.from('audit_logs').insert({
      action: `elevenlabs_webhook_${eventType}`,
      entity_type: 'elevenlabs',
      entity_id: body.id || body.request_id || null,
      details: body,
    });

    // Handle specific event types
    switch (eventType) {
      case 'tts.completed':
        console.log('[Webhook] TTS generation completed:', body.request_id);
        break;

      case 'tts.failed':
        console.error('[Webhook] TTS generation failed:', body.request_id, body.error);
        break;

      case 'music.completed':
        console.log('[Webhook] Music generation completed:', body.request_id);
        break;

      case 'sfx.completed':
        console.log('[Webhook] SFX generation completed:', body.request_id);
        break;

      case 'voice_clone.completed':
        console.log('[Webhook] Voice clone completed:', body.voice_id);
        break;

      case 'quota.warning':
        console.warn('[Webhook] Quota warning received:', body.usage_percent);
        break;

      default:
        console.log('[Webhook] Unhandled event type:', eventType);
    }

    return new Response(
      JSON.stringify({ received: true, event: eventType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ElevenLabs Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
