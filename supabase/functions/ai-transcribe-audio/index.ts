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
    const { audioUrl, messageId, languageCode, enableDiarization, tagAudioEvents } = await req.json();

    if (!audioUrl) {
      return new Response(
        JSON.stringify({ error: 'Audio URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting ElevenLabs transcription (scribe_v2) for message:', messageId);

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to download audio file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBlob = await audioResponse.blob();
    console.log('Audio downloaded, size:', audioBlob.size, 'type:', audioBlob.type);

    // Determine file extension
    let fileName = 'audio.mp3';
    const contentType = audioBlob.type || '';
    if (contentType.includes('ogg') || audioUrl.includes('.ogg')) fileName = 'audio.ogg';
    else if (contentType.includes('webm') || audioUrl.includes('.webm')) fileName = 'audio.webm';
    else if (contentType.includes('wav') || audioUrl.includes('.wav')) fileName = 'audio.wav';
    else if (contentType.includes('m4a') || audioUrl.includes('.m4a')) fileName = 'audio.m4a';

    const formData = new FormData();
    formData.append('file', audioBlob, fileName);
    formData.append('model_id', 'scribe_v2'); // Upgraded from scribe_v1
    formData.append('language_code', languageCode || 'por');
    formData.append('tag_audio_events', String(tagAudioEvents ?? true));
    formData.append('diarize', String(enableDiarization ?? false));

    console.log('Sending to ElevenLabs STT API (scribe_v2)...');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
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
    const transcription = data.text || '';
    console.log('Transcription result:', transcription);

    return new Response(
      JSON.stringify({
        transcription,
        messageId,
        words: data.words || [],
        audio_events: data.audio_events || [],
        speakers: data.speakers || [],
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
