import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auto-close config
    const { data: config, error: configError } = await supabase
      .from('auto_close_config')
      .select('*')
      .eq('is_enabled', true)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching config:', configError);
      return new Response(JSON.stringify({ error: 'Failed to fetch config' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!config) {
      return new Response(JSON.stringify({ message: 'Auto-close is disabled', closed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - config.inactivity_hours);

    // Find contacts with no recent messages that are still "open"
    // A contact is considered to have an open conversation if they have
    // messages and their last message is older than the inactivity threshold
    const { data: staleContacts, error: staleError } = await supabase
      .from('contacts')
      .select('id, name, phone, assigned_to')
      .lt('updated_at', cutoffDate.toISOString())
      .not('assigned_to', 'is', null);

    if (staleError) {
      console.error('Error finding stale contacts:', staleError);
      return new Response(JSON.stringify({ error: 'Failed to query stale contacts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!staleContacts || staleContacts.length === 0) {
      return new Response(JSON.stringify({ message: 'No stale conversations found', closed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let closedCount = 0;

    for (const contact of staleContacts) {
      // Send close message if configured
      if (config.close_message) {
        await supabase.from('messages').insert({
          contact_id: contact.id,
          content: config.close_message,
          sender: 'system',
          type: 'text',
        });
      }

      // Log the closure
      await supabase.from('conversation_closures').insert({
        contact_id: contact.id,
        close_reason: 'inactivity',
        outcome: 'auto_closed',
        notes: `Auto-closed after ${config.inactivity_hours}h of inactivity`,
      });

      // Unassign the contact
      await supabase
        .from('contacts')
        .update({ assigned_to: null })
        .eq('id', contact.id);

      closedCount++;
    }

    console.log(`Auto-closed ${closedCount} conversations`);

    return new Response(JSON.stringify({
      message: `Auto-closed ${closedCount} conversations`,
      closed: closedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
