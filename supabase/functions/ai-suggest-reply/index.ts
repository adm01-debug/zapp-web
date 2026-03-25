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

  // Rate limit: 20 AI requests per minute per IP
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(`ai:${clientIP}`, { maxRequests: 20, windowSeconds: 60 });
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck, getCorsHeaders(req));
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  try {
    const { messages, contactName, context, contactId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch Knowledge Base articles for context
    let knowledgeContext = '';
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: articles } = await supabase
        .from('knowledge_base_articles')
        .select('title, content, category')
        .eq('is_published', true)
        .limit(10);

      if (articles && articles.length > 0) {
        knowledgeContext = `\n\nBASE DE CONHECIMENTO DA EMPRESA (use como referência para suas respostas):\n${
          articles.map(a => `[${a.category || 'Geral'}] ${a.title}: ${a.content.substring(0, 500)}`).join('\n---\n')
        }`;
      }

      // Fetch contact history/notes for more context
      if (contactId) {
        const { data: notes } = await supabase
          .from('contact_notes')
          .select('content')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (notes && notes.length > 0) {
          knowledgeContext += `\n\nNOTAS DO CONTATO:\n${notes.map(n => n.content).join('\n')}`;
        }

        const { data: customFields } = await supabase
          .from('contact_custom_fields')
          .select('field_name, field_value')
          .eq('contact_id', contactId);

        if (customFields && customFields.length > 0) {
          knowledgeContext += `\n\nDADOS DO CONTATO:\n${customFields.map(f => `${f.field_name}: ${f.field_value}`).join('\n')}`;
        }
      }
    } catch (e) {
      console.error("Error fetching knowledge base:", e);
    }

    console.log("Generating reply suggestions for:", contactName, "with KB context:", knowledgeContext.length > 0);

    const systemPrompt = `Você é um Copilot de IA especializado em atendimento ao cliente via WhatsApp.
Seu papel é sugerir respostas profissionais, empáticas e CONTEXTUALIZADAS para agentes de suporte.

Contexto do cliente: ${contactName || 'Cliente'}
${context ? `Informações adicionais: ${context}` : ''}
${knowledgeContext}

IMPORTANTE: Use as informações da Base de Conhecimento e dados do contato para personalizar suas sugestões.
Se houver artigos relevantes, cite informações específicas nas respostas.

Baseado na conversa, gere exatamente 3 sugestões de resposta:
1. Uma resposta direta e objetiva (use dados da KB se aplicável)
2. Uma resposta mais empática e detalhada  
3. Uma resposta com pergunta de follow-up

Responda APENAS em formato JSON com a seguinte estrutura:
{
  "suggestions": [
    {"type": "direct", "text": "resposta aqui", "emoji": "✓", "source": "kb_article_title ou null"},
    {"type": "empathetic", "text": "resposta aqui", "emoji": "💬", "source": null},
    {"type": "followup", "text": "resposta aqui", "emoji": "❓", "source": null}
  ]
}`;

    const conversationHistory = messages?.map((m: any) => ({
      role: m.sender === 'agent' ? 'assistant' : 'user',
      content: m.content
    })) || [];

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
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: "Gere 3 sugestões de resposta contextualizadas para a última mensagem do cliente." }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let suggestions;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      suggestions = {
        suggestions: [
          { type: "direct", text: "Entendi sua solicitação. Vou verificar isso para você.", emoji: "✓", source: null },
          { type: "empathetic", text: "Compreendo sua situação. Estou aqui para ajudá-lo da melhor forma possível.", emoji: "💬", source: null },
          { type: "followup", text: "Poderia me fornecer mais detalhes sobre isso?", emoji: "❓", source: null }
        ]
      };
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in ai-suggest-reply:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
