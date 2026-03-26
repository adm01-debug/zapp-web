import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { generateCacheKey, getCachedResponse, setCachedResponse } from '../_shared/aiCache.ts';
import { validateRequired, validateUUID, validateStringLength, ValidationError, validationErrorResponse } from '../_shared/validation.ts';

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

const logger = createStructuredLogger('chatbot-l1');

serve(async (req) => {
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'chatbot-l1', getCorsHeaders(req));
  }

  // Rate limit: 30 chatbot requests per minute per IP
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(`chatbot:${clientIP}`, { maxRequests: 30, windowSeconds: 60 });
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck, getCorsHeaders(req));
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  try {
    const { contactId, message, connectionId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if chatbot is active for this connection
    const { data: flow } = await supabase
      .from('chatbot_flows')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'ai_l1')
      .limit(1)
      .maybeSingle();

    if (!flow) {
      return new Response(JSON.stringify({ handled: false, reason: 'no_active_flow' }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Fetch Knowledge Base for context
    const { data: articles } = await supabase
      .from('knowledge_base_articles')
      .select('title, content, category')
      .eq('is_published', true)
      .limit(15);

    const kbContext = articles && articles.length > 0
      ? articles.map(a => `[${a.category || 'Geral'}] ${a.title}: ${a.content.substring(0, 600)}`).join('\n---\n')
      : '';

    // Fetch conversation history
    const { data: history } = await supabase
      .from('messages')
      .select('content, sender, message_type')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationHistory = (history || []).reverse().map((m: any) => ({
      role: m.sender === 'agent' ? 'assistant' : 'user',
      content: m.content,
    }));

    // Check AI response cache (use conversation history + current message for cache key)
    const cacheMessages = [...conversationHistory, { role: 'user', content: message }];
    const cacheKey = await generateCacheKey('chatbot-l1', cacheMessages, { kbContext }, 'google/gemini-3-flash-preview');
    const cached = await getCachedResponse(supabase, cacheKey);
    if (cached.hit) {
      logger.info('Cache HIT for chatbot-l1');
      requestTimer.end({ status: 'cache_hit' });
      return new Response(JSON.stringify(cached.response), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const systemPrompt = `Você é um assistente de atendimento automatizado (Nível 1) via WhatsApp.
Seu objetivo é resolver dúvidas simples usando a Base de Conhecimento da empresa.

BASE DE CONHECIMENTO:
${kbContext || 'Nenhum artigo disponível.'}

REGRAS:
1. Se a pergunta pode ser respondida com a Base de Conhecimento, responda diretamente.
2. Se a pergunta é complexa, requer ação humana, ou o cliente está irritado, responda com transfer_to_human = true.
3. Seja cordial, objetivo e profissional.
4. Não invente informações que não estão na Base de Conhecimento.
5. Se não tiver certeza, transfira para humano.

Responda em JSON:
{
  "response": "sua resposta ao cliente",
  "transfer_to_human": false,
  "transfer_reason": null,
  "confidence": 0.95,
  "matched_article": "título do artigo usado ou null"
}`;

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
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ handled: false, reason: 'rate_limit' }), {
          status: response.status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      result = null;
    }

    if (!result) {
      return new Response(JSON.stringify({ handled: false, reason: 'parse_error' }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // If confidence is too low, transfer to human
    if (result.confidence < 0.6) {
      result.transfer_to_human = true;
      result.transfer_reason = 'low_confidence';
    }

    const handled = !result.transfer_to_human;
    const responseBody = {
      handled,
      response: result.response,
      transfer_to_human: result.transfer_to_human || false,
      transfer_reason: result.transfer_reason,
      confidence: result.confidence,
      matched_article: result.matched_article,
    };

    // Cache the response (TTL: 1 hour)
    await setCachedResponse(supabase, {
      cacheKey,
      functionName: 'chatbot-l1',
      model: 'google/gemini-3-flash-preview',
      requestHash: cacheKey,
      responseBody,
      tokenCount: data.usage?.total_tokens,
      ttlHours: 1,
    });

    logger.info(handled ? 'Request handled by chatbot' : 'Transferring to human', {
      handled,
      confidence: result.confidence,
      transfer_reason: result.transfer_reason ?? null,
      matched_article: result.matched_article ?? null,
    });
    requestTimer.end({ handled, confidence: result.confidence, cache: 'MISS' });

    return new Response(JSON.stringify(responseBody), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error in chatbot-l1", { error: errorMessage });
    requestTimer.end({ error: true });
    return new Response(JSON.stringify({ handled: false, error: errorMessage }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
