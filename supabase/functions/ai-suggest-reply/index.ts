import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';
import { generateCacheKey, getCachedResponse, setCachedResponse } from '../_shared/aiCache.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { validateUUID, ValidationError, validationErrorResponse } from '../_shared/validation.ts';

import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { verifyJWT } from '../_shared/jwtVerifier.ts';
import { unauthorized, serverError, tooManyRequests, errorResponse } from '../_shared/errorResponse.ts';

const logger = createStructuredLogger('ai-suggest-reply');

serve(async (req) => {
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'ai-suggest-reply', getCorsHeaders(req));
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
    return unauthorized(authError || "Authentication required", getCorsHeaders(req));
  }

  try {
    const { messages, contactName, context, contactId } = await req.json();

    // Input validation
    try {
      if (contactId) {
        validateUUID(contactId, 'contactId');
      }
      if (messages && !Array.isArray(messages)) {
        throw new ValidationError('messages must be an array');
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        return validationErrorResponse(e, getCorsHeaders(req));
      }
      throw e;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check AI response cache
    const cacheKey = await generateCacheKey('ai-suggest-reply', messages || [], { contactName, context }, 'google/gemini-3-flash-preview');
    const cached = await getCachedResponse(supabase, cacheKey);
    if (cached.hit) {
      logger.info('Cache HIT for ai-suggest-reply');
      requestTimer.end({ status: 'cache_hit' });
      return new Response(JSON.stringify(cached.response), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    // Fetch Knowledge Base articles for context
    let knowledgeContext = '';
    try {
      const { data: articles } = await supabase
        .from('knowledge_base_articles')
        .select('title, content, category')
        .eq('is_published', true)
        .limit(10);

      logger.info('KB articles fetched', { count: articles?.length ?? 0 });
      if (articles && articles.length > 0) {
        knowledgeContext = `\n\nBASE DE CONHECIMENTO DA EMPRESA (use como referência para suas respostas):\n${
          articles.map(a => `[${a.category || 'Geral'}] ${a.title}: ${a.content.substring(0, 500)}`).join('\n---\n')
        }`;
      }

      // Fetch contact history/notes for more context
      if (contactId) {
        const { data: notes } = await supabase
          .from('contact_notes')
          .select('content')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (notes && notes.length > 0) {
          knowledgeContext += `\n\nNOTAS DO CONTATO:\n${notes.map(n => n.content).join('\n')}`;
        }

        const { data: customFields } = await supabase
          .from('contact_custom_fields')
          .select('field_name, field_value')
          .eq('contact_id', contactId);

        if (customFields && customFields.length > 0) {
          knowledgeContext += `\n\nDADOS DO CONTATO:\n${customFields.map(f => `${f.field_name}: ${f.field_value}`).join('\n')}`;
        }
      }
    } catch (e) {
      logger.error("Error fetching knowledge base", { error: e instanceof Error ? e.message : String(e) });
    }

    logger.info("Generating reply suggestions", { contactName, hasKBContext: knowledgeContext.length > 0 });

    const systemPrompt = `Você é um Copilot de IA especializado em atendimento ao cliente via WhatsApp.
Seu papel é sugerir respostas profissionais, empáticas e CONTEXTUALIZADAS para agentes de suporte.

Contexto do cliente: ${contactName || 'Cliente'}
${context ? `Informações adicionais: ${context}` : ''}
${knowledgeContext}

IMPORTANTE: Use as informações da Base de Conhecimento e dados do contato para personalizar suas sugestões.
Se houver artigos relevantes, cite informações específicas nas respostas.

Baseado na conversa, gere exatamente 3 sugestões de resposta:
1. Uma resposta direta e objetiva (use dados da KB se aplicável)
2. Uma resposta mais empática e detalhada
3. Uma resposta com pergunta de follow-up

Responda APENAS em formato JSON com a seguinte estrutura:
{
  "suggestions": [
    {"type": "direct", "text": "resposta aqui", "emoji": "✓", "source": "kb_article_title ou null"},
    {"type": "empathetic", "text": "resposta aqui", "emoji": "💬", "source": null},
    {"type": "followup", "text": "resposta aqui", "emoji": "❓", "source": null}
  ]
}`;

    const conversationHistory = messages?.map((m: any) => ({
      role: m.sender === 'agent' ? 'assistant' : 'user',
      content: m.content
    })) || [];

    const aiTimer = logger.startTimer('ai-api-call');
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
          { role: "user", content: "Gere 3 sugestões de resposta contextualizadas para a última mensagem do cliente." }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("AI gateway error", { status: response.status, errorText });
      aiTimer.end({ status: response.status, error: true });

      if (response.status === 429) {
        return tooManyRequests(60, getCorsHeaders(req));
      }
      if (response.status === 402) {
        return errorResponse('Payment required. Please add credits.', { status: 402, code: 'PAYMENT_REQUIRED', corsHeaders: getCorsHeaders(req) });
      }
      throw new Error(`AI gateway error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    aiTimer.end({ tokens: data.usage?.total_tokens });
    const content = data.choices?.[0]?.message?.content;

    let suggestions;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      logger.warn("Parse error on AI response, using fallback suggestions");
      suggestions = {
        suggestions: [
          { type: "direct", text: "Entendi sua solicitação. Vou verificar isso para você.", emoji: "✓", source: null },
          { type: "empathetic", text: "Compreendo sua situação. Estou aqui para ajudá-lo da melhor forma possível.", emoji: "💬", source: null },
          { type: "followup", text: "Poderia me fornecer mais detalhes sobre isso?", emoji: "❓", source: null }
        ]
      };
    }

    // Cache the response (TTL: 1 hour)
    await setCachedResponse(supabase, {
      cacheKey,
      functionName: 'ai-suggest-reply',
      model: 'google/gemini-3-flash-preview',
      requestHash: cacheKey,
      responseBody: suggestions,
      tokenCount: data.usage?.total_tokens,
      ttlHours: 1,
    });

    requestTimer.end({ status: 'success', cache: 'MISS' });
    return new Response(JSON.stringify(suggestions), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error in ai-suggest-reply", { error: errorMessage });
    requestTimer.end({ error: true });
    return serverError('AI suggestion processing failed', getCorsHeaders(req));
  }
});
