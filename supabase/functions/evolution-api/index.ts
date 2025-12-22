import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  instanceName: string;
  number: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
}

interface EvolutionInstance {
  instanceName: string;
  status: string;
  qrcode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

  if (!evolutionApiUrl || !evolutionApiKey) {
    return new Response(
      JSON.stringify({ 
        error: 'Evolution API not configured',
        message: 'Please configure EVOLUTION_API_URL and EVOLUTION_API_KEY secrets'
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);
  const action = url.pathname.split('/').pop();

  try {
    // Create new instance
    if (action === 'create-instance' && req.method === 'POST') {
      const { instanceName, qrcode = true } = await req.json();
      
      const response = await fetch(`${evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify({
          instanceName,
          qrcode,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Connect instance (get QR code)
    if (action === 'connect' && req.method === 'POST') {
      const { instanceName } = await req.json();
      
      const response = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
        },
      });

      const data = await response.json();
      
      // Update connection in database with QR code
      if (data.qrcode) {
        await supabase
          .from('whatsapp_connections')
          .update({ 
            qr_code: data.qrcode.base64,
            status: 'pending',
            instance_id: instanceName,
          })
          .eq('instance_id', instanceName);
      }

      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check instance status
    if (action === 'status' && req.method === 'POST') {
      const { instanceName } = await req.json();
      
      const response = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
        },
      });

      const data = await response.json();
      
      // Update connection status in database
      const status = data.state === 'open' ? 'connected' : 'disconnected';
      await supabase
        .from('whatsapp_connections')
        .update({ 
          status,
          qr_code: null,
        })
        .eq('instance_id', instanceName);

      return new Response(JSON.stringify({ ...data, status }), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send text message
    if (action === 'send-text' && req.method === 'POST') {
      const { instanceName, number, text }: SendMessageRequest = await req.json();
      
      const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify({
          number,
          text,
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send media message
    if (action === 'send-media' && req.method === 'POST') {
      const { instanceName, number, mediaUrl, mediaType, caption }: SendMessageRequest = await req.json();
      
      const response = await fetch(`${evolutionApiUrl}/message/sendMedia/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify({
          number,
          mediatype: mediaType,
          media: mediaUrl,
          caption,
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send audio message
    if (action === 'send-audio' && req.method === 'POST') {
      const { instanceName, number, mediaUrl }: SendMessageRequest = await req.json();
      
      const response = await fetch(`${evolutionApiUrl}/message/sendWhatsAppAudio/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify({
          number,
          audio: mediaUrl,
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send location
    if (action === 'send-location' && req.method === 'POST') {
      const { instanceName, number, latitude, longitude, locationName, locationAddress }: SendMessageRequest = await req.json();
      
      const response = await fetch(`${evolutionApiUrl}/message/sendLocation/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify({
          number,
          latitude,
          longitude,
          name: locationName,
          address: locationAddress,
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List all instances
    if (action === 'list-instances' && req.method === 'GET') {
      const response = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Disconnect instance
    if (action === 'disconnect' && req.method === 'POST') {
      const { instanceName } = await req.json();
      
      const response = await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': evolutionApiKey,
        },
      });

      const data = await response.json();
      
      // Update connection status in database
      await supabase
        .from('whatsapp_connections')
        .update({ status: 'disconnected' })
        .eq('instance_id', instanceName);

      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete instance
    if (action === 'delete-instance' && req.method === 'DELETE') {
      const { instanceName } = await req.json();
      
      const response = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': evolutionApiKey,
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Evolution API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
