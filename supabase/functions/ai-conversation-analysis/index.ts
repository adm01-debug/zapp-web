import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';
import { generateCacheKey, getCachedResponse, setCachedResponse } from '../_shared/aiCache.ts';

import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { verifyJWT } from '../_shared/jwtVerifier.ts';
import { unauthorized, serverError } from '../_shared/errorResponse.ts';

const logger = createStructuredLogger('ai-conversation-analysis');

serve(async (req) => {
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'ai-conversation-analysis', getCorsHeaders(req));
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
    const { messages, contactName } = await req.json();

    if (!messages || messages.length < 5) {
      return new Response(
        JSON.stringify({ error: 'Conversation must have at least 5 messages for analysis' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
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
    const cacheKey = await generateCacheKey('ai-conversation-analysis', messages, undefined, 'google/gemini-2.5-flash');
    const cached = await getCachedResponse(supabaseClient, cacheKey);
    if (cached.hit) {
      logger.info('Cache HIT for ai-conversation-analysis');
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

    const systemPrompt = `Você é um assistente especializado em análise de conversas de atendimento ao cliente.
Analise a conversa abaixo e forneça uma análise completa incluindo:

1. Um resumo conciso (máximo 4 frases) do assunto principal e o que foi discutido
2. O status atual da conversa (resolvido, pendente, aguardando_cliente, aguardando_atendente)
3. Pontos-chave discutidos (máximo 5 itens importantes)
4. Próximos passos sugeridos (ações recomendadas para o atendente)
5. Análise de sentimento do cliente (positivo, neutro, negativo)
6. Score de sentimento (0-100, onde 0 é muito negativo e 100 é muito positivo)
7. Tópicos principais abordados na conversa (máximo 5 palavras-chave)
8. Nível de urgência detectado (baixa, media, alta)
9. Estimativa de satisfação do cliente (1-5 estrelas)

Considere:
- Tom das mensagens do cliente
- Velocidade de resolução
- Complexidade do problema
- Sinais de frustração ou satisfação

Responda em português brasileiro de forma clara e objetiva.`;

    logger.info('Calling Lovable AI for conversation analysis');

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
              name: "analyze_conversation",
              description: "Perform comprehensive analysis of the customer service conversation",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Brief summary of the conversation (max 4 sentences)"
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
                    description: "Suggested next steps for the agent"
                  },
                  sentiment: {
                    type: "string",
                    enum: ["positivo", "neutro", "negativo"],
                    description: "Overall customer sentiment"
                  },
                  sentimentScore: {
                    type: "number",
                    description: "Sentiment score from 0 (very negative) to 100 (very positive)"
                  },
                  topics: {
                    type: "array",
                    items: { type: "string" },
                    description: "Main topics discussed (max 5 keywords)"
                  },
                  urgency: {
                    type: "string",
                    enum: ["baixa", "media", "alta"],
                    description: "Urgency level of the conversation"
                  },
                  customerSatisfaction: {
                    type: "number",
                    description: "Estimated customer satisfaction from 1 to 5"
                  }
                },
                required: ["summary", "status", "keyPoints", "sentiment", "sentimentScore", "urgency"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_conversation" } }
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    logger.info('AI response received', { usage: data.usage });

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let resultData;
    if (toolCall?.function?.arguments) {
      resultData = JSON.parse(toolCall.function.arguments);
      logger.info('Analysis data extracted');
    } else {
      // Fallback to content if no tool call
      const content = data.choices?.[0]?.message?.content;
      resultData = {
        summary: content || 'Unable to analyze conversation',
        status: 'pendente',
        keyPoints: [],
        sentiment: 'neutro',
        sentimentScore: 50,
        urgency: 'media'
      };
    }

    // Cache the response (TTL: 2 hours)
    await setCachedResponse(supabaseClient, {
      cacheKey,
      functionName: 'ai-conversation-analysis',
      model: 'google/gemini-2.5-flash',
      requestHash: cacheKey,
      responseBody: resultData,
      tokenCount: data.usage?.total_tokens,
      ttlHours: 2,
    });

    requestTimer.end({ status: 'success' });
    return new Response(
      JSON.stringify(resultData),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'X-Cache': 'MISS' } }
    );

  } catch (error) {
    logger.error('Error analyzing conversation', { error: error instanceof Error ? error.message : String(error) });
    requestTimer.end({ error: true });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
