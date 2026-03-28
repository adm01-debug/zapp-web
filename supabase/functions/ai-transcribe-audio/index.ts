import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { verifyJWT } from '../_shared/jwtVerifier.ts';
import { assertAllowedHost } from '../_shared/ssrfGuard.ts';
import { requireEnv } from '../_shared/envValidator.ts';
import { unauthorized, badRequest, serverError } from '../_shared/errorResponse.ts';

requireEnv({ required: ['ELEVENLABS_API_KEY'] });

const logger = createStructuredLogger('ai-transcribe-audio');

serve(async (req) => {
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'ai-transcribe-audio', getCorsHeaders(req));
  }

  // Rate limit: 10 audio requests per minute per IP
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(`audio:${clientIP}`, { maxRequests: 10, windowSeconds: 60 });
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck, getCorsHeaders(req));
  }

  // Verify JWT authentication
  const { user, error: authError } = await verifyJWT(req);
  if (authError || !user) {
    logger.warn('Authentication failed', { error: authError });
    return unauthorized(authError || 'Authentication required', getCorsHeaders(req));
  }

  try {
    const { audioUrl, messageId } = await req.json();

    if (!audioUrl) {
      return badRequest('Audio URL is required', getCorsHeaders(req));
    }

    // SSRF protection: validate audio URL host
    try {
      assertAllowedHost(audioUrl);
    } catch (ssrfError) {
      logger.warn('SSRF blocked', { url: audioUrl, error: String(ssrfError) });
      return badRequest('Invalid audio URL', getCorsHeaders(req));
    }

    logger.info('Starting ElevenLabs transcription', { messageId });
    logger.info('Audio URL received', { audioUrl });

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!;

    // Download the audio file from the URL
    logger.info('Downloading audio file');
    const audioResponse = await fetchWithRetry(audioUrl, { timeout: 30000, maxRetries: 3 });
    if (!audioResponse.ok) {
      logger.error('Failed to download audio', { status: audioResponse.status });
      return badRequest('Failed to download audio file', getCorsHeaders(req));
    }

    const audioBlob = await audioResponse.blob();
    logger.info('Audio downloaded', { size: audioBlob.size, type: audioBlob.type });

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

    logger.info('Sending to ElevenLabs STT API');
    
    // Call ElevenLabs Speech-to-Text API
    const response = await fetchWithRetry('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      timeout: 60000,
      maxRetries: 3,
      circuitBreakerService: 'elevenlabs',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('ElevenLabs STT error', { status: response.status, errorText });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid ElevenLabs API key.' }),
          { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to transcribe audio', details: errorText }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    logger.info('ElevenLabs response received');
    
    // Extract transcription text from response
    const transcription = data.text || '';

    logger.info('Transcription complete', { length: transcription.length });

    requestTimer.end({ status: 'success' });
    return new Response(
      JSON.stringify({
        transcription,
        messageId,
        words: data.words || [], // Include word-level timestamps if available
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Transcription error', { error: error instanceof Error ? error.message : String(error) });
    requestTimer.end({ error: true });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
