import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCors } from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

async function sendEvolutionMessage(
  instanceName: string,
  phone: string,
  text: string
): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number: phone, text }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch (err) {
    console.error(`Evolution API error for ${instanceName}:`, err);
    return false;
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles").select("id, name, role").eq("user_id", user.id).single();
    if (!profile) throw new Error("Profile not found");

    const body = await req.json();
    const {
      source_contact_id, target_connection_id,
      farewell_message, welcome_message, transfer_message,
      target_queue_id, target_agent_id,
    } = body;

    if (!source_contact_id || !target_connection_id) {
      return new Response(JSON.stringify({ error: "Missing source_contact_id or target_connection_id" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── 1. Validate source contact ─────────────────────────────────────
    const { data: sourceContact } = await supabase
      .from("contacts")
      .select("id, name, phone, email, whatsapp_connection_id, assigned_to, tags")
      .eq("id", source_contact_id)
      .single();

    if (!sourceContact) {
      return new Response(JSON.stringify({ error: "Contato não encontrado" }), {
        status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!sourceContact.phone) {
      return new Response(JSON.stringify({ error: "Contato sem telefone — transferência requer WhatsApp" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!sourceContact.whatsapp_connection_id) {
      return new Response(JSON.stringify({ error: "Contato sem conexão WhatsApp" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── SECURITY: Only assigned agent or admin can transfer ────────────
    const isAdmin = profile.role === 'admin' || profile.role === 'supervisor';
    if (!isAdmin && sourceContact.assigned_to !== profile.id) {
      return new Response(JSON.stringify({ error: "Sem permissão: contato não atribuído a você" }), {
        status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── GUARD: Block self-transfer ─────────────────────────────────────
    if (sourceContact.whatsapp_connection_id === target_connection_id) {
      return new Response(JSON.stringify({ error: "Não é possível transferir para a mesma conexão" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── 2. Get connections in parallel ─────────────────────────────────
    const [sourceConnResult, targetConnResult] = await Promise.all([
      supabase.from("whatsapp_connections").select("id, name, instance_id").eq("id", sourceContact.whatsapp_connection_id).single(),
      supabase.from("whatsapp_connections").select("id, name, instance_id, phone_number, status").eq("id", target_connection_id).single(),
    ]);

    const sourceConn = sourceConnResult.data;
    const targetConn = targetConnResult.data;

    if (!targetConn) {
      return new Response(JSON.stringify({ error: "Conexão destino não encontrada" }), {
        status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (targetConn.status !== 'connected') {
      return new Response(JSON.stringify({ error: `Conexão destino (${targetConn.name}) está desconectada` }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── 3. Create transfer record ──────────────────────────────────────
    const { data: transfer, error: transferErr } = await supabase
      .from("connection_transfers")
      .insert({
        source_connection_id: sourceContact.whatsapp_connection_id,
        source_contact_id: sourceContact.id,
        source_agent_id: profile.id,
        target_connection_id,
        target_queue_id: target_queue_id || null,
        target_agent_id: target_agent_id || null,
        client_phone: sourceContact.phone,
        client_name: sourceContact.name,
        farewell_message: farewell_message || null,
        welcome_message: welcome_message || null,
        transfer_message: transfer_message || null,
        status: "pending",
      })
      .select().single();

    if (transferErr) throw transferErr;

    // Update to "sending"
    await supabase.from("connection_transfers").update({ status: "sending" }).eq("id", transfer.id);

    // ── 4. Send farewell from source ───────────────────────────────────
    const defaultFarewell = `Obrigado pelo contato! Vou transferir você para o nosso setor responsável que continuará seu atendimento pelo número ${targetConn.phone_number || "da empresa"}. Até breve! 🙏`;
    const farewellText = farewell_message || defaultFarewell;
    let farewellSent = false;

    if (sourceConn?.instance_id) {
      farewellSent = await sendEvolutionMessage(sourceConn.instance_id, sourceContact.phone, farewellText);
      if (!farewellSent) {
        console.warn("Farewell message failed to send — continuing transfer anyway");
        await supabase.from("connection_transfers").update({
          error_message: "Mensagem de despedida não enviada (conexão origem instável)",
        }).eq("id", transfer.id);
      }
    }

    // ── 5. Create/link target contact ──────────────────────────────────
    const { data: existingTarget } = await supabase
      .from("contacts").select("id, tags")
      .eq("phone", sourceContact.phone)
      .eq("whatsapp_connection_id", target_connection_id)
      .maybeSingle();

    let targetContactId: string;

    if (existingTarget) {
      targetContactId = existingTarget.id;
      // Add "transferido" tag if not already present
      const tags = existingTarget.tags || [];
      if (!tags.includes("transferido")) {
        await supabase.from("contacts").update({ tags: [...tags, "transferido"] }).eq("id", existingTarget.id);
      }
    } else {
      const { data: newContact, error: createErr } = await supabase
        .from("contacts")
        .insert({
          name: sourceContact.name,
          phone: sourceContact.phone,
          email: sourceContact.email,
          whatsapp_connection_id: target_connection_id,
          assigned_to: target_agent_id || null,
          tags: [...(sourceContact.tags || []), "transferido"],
          notes: `Transferido de ${sourceConn?.name || "outra conexão"} por ${profile.name} em ${new Date().toLocaleString("pt-BR")}`,
        })
        .select("id").single();

      if (createErr) {
        await supabase.from("connection_transfers").update({
          status: "failed", error_message: `Falha ao criar contato: ${createErr.message}`,
        }).eq("id", transfer.id);
        throw createErr;
      }
      targetContactId = newContact.id;
    }

    await supabase.from("connection_transfers").update({ target_contact_id: targetContactId }).eq("id", transfer.id);

    // ── 6. Send welcome from target ────────────────────────────────────
    const agentName = target_agent_id
      ? (await supabase.from("profiles").select("name").eq("id", target_agent_id).single()).data?.name
      : null;

    const defaultWelcome = `Olá ${sourceContact.name}! 👋\n\nSou ${agentName || "do setor"} ${targetConn.name || "responsável"} e vou dar continuidade ao seu atendimento.\n\nComo posso ajudá-lo(a)?`;
    const welcomeText = welcome_message || defaultWelcome;

    let welcomeSent = false;
    if (targetConn.instance_id) {
      welcomeSent = await sendEvolutionMessage(targetConn.instance_id, sourceContact.phone, welcomeText);
    }

    if (!welcomeSent) {
      // Welcome failed — record but don't fully fail (contact already created)
      await supabase.from("connection_transfers").update({
        status: "failed",
        error_message: "Mensagem de boas-vindas não enviada — contato criado mas cliente não notificado",
      }).eq("id", transfer.id);

      // If farewell was sent, notify client on source that transfer had issues
      if (farewellSent && sourceConn?.instance_id) {
        await sendEvolutionMessage(
          sourceConn.instance_id,
          sourceContact.phone,
          "Pedimos desculpa, houve um problema técnico na transferência. Um atendente entrará em contato em breve."
        ).catch(() => {});
      }

      return new Response(JSON.stringify({
        success: false,
        transfer_id: transfer.id,
        error: "Transferência parcial: contato criado mas mensagem de boas-vindas falhou",
      }), {
        status: 207, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── 7. Save messages ───────────────────────────────────────────────
    await supabase.from("messages").insert({
      contact_id: targetContactId,
      whatsapp_connection_id: target_connection_id,
      sender: "agent",
      content: welcomeText,
      message_type: "text",
      agent_id: target_agent_id || null, // null if no specific target agent
    });

    // Save internal note using whisper_messages if transfer_message provided
    if (transfer_message) {
      await supabase.from("whisper_messages").insert({
        contact_id: targetContactId,
        sender_agent_id: profile.id,
        target_agent_id: target_agent_id || null,
        content: `📋 Nota de transferência de ${sourceConn?.name || "outra conexão"}:\n${transfer_message}`,
      }).then(() => {}).catch(() => {
        // Fallback: save as regular message if whisper table doesn't support this
        supabase.from("messages").insert({
          contact_id: targetContactId,
          whatsapp_connection_id: target_connection_id,
          sender: "agent",
          content: `📋 *[INTERNO]* Nota de transferência:\n${transfer_message}\n\n_Por ${profile.name}_`,
          message_type: "text",
          agent_id: profile.id,
        });
      });
    }

    // ── 8. Complete ────────────────────────────────────────────────────
    await supabase.from("connection_transfers").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      context_summary: `Despedida: ${farewellSent ? 'enviada' : 'falhou'}. Boas-vindas: enviada. Contato: ${existingTarget ? 'existente' : 'criado'}.`,
    }).eq("id", transfer.id);

    return new Response(JSON.stringify({
      success: true,
      transfer_id: transfer.id,
      target_contact_id: targetContactId,
      message: `Conversa transferida para ${targetConn.name}`,
    }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Transfer error:", msg);
    return new Response(JSON.stringify({ error: "Falha na transferência" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
