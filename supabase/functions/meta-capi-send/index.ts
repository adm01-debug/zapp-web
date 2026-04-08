import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Sends Meta Conversions API events to Facebook.
 * Reads unsent events from meta_capi_events, sends to Meta, marks as sent.
 *
 * Required env: META_PIXEL_ID, META_ACCESS_TOKEN
 * API: https://graph.facebook.com/v21.0/{pixel_id}/events
 */
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

    // Get Meta config from global_settings
    const { data: pixelSetting } = await supabase
      .from("global_settings").select("value").eq("key", "meta_pixel_id").maybeSingle();
    const { data: tokenSetting } = await supabase
      .from("global_settings").select("value").eq("key", "meta_access_token").maybeSingle();

    const pixelId = pixelSetting?.value;
    const accessToken = tokenSetting?.value;

    if (!pixelId || !accessToken) {
      return errorResponse("Meta CAPI não configurado. Defina meta_pixel_id e meta_access_token nas configurações.", 400, req);
    }

    const body = await req.json();
    const action = body.action || "send-pending";

    if (action === "send-pending") {
      // Fetch unsent events
      const { data: events, error: fetchErr } = await supabase
        .from("meta_capi_events")
        .select("*")
        .eq("sent_to_meta", false)
        .order("created_at", { ascending: true })
        .limit(100);

      if (fetchErr) throw fetchErr;
      if (!events?.length) return jsonResponse({ sent: 0, message: "Nenhum evento pendente" }, 200, req);

      // Build Meta CAPI payload
      const metaEvents = events.map(evt => ({
        event_name: evt.event_name,
        event_time: Math.floor(new Date(evt.event_time || evt.created_at).getTime() / 1000),
        action_source: evt.action_source || "website",
        user_data: evt.user_data || {},
        custom_data: evt.custom_data || {},
        ...(evt.event_source_url ? { event_source_url: evt.event_source_url } : {}),
      }));

      // Send to Meta Conversions API
      const metaResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: metaEvents,
            ...(body.test_event_code ? { test_event_code: body.test_event_code } : {}),
          }),
        }
      );

      const metaResult = await metaResponse.json();

      if (!metaResponse.ok) {
        console.error("Meta CAPI error:", JSON.stringify(metaResult));
        return jsonResponse({
          sent: 0,
          error: metaResult.error?.message || "Meta API error",
          events_attempted: events.length,
        }, 207, req);
      }

      // Mark events as sent
      const eventIds = events.map(e => e.id);
      await supabase
        .from("meta_capi_events")
        .update({ sent_to_meta: true, sent_at: new Date().toISOString() })
        .in("id", eventIds);

      return jsonResponse({
        sent: events.length,
        meta_response: metaResult,
        events_processed: metaResult.events_received || events.length,
      }, 200, req);

    } else if (action === "send-single") {
      // Send a single event immediately
      const { event } = body;
      if (!event?.event_name) return errorResponse("Missing event data", 400, req);

      const metaResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: [{
              event_name: event.event_name,
              event_time: Math.floor(Date.now() / 1000),
              action_source: event.action_source || "website",
              user_data: event.user_data || {},
              custom_data: event.custom_data || {},
            }],
            ...(body.test_event_code ? { test_event_code: body.test_event_code } : {}),
          }),
        }
      );

      const metaResult = await metaResponse.json();
      return jsonResponse({ success: metaResponse.ok, meta_response: metaResult }, metaResponse.ok ? 200 : 207, req);
    }

    return errorResponse(`Unknown action: ${action}`, 400, req);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("meta-capi-send error:", msg);
    return errorResponse("Falha ao enviar eventos", 500, req);
  }
});
