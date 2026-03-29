import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  handleCors, errorResponse, jsonResponse,
  sanitizeString, isValidUUID, checkRateLimit, getClientIP, requireEnv,
} from "../_shared/validation.ts";

const ALLOWED_LANGUAGES = new Set([
  'por', 'eng', 'spa', 'fra', 'deu', 'ita', 'jpn', 'kor', 'zho', 'ara', 'hin', 'rus',
]);

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Rate limiting
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(`transcribe:${ip}`, 10, 60_000);
    if (!allowed) {
      return errorResponse("Limite de transcrições excedido. Tente novamente em 1 minuto.", 429);
    }

    const body = await req.json();
    const audioUrl = sanitizeString(body.audioUrl, 2048);
    const messageId = body.messageId ? sanitizeString(String(body.messageId), 100) : undefined;
    const languageCode = typeof body.languageCode === 'string' && ALLOWED_LANGUAGES.has(body.languageCode)
      ? body.languageCode : 'por';
    const enableDiarization = body.enableDiarization === true;
    const tagAudioEvents = body.tagAudioEvents !== false;

    if (!audioUrl) {
      return errorResponse("Audio URL is required");
    }

    // Validate URL format
    try {
      new URL(audioUrl);
    } catch {
      return errorResponse("Invalid audio URL format");
    }

    console.log('Starting ElevenLabs transcription (scribe_v2) for message:', messageId);
    const ELEVENLABS_API_KEY = requireEnv('ELEVENLABS_API_KEY');

    // Download audio with size check
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return errorResponse("Failed to download audio file");
    }

    const contentLength = audioResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_AUDIO_SIZE) {
      return errorResponse("Audio file too large (max 25MB)");
    }

    const audioBlob = await audioResponse.blob();
    if (audioBlob.size > MAX_AUDIO_SIZE) {
      return errorResponse("Audio file too large (max 25MB)");
    }

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
    formData.append('model_id', 'scribe_v2');
    formData.append('language_code', languageCode);
    formData.append('tag_audio_events', String(tagAudioEvents));
    formData.append('diarize', String(enableDiarization));

    console.log('Sending to ElevenLabs STT API (scribe_v2)...');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STT error:', response.status, errorText);
      if (response.status === 429) return errorResponse("Rate limit exceeded. Please try again later.", 429);
      if (response.status === 401) return errorResponse("Invalid ElevenLabs API key.", 401);
      return errorResponse("Failed to transcribe audio", 500);
    }

    const data = await response.json();
    const transcription = data.text || '';
    console.log('Transcription result:', transcription);

    return jsonResponse({
      transcription,
      messageId,
      words: data.words || [],
      audio_events: data.audio_events || [],
      speakers: data.speakers || [],
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
