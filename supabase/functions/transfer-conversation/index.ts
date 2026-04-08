import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCors } from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

/**
 * Cross-connection transfer: moves a conversation from one WhatsApp number
 * to another. The flow:
 *
 * 1. Validate source contact and target connection
 * 2. Send farewell message from source number
 * 3. Create/link contact on target connection
 * 4. Send welcome message from target number (with context)
 * 5. Mark source conversation as transferred
 * 6. Create transfer record for audit trail
 */

async function sendEvolutionMessage(
  instanceName: string,
  phone: string,
  text: string
): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error("Evolution API not configured");
    return false;
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: phone, text }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`Failed to send message via ${instanceName}: ${err}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Evolution API error: ${err}`);
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
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("user_id", user.id)
      .single();
    if (!profile) throw new Error("Profile not found");

    const body = await req.json();
    const {
      source_contact_id,
      target_connection_id,
      farewell_message,
      welcome_message,
      transfer_message, // internal note for receiving agent
      target_queue_id,
      target_agent_id,
    } = body;

    if (!source_contact_id || !target_connection_id) {
      return new Response(JSON.stringify({ error: "Missing source_contact_id or target_connection_id" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 1. Get source contact and connection info
    const { data: sourceContact, error: contactErr } = await supabase
      .from("contacts")
      .select("id, name, phone, email, whatsapp_connection_id, assigned_to, tags")
      .eq("id", source_contact_id)
      .single();

    if (contactErr || !sourceContact) {
      return new Response(JSON.stringify({ error: "Source contact not found" }), {
        status: 404,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!sourceContact.whatsapp_connection_id) {
      return new Response(JSON.stringify({ error: "Source contact has no WhatsApp connection" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get source connection details (for instance name)
    const { data: sourceConn } = await supabase
      .from("whatsapp_connections")
      .select("id, name, instance_id")
      .eq("id", sourceContact.whatsapp_connection_id)
      .single();

    // Get target connection details
    const { data: targetConn } = await supabase
      .from("whatsapp_connections")
      .select("id, name, instance_id, phone_number")
      .eq("id", target_connection_id)
      .single();

    if (!targetConn) {
      return new Response(JSON.stringify({ error: "Target connection not found" }), {
        status: 404,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 2. Create transfer record
    const { data: transfer, error: transferErr } = await supabase
      .from("connection_transfers")
      .insert({
        source_connection_id: sourceContact.whatsapp_connection_id,
        source_contact_id: sourceContact.id,
        source_agent_id: profile.id,
        target_connection_id: target_connection_id,
        target_queue_id: target_queue_id || null,
        target_agent_id: target_agent_id || null,
        client_phone: sourceContact.phone,
        client_name: sourceContact.name,
        farewell_message: farewell_message || null,
        welcome_message: welcome_message || null,
        transfer_message: transfer_message || null,
        status: "sending",
      })
      .select()
      .single();

    if (transferErr) throw transferErr;

    // 3. Send farewell message from source number
    const defaultFarewell = `Obrigado pelo contato! Vou transferir você para o nosso setor responsável que continuará seu atendimento pelo número ${targetConn.phone_number || "da empresa"}. Até breve! 🙏`;
    const farewellText = farewell_message || defaultFarewell;

    if (sourceConn?.instance_id) {
      await sendEvolutionMessage(sourceConn.instance_id, sourceContact.phone, farewellText);
    }

    // 4. Create/link contact on target connection
    const { data: existingTarget } = await supabase
      .from("contacts")
      .select("id")
      .eq("phone", sourceContact.phone)
      .eq("whatsapp_connection_id", target_connection_id)
      .maybeSingle();

    let targetContactId: string;

    if (existingTarget) {
      targetContactId = existingTarget.id;
    } else {
      // Create new contact linked to target connection
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
        .select("id")
        .single();

      if (createErr) {
        await supabase.from("connection_transfers").update({
          status: "failed",
          error_message: `Failed to create target contact: ${createErr.message}`,
        }).eq("id", transfer.id);
        throw createErr;
      }
      targetContactId = newContact.id;
    }

    // Update transfer with target contact
    await supabase.from("connection_transfers").update({
      target_contact_id: targetContactId,
    }).eq("id", transfer.id);

    // 5. Send welcome message from target number
    const agentName = target_agent_id
      ? (await supabase.from("profiles").select("name").eq("id", target_agent_id).single()).data?.name
      : null;

    const defaultWelcome = `Olá ${sourceContact.name}! 👋\n\nSou ${agentName || "do setor"} ${targetConn.name || "responsável"} e vou dar continuidade ao seu atendimento.\n\nComo posso ajudá-lo(a)?`;
    const welcomeText = welcome_message || defaultWelcome;

    if (targetConn.instance_id) {
      const sent = await sendEvolutionMessage(targetConn.instance_id, sourceContact.phone, welcomeText);
      if (!sent) {
        await supabase.from("connection_transfers").update({
          status: "failed",
          error_message: "Failed to send welcome message from target connection",
        }).eq("id", transfer.id);
      }
    }

    // 6. Save welcome as a message in the target contact
    await supabase.from("messages").insert({
      contact_id: targetContactId,
      whatsapp_connection_id: target_connection_id,
      sender: "agent",
      content: welcomeText,
      message_type: "text",
      agent_id: target_agent_id || profile.id,
    });

    // 7. Save context summary as internal note
    if (transfer_message) {
      await supabase.from("messages").insert({
        contact_id: targetContactId,
        whatsapp_connection_id: target_connection_id,
        sender: "agent",
        content: `📋 *Nota de transferência:*\n${transfer_message}\n\n_Transferido por ${profile.name}_`,
        message_type: "text",
        agent_id: profile.id,
      });
    }

    // 8. Mark transfer as completed
    await supabase.from("connection_transfers").update({
      status: "completed",
      completed_at: new Date().toISOString(),
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
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
