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
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const voiceId = formData.get('voiceId') as string;
    const modelId = formData.get('modelId') as string;

    if (!audioFile) throw new Error('Audio file is required');
    if (!voiceId) throw new Error('Voice ID is required');

    // Default to multilingual model for Portuguese/multi-language support
    const selectedModel = modelId || 'eleven_multilingual_sts_v2';

    console.log(`STS: Converting audio (${audioFile.size} bytes) to voice ${voiceId} with model ${selectedModel}`);

    const apiFormData = new FormData();
    apiFormData.append('audio', audioFile);
    apiFormData.append('model_id', selectedModel);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
        body: apiFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STS error:', response.status, errorText);

      if (response.status === 401) throw new Error('Invalid ElevenLabs API key');
      if (response.status === 429) throw new Error('Rate limit exceeded. Try again in a few seconds.');
      throw new Error(`ElevenLabs STS error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`STS: Conversion complete, output size: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in elevenlabs-sts:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
