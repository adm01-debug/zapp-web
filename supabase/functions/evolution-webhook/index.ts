import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface WebhookPayload {
  event: string;
  instance: string;
  data: Record<string, unknown> | Record<string, unknown>[];
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEventName(event?: string): string {
  return (event || '').trim().toLowerCase().replace(/_/g, '.');
}

function toEventRecords(data: unknown, collectionKeys: string[] = []): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  if (!isRecord(data)) {
    return [];
  }

  for (const key of collectionKeys) {
    const collection = data[key];
    if (Array.isArray(collection)) {
      return collection.filter(isRecord);
    }
  }

  return [data];
}

function normalizePhone(rawJid?: string): string | null {
  if (!rawJid) return null;
  return rawJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
}

// Helper: Download WhatsApp profile picture and upload to Supabase storage
async function persistProfilePicture(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  profilePicUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(profilePicUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    
    const blob = await response.arrayBuffer();
    const bytes = new Uint8Array(blob);
    if (bytes.length < 100) return null; // too small, probably invalid
    
    const fileName = `${phone}_${Date.now()}.jpg`;
    const storagePath = `avatars/${fileName}`;
    
    // Delete old avatars for this phone
    const { data: oldFiles } = await supabase.storage
      .from('avatars')
      .list('avatars', { search: phone });
    if (oldFiles?.length) {
      await supabase.storage.from('avatars').remove(oldFiles.map(f => `avatars/${f.name}`));
    }
    
    const { error } = await supabase.storage
      .from('avatars')
      .upload(storagePath, bytes, {
        contentType: 'image/jpeg',
        cacheControl: '604800',
        upsert: true,
      });
    
    if (error) {
      console.error('Avatar upload error:', error);
      return null;
    }
    
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Avatar persist error:', err);
    return null;
  }
}

