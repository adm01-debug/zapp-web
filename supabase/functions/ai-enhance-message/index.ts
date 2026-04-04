import {
  handleCors, errorResponse, jsonResponse,
  sanitizeString, isValidUUID, checkRateLimit, getClientIP, requireEnv, Logger,
} from "../_shared/validation.ts";
import { AiEnhanceMessageSchema, parseBody } from "../_shared/schemas.ts";

const tonePrompts: Record<string, string> = {
  professional: "Reescreva a mensagem abaixo de forma mais profissional, clara e educada. Mantenha o mesmo significado mas use linguagem corporativa e polida.",
  casual: "Reescreva a mensagem abaixo de forma mais casual, amigável e descontraída. Mantenha o mesmo significado mas use linguagem informal e acolhedora.",
  persuasive: "Reescreva a mensagem abaixo de forma mais persuasiva e convincente. Mantenha o mesmo significado mas torne-a mais impactante e motivadora.",
  empathetic: "Reescreva a mensagem abaixo de forma mais empática e acolhedora. Mantenha o mesmo significado mas demonstre compreensão e cuidado com o cliente.",
  concise: "Reescreva a mensagem abaixo de forma mais concisa e direta. Remova redundâncias e mantenha apenas o essencial, sem perder o significado.",
  detailed: "Reescreva a mensagem abaixo de forma mais detalhada e explicativa. Expanda as ideias para que fique mais completa e informativa.",
};

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("ai-enhance-message");

  try {
    const ip = getClientIP(req);
    const { allowed } = checkRateLimit(`enhance:${ip}`, 20, 60_000);
    if (!allowed) return errorResponse("Limite de requisições excedido. Tente novamente em 1 minuto.", 429, req);

    const parsed = parseBody(AiEnhanceMessageSchema, await req.json());
    if (!parsed.success) return errorResponse(parsed.error, 400, req);

    const { message, tone } = parsed.data;
    const LOVABLE_API_KEY = requireEnv("LOVABLE_API_KEY");
    const systemPrompt = tonePrompts[tone];

    log.info("Enhancing message", { tone, len: message.length });

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
      if (response.status === 429) return errorResponse("Limite de requisições excedido. Tente novamente em alguns segundos.", 429, req);
      if (response.status === 402) return errorResponse("Créditos de IA esgotados. Adicione créditos nas configurações.", 402, req);
      const errorText = await response.text();
      log.error("AI gateway error", { status: response.status, detail: errorText.substring(0, 300) });
      throw new Error("Erro ao processar com IA");
    }

    const data = await response.json();
    const enhancedMessage = data.choices?.[0]?.message?.content?.trim();
    if (!enhancedMessage) throw new Error("Resposta vazia da IA");

    log.done(200);
    return jsonResponse({ enhanced: enhancedMessage }, 200, req);
  } catch (error: unknown) {
    log.error("Unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return errorResponse(error instanceof Error ? error.message : "Erro desconhecido", 500, req);
  }
});
