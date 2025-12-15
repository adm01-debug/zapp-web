import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, contactName, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating reply suggestions for:", contactName);
    console.log("Messages count:", messages?.length || 0);

    const systemPrompt = `Você é um assistente especializado em atendimento ao cliente via WhatsApp. 
Seu papel é sugerir respostas profissionais e empáticas para agentes de suporte.

Contexto do cliente: ${contactName || 'Cliente'}
${context ? `Informações adicionais: ${context}` : ''}

Baseado na conversa, gere exatamente 3 sugestões de resposta:
1. Uma resposta direta e objetiva
2. Uma resposta mais empática e detalhada  
3. Uma resposta com pergunta de follow-up

Responda APENAS em formato JSON com a seguinte estrutura:
{
  "suggestions": [
    {"type": "direct", "text": "resposta aqui", "emoji": "✓"},
    {"type": "empathetic", "text": "resposta aqui", "emoji": "💬"},
    {"type": "followup", "text": "resposta aqui", "emoji": "❓"}
  ]
}`;

    const conversationHistory = messages?.map((m: any) => ({
      role: m.sender === 'agent' ? 'assistant' : 'user',
      content: m.content
    })) || [];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: "Gere 3 sugestões de resposta para a última mensagem do cliente." }
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("AI response:", content);

    // Parse JSON response
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
      // Fallback suggestions
      suggestions = {
        suggestions: [
          { type: "direct", text: "Entendi sua solicitação. Vou verificar isso para você.", emoji: "✓" },
          { type: "empathetic", text: "Compreendo sua situação. Estou aqui para ajudá-lo da melhor forma possível.", emoji: "💬" },
          { type: "followup", text: "Poderia me fornecer mais detalhes sobre isso?", emoji: "❓" }
        ]
      };
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in ai-suggest-reply:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
