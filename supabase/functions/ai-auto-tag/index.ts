import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactId, messages } = await req.json();
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
      return new Response(JSON.stringify({ tags: [], priority: 'normal', sentiment: 'neutral' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversationText = conversationMessages
      .map((m: any) => `${m.sender}: ${m.content}`)
      .join('\n');

    // Fetch available queues for routing suggestion
    const { data: queues } = await supabase
      .from('queues')
      .select('id, name, description')
      .eq('is_active', true);

    const queueList = queues && queues.length > 0
      ? queues.map(q => `- "${q.name}" (${q.id}): ${q.description || 'Sem descrição'}`).join('\n')
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

    // Save tags to database
    if (contactId && result.tags?.length > 0) {
      await supabase.from('ai_conversation_tags').delete().eq('contact_id', contactId);
      
      await supabase.from('ai_conversation_tags').insert(
        result.tags.map((t: any) => ({
          contact_id: contactId,
          tag_name: t.name,
          confidence: t.confidence,
          source: 'ai',
        }))
      );
    }

    // Update contact AI metadata
    if (contactId) {
      const updateData: Record<string, string> = {};
      if (result.sentiment) updateData.ai_sentiment = result.sentiment;
      if (result.priority) updateData.ai_priority = result.priority;
      
      // Auto-route to suggested queue if confidence is high
      if (result.suggested_queue_id) {
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
            admins.map((a: any) => ({
              user_id: a.user_id,
              type: 'urgent_conversation',
              title: '🚨 Conversa Urgente Detectada',
              message: `${result.summary || 'Conversa requer atenção imediata'}. Motivo: ${result.escalation_reason || result.priority_reason || 'Alta prioridade'}`,
              metadata: { contact_id: contactId, priority: result.priority, sentiment: result.sentiment },
            }))
          );
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in ai-auto-tag:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
