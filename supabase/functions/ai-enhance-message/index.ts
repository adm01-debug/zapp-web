import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tonePrompts: Record<string, string> = {
  professional: "Reescreva a mensagem abaixo de forma mais profissional, clara e educada. Mantenha o mesmo significado mas use linguagem corporativa e polida.",
  casual: "Reescreva a mensagem abaixo de forma mais casual, amigável e descontraída. Mantenha o mesmo significado mas use linguagem informal e acolhedora.",
  persuasive: "Reescreva a mensagem abaixo de forma mais persuasiva e convincente. Mantenha o mesmo significado mas torne-a mais impactante e motivadora.",
  empathetic: "Reescreva a mensagem abaixo de forma mais empática e acolhedora. Mantenha o mesmo significado mas demonstre compreensão e cuidado com o cliente.",
  concise: "Reescreva a mensagem abaixo de forma mais concisa e direta. Remova redundâncias e mantenha apenas o essencial, sem perder o significado.",
  detailed: "Reescreva a mensagem abaixo de forma mais detalhada e explicativa. Expanda as ideias para que fique mais completa e informativa.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, tone = "professional" } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagem é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = tonePrompts[tone] || tonePrompts.professional;

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
            content: `${systemPrompt}\n\nRegras importantes:\n- Retorne APENAS a mensagem reescrita, sem explicações, aspas ou prefixos.\n- Não adicione saudações ou despedidas que não existiam na mensagem original.\n- Mantenha o mesmo idioma da mensagem original.\n- Mantenha emojis se houverem na mensagem original.\n- A mensagem é para ser enviada via WhatsApp para um cliente.`,
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos nas configurações." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao processar com IA");
    }

    const data = await response.json();
    const enhancedMessage = data.choices?.[0]?.message?.content?.trim();

    if (!enhancedMessage) {
      throw new Error("Resposta vazia da IA");
    }

    return new Response(
      JSON.stringify({ enhanced: enhancedMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-enhance-message error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
