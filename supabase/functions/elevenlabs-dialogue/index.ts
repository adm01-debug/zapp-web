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
    const { script, languageCode } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    if (!script || !Array.isArray(script) || script.length === 0) {
      throw new Error('Script is required (array of { voice_id, text } objects)');
    }

    // Validate script format
    for (const line of script) {
      if (!line.voice_id || !line.text) {
        throw new Error('Each script line must have voice_id and text');
      }
    }

    console.log(`[Dialogue] Generating dialogue with ${script.length} lines`);

    // Build the dialogue request for eleven_v3
    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128',
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: 'eleven_v3',
          script,
          language_code: languageCode || 'pt',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Dialogue] API error:', response.status, errorText);

      if (response.status === 401) throw new Error('Invalid ElevenLabs API key');
      if (response.status === 429) throw new Error('Rate limit exceeded');
      throw new Error(`ElevenLabs Dialogue API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[Dialogue] Generated ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Dialogue] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
