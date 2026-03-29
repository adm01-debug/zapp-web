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
    const { allowed } = checkRateLimit(`suggest:${ip}`, 15, 60_000);
    if (!allowed) return errorResponse("Rate limit exceeded. Please try again later.", 429);

    const body = await req.json();
    const { messages, context } = body;
    const contactName = sanitizeString(body.contactName, 200) || 'Cliente';
    const contactId = body.contactId && isValidUUID(body.contactId) ? body.contactId : null;

    const LOVABLE_API_KEY = requireEnv("LOVABLE_API_KEY");

    // Fetch Knowledge Base articles for context
    let knowledgeContext = '';
    try {
      const supabaseUrl = requireEnv("SUPABASE_URL");
      const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: articles } = await supabase
        .from('knowledge_base_articles')
        .select('title, content, category')
        .eq('is_published', true)
        .limit(10);

      if (articles && articles.length > 0) {
        knowledgeContext = `\n\nBASE DE CONHECIMENTO DA EMPRESA (use como referência para suas respostas):\n${
          articles.map((a: { category: string | null; title: string; content: string }) =>
            `[${a.category || 'Geral'}] ${a.title}: ${a.content.substring(0, 500)}`
          ).join('\n---\n')
        }`;
      }

      if (contactId) {
        const { data: notes } = await supabase
          .from('contact_notes')
          .select('content')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (notes && notes.length > 0) {
          knowledgeContext += `\n\nNOTAS DO CONTATO:\n${notes.map((n: { content: string }) => n.content).join('\n')}`;
        }

        const { data: customFields } = await supabase
          .from('contact_custom_fields')
          .select('field_name, field_value')
          .eq('contact_id', contactId);

        if (customFields && customFields.length > 0) {
          knowledgeContext += `\n\nDADOS DO CONTATO:\n${customFields.map((f: { field_name: string; field_value: string | null }) => `${f.field_name}: ${f.field_value}`).join('\n')}`;
        }
      }
    } catch (e) {
      console.error("Error fetching knowledge base:", e);
    }

    console.log("Generating reply suggestions for:", contactName, "with KB context:", knowledgeContext.length > 0);

    const systemPrompt = `Você é um Copilot de IA especializado em atendimento ao cliente via WhatsApp.
Seu papel é sugerir respostas profissionais, empáticas e CONTEXTUALIZADAS para agentes de suporte.

Contexto do cliente: ${contactName}
${context ? `Informações adicionais: ${sanitizeString(String(context), 500)}` : ''}
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

    const conversationHistory = Array.isArray(messages)
      ? messages.slice(-20).map((m: { sender?: string; content?: string }) => ({
          role: m.sender === 'agent' ? 'assistant' : 'user',
          content: sanitizeString(String(m.content || ''), 2000) || '',
        }))
      : [];

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
          { role: "user", content: "Gere 3 sugestões de resposta contextualizadas para a última mensagem do cliente." }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) return errorResponse("Rate limit exceeded. Please try again later.", 429);
      if (response.status === 402) return errorResponse("Payment required. Please add credits.", 402);
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
    } catch {
      console.error("Parse error, using fallback suggestions");
      suggestions = {
        suggestions: [
          { type: "direct", text: "Entendi sua solicitação. Vou verificar isso para você.", emoji: "✓", source: null },
          { type: "empathetic", text: "Compreendo sua situação. Estou aqui para ajudá-lo da melhor forma possível.", emoji: "💬", source: null },
          { type: "followup", text: "Poderia me fornecer mais detalhes sobre isso?", emoji: "❓", source: null }
        ]
      };
    }

    return jsonResponse(suggestions);
  } catch (error: unknown) {
    console.error("Error in ai-suggest-reply:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(errorMessage, 500);
  }
});
