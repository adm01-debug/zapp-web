import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';
import { generateCacheKey, getCachedResponse, setCachedResponse } from '../_shared/aiCache.ts';
import { validateUUID, ValidationError, validationErrorResponse } from '../_shared/validation.ts';

import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { verifyJWT } from '../_shared/jwtVerifier.ts';

const logger = createStructuredLogger('ai-auto-tag');

serve(async (req) => {
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'ai-auto-tag', getCorsHeaders(req));
  }

  // Rate limit: 20 AI requests per minute per IP
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(`ai:${clientIP}`, { maxRequests: 20, windowSeconds: 60 });
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck, getCorsHeaders(req));
  }

  // Verify JWT authentication
  const { user, error: authError } = await verifyJWT(req);
  if (authError || !user) {
    logger.warn('Authentication failed', { error: authError });
    return new Response(JSON.stringify({ error: authError || 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  try {
    const { contactId, messages } = await req.json();

    // Input validation
    try {
      if (contactId) {
        validateUUID(contactId, 'contactId');
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        return validationErrorResponse(e, getCorsHeaders(req));
      }
      throw e;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recent messages if not provided
    let conversationMessages = messages;
    if (!conversationMessages && contactId) {
      const { data } = await supabase
        .from('messages')
        .select('content, sender, message_type')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20);
      conversationMessages = data || [];
    }

    if (!conversationMessages || conversationMessages.length === 0) {
      return new Response(JSON.stringify({ tags: [] }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Check AI response cache
    const cacheKey = await generateCacheKey('ai-auto-tag', conversationMessages, undefined, 'google/gemini-3-flash-preview');
    const cached = await getCachedResponse(supabase, cacheKey);
    if (cached.hit) {
      logger.info('Cache HIT for ai-auto-tag');
      const cachedResult = cached.response;

      // Still save tags to database even on cache hit
      if (contactId && cachedResult.tags?.length > 0) {
        await supabase.from('ai_conversation_tags').delete().eq('contact_id', contactId);
        await supabase.from('ai_conversation_tags').insert(
          cachedResult.tags.map((t: any) => ({
            contact_id: contactId,
            tag_name: t.name,
            confidence: t.confidence,
            source: 'ai',
          }))
        );
      }

      return new Response(JSON.stringify(cachedResult), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const conversationText = conversationMessages
      .map((m: any) => `${m.sender}: ${m.content}`)
      .join('\n');

    const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
      maxRetries: 3,
      circuitBreakerService: 'ai-gateway',
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um classificador de conversas de atendimento ao cliente. Analise a conversa e retorne tags relevantes.

Categorias possíveis: suporte_tecnico, vendas, financeiro, reclamacao, elogio, duvida, urgente, cancelamento, troca, entrega, pagamento, produto, servico, feedback, agendamento, orcamento

Responda APENAS em JSON:
{
  "tags": [
    {"name": "tag_name", "confidence": 0.95},
    {"name": "tag_name2", "confidence": 0.8}
  ],
  "sentiment": "positive|neutral|negative|critical",
  "summary": "resumo em 1 linha"
}`
          },
          { role: "user", content: conversationText }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { tags: [], sentiment: 'neutral', summary: '' };
    } catch {
      result = { tags: [], sentiment: 'neutral', summary: '' };
    }

    // Cache the response (TTL: 4 hours)
    await setCachedResponse(supabase, {
      cacheKey,
      functionName: 'ai-auto-tag',
      model: 'google/gemini-3-flash-preview',
      requestHash: cacheKey,
      responseBody: result,
      tokenCount: data.usage?.total_tokens,
      ttlHours: 4,
    });

    // Save tags to database
    if (contactId && result.tags?.length > 0) {
      // Remove old AI tags for this contact
      await supabase.from('ai_conversation_tags').delete().eq('contact_id', contactId);

      // Insert new ones
      await supabase.from('ai_conversation_tags').insert(
        result.tags.map((t: any) => ({
          contact_id: contactId,
          tag_name: t.name,
          confidence: t.confidence,
          source: 'ai',
        }))
      );
    }

    requestTimer.end({ status: 'success' });
    return new Response(JSON.stringify(result), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error in ai-auto-tag", { error: errorMessage });
    requestTimer.end({ error: true });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
