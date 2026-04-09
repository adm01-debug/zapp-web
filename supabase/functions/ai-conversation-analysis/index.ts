import { handleCors, errorResponse, jsonResponse, requireEnv, Logger, checkRateLimit, getClientIP } from "../_shared/validation.ts";
import { AiConversationAnalysisSchema, parseBody } from "../_shared/schemas.ts";
import { callAiWithTracking, extractUserIdFromRequest } from "../_shared/ai-usage.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("ai-conversation-analysis");
  const userId = extractUserIdFromRequest(req);

  try {
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(`analysis:${ip}`, 10, 60_000);
    if (!allowed) return errorResponse("Rate limit exceeded. Please try again later.", 429, req);

    const parsed = parseBody(AiConversationAnalysisSchema, await req.json());
    if (!parsed.success) return errorResponse(parsed.error, 400, req);

    const { messages, contactName } = parsed.data;
    const LOVABLE_API_KEY = requireEnv("LOVABLE_API_KEY");

    const conversationText = messages
      .map((msg) =>
        `[${msg.sender === 'agent' ? 'Atendente' : contactName || 'Cliente'}]: ${msg.content || ''}`
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

    log.info("Calling AI for conversation analysis");

    const { response, data } = await callAiWithTracking({
      functionName: 'ai-conversation-analysis',
      userId,
      apiKey: LOVABLE_API_KEY,
      body: {
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
                  summary: { type: "string", description: "Brief summary of the conversation (max 4 sentences)" },
                  status: { type: "string", enum: ["resolvido", "pendente", "aguardando_cliente", "aguardando_atendente"], description: "Current status of the conversation" },
                  keyPoints: { type: "array", items: { type: "string" }, description: "Key points discussed (max 5)" },
                  nextSteps: { type: "array", items: { type: "string" }, description: "Suggested next steps for the agent" },
                  sentiment: { type: "string", enum: ["positivo", "neutro", "negativo"], description: "Overall customer sentiment" },
                  sentimentScore: { type: "number", description: "Sentiment score from 0 (very negative) to 100 (very positive)" },
                  topics: { type: "array", items: { type: "string" }, description: "Main topics discussed (max 5 keywords)" },
                  urgency: { type: "string", enum: ["baixa", "media", "alta"], description: "Urgency level of the conversation" },
                  customerSatisfaction: { type: "number", description: "Estimated customer satisfaction from 1 to 5" }
                },
                required: ["summary", "status", "keyPoints", "sentiment", "sentimentScore", "urgency"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_conversation" } }
      },
    });

    if (!response.ok || !data) {
      if (response.status === 429) return errorResponse("Rate limit exceeded. Please try again later.", 429, req);
      if (response.status === 402) return errorResponse("Payment required. Please add credits to your workspace.", 402, req);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const toolCall = (data.choices as Array<{message: {tool_calls?: Array<{function: {arguments: string}}>; content?: string}}>)?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const analysisData = JSON.parse(toolCall.function.arguments);
      log.done(200);
      return jsonResponse(analysisData, 200, req);
    }

    const content = (data.choices as Array<{message: {content?: string}}>)?.[0]?.message?.content;
    log.done(200);
    return jsonResponse({
      summary: content || 'Unable to analyze conversation',
      status: 'pendente',
      keyPoints: [],
      sentiment: 'neutro',
      sentimentScore: 50,
      urgency: 'media'
    }, 200, req);

  } catch (error) {
    log.error("Error analyzing conversation", { error: error instanceof Error ? error.message : String(error) });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500, req);
  }
});
