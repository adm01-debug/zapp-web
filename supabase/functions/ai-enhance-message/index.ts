import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  handleCors, errorResponse, jsonResponse,
  sanitizeString, checkRateLimit, getClientIP, requireEnv, Logger,
} from "../_shared/validation.ts";

const tonePrompts: Record<string, string> = {
  professional: "Reescreva a mensagem abaixo de forma mais profissional, clara e educada. Mantenha o mesmo significado mas use linguagem corporativa e polida.",
  casual: "Reescreva a mensagem abaixo de forma mais casual, amigável e descontraída. Mantenha o mesmo significado mas use linguagem informal e acolhedora.",
  persuasive: "Reescreva a mensagem abaixo de forma mais persuasiva e convincente. Mantenha o mesmo significado mas torne-a mais impactante e motivadora.",
  empathetic: "Reescreva a mensagem abaixo de forma mais empática e acolhedora. Mantenha o mesmo significado mas demonstre compreensão e cuidado com o cliente.",
  concise: "Reescreva a mensagem abaixo de forma mais concisa e direta. Remova redundâncias e mantenha apenas o essencial, sem perder o significado.",
  detailed: "Reescreva a mensagem abaixo de forma mais detalhada e explicativa. Expanda as ideias para que fique mais completa e informativa.",
};

const VALID_TONES = new Set(Object.keys(tonePrompts));

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Rate limiting
    const ip = getClientIP(req);
    const { allowed, remaining } = checkRateLimit(`enhance:${ip}`, 20, 60_000);
    if (!allowed) {
      return errorResponse("Limite de requisições excedido. Tente novamente em 1 minuto.", 429);
    }

    const body = await req.json();
    const message = sanitizeString(body.message, 4096);
    const tone = typeof body.tone === 'string' && VALID_TONES.has(body.tone) ? body.tone : 'professional';

    if (!message) {
      return errorResponse("Mensagem é obrigatória e deve ter conteúdo válido.");
    }

    const LOVABLE_API_KEY = requireEnv("LOVABLE_API_KEY");
    const systemPrompt = tonePrompts[tone];

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
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return errorResponse("Limite de requisições excedido. Tente novamente em alguns segundos.", 429);
      if (response.status === 402) return errorResponse("Créditos de IA esgotados. Adicione créditos nas configurações.", 402);
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao processar com IA");
    }

    const data = await response.json();
    const enhancedMessage = data.choices?.[0]?.message?.content?.trim();
    if (!enhancedMessage) throw new Error("Resposta vazia da IA");

    return jsonResponse({ enhanced: enhancedMessage }, 200);
  } catch (error) {
    console.error("ai-enhance-message error:", error);
    return errorResponse(error instanceof Error ? error.message : "Erro desconhecido", 500);
  }
});
