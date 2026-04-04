import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { handleCors, errorResponse, jsonResponse, requireEnv, Logger } from "../_shared/validation.ts";
import { AiConversationSummarySchema, parseBody } from "../_shared/schemas.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("ai-conversation-summary");

  try {
    const parsed = parseBody(AiConversationSummarySchema, await req.json());
    if (!parsed.success) return errorResponse(parsed.error, 400, req);

    const { messages, contactName, contactId } = parsed.data;
    const LOVABLE_API_KEY = requireEnv("LOVABLE_API_KEY");
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));

    // Fetch contact context for richer analysis
    let contactContext = '';
    if (contactId) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('name, company, tags, ai_priority, ai_sentiment, notes')
        .eq('id', contactId)
        .maybeSingle();

      if (contact) {
        contactContext = `\nContexto: ${contact.name || 'Cliente'}, Empresa: ${contact.company || 'N/A'}, Tags: ${contact.tags?.join(', ') || 'Nenhuma'}`;
      }

      const { data: prevAnalyses } = await supabase
        .from('conversation_analyses')
        .select('sentiment, summary, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (prevAnalyses && prevAnalyses.length > 0) {
        contactContext += `\nHistórico: ${prevAnalyses.map(a => `[${a.sentiment}] ${a.summary}`).join(' | ')}`;
      }
    }

    const conversationText = messages
      .map((msg) =>
        `[${msg.sender === 'agent' ? 'Atendente' : contactName || 'Cliente'}]: ${msg.content || ''}`
      )
      .join('\n');

    const systemPrompt = `Você é um analista de conversas de atendimento ao cliente com foco em insights acionáveis.
Analise a conversa e forneça uma análise estruturada e detalhada.
${contactContext}

Foque em:
- Identificar o problema/necessidade REAL do cliente (não apenas o que ele disse)
- Avaliar a qualidade do atendimento prestado
- Detectar oportunidades de venda ou melhoria
- Identificar riscos de churn/insatisfação
- Sugerir ações concretas e mensuráveis`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversa com ${contactName || 'Cliente'}:\n\n${conversationText}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_analysis",
              description: "Generate a comprehensive analysis of the conversation",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Brief summary (max 3 sentences)" },
                  status: { type: "string", enum: ["resolvido", "pendente", "aguardando_cliente", "aguardando_atendente", "escalado"] },
                  keyPoints: { type: "array", items: { type: "string" }, description: "Key points (max 5)" },
                  nextSteps: { type: "array", items: { type: "string" }, description: "Actionable next steps" },
                  sentiment: { type: "string", enum: ["positivo", "neutro", "negativo", "critico"] },
                  sentimentScore: { type: "number", description: "Sentiment score 0-100 (100=very positive)" },
                  customerSatisfaction: { type: "number", description: "Estimated CSAT 1-5" },
                  agentPerformance: {
                    type: "object",
                    properties: {
                      empathy: { type: "number" }, clarity: { type: "number" },
                      efficiency: { type: "number" }, knowledge: { type: "number" },
                    },
                  },
                  churnRisk: { type: "string", enum: ["low", "medium", "high"] },
                  salesOpportunity: { type: "string", description: "Description of sales opportunity or null" },
                  topics: { type: "array", items: { type: "string" }, description: "Main topics discussed" },
                  urgency: { type: "string", enum: ["low", "normal", "high", "critical"] },
                },
                required: ["summary", "status", "keyPoints", "sentiment", "sentimentScore", "customerSatisfaction", "topics", "urgency"],
                additionalProperties: false,
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_analysis" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return errorResponse("Rate limit exceeded", 429, req);
      if (response.status === 402) return errorResponse("Payment required", 402, req);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let analysisData;
    if (toolCall?.function?.arguments) {
      analysisData = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content;
      analysisData = { summary: content, status: 'pendente', keyPoints: [], sentiment: 'neutro', sentimentScore: 50, customerSatisfaction: 3, topics: [], urgency: 'normal' };
    }

    // Save analysis to database
    if (contactId) {
      await supabase.from('conversation_analyses').insert({
        contact_id: contactId,
        summary: analysisData.summary,
        sentiment: analysisData.sentiment,
        sentiment_score: analysisData.sentimentScore,
        customer_satisfaction: analysisData.customerSatisfaction,
        key_points: analysisData.keyPoints,
        next_steps: analysisData.nextSteps || [],
        topics: analysisData.topics,
        urgency: analysisData.urgency,
        status: analysisData.status,
        message_count: messages.length,
      });

      await supabase.from('contacts').update({
        ai_sentiment: analysisData.sentiment,
        ai_priority: analysisData.urgency === 'critical' ? 'urgent' : analysisData.urgency,
      }).eq('id', contactId);
    }

    log.done(200);
    return jsonResponse(analysisData, 200, req);
  } catch (error) {
    log.error("Error generating summary", { error: error instanceof Error ? error.message : String(error) });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500, req);
  }
});
