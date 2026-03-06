import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key?: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      imageMessage?: { caption?: string; url?: string };
      videoMessage?: { caption?: string; url?: string };
      audioMessage?: { url?: string };
      documentMessage?: { fileName?: string; url?: string };
      locationMessage?: { degreesLatitude: number; degreesLongitude: number };
    };
    messageType?: string;
    messageTimestamp?: number;
    status?: string;
    participant?: string;
  };
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: EvolutionWebhookPayload = await req.json();
    console.log('Evolution webhook received:', JSON.stringify(payload, null, 2));

    const { event, instance, data } = payload;

    // Handle connection status updates
    if (event === 'connection.update') {
      const status = data.status === 'open' ? 'connected' : 
                     data.status === 'close' ? 'disconnected' : 'pending';
      
      await supabase
        .from('whatsapp_connections')
        .update({ 
          status,
          qr_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq('instance_id', instance);

      console.log(`Connection ${instance} status updated to ${status}`);
    }

    // Handle QR code updates
    if (event === 'qrcode.updated') {
      const qrCode = (data as any).qrcode?.base64;
      if (qrCode) {
        await supabase
          .from('whatsapp_connections')
          .update({ 
            qr_code: qrCode,
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('instance_id', instance);

        console.log(`QR code updated for instance ${instance}`);
      }
    }

    // Handle incoming messages
    if (event === 'messages.upsert' && data.key && !data.key.fromMe) {
      const remoteJid = data.key.remoteJid;
      const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      
      // Get message content and type
      let content = '';
      let messageType = 'text';
      let mediaUrl: string | null = null;

      if (data.message?.conversation) {
        content = data.message.conversation;
      } else if (data.message?.extendedTextMessage?.text) {
        content = data.message.extendedTextMessage.text;
      } else if (data.message?.imageMessage) {
        messageType = 'image';
        content = data.message.imageMessage.caption || '[Imagem]';
        mediaUrl = data.message.imageMessage.url || null;
      } else if (data.message?.videoMessage) {
        messageType = 'video';
        content = data.message.videoMessage.caption || '[Vídeo]';
        mediaUrl = data.message.videoMessage.url || null;
      } else if (data.message?.audioMessage) {
        messageType = 'audio';
        content = '[Áudio]';
        mediaUrl = data.message.audioMessage.url || null;
      } else if (data.message?.documentMessage) {
        messageType = 'document';
        content = data.message.documentMessage.fileName || '[Documento]';
        mediaUrl = data.message.documentMessage.url || null;
      } else if (data.message?.locationMessage) {
        messageType = 'location';
        const loc = data.message.locationMessage;
        content = JSON.stringify({
          latitude: loc.degreesLatitude,
          longitude: loc.degreesLongitude,
        });
      }

      // Find or create contact
      const { data: connection } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('instance_id', instance)
        .single();

      if (connection) {
        // Find or create contact
        let { data: contact } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone', phone)
          .eq('whatsapp_connection_id', connection.id)
          .single();

        if (!contact) {
          const { data: newContact } = await supabase
            .from('contacts')
            .insert({
              phone,
              name: data.pushName || phone,
              whatsapp_connection_id: connection.id,
            })
            .select('id')
            .single();
          
          contact = newContact;
        }

        if (contact) {
          // Insert message
          const { data: insertedMessage, error: msgError } = await supabase
            .from('messages')
            .insert({
              contact_id: contact.id,
              whatsapp_connection_id: connection.id,
              content,
              message_type: messageType,
              media_url: mediaUrl,
              sender: 'contact',
              external_id: data.key.id,
              status: 'received',
              created_at: data.messageTimestamp 
                ? new Date(data.messageTimestamp * 1000).toISOString()
                : new Date().toISOString(),
            })
            .select('id')
            .single();

          if (msgError) {
            console.error('Error inserting message:', msgError);
          } else {
            console.log(`Message saved from ${phone}`);
            
            // Auto-transcribe audio if enabled
            if (messageType === 'audio' && mediaUrl && insertedMessage) {
              // Get the assigned agent's settings (if any)
              const { data: contactData } = await supabase
                .from('contacts')
                .select('assigned_to')
                .eq('id', contact.id)
                .single();

              let shouldTranscribe = true;

              if (contactData?.assigned_to) {
                // Get the profile's user_id
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('user_id')
                  .eq('id', contactData.assigned_to)
                  .single();

                if (profileData?.user_id) {
                  // Check user settings for auto transcription
                  const { data: userSettings } = await supabase
                    .from('user_settings')
                    .select('auto_transcription_enabled')
                    .eq('user_id', profileData.user_id)
                    .single();

                  if (userSettings && userSettings.auto_transcription_enabled === false) {
                    shouldTranscribe = false;
                  }
                }
              }

              if (shouldTranscribe) {
                // Update status to transcribing
                await supabase
                  .from('messages')
                  .update({ transcription_status: 'processing' })
                  .eq('id', insertedMessage.id);

                // Call transcription edge function
                try {
                  const transcribeResponse = await fetch(
                    `${supabaseUrl}/functions/v1/ai-transcribe-audio`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                      },
                      body: JSON.stringify({
                        audioUrl: mediaUrl,
                        messageId: insertedMessage.id,
                      }),
                    }
                  );

                  if (transcribeResponse.ok) {
                    const transcribeResult = await transcribeResponse.json();
                    console.log(`Audio transcribed successfully: ${insertedMessage.id}`);
                    
                    // Update message with transcription
                    await supabase
                      .from('messages')
                      .update({
                        transcription: transcribeResult.text,
                        transcription_status: 'completed',
                      })
                      .eq('id', insertedMessage.id);
                  } else {
                    console.error('Transcription failed:', await transcribeResponse.text());
                    await supabase
                      .from('messages')
                      .update({ transcription_status: 'failed' })
                      .eq('id', insertedMessage.id);
                  }
                } catch (transcribeError) {
                  console.error('Error calling transcription:', transcribeError);
                  await supabase
                    .from('messages')
                    .update({ transcription_status: 'failed' })
                    .eq('id', insertedMessage.id);
                }
              }
            }
          }
        }
      }
    }

    // Handle message status updates
    if (event === 'messages.update' && data.key) {
      const statusMap: Record<string, string> = {
        'DELIVERY_ACK': 'delivered',
        'READ': 'read',
        'PLAYED': 'read',
        'SERVER_ACK': 'sent',
        'ERROR': 'failed',
      };

      const status = statusMap[data.status || ''] || data.status;
      
      if (status) {
        await supabase
          .from('messages')
          .update({
            status,
            status_updated_at: new Date().toISOString(),
          })
          .eq('external_id', data.key.id);

        console.log(`Message ${data.key.id} status updated to ${status}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Evolution webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
