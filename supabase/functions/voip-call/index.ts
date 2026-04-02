/**
 * voip-call — Edge Function for VoIP call orchestration
 *
 * Actions:
 *   offer   → Initiate outbound call via Evolution API
 *   accept  → Accept incoming call (future: relay audio)
 *   reject  → Reject incoming call
 *   end     → End active call
 *
 * All actions update the `calls` table and proxy to Evolution API.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { verifyJWT } from '../_shared/jwtVerifier.ts';
import { badRequest, serverError, unauthorized } from '../_shared/errorResponse.ts';
import { validateRequired } from '../_shared/validation.ts';

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') || '';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || '';

async function evolutionProxy(path: string, method: string, body?: unknown): Promise<Response> {
  const url = `${EVOLUTION_API_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res;
}

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Auth
    const { user, error: authError } = await verifyJWT(req);
    if (authError || !user) {
      return unauthorized('Token inválido', corsHeaders);
    }

    if (req.method !== 'POST') {
      return badRequest('Método não permitido', corsHeaders);
    }

    const body = await req.json();
    const { action } = body;

    const validationError = validateRequired(body, ['action']);
    if (validationError) {
      return badRequest(validationError, corsHeaders);
    }

    // Supabase client for DB operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get agent profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const agentId = profile?.id || null;

    // =============================================
    // OFFER — Start outbound call
    // =============================================
    if (action === 'offer') {
      const { instanceName, number, isVideo, contactId, connectionId } = body;

      if (!instanceName || !number) {
        return badRequest('instanceName e number são obrigatórios', corsHeaders);
      }

      // Create call record in DB
      const { data: callRecord, error: insertError } = await supabase
        .from('calls')
        .insert({
          contact_id: contactId || null,
          agent_id: agentId,
          whatsapp_connection_id: connectionId || null,
          direction: 'outbound',
          status: 'ringing',
          started_at: new Date().toISOString(),
          notes: isVideo ? 'Chamada de vídeo' : 'Chamada de voz',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating call record:', insertError);
        return serverError('Erro ao registrar chamada', corsHeaders);
      }

      // Send offer to Evolution API
      const evoRes = await evolutionProxy(`/call/offerCall/${instanceName}`, 'POST', {
        number,
        isVideo: isVideo ?? false,
        callDuration: body.callDuration ?? 0, // 0 = unlimited
      });

      const evoData = await evoRes.json().catch(() => ({}));

      if (!evoRes.ok) {
        // Update call as failed
        await supabase
          .from('calls')
          .update({ status: 'failed', ended_at: new Date().toISOString() })
          .eq('id', callRecord.id);

        return new Response(JSON.stringify({
          success: false,
          error: evoData.message || 'Falha ao iniciar chamada',
          callId: callRecord.id,
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        callId: callRecord.id,
        evolution: evoData,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =============================================
    // ACCEPT — Accept incoming call
    // =============================================
    if (action === 'accept') {
      const { callId } = body;

      if (!callId) {
        return badRequest('callId é obrigatório', corsHeaders);
      }

      // Update call record
      const { error: updateError } = await supabase
        .from('calls')
        .update({
          status: 'answered',
          agent_id: agentId,
          answered_at: new Date().toISOString(),
        })
        .eq('id', callId);

      if (updateError) {
        return serverError('Erro ao atualizar chamada', corsHeaders);
      }

      return new Response(JSON.stringify({ success: true, callId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =============================================
    // REJECT — Reject incoming call
    // =============================================
    if (action === 'reject') {
      const { callId } = body;

      if (!callId) {
        return badRequest('callId é obrigatório', corsHeaders);
      }

      await supabase
        .from('calls')
        .update({
          status: 'missed',
          agent_id: agentId,
          ended_at: new Date().toISOString(),
        })
        .eq('id', callId);

      return new Response(JSON.stringify({ success: true, callId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =============================================
    // END — End active call
    // =============================================
    if (action === 'end') {
      const { callId, durationSeconds } = body;

      if (!callId) {
        return badRequest('callId é obrigatório', corsHeaders);
      }

      await supabase
        .from('calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds || 0,
        })
        .eq('id', callId);

      return new Response(JSON.stringify({ success: true, callId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return badRequest(`Ação desconhecida: ${action}`, corsHeaders);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('[voip-call] Error:', message);
    return serverError('Erro interno no servidor', corsHeaders);
  }
});