// Helper: Fetch profile picture URL from Evolution API
async function fetchProfilePicFromApi(instance: string, phone: string): Promise<string | null> {
  try {
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
    if (!evolutionUrl || !evolutionKey) return null;
    
    const resp = await fetch(
      `${evolutionUrl}/chat/fetchProfilePictureUrl/${instance}`,
      {
        method: 'POST',
        headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: phone }),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!resp.ok) return null;
    const result = await resp.json();
    return result?.profilePictureUrl || result?.picture || result?.url || null;
  } catch {
    return null;
  }
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

    const payload: WebhookPayload = await req.json();
    const event = normalizeEventName(payload.event);
    const instance = payload.instance;
    const data = payload.data ?? {};
    const baseData = isRecord(data) ? data : {};
    console.log('Evolution webhook received:', payload.event, '->', event, instance);

    // =============================================
    // CONNECTION_UPDATE
    // =============================================
    if (event === 'connection.update') {
      const status = (baseData.status as string) === 'open' ? 'connected' : 
                     (baseData.status as string) === 'close' ? 'disconnected' : 'pending';
      
      await supabase
        .from('whatsapp_connections')
        .update({ status, qr_code: null, updated_at: new Date().toISOString() })
        .eq('instance_id', instance);

      console.log(`Connection ${instance} status: ${status}`);
    }

    // =============================================
    // QRCODE_UPDATED
    // =============================================
    if (event === 'qrcode.updated') {
      const qrCode = (baseData.qrcode as Record<string, string>)?.base64;
      if (qrCode) {
        await supabase
          .from('whatsapp_connections')
          .update({ qr_code: qrCode, status: 'pending', updated_at: new Date().toISOString() })
          .eq('instance_id', instance);
        console.log(`QR code updated for ${instance}`);
      }
    }

    // =============================================
    // MESSAGES_UPSERT — Incoming messages
    // =============================================
    if (event === 'messages.upsert') {
      for (const entry of toEventRecords(data, ['messages'])) {
        const keySource = isRecord(entry.key) ? entry.key : isRecord(baseData.key) ? baseData.key : null;
        const key = keySource as { remoteJid: string; fromMe: boolean; id: string } | null;
        if (key && !key.fromMe) {
          await handleIncomingMessage(
            supabase,
            instance,
            { ...baseData, ...entry },
            key,
            supabaseUrl,
            supabaseServiceKey,
          );
        }
      }
    }

    // =============================================
    // SEND_MESSAGE — Outgoing message confirmation
    // =============================================
    if (event === 'send.message') {
      for (const entry of toEventRecords(data, ['messages'])) {
        const keySource = isRecord(entry.key) ? entry.key : isRecord(baseData.key) ? baseData.key : null;
        const key = keySource as { remoteJid?: string; fromMe?: boolean; id?: string } | null;
        const externalId = key?.id;

        if (!externalId) continue;

        let updatedMessageId: string | null = null;
        const now = new Date().toISOString();

        const { data: existingMessage } = await supabase
          .from('messages')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existingMessage?.id) {
          await supabase
            .from('messages')
            .update({ status: 'sent', external_id: externalId, status_updated_at: now })
            .eq('id', existingMessage.id);
          updatedMessageId = existingMessage.id;
        }

        if (!updatedMessageId) {
          const phone = normalizePhone(key.remoteJid);
          const { data: connection } = await supabase
            .from('whatsapp_connections')
            .select('id')
            .eq('instance_id', instance)
            .maybeSingle();

          if (connection?.id && phone) {
            const { data: contact } = await supabase
              .from('contacts')
              .select('id')
              .eq('phone', phone)
              .eq('whatsapp_connection_id', connection.id)
              .maybeSingle();

            if (contact?.id) {
              const { data: pendingMessage } = await supabase
                .from('messages')
                .select('id')
                .eq('contact_id', contact.id)
                .eq('sender', 'agent')
                .is('external_id', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (pendingMessage?.id) {
                await supabase
                  .from('messages')
                  .update({ status: 'sent', external_id: externalId, status_updated_at: now })
                  .eq('id', pendingMessage.id);
                updatedMessageId = pendingMessage.id;
              }
            }
          }
        }

        console.log(`Outgoing message confirmed: ${externalId}${updatedMessageId ? ` (message ${updatedMessageId})` : ' (no local match found)'}`);
      }
    }

    // =============================================
    // MESSAGES_UPDATE — Status updates (delivered, read)
    // =============================================
    if (event === 'messages.update') {
      const statusMap: Record<string, string> = {
        'DELIVERY_ACK': 'delivered',
        'READ': 'read',
        'PLAYED': 'read',
        'SERVER_ACK': 'sent',
        'ERROR': 'failed',
      };

      const { data: connection } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('instance_id', instance)
        .maybeSingle();

      for (const entry of toEventRecords(data, ['messages', 'updates', 'statuses'])) {
        const keySource = isRecord(entry.key) ? entry.key : isRecord(baseData.key) ? baseData.key : null;
        const key = keySource as { id?: string } | null;
        const rawStatus = (entry.status as string) || (baseData.status as string) || '';
        const status = statusMap[rawStatus] || rawStatus.toLowerCase();

        if (status && key?.id) {
          const now = new Date().toISOString();
          const { data: updatedMessages, error: updateError } = await supabase
            .from('messages')
            .update({ status, status_updated_at: now })
            .eq('external_id', key.id)
            .select('id');

          if (updateError) {
            console.error(`Error updating message status ${key.id}:`, updateError);
            continue;
          }

          if (!updatedMessages?.length) {
            const { error: insertError } = await supabase
              .from('messages')
              .insert({
                content: '[Mensagem recebida]',
                message_type: 'text',
                sender: 'contact',
                external_id: key.id,
                status,
                status_updated_at: now,
                created_at: now,
                whatsapp_connection_id: connection?.id ?? null,
              });

            if (insertError) {
              console.error(`Error creating placeholder for message status ${key.id}:`, insertError);
              continue;
            }
          }

          console.log(`Message ${key.id} status: ${status}`);
        }
      }
    }

    // =============================================
    // MESSAGES_DELETE — Message deleted by contact
    // =============================================
    if (event === 'messages.delete') {
      const { data: connection } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('instance_id', instance)
        .maybeSingle();

      for (const entry of toEventRecords(data, ['messages', 'keys'])) {
        const keySource = isRecord(entry.key)
          ? entry.key
          : (typeof entry.id === 'string' ? entry : null) ?? (isRecord(baseData.key) ? baseData.key : null);
        const key = keySource as { id?: string } | null;

        if (key?.id) {
          const now = new Date().toISOString();
          const { data: updatedMessages, error: updateError } = await supabase
            .from('messages')
            .update({ content: '[Mensagem apagada]', status: 'deleted', status_updated_at: now })
            .eq('external_id', key.id)
            .select('id');

          if (updateError) {
            console.error(`Error deleting message ${key.id}:`, updateError);
            continue;
          }

          if (!updatedMessages?.length) {
            const { error: insertError } = await supabase
              .from('messages')
              .insert({
                content: '[Mensagem apagada]',
                message_type: 'text',
                sender: 'contact',
                external_id: key.id,
                status: 'deleted',
                status_updated_at: now,
                created_at: now,
                whatsapp_connection_id: connection?.id ?? null,
              });

            if (insertError) {
              console.error(`Error creating placeholder for deleted message ${key.id}:`, insertError);
              continue;
            }
          }

          console.log(`Message deleted: ${key.id}`);
        }
      }
    }
  const messageCreatedAt = (data.messageTimestamp as number)
    ? new Date((data.messageTimestamp as number) * 1000).toISOString()
    : new Date().toISOString();

  const { data: existingMessage } = await supabase
    .from('messages')
    .select('id, status, content')
    .eq('external_id', key.id)
    .maybeSingle();

  if (existingMessage?.id) {
    const preservedStatus = existingMessage.status && existingMessage.status !== 'received'
      ? existingMessage.status
      : 'received';
    const preservedContent = existingMessage.status === 'deleted'
      ? (existingMessage.content || '[Mensagem apagada]')
      : content;

    const { error: updateExistingError } = await supabase
      .from('messages')
      .update({
        contact_id: contact.id,
        whatsapp_connection_id: connection.id,
        content: preservedContent,
        message_type: messageType,
        media_url: mediaUrl,
        sender: 'contact',
        created_at: messageCreatedAt,
        status: preservedStatus,
      })
      .eq('id', existingMessage.id);

    if (updateExistingError) {
      console.error('Error reconciling existing message:', updateExistingError);
      return;
    }

    console.log(`Message reconciled from ${phone} (${messageType})`);

    if (messageType === 'audio' && mediaUrl) {
      await handleAudioTranscription(supabase, contact.id, existingMessage.id, mediaUrl, supabaseUrl, supabaseServiceKey);
    }
    return;
  }

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
      external_id: key.id,
      status: 'received',
      created_at: messageCreatedAt,
    })
    .select('id')
    .single();

  if (msgError) {
    console.error('Error inserting message:', msgError);
    return;
  }

  console.log(`Message saved from ${phone} (${messageType})`);

  // Auto-transcribe audio if enabled
  if (messageType === 'audio' && mediaUrl && insertedMessage) {
    await handleAudioTranscription(supabase, contact.id, insertedMessage.id, mediaUrl, supabaseUrl, supabaseServiceKey);
  }
}

// =============================================
// HELPER: Audio transcription
// =============================================
async function handleAudioTranscription(
  supabase: ReturnType<typeof createClient>,
  contactId: string,
  messageId: string,
  mediaUrl: string,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const { data: contactData } = await supabase
    .from('contacts')
    .select('assigned_to')
    .eq('id', contactId)
    .single();

  let shouldTranscribe = true;

  if (contactData?.assigned_to) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', contactData.assigned_to)
      .single();

    if (profileData?.user_id) {
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

  if (!shouldTranscribe) return;

  await supabase.from('messages').update({ transcription_status: 'processing' }).eq('id', messageId);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-transcribe-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ audioUrl: mediaUrl, messageId }),
    });

    if (response.ok) {
      const result = await response.json();
      await supabase.from('messages').update({
        transcription: result.text,
        transcription_status: 'completed',
      }).eq('id', messageId);
      console.log(`Audio transcribed: ${messageId}`);
    } else {
      console.error('Transcription failed:', await response.text());
      await supabase.from('messages').update({ transcription_status: 'failed' }).eq('id', messageId);
    }
  } catch (err) {
    console.error('Transcription error:', err);
    await supabase.from('messages').update({ transcription_status: 'failed' }).eq('id', messageId);
  }
}
