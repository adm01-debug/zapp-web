import { handleCors, errorResponse, jsonResponse, checkRateLimit, getClientIP, requireEnv, Logger } from "../_shared/validation.ts";
import { TranscribeAudioSchema, parseBody } from "../_shared/schemas.ts";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("ai-transcribe-audio");

  try {
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(`transcribe:${ip}`, 10, 60_000);
    if (!allowed) return errorResponse("Limite de transcrições excedido. Tente novamente em 1 minuto.", 429, req);

    const parsed = parseBody(TranscribeAudioSchema, await req.json());
    if (!parsed.success) return errorResponse(parsed.error, 400, req);

    const { audioUrl, messageId, languageCode, enableDiarization, tagAudioEvents } = parsed.data;

    log.info("Starting transcription", { messageId, languageCode });
    const ELEVENLABS_API_KEY = requireEnv('ELEVENLABS_API_KEY');

    // Download audio with size check
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) return errorResponse("Failed to download audio file", 400, req);

    const contentLength = audioResponse.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_AUDIO_SIZE) {
      return errorResponse("Audio file too large (max 25MB)", 400, req);
    }

    const audioBlob = await audioResponse.blob();
    if (audioBlob.size > MAX_AUDIO_SIZE) {
      return errorResponse("Audio file too large (max 25MB)", 400, req);
    }

    log.info("Audio downloaded", { size: audioBlob.size, type: audioBlob.type });

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

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("ElevenLabs STT error", { status: response.status, detail: errorText.substring(0, 300) });
      if (response.status === 429) return errorResponse("Rate limit exceeded.", 429, req);
      if (response.status === 401) return errorResponse("Invalid ElevenLabs API key.", 401, req);
      return errorResponse("Failed to transcribe audio", 500, req);
    }

    const data = await response.json();
    log.done(200, { transcriptionLength: data.text?.length || 0 });

    return jsonResponse({
      transcription: data.text || '',
      messageId,
      words: data.words || [],
      audio_events: data.audio_events || [],
      speakers: data.speakers || [],
    }, 200, req);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log.error("Unhandled error", { error: msg });
    return errorResponse(msg, 500, req);
  }
});
