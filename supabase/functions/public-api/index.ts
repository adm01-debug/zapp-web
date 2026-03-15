import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API token
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing x-api-key header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: setting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'api_token')
      .single();

    if (!setting?.value || setting.value !== apiKey) {
      return new Response(JSON.stringify({ error: 'Invalid API token' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    if (req.method === 'POST' && path === 'public-api') {
      const body = await req.json();
      const { action } = body;

      if (action === 'send') {
        const { number, message, connectionId } = body;

        if (!number || !message) {
          return new Response(JSON.stringify({ error: 'number and message are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Find or use specified connection
        let connection;
        if (connectionId) {
          const { data } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('id', connectionId)
            .eq('status', 'connected')
            .single();
          connection = data;
        } else {
          const { data } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('is_default', true)
            .eq('status', 'connected')
            .single();
          connection = data;
        }

        if (!connection) {
          return new Response(JSON.stringify({ error: 'No active WhatsApp connection found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Find or create contact
        const phone = number.replace(/\D/g, '');
        let { data: contact } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone', phone)
          .single();

        if (!contact) {
          const { data: newContact } = await supabase
            .from('contacts')
            .insert({ name: phone, phone, whatsapp_connection_id: connection.id })
            .select('id')
            .single();
          contact = newContact;
        }

        if (!contact) {
          return new Response(JSON.stringify({ error: 'Failed to create contact' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Insert message
        const { data: msg, error: msgError } = await supabase
          .from('messages')
          .insert({
            contact_id: contact.id,
            content: message,
            sender: 'agent',
            message_type: 'text',
            status: 'sending',
            whatsapp_connection_id: connection.id,
          })
          .select()
          .single();

        if (msgError) {
          return new Response(JSON.stringify({ error: 'Failed to save message', details: msgError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Send via Evolution API
        try {
          const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
          const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

          if (evolutionUrl && evolutionKey && connection.instance_id) {
            const sendRes = await fetch(
              `${evolutionUrl}/message/sendText/${connection.instance_id}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': evolutionKey,
                },
                body: JSON.stringify({
                  number: phone,
                  text: message,
                }),
              }
            );
            const sendData = await sendRes.json();

            if (sendData?.key?.id) {
              await supabase
                .from('messages')
                .update({ external_id: sendData.key.id, status: 'sent' })
                .eq('id', msg.id);
            }
          }
        } catch (sendErr) {
          console.error('Evolution API send error:', sendErr);
          await supabase
            .from('messages')
            .update({ status: 'failed' })
            .eq('id', msg.id);
        }

        return new Response(JSON.stringify({
          success: true,
          messageId: msg.id,
          contactId: contact.id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Unknown action. Supported: send' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
