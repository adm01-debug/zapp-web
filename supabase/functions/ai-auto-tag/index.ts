import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import {
  handleCors, errorResponse, jsonResponse,
  sanitizeString, isValidUUID, checkRateLimit, getClientIP, requireEnv, Logger,
} from "../_shared/validation.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(`autotag:${ip}`, 20, 60_000);
    if (!allowed) return errorResponse("Rate limit exceeded", 429);

    const body = await req.json();
    const contactId = body.contactId && isValidUUID(body.contactId) ? body.contactId : null;

    const LOVABLE_API_KEY = requireEnv("LOVABLE_API_KEY");
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recent messages if not provided
    let conversationMessages = body.messages;
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
      return jsonResponse({ tags: [], priority: 'normal', sentiment: 'neutral' });
    }

    const conversationText = conversationMessages
      .map((m: { sender?: string; content?: string }) =>
        `${sanitizeString(String(m.sender || 'unknown'), 50)}: ${sanitizeString(String(m.content || ''), 1000)}`
      )
      .join('\n');

    // Fetch available queues for routing suggestion
    const { data: queues } = await supabase
      .from('queues')
      .select('id, name, description')
      .eq('is_active', true);

    const queueList = queues && queues.length > 0
      ? queues.map((q: { name: string; id: string; description: string | null }) =>
          `- "${q.name}" (${q.id}): ${q.description || 'Sem descrição'}`
        ).join('\n')
      : '';

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um classificador avançado de conversas de atendimento ao cliente. Analise a conversa e retorne classificação completa.

Categorias possíveis: suporte_tecnico, vendas, financeiro, reclamacao, elogio, duvida, urgente, cancelamento, troca, entrega, pagamento, produto, servico, feedback, agendamento, orcamento

${queueList ? `FILAS DISPONÍVEIS:\n${queueList}` : ''}

Responda APENAS em JSON:
{
  "tags": [
    {"name": "tag_name", "confidence": 0.95}
  ],
  "sentiment": "positive|neutral|negative|critical",
  "priority": "low|normal|high|urgent",
  "priority_reason": "motivo da prioridade",
  "summary": "resumo em 1 linha",
  "suggested_queue_id": "uuid da fila sugerida ou null",
  "suggested_queue_reason": "motivo da sugestão",
  "customer_intent": "o que o cliente quer resolver",
  "requires_immediate_attention": false,
  "escalation_reason": null
}`
          },
          { role: "user", content: conversationText }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return errorResponse("Rate limit exceeded", 429);
      if (response.status === 402) return errorResponse("Payment required", 402);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { tags: [], sentiment: 'neutral', summary: '', priority: 'normal' };
    } catch {
      result = { tags: [], sentiment: 'neutral', summary: '', priority: 'normal' };
    }

    // Validate suggested_queue_id is a valid UUID before using it
    if (result.suggested_queue_id && !isValidUUID(result.suggested_queue_id)) {
      result.suggested_queue_id = null;
    }

    // Save tags to database
    if (contactId && result.tags?.length > 0) {
      await supabase.from('ai_conversation_tags').delete().eq('contact_id', contactId);

      await supabase.from('ai_conversation_tags').insert(
        result.tags.map((t: { name: string; confidence: number }) => ({
          contact_id: contactId,
          tag_name: sanitizeString(t.name, 100) || 'unknown',
          confidence: Math.min(Math.max(Number(t.confidence) || 0, 0), 1),
          source: 'ai',
        }))
      );
    }

    // Update contact AI metadata
    if (contactId) {
      const validSentiments = ['positive', 'neutral', 'negative', 'critical'];
      const validPriorities = ['low', 'normal', 'high', 'urgent'];

      const updateData: Record<string, string> = {};
      if (validSentiments.includes(result.sentiment)) updateData.ai_sentiment = result.sentiment;
      if (validPriorities.includes(result.priority)) updateData.ai_priority = result.priority;

      if (result.suggested_queue_id && isValidUUID(result.suggested_queue_id)) {
        updateData.queue_id = result.suggested_queue_id;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase.from('contacts').update(updateData).eq('id', contactId);
      }

      // Create urgent notification if needed
      if (result.requires_immediate_attention && result.priority === 'urgent') {
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'supervisor'])
          .limit(5);

        if (admins) {
          await supabase.from('notifications').insert(
            admins.map((a: { user_id: string }) => ({
              user_id: a.user_id,
              type: 'urgent_conversation',
              title: '🚨 Conversa Urgente Detectada',
              message: `${sanitizeString(result.summary, 200) || 'Conversa requer atenção imediata'}. Motivo: ${sanitizeString(result.escalation_reason || result.priority_reason, 200) || 'Alta prioridade'}`,
              metadata: { contact_id: contactId, priority: result.priority, sentiment: result.sentiment },
            }))
          );
        }
      }
    }

    return jsonResponse(result);
  } catch (error: unknown) {
    console.error("Error in ai-auto-tag:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(errorMessage, 500);
  }
});
