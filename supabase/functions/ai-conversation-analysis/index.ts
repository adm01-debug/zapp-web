import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
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

    const { messages, contactName, contactId } = parsed.data;
    const LOVABLE_API_KEY = requireEnv("LOVABLE_API_KEY");
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));

    // Fetch contact context for richer analysis
    let contactContext = '';
    if (contactId) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('name, company, tags, ai_priority, ai_sentiment, notes, contact_type')
        .eq('id', contactId)
        .maybeSingle();

      if (contact) {
        contactContext = `\nContexto do cliente: ${contact.name || 'Cliente'}`;
        if (contact.company) contactContext += `, Empresa: ${contact.company}`;
        if (contact.tags?.length) contactContext += `, Tags: ${contact.tags.join(', ')}`;
        if (contact.contact_type) contactContext += `, Tipo: ${contact.contact_type}`;
        if (contact.ai_sentiment) contactContext += `, Sentimento anterior: ${contact.ai_sentiment}`;
      }

      // Previous analyses for trend
      const { data: prevAnalyses } = await supabase
        .from('conversation_analyses')
        .select('sentiment, sentiment_score, summary, urgency, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (prevAnalyses && prevAnalyses.length > 0) {
        contactContext += `\nAnálises anteriores: ${prevAnalyses.map(a => `[${a.sentiment} ${a.sentiment_score}%] ${a.summary?.substring(0, 80)}`).join(' | ')}`;
      }
    }

    const conversationText = messages
      .map((msg) =>
        `[${msg.sender === 'agent' ? 'Atendente' : contactName || 'Cliente'}]: ${msg.content || ''}`
      )
      .join('\n');

    const systemPrompt = `Você é um analista sênior de conversas de atendimento ao cliente com foco em insights acionáveis.
${contactContext}

Analise a conversa de forma profunda e forneça:
1. Resumo conciso (máx 4 frases) do problema real do cliente
2. Status da conversa
3. Pontos-chave (máx 5)
4. Próximos passos concretos e acionáveis
5. Sentimento do cliente com score 0-100
6. Tópicos principais (máx 5 palavras-chave)
7. Urgência detectada
8. Satisfação estimada (1-5)
9. Desempenho do atendente (empatia, clareza, eficiência, conhecimento - cada 1-10)
10. Risco de churn (low/medium/high)
11. Oportunidade de venda/upsell se houver

Considere tom, frustração, complexidade, tempo de resposta e qualidade do atendimento.
Responda em português brasileiro.`;

    log.info("Calling AI for conversation analysis", {
      contactId,
      messageCount: messages.length,
    });
...
    // Save analysis & update contact
    let analysisId: string | null = null;

    if (contactId) {
      const { data: insertedAnalysis, error: insertError } = await supabase
        .from('conversation_analyses')
        .insert({
          contact_id: contactId,
          summary: analysisData.summary,
          sentiment: analysisData.sentiment,
          sentiment_score: analysisData.sentimentScore,
          customer_satisfaction: analysisData.customerSatisfaction,
          key_points: analysisData.keyPoints,
          next_steps: analysisData.nextSteps,
          topics: analysisData.topics,
          urgency: analysisData.urgency,
          status: analysisData.status,
          message_count: messages.length,
        })
        .select('id')
        .single();

      if (insertError) {
        log.warn("Failed to persist conversation analysis", {
          contactId,
          error: insertError.message,
        });
      } else {
        analysisId = insertedAnalysis?.id ?? null;
      }

      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          ai_sentiment: analysisData.sentiment,
          ai_priority: analysisData.urgency === 'critica' ? 'urgent' : analysisData.urgency,
        })
        .eq('id', contactId);

      if (updateError) {
        log.warn("Failed to update contact AI fields", {
          contactId,
          error: updateError.message,
        });
      }
    }

    log.done(200, { analysisId, messageCount: messages.length });
    return jsonResponse({ ...analysisData, analysisId }, 200, req);

  } catch (error) {
    log.error("Error analyzing conversation", { error: error instanceof Error ? error.message : String(error) });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500, req);
  }
});
