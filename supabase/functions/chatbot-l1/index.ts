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

    return new Response(JSON.stringify({
      handled: !result.transfer_to_human,
      response: result.response,
      transfer_to_human: result.transfer_to_human || false,
      transfer_reason: result.transfer_reason,
      confidence: result.confidence,
      matched_article: result.matched_article,
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
