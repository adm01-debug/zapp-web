import { handleCors, errorResponse, requireEnv, Logger, getCorsHeaders } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("elevenlabs-dialogue");

  try {
    const { script, languageCode } = await req.json();
    const ELEVENLABS_API_KEY = requireEnv("ELEVENLABS_API_KEY");

    if (!script || !Array.isArray(script) || script.length === 0) {
      return errorResponse("Script is required (array of { voice_id, text } objects)", 400, req);
    }

    // Validate script format
    for (const line of script) {
      if (!line.voice_id || !line.text) {
        return errorResponse("Each script line must have voice_id and text", 400, req);
      }
    }

    log.info(`Generating dialogue with ${script.length} lines`);

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
      log.error(`API error ${response.status}`, { detail: errorText.substring(0, 300) });

      if (response.status === 401) return errorResponse("Invalid ElevenLabs API key", 401, req);
      if (response.status === 429) return errorResponse("Rate limit exceeded", 429, req);
      return errorResponse(`ElevenLabs Dialogue API error: ${response.status}`, response.status, req);
    }

    const audioBuffer = await response.arrayBuffer();
    log.done(200, { bytes: audioBuffer.byteLength });

    return new Response(audioBuffer, {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'audio/mpeg' },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    log.error("Unhandled error", { error: errorMessage });
    return errorResponse(errorMessage, 500, req);
  }
});
