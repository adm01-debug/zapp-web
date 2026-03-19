import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    const bridgeSecret = Deno.env.get('SICOOB_BRIDGE_SECRET');
    
    if (!bridgeSecret) {
      throw new Error('SICOOB_BRIDGE_SECRET not configured');
    }
    
    if (authHeader !== `Bearer ${bridgeSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    if (action === 'new_message') {
      const {
        message_id,
        sender_name,
        sender_email,
        sender_phone,
        singular_name,
        singular_id,
        content,
        vendedor_user_id,
        created_at,
      } = body;

      if (!message_id || !sender_name || !content || !vendedor_user_id || !singular_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: message_id, sender_name, content, vendedor_user_id, singular_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if message already exists (idempotency)
      const { data: existingMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('external_id', message_id)
        .maybeSingle();

      if (existingMsg) {
        return new Response(
          JSON.stringify({ success: true, message: 'Message already exists', message_id: existingMsg.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if we already have a mapping for this sender
      const { data: existingMapping } = await supabase
        .from('sicoob_contact_mapping')
        .select('contact_id, zappweb_agent_id')
        .eq('sicoob_user_id', body.sender_id || message_id) // Use sender_id if provided
        .eq('sicoob_singular_id', singular_id)
        .maybeSingle();

      let contactId: string;
      let agentId: string | null = null;

      if (existingMapping) {
        contactId = existingMapping.contact_id;
        agentId = existingMapping.zappweb_agent_id;

        // Update contact info
        await supabase
          .from('contacts')
          .update({
            name: sender_name,
            company: singular_name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId);
      } else {
        // Find or match the vendedor in profiles by email or metadata
        // For now, try to find a profile that matches
        const { data: vendedorProfile } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .maybeSingle();

        agentId = vendedorProfile?.id || null;

        // Create new contact
        const phone = sender_phone || `sicoob-${singular_id}-${Date.now()}`;
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            name: sender_name,
            phone,
            email: sender_email || null,
            company: singular_name,
            contact_type: 'sicoob_gifts',
            channel_type: 'internal_chat',
            assigned_to: agentId,
            tags: ['sicoob-gifts'],
            notes: `Cooperado da singular: ${singular_name} (${singular_id})`,
          })
          .select('id')
          .single();

        if (contactError) {
          console.error('Error creating contact:', contactError);
          throw new Error(`Failed to create contact: ${contactError.message}`);
        }

        contactId = newContact.id;

        // Create mapping
        await supabase
          .from('sicoob_contact_mapping')
          .insert({
            contact_id: contactId,
            sicoob_user_id: body.sender_id || `sender-${message_id}`,
            sicoob_vendedor_id: vendedor_user_id,
            sicoob_singular_id: singular_id,
            zappweb_agent_id: agentId,
          });
      }

      // Insert the message
      const { data: newMessage, error: msgError } = await supabase
        .from('messages')
        .insert({
          contact_id: contactId,
          content,
          sender: 'contact',
          message_type: 'text',
          external_id: message_id,
          channel_type: 'internal_chat',
          is_read: false,
          status: 'delivered',
          created_at: created_at || new Date().toISOString(),
        })
        .select('id')
        .single();

      if (msgError) {
        console.error('Error creating message:', msgError);
        throw new Error(`Failed to create message: ${msgError.message}`);
      }

      // Update contact's updated_at to reorder inbox
      await supabase
        .from('contacts')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', contactId);

      console.log(`Sicoob bridge: new message ${newMessage.id} from ${sender_name} for contact ${contactId}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          contact_id: contactId, 
          message_id: newMessage.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'mark_read') {
      const { external_ids } = body;

      if (!external_ids || !Array.isArray(external_ids) || external_ids.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: external_ids (array)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('external_id', external_ids);

      if (error) {
        console.error('Error marking messages as read:', error);
        throw new Error(`Failed to mark messages as read: ${error.message}`);
      }

      console.log(`Sicoob bridge: marked ${external_ids.length} messages as read`);

      return new Response(
        JSON.stringify({ success: true, updated: external_ids.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}. Supported: new_message, mark_read` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Sicoob bridge error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
