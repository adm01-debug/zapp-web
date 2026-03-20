import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop() || 'generate';

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const body = await req.json();

    if (action === 'preview' || body.action === 'preview') {
      // Generate a preview of a voice from text description
      const { description, text } = body;

      if (!description) throw new Error('Voice description is required');

      const previewText = text || 'Olá, esta é uma prévia da minha voz. Como posso te ajudar hoje?';

      console.log(`[Voice Design] Generating preview: "${description.substring(0, 60)}..."`);

      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-voice/create-previews',
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            voice_description: description,
            text: previewText,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Voice Design] Preview error:', response.status, errorText);
        throw new Error(`Voice preview error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Voice Design] Preview generated successfully`);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create' || body.action === 'create') {
      // Create a permanent voice from a preview
      const { voice_name, voice_description, generated_voice_id, labels } = body;

      if (!voice_name) throw new Error('Voice name is required');
      if (!generated_voice_id) throw new Error('Generated voice ID from preview is required');

      console.log(`[Voice Design] Creating voice: "${voice_name}"`);

      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview',
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            voice_name,
            voice_description: voice_description || '',
            generated_voice_id,
            labels: labels || {},
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Voice Design] Create error:', response.status, errorText);
        throw new Error(`Voice creation error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Voice Design] Voice created: ${data.voice_id}`);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // List available voices
    console.log('[Voice Design] Listing voices');
    const response = await fetch(
      'https://api.elevenlabs.io/v1/voices',
      {
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`List voices error: ${response.status}`);
    }

    const data = await response.json();
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Voice Design] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
