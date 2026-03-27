import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { generateCacheKey, getCachedResponse, setCachedResponse } from '../_shared/aiCache.ts';
import { validateRequired, validateUUID, ValidationError, validationErrorResponse } from '../_shared/validation.ts';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { verifyJWT } from '../_shared/jwtVerifier.ts';

const logger = createStructuredLogger('ai-conversation-summary');

serve(async (req) => {
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'ai-conversation-summary', getCorsHeaders(req));
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
    const { contactId, messages, contactName } = await req.json();

    // Input validation
    try {
      if (contactId) {
        validateUUID(contactId, 'contactId');
      }
      if (!messages || !Array.isArray(messages)) {
        throw new ValidationError('messages must be a non-empty array');
      }
      if (messages.length < 10) {
        throw new ValidationError('Conversation must have at least 10 messages for summary');
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        return validationErrorResponse(e, getCorsHeaders(req));
      }
      throw e;
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Check AI response cache
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const cacheKey = await generateCacheKey('ai-conversation-summary', messages, undefined, 'google/gemini-2.5-flash');
    const cached = await getCachedResponse(supabaseClient, cacheKey);
    if (cached.hit) {
      logger.info('Cache HIT for ai-conversation-summary');
      requestTimer.end({ status: 'cache_hit' });
      return new Response(JSON.stringify(cached.response), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    // Format messages for context
    const conversationText = messages
      .map((msg: { sender: string; content: string; created_at: string }) =>
        `[${msg.sender === 'agent' ? 'Atendente' : contactName || 'Cliente'}]: ${msg.content}`
      )
      .join('\n');

    const systemPrompt = `Você é um assistente especializado em resumir conversas de atendimento ao cliente.
Analise a conversa abaixo e forneça:
1. Um resumo conciso (máximo 3 frases) do assunto principal
2. O status atual da conversa (resolvido, pendente, aguardando cliente, aguardando atendente)
3. Pontos-chave discutidos (máximo 5 itens)
4. Próximos passos sugeridos (se houver)

Responda em português brasileiro de forma clara e objetiva.`;

    logger.info('Calling AI gateway', { model: 'google/gemini-2.5-flash', messageCount: messages.length });
    const aiTimer = logger.startTimer('ai-api-call');
    const response = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
      maxRetries: 3,
      circuitBreakerService: 'ai-gateway',
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversa com ${contactName || 'Cliente'}:\n\n${conversationText}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_summary",
              description: "Generate a structured summary of the conversation",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Brief summary of the main topic (max 3 sentences)"
                  },
                  status: {
                    type: "string",
                    enum: ["resolvido", "pendente", "aguardando_cliente", "aguardando_atendente"],
                    description: "Current status of the conversation"
                  },
                  keyPoints: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key points discussed (max 5)"
                  },
                  nextSteps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Suggested next steps"
                  },
                  sentiment: {
                    type: "string",
                    enum: ["positivo", "neutro", "negativo"],
                    description: "Overall customer sentiment"
                  }
                },
                required: ["summary", "status", "keyPoints", "sentiment"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_summary" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      logger.error('AI gateway error', { status: response.status, errorText });
      aiTimer.end({ status: response.status, error: true });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const usage = data.usage;
    aiTimer.end({ tokens: usage?.total_tokens, promptTokens: usage?.prompt_tokens, completionTokens: usage?.completion_tokens });

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let resultData;
    if (toolCall?.function?.arguments) {
      resultData = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback to content if no tool call
      const content = data.choices?.[0]?.message?.content;
      resultData = { summary: content, status: 'pendente', keyPoints: [], sentiment: 'neutro' };
    }

    // Cache the response (TTL: 2 hours)
    await setCachedResponse(supabaseClient, {
      cacheKey,
      functionName: 'ai-conversation-summary',
      model: 'google/gemini-2.5-flash',
      requestHash: cacheKey,
      responseBody: resultData,
      tokenCount: usage?.total_tokens,
      ttlHours: 2,
    });

    requestTimer.end({ status: 'success', cache: 'MISS' });
    return new Response(
      JSON.stringify(resultData),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
    );

  } catch (error) {
    logger.error('Error generating summary', { error: error instanceof Error ? error.message : 'Unknown error' });
    requestTimer.end({ error: true });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
