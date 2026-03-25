import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || '');
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
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
      return new Response(JSON.stringify({ tags: [] }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const conversationText = conversationMessages
      .map((m: any) => `${m.sender}: ${m.content}`)
      .join('\n');

    const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
      maxRetries: 3,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um classificador de conversas de atendimento ao cliente. Analise a conversa e retorne tags relevantes.

Categorias possíveis: suporte_tecnico, vendas, financeiro, reclamacao, elogio, duvida, urgente, cancelamento, troca, entrega, pagamento, produto, servico, feedback, agendamento, orcamento

Responda APENAS em JSON:
{
  "tags": [
    {"name": "tag_name", "confidence": 0.95},
    {"name": "tag_name2", "confidence": 0.8}
  ],
  "sentiment": "positive|neutral|negative|critical",
  "summary": "resumo em 1 linha"
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
          status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { tags: [], sentiment: 'neutral', summary: '' };
    } catch {
      result = { tags: [], sentiment: 'neutral', summary: '' };
    }

    // Save tags to database
    if (contactId && result.tags?.length > 0) {
      // Remove old AI tags for this contact
      await supabase.from('ai_conversation_tags').delete().eq('contact_id', contactId);
      
      // Insert new ones
      await supabase.from('ai_conversation_tags').insert(
        result.tags.map((t: any) => ({
          contact_id: contactId,
          tag_name: t.name,
          confidence: t.confidence,
          source: 'ai',
        }))
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in ai-auto-tag:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
