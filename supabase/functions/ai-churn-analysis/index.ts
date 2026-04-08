import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

interface ChurnSignal {
  contactId: string;
  contactName: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  riskScore: number; // 0-100
  signals: string[];
  recommendation: string;
}

function calculateChurnRisk(metrics: {
  daysSinceLastMessage: number;
  totalMessages: number;
  avgResponseTime: number;
  sentimentTrend: number; // -1 to 1
  hasNegativeSentiment: boolean;
  wasRecentlyTransferred: boolean;
}): { riskScore: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Inactivity
  if (metrics.daysSinceLastMessage > 30) { score += 30; signals.push(`Sem contato há ${metrics.daysSinceLastMessage} dias`); }
  else if (metrics.daysSinceLastMessage > 14) { score += 15; signals.push(`Sem contato há ${metrics.daysSinceLastMessage} dias`); }
  else if (metrics.daysSinceLastMessage > 7) { score += 5; }

  // Low engagement
  if (metrics.totalMessages < 3) { score += 15; signals.push("Pouquíssimas interações"); }

  // Negative sentiment
  if (metrics.hasNegativeSentiment) { score += 20; signals.push("Sentimento negativo detectado"); }
  if (metrics.sentimentTrend < -0.3) { score += 10; signals.push("Tendência de sentimento em queda"); }

  // Slow response (from our side)
  if (metrics.avgResponseTime > 24 * 60) { score += 15; signals.push("Tempo de resposta > 24h"); }
  else if (metrics.avgResponseTime > 4 * 60) { score += 5; signals.push("Tempo de resposta > 4h"); }

  // Recently transferred (sign of frustration)
  if (metrics.wasRecentlyTransferred) { score += 10; signals.push("Transferido recentemente"); }

  return { riskScore: Math.min(score, 100), signals };
}

function getRiskLevel(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function getRecommendation(level: string, signals: string[]): string {
  switch (level) {
    case "critical": return "Ação imediata: contate o cliente com oferta de retenção personalizada";
    case "high": return "Agende um follow-up proativo nas próximas 24h";
    case "medium": return "Monitore e envie uma mensagem de acompanhamento esta semana";
    default: return "Cliente saudável — mantenha o relacionamento";
  }
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
    const contactIds: string[] = body.contactIds || [];

    // If no specific contacts, analyze recent ones
    let contactsToAnalyze: { id: string; name: string }[];

    if (contactIds.length > 0) {
      const { data } = await supabase
        .from("contacts")
        .select("id, name")
        .in("id", contactIds.slice(0, 50));
      contactsToAnalyze = data || [];
    } else {
      const { data } = await supabase
        .from("contacts")
        .select("id, name")
        .eq("contact_type", "cliente")
        .order("updated_at", { ascending: false })
        .limit(50);
      contactsToAnalyze = data || [];
    }

    const results: ChurnSignal[] = [];
    const now = new Date();

    for (const contact of contactsToAnalyze) {
      // Get latest messages
      const { data: messages } = await supabase
        .from("messages")
        .select("created_at, sender, content")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!messages?.length) continue;

      const lastMessage = new Date(messages[0].created_at);
      const daysSinceLastMessage = Math.floor((now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate avg response time (agent responses after contact messages)
      let totalResponseTime = 0;
      let responseCount = 0;
      for (let i = 1; i < messages.length; i++) {
        if (messages[i - 1].sender === "agent" && messages[i].sender === "contact") {
          const diff = new Date(messages[i - 1].created_at).getTime() - new Date(messages[i].created_at).getTime();
          totalResponseTime += diff / (1000 * 60); // in minutes
          responseCount++;
        }
      }
      const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

      // Check sentiment
      const { data: analyses } = await supabase
        .from("conversation_analyses")
        .select("sentiment_score")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const sentimentScores = (analyses || []).map(a => a.sentiment_score || 0);
      const avgSentiment = sentimentScores.length > 0 ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length : 0;
      const sentimentTrend = sentimentScores.length >= 2 ? sentimentScores[0] - sentimentScores[sentimentScores.length - 1] : 0;

      // Check transfers
      const { count: transferCount } = await supabase
        .from("connection_transfers")
        .select("*", { count: "exact", head: true })
        .eq("client_phone", contact.id)
        .gte("created_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { riskScore, signals } = calculateChurnRisk({
        daysSinceLastMessage,
        totalMessages: messages.length,
        avgResponseTime,
        sentimentTrend,
        hasNegativeSentiment: avgSentiment < -0.3,
        wasRecentlyTransferred: (transferCount || 0) > 0,
      });

      const riskLevel = getRiskLevel(riskScore);
      const recommendation = getRecommendation(riskLevel, signals);

      results.push({
        contactId: contact.id,
        contactName: contact.name,
        riskLevel,
        riskScore,
        signals,
        recommendation,
      });
    }

    // Sort by risk score descending
    results.sort((a, b) => b.riskScore - a.riskScore);

    return jsonResponse({
      analyzed: results.length,
      results,
      summary: {
        critical: results.filter(r => r.riskLevel === "critical").length,
        high: results.filter(r => r.riskLevel === "high").length,
        medium: results.filter(r => r.riskLevel === "medium").length,
        low: results.filter(r => r.riskLevel === "low").length,
      },
    }, 200, req);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("ai-churn-analysis error:", msg);
    return errorResponse("Falha na análise de churn", 500, req);
  }
});
