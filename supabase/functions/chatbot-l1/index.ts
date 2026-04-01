import { getCorsHeaders as _getCors } from "../_shared/validation.ts";
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RAG: Search Knowledge Base with full-text search for relevant articles
    const { data: relevantArticles } = await supabase
      .rpc('search_knowledge_base', { search_query: message, max_results: 5 });

    // Fallback: if no results from search, get general articles
    let kbContext = '';
    if (relevantArticles && relevantArticles.length > 0) {
      kbContext = relevantArticles
        .map((a: any) => `[${a.category || 'Geral'}] ${a.title} (relevância: ${(a.rank * 100).toFixed(0)}%):\n${a.content.substring(0, 800)}`)
        .join('\n---\n');
    } else {
      const { data: fallbackArticles } = await supabase
        .from('knowledge_base_articles')
        .select('title, content, category')
        .eq('is_published', true)
        .limit(5);

      if (fallbackArticles && fallbackArticles.length > 0) {
        kbContext = fallbackArticles
          .map(a => `[${a.category || 'Geral'}] ${a.title}: ${a.content.substring(0, 400)}`)
          .join('\n---\n');
      }
    }

    // Fetch conversation history
    const { data: history } = await supabase
      .from('messages')
      .select('content, sender, message_type')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(15);

    const conversationHistory = (history || []).reverse().map((m: any) => ({
      role: m.sender === 'agent' ? 'assistant' : 'user',
      content: m.content,
    }));

    // Fetch contact context
    let contactContext = '';
    if (contactId) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('name, company, tags, ai_priority, ai_sentiment')
        .eq('id', contactId)
        .maybeSingle();

      if (contact) {
        contactContext = `\nCONTEXTO DO CLIENTE:
- Nome: ${contact.name || 'Desconhecido'}
- Empresa: ${contact.company || 'N/A'}
- Tags: ${contact.tags?.join(', ') || 'Nenhuma'}
- Prioridade: ${contact.ai_priority || 'normal'}
- Sentimento: ${contact.ai_sentiment || 'neutro'}`;
      }
    }

    const systemPrompt = `Você é um assistente de atendimento automatizado (Nível 1) via WhatsApp.
Seu objetivo é resolver dúvidas usando a Base de Conhecimento da empresa com respostas precisas e contextualizadas.

BASE DE CONHECIMENTO (artigos mais relevantes para a pergunta):
${kbContext || 'Nenhum artigo disponível.'}
${contactContext}

REGRAS:
1. Se a pergunta pode ser respondida com a Base de Conhecimento, responda diretamente com informações ESPECÍFICAS dos artigos.
2. Cite dados concretos dos artigos (valores, procedimentos, prazos) quando disponíveis.
3. Se a pergunta é complexa, requer ação humana, ou o cliente está irritado, transfira para humano.
4. NUNCA invente informações que não estão na Base de Conhecimento.
5. Se não encontrou artigos relevantes mas é uma saudação/despedida, responda normalmente.
6. Se não tiver certeza, transfira para humano.
7. Adapte o tom ao sentimento do cliente (mais cuidadoso com clientes insatisfeitos).

Responda em JSON:
{
  "response": "sua resposta ao cliente",
  "transfer_to_human": false,
  "transfer_reason": null,
  "confidence": 0.95,
  "matched_article": "título do artigo usado ou null",
  "detected_intent": "categoria da intenção (suporte, vendas, reclamação, etc)",
  "detected_sentiment": "positive|neutral|negative|critical"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If confidence is too low, transfer to human
    if (result.confidence < 0.6) {
      result.transfer_to_human = true;
      result.transfer_reason = 'low_confidence';
    }

    // Update contact AI metadata
    if (contactId && (result.detected_sentiment || result.detected_intent)) {
      const updateData: Record<string, string> = {};
      if (result.detected_sentiment) updateData.ai_sentiment = result.detected_sentiment;
      if (result.detected_sentiment === 'critical' || result.detected_sentiment === 'negative') {
        updateData.ai_priority = 'high';
      }
      
      await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId);
    }

    return new Response(JSON.stringify({
      handled: !result.transfer_to_human,
      response: result.response,
      transfer_to_human: result.transfer_to_human || false,
      transfer_reason: result.transfer_reason,
      confidence: result.confidence,
      matched_article: result.matched_article,
      detected_intent: result.detected_intent,
      detected_sentiment: result.detected_sentiment,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in chatbot-l1:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ handled: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
