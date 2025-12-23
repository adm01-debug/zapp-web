import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioUrl, messageId } = await req.json();

    if (!audioUrl) {
      return new Response(
        JSON.stringify({ error: 'Audio URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting ElevenLabs transcription for message:', messageId);
    console.log('Audio URL:', audioUrl);

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the audio file from the URL
    console.log('Downloading audio file...');
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      console.error('Failed to download audio:', audioResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to download audio file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBlob = await audioResponse.blob();
    console.log('Audio downloaded, size:', audioBlob.size, 'type:', audioBlob.type);

    // Prepare form data for ElevenLabs Speech-to-Text API
    const formData = new FormData();
    
    // Determine file extension from content type or URL
    let fileName = 'audio.mp3';
    const contentType = audioBlob.type || '';
    if (contentType.includes('ogg') || audioUrl.includes('.ogg')) {
      fileName = 'audio.ogg';
    } else if (contentType.includes('webm') || audioUrl.includes('.webm')) {
      fileName = 'audio.webm';
    } else if (contentType.includes('wav') || audioUrl.includes('.wav')) {
      fileName = 'audio.wav';
    } else if (contentType.includes('m4a') || audioUrl.includes('.m4a')) {
      fileName = 'audio.m4a';
    }
    
    formData.append('file', audioBlob, fileName);
    formData.append('model_id', 'scribe_v1');
    formData.append('language_code', 'por'); // Portuguese (ISO 639-3)

    console.log('Sending to ElevenLabs STT API...');
    
    // Call ElevenLabs Speech-to-Text API
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STT error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid ElevenLabs API key.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to transcribe audio', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('ElevenLabs response:', JSON.stringify(data));
    
    // Extract transcription text from response
    const transcription = data.text || '';

    console.log('Transcription result:', transcription);

    return new Response(
      JSON.stringify({ 
        transcription,
        messageId,
        words: data.words || [], // Include word-level timestamps if available
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
