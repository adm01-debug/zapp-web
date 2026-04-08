import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const CATEGORIES = [
  "Suporte Técnico", "Financeiro", "Comercial", "Reclamação",
  "Dúvida", "Elogio", "Cancelamento", "Agendamento",
];

async function classifyWithAI(messages: string[]): Promise<{ tag: string; confidence: number }> {
  if (!GEMINI_API_KEY) {
    // Fallback: keyword-based classification
    const text = messages.join(" ").toLowerCase();
    if (text.includes("erro") || text.includes("bug") || text.includes("não funciona")) return { tag: "Suporte Técnico", confidence: 0.7 };
    if (text.includes("pagamento") || text.includes("boleto") || text.includes("nota fiscal")) return { tag: "Financeiro", confidence: 0.7 };
    if (text.includes("preço") || text.includes("orçamento") || text.includes("comprar")) return { tag: "Comercial", confidence: 0.7 };
    if (text.includes("reclamação") || text.includes("insatisf") || text.includes("absurdo")) return { tag: "Reclamação", confidence: 0.8 };
    if (text.includes("cancelar") || text.includes("cancelamento")) return { tag: "Cancelamento", confidence: 0.8 };
    if (text.includes("agendar") || text.includes("horário") || text.includes("agenda")) return { tag: "Agendamento", confidence: 0.7 };
    if (text.includes("parabéns") || text.includes("obrigado") || text.includes("excelente")) return { tag: "Elogio", confidence: 0.6 };
    return { tag: "Dúvida", confidence: 0.5 };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Classifique esta conversa em UMA das categorias: ${CATEGORIES.join(", ")}.\n\nConversa:\n${messages.slice(-10).join("\n")}\n\nResponda APENAS com JSON: {"tag": "categoria", "confidence": 0.0-1.0}` }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
        }),
      }
    );

    if (!response.ok) throw new Error("Gemini API error");
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = text.match(/\{[^}]+\}/);
    if (match) return JSON.parse(match[0]);
  } catch {
    // Fallback to keyword classification
  }

  return { tag: "Dúvida", confidence: 0.4 };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401, req);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401, req);

    const body = await req.json();
    const limit = Math.min(body.limit || 50, 100);

    // Get recent conversations without AI tags
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, name")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (!contacts?.length) return jsonResponse({ classified: 0, results: [] }, 200, req);

    const results: { contactId: string; contactName: string; tag: string; confidence: number; priority: string }[] = [];

    for (const contact of contacts) {
      // Get recent messages for this contact
      const { data: messages } = await supabase
        .from("messages")
        .select("content, sender")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!messages?.length) continue;

      const messageTexts = messages.map(m => `${m.sender}: ${m.content}`);
      const { tag, confidence } = await classifyWithAI(messageTexts);

      // Determine priority
      let priority = "medium";
      const tagLower = tag.toLowerCase();
      if (tagLower.includes("reclamação") || tagLower.includes("cancelamento")) priority = "high";
      if (confidence > 0.8 && tagLower.includes("reclamação")) priority = "urgent";
      if (tagLower.includes("elogio") || tagLower.includes("dúvida")) priority = "low";

      // Save the tag
      await supabase.from("ai_conversation_tags").upsert({
        contact_id: contact.id,
        tag_name: tag,
        confidence,
        source: "ai-classify-tickets",
      }, { onConflict: "contact_id,tag_name" }).catch(() => {});

      results.push({
        contactId: contact.id,
        contactName: contact.name,
        tag,
        confidence,
        priority,
      });
    }

    return jsonResponse({
      classified: results.length,
      results,
    }, 200, req);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("ai-classify-tickets error:", msg);
    return errorResponse("Falha na classificação", 500, req);
  }
});
