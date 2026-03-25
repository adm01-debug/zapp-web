import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || '');
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  try {
    const { text, voiceId } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY is not configured');
      throw new Error('ElevenLabs API key not configured');
    }

    if (!text || text.trim() === '') {
      throw new Error('Text is required');
    }

    // Default voice: Sarah (friendly, natural)
    const selectedVoiceId = voiceId || 'EXAVITQu4vr4xnSDxMaL';

    console.log(`Generating TTS for text: "${text.substring(0, 50)}..." with voice: ${selectedVoiceId}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`TTS generated successfully, audio size: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in elevenlabs-tts function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});
