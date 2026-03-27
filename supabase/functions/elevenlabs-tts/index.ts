import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';
import { validateRequired, validateStringLength, ValidationError, validationErrorResponse } from '../_shared/validation.ts';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { verifyJWT } from '../_shared/jwtVerifier.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';

const logger = createStructuredLogger('elevenlabs-tts');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'elevenlabs-tts', getCorsHeaders(req));
  }

  // Rate limit: 10 audio requests per minute per IP
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(`audio:${clientIP}`, { maxRequests: 10, windowSeconds: 60 });
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck, getCorsHeaders(req));
  }

  // Verify authentication
  const { user, error: authError } = await verifyJWT(req);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: authError || 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  try {
    const { text, voiceId, model_id } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      logger.error('ELEVENLABS_API_KEY is not configured');
      throw new Error('ElevenLabs API key not configured');
    }

    // Input validation
    try {
      validateRequired({ text }, ['text']);
      validateStringLength(text.trim(), 'text', 1, 5000);
    } catch (e) {
      if (e instanceof ValidationError) {
        return validationErrorResponse(e, getCorsHeaders(req));
      }
      throw e;
    }

    // Default voice: Sarah (friendly, natural)
    const selectedVoiceId = voiceId || 'EXAVITQu4vr4xnSDxMaL';

    logger.info(`Generating TTS for text: "${text.substring(0, 50)}..." with voice: ${selectedVoiceId}`);

    const response = await fetchWithRetry(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
        maxRetries: 3,
        circuitBreakerService: 'elevenlabs',
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
      logger.error('ElevenLabs API error', { status: response.status, details: errorText });
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    logger.info(`TTS generated successfully, audio size: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in elevenlabs-tts function', { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});
