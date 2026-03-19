import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Called internally (via DB webhook or from the app) when an agent replies
 * to a sicoob_gifts contact. Forwards the message to Sicoob Gifts' chat-bridge.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sicoobGiftsUrl = Deno.env.get('SICOOB_GIFTS_URL');
    const sicoobGiftsBridgeSecret = Deno.env.get('SICOOB_GIFTS_BRIDGE_SECRET');

    if (!sicoobGiftsUrl || !sicoobGiftsBridgeSecret) {
      throw new Error('SICOOB_GIFTS_URL or SICOOB_GIFTS_BRIDGE_SECRET not configured');
    }

    const body = await req.json();
    const { contact_id, content, message_id, agent_id, created_at } = body;

    if (!contact_id || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: contact_id, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the contact to verify it's a sicoob_gifts contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, name, contact_type, channel_type')
      .eq('id', contact_id)
      .single();

    if (!contact || contact.contact_type !== 'sicoob_gifts') {
      return new Response(
        JSON.stringify({ error: 'Contact is not a Sicoob Gifts contact' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the mapping to find Sicoob IDs
    const { data: mapping } = await supabase
      .from('sicoob_contact_mapping')
      .select('sicoob_user_id, sicoob_vendedor_id, sicoob_singular_id')
      .eq('contact_id', contact_id)
      .single();

    if (!mapping) {
      console.error('No Sicoob mapping found for contact:', contact_id);
      return new Response(
        JSON.stringify({ error: 'No Sicoob mapping found for this contact' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get agent name
    let agentName = 'Vendedor';
    if (agent_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', agent_id)
        .single();
      if (profile?.full_name) agentName = profile.full_name;
    }

    // Forward to Sicoob Gifts
    const sicoobPayload = {
      action: 'agent_reply',
      contact_id,
      content,
      message_id,
      agent_id,
      agent_name: agentName,
      sicoob_user_id: mapping.sicoob_user_id,
      sicoob_vendedor_id: mapping.sicoob_vendedor_id,
      sicoob_singular_id: mapping.sicoob_singular_id,
      created_at: created_at || new Date().toISOString(),
    };

    console.log('Forwarding reply to Sicoob Gifts:', JSON.stringify(sicoobPayload));

    const response = await fetch(`${sicoobGiftsUrl}/functions/v1/chat-bridge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sicoobGiftsBridgeSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sicoobPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sicoob Gifts bridge error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Sicoob Gifts returned ${response.status}: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Sicoob Gifts bridge response:', JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true, sicoob_response: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sicoob bridge reply error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
