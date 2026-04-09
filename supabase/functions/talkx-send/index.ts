/**
 * Talk X — Humanized bulk messaging edge function
 * Simulates typing, personalized messages with {{nome}}, {{apelido}}, {{empresa}}, {{saudacao}}
 * Supports text + media (image, video, document, audio)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getGreeting(): string {
  const hour = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  });
  const h = parseInt(hour, 10);
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function personalize(
  template: string,
  contact: { name: string; nickname?: string; company?: string }
): string {
  const firstName = contact.name?.split(" ")[0] || "";
  return template
    .replace(/\{\{nome\}\}/gi, firstName)
    .replace(/\{\{nome_completo\}\}/gi, contact.name || "")
    .replace(/\{\{apelido\}\}/gi, contact.nickname || firstName)
    .replace(/\{\{empresa\}\}/gi, contact.company || "")
    .replace(/\{\{saudacao\}\}/gi, getGreeting());
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch with exponential backoff retry */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      // Don't retry on client errors (4xx), only on server errors (5xx) or network failures
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < maxRetries) {
      const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      await sleep(backoff);
    }
  }
  throw lastError || new Error("Fetch failed after retries");
}

/** Map media_type to Evolution API endpoint */
function getMediaEndpoint(mediaType: string): string {
  switch (mediaType) {
    case "image": return "sendMedia";
    case "video": return "sendMedia";
    case "audio": return "sendWhatsAppAudio";
    case "document": return "sendMedia";
    default: return "sendMedia";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL")!;
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    const { campaignId, action } = await req.json();

    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaignId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle pause/cancel
    if (action === "pause" || action === "cancel") {
      const newStatus = action === "pause" ? "paused" : "cancelled";
      await supabase
        .from("talkx_campaigns")
        .update({ status: newStatus })
        .eq("id", campaignId);
      return new Response(JSON.stringify({ success: true, status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get campaign
    const { data: campaign, error: campErr } = await supabase
      .from("talkx_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get WhatsApp connection instance
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("instance_id")
      .eq("id", campaign.whatsapp_connection_id)
      .single();

    if (!connection?.instance_id) {
      return new Response(
        JSON.stringify({ error: "WhatsApp connection not found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark as sending
    await supabase
      .from("talkx_campaigns")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", campaignId);

    // Get pending recipients with contact info
    const { data: recipients } = await supabase
      .from("talkx_recipients")
      .select("*, contacts:contact_id(name, nickname, phone, company)")
      .eq("campaign_id", campaignId)
      .in("status", ["pending", "sending"])
      .order("created_at");

    if (!recipients || recipients.length === 0) {
      await supabase
        .from("talkx_campaigns")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", campaignId);
      return new Response(
        JSON.stringify({ success: true, message: "No recipients to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = campaign.sent_count || 0;
    let failedCount = campaign.failed_count || 0;
    const hasMedia = !!campaign.media_url && !!campaign.media_type;

    for (const recipient of recipients) {
      // Check if campaign was paused/cancelled
      const { data: currentCampaign } = await supabase
        .from("talkx_campaigns")
        .select("status")
        .eq("id", campaignId)
        .single();

      if (
        currentCampaign?.status === "paused" ||
        currentCampaign?.status === "cancelled"
      ) {
        break;
      }

      const contact = recipient.contacts as any;
      if (!contact?.phone) {
        await supabase
          .from("talkx_recipients")
          .update({
            status: "skipped",
            error_message: "Sem número de telefone",
          })
          .eq("id", recipient.id);
        continue;
      }

      // Personalize message
      const personalizedMsg = personalize(campaign.message_template, contact);

      // Update recipient with personalized message
      await supabase
        .from("talkx_recipients")
        .update({ personalized_message: personalizedMsg, status: "sending" })
        .eq("id", recipient.id);

      try {
        // Format phone number
        const phone = contact.phone.replace(/\D/g, "");

        // 1. Simulate typing (composing state)
        const typingDelay = randomBetween(
          campaign.typing_delay_min,
          campaign.typing_delay_max
        );

        try {
          await fetch(
            `${evolutionUrl}/chat/updatePresence/${connection.instance_id}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: evolutionKey,
              },
              body: JSON.stringify({
                number: phone,
                presence: "composing",
              }),
            }
          );
        } catch {
          // Presence update is best-effort
        }

        // Wait typing delay
        await sleep(typingDelay);

        let sendResponse: Response;
        let sendResult: any;

        if (hasMedia) {
          // 2a. Send media message with retry
          const mediaEndpoint = getMediaEndpoint(campaign.media_type);
          sendResponse = await fetchWithRetry(
            `${evolutionUrl}/message/${mediaEndpoint}/${connection.instance_id}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: evolutionKey,
              },
              body: JSON.stringify({
                number: phone,
                mediatype: campaign.media_type,
                media: campaign.media_url,
                caption: personalizedMsg,
                delay: 0,
              }),
            }
          );
          sendResult = await sendResponse.json();
        } else {
          // 2b. Send text-only message with retry
          sendResponse = await fetchWithRetry(
            `${evolutionUrl}/message/sendText/${connection.instance_id}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: evolutionKey,
              },
              body: JSON.stringify({
                number: phone,
                text: personalizedMsg,
                delay: 0,
              }),
            }
          );
          sendResult = await sendResponse.json();
        }

        if (sendResponse.ok && !sendResult.error) {
          sentCount++;
          await supabase
            .from("talkx_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);
        } else {
          failedCount++;
          await supabase
            .from("talkx_recipients")
            .update({
              status: "failed",
              error_message:
                sendResult?.message || sendResult?.error || "Erro ao enviar",
            })
            .eq("id", recipient.id);
        }
      } catch (err) {
        failedCount++;
        await supabase
          .from("talkx_recipients")
          .update({
            status: "failed",
            error_message: err instanceof Error ? err.message : "Erro desconhecido",
          })
          .eq("id", recipient.id);
      }

      // Update campaign progress
      await supabase
        .from("talkx_campaigns")
        .update({ sent_count: sentCount, failed_count: failedCount })
        .eq("id", campaignId);

      // 3. Wait between messages (human-like interval)
      const sendInterval = randomBetween(
        campaign.send_interval_min,
        campaign.send_interval_max
      );
      await sleep(sendInterval);
    }

    // Check final status
    const { data: finalCampaign } = await supabase
      .from("talkx_campaigns")
      .select("status")
      .eq("id", campaignId)
      .single();

    if (finalCampaign?.status === "sending") {
      await supabase
        .from("talkx_campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .eq("id", campaignId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: recipients.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Talk X error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
