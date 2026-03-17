import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface WebhookPayload {
  event: string;
  instance: string;
  data: Record<string, unknown>;
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
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
    console.log('Evolution webhook received:', payload.event, payload.instance);

    const { event, instance, data } = payload;

    // =============================================
    // CONNECTION_UPDATE
    // =============================================
    if (event === 'connection.update') {
      const status = (data.status as string) === 'open' ? 'connected' : 
                     (data.status as string) === 'close' ? 'disconnected' : 'pending';
      
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
      const qrCode = (data.qrcode as Record<string, string>)?.base64;
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
      const key = data.key as { remoteJid: string; fromMe: boolean; id: string } | undefined;
      if (key && !key.fromMe) {
        await handleIncomingMessage(supabase, instance, data, key, supabaseUrl, supabaseServiceKey);
      }
    }

    // =============================================
    // SEND_MESSAGE — Outgoing message confirmation
    // =============================================
    if (event === 'send.message') {
      const key = data.key as { remoteJid: string; fromMe: boolean; id: string } | undefined;
      if (key) {
        // Update message with external_id if we sent it via API
        const externalId = key.id;
        if (externalId) {
          await supabase
            .from('messages')
            .update({ status: 'sent', external_id: externalId, status_updated_at: new Date().toISOString() })
            .eq('external_id', externalId);
          console.log(`Outgoing message confirmed: ${externalId}`);
        }
      }
    }

    // =============================================
    // MESSAGES_UPDATE — Status updates (delivered, read)
    // =============================================
    if (event === 'messages.update') {
      const key = data.key as { id: string } | undefined;
      const statusMap: Record<string, string> = {
        'DELIVERY_ACK': 'delivered',
        'READ': 'read',
        'PLAYED': 'read',
        'SERVER_ACK': 'sent',
        'ERROR': 'failed',
      };
      const status = statusMap[(data.status as string) || ''] || (data.status as string);
      
      if (status && key) {
        await supabase
          .from('messages')
          .update({ status, status_updated_at: new Date().toISOString() })
          .eq('external_id', key.id);
        console.log(`Message ${key.id} status: ${status}`);
      }
    }

    // =============================================
    // MESSAGES_DELETE — Message deleted by contact
    // =============================================
    if (event === 'messages.delete') {
      const key = data.key as { id: string } | undefined;
      if (key) {
        // Mark message as deleted instead of actually deleting
        await supabase
          .from('messages')
          .update({ content: '[Mensagem apagada]', status: 'deleted', status_updated_at: new Date().toISOString() })
          .eq('external_id', key.id);
        console.log(`Message deleted: ${key.id}`);
      }
    }

    // =============================================
    // CONTACTS_UPSERT / CONTACTS_UPDATE — Contact sync
    // =============================================
    if (event === 'contacts.upsert' || event === 'contacts.update') {
      const contacts = Array.isArray(data) ? data : [data];
      for (const contact of contacts) {
        const contactData = contact as Record<string, unknown>;
        const jid = (contactData.id || contactData.remoteJid) as string;
        if (!jid) continue;
        
        const phone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
        const pushName = contactData.pushName as string || contactData.name as string;
        const profilePicUrl = contactData.profilePictureUrl as string || contactData.imgUrl as string;

        // Find the connection for this instance
        const { data: connection } = await supabase
          .from('whatsapp_connections')
          .select('id')
          .eq('instance_id', instance)
          .single();

        if (connection && pushName) {
          // Persist avatar to storage if we have a WhatsApp CDN URL
          let permanentAvatarUrl: string | null = null;
          if (profilePicUrl && profilePicUrl.includes('pps.whatsapp.net')) {
            permanentAvatarUrl = await persistProfilePicture(supabase, phone, profilePicUrl);
          } else if (profilePicUrl) {
            permanentAvatarUrl = profilePicUrl;
          }

          // Upsert: update name/avatar if contact exists, create if not
          const { data: existing } = await supabase
            .from('contacts')
            .select('id, avatar_url')
            .eq('phone', phone)
            .eq('whatsapp_connection_id', connection.id)
            .single();

          if (existing) {
            const updateData: Record<string, unknown> = { name: pushName, updated_at: new Date().toISOString() };
            if (permanentAvatarUrl) updateData.avatar_url = permanentAvatarUrl;
            await supabase.from('contacts').update(updateData).eq('id', existing.id);
          } else {
            await supabase.from('contacts').insert({
              phone,
              name: pushName,
              avatar_url: permanentAvatarUrl || null,
              whatsapp_connection_id: connection.id,
            });
          }
          console.log(`Contact synced: ${phone} (${pushName}) avatar: ${permanentAvatarUrl ? 'saved' : 'none'}`);
        }
      }
    }

    // =============================================
    // PRESENCE_UPDATE — Online/typing status
    // =============================================
    if (event === 'presence.update') {
      // Presence is transient; log it for real-time UI but don't persist
      const jid = data.id as string;
      const presences = data.presences as Record<string, unknown>;
      if (jid && presences) {
        console.log(`Presence update: ${jid}`, JSON.stringify(presences));
        // This can be consumed by real-time subscriptions in the frontend
        // via a separate presence channel if needed
      }
    }

    // =============================================
    // CHATS_UPSERT / CHATS_UPDATE — Chat sync
    // =============================================
    if (event === 'chats.upsert' || event === 'chats.update') {
      // Chat events represent conversation metadata changes
      const chats = Array.isArray(data) ? data : [data];
      for (const chat of chats) {
        const chatData = chat as Record<string, unknown>;
        const jid = chatData.id as string;
        if (!jid || jid.endsWith('@g.us')) continue; // Skip group chats

        const phone = jid.replace('@s.whatsapp.net', '');
        const unreadCount = chatData.unreadCount as number;
        
        if (unreadCount !== undefined) {
          const { data: connection } = await supabase
            .from('whatsapp_connections')
            .select('id')
            .eq('instance_id', instance)
            .single();

          if (connection) {
            // Update unread status on messages
            const { data: contact } = await supabase
              .from('contacts')
              .select('id')
              .eq('phone', phone)
              .eq('whatsapp_connection_id', connection.id)
              .single();

            if (contact && unreadCount === 0) {
              await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('contact_id', contact.id)
                .eq('sender', 'contact')
                .eq('is_read', false);
            }
          }
        }
        console.log(`Chat updated: ${jid}`);
      }
    }

    // =============================================
    // GROUPS_UPSERT / GROUP_UPDATE
    // =============================================
    if (event === 'groups.upsert' || event === 'group.update') {
      const groupData = data as Record<string, unknown>;
      const groupJid = groupData.id as string;
      const subject = groupData.subject as string;
      if (groupJid && subject) {
        console.log(`Group update: ${groupJid} — ${subject}`);
        // Group data can be synced to a groups table if needed
      }
    }

    // =============================================
    // GROUP_PARTICIPANTS_UPDATE
    // =============================================
    if (event === 'group-participants.update') {
      const groupJid = data.id as string;
      const participants = data.participants as string[];
      const action = data.action as string; // add, remove, promote, demote
      if (groupJid) {
        console.log(`Group ${groupJid} participants ${action}: ${participants?.join(', ')}`);
      }
    }

    // =============================================
    // LABELS_EDIT — Label created/edited/deleted
    // =============================================
    if (event === 'labels.edit') {
      const labelData = data as Record<string, unknown>;
      const labelId = labelData.id as string;
      const labelName = labelData.name as string;
      const labelColor = labelData.color as string;
      const deleted = labelData.deleted as boolean;

      if (labelId) {
        const { data: connection } = await supabase
          .from('whatsapp_connections')
          .select('id')
          .eq('instance_id', instance)
          .single();

        if (connection) {
          if (deleted) {
            // Delete tag
            await supabase
              .from('tags')
              .delete()
              .eq('name', `wa:${labelId}:${labelName}`);
            console.log(`Label deleted: ${labelName}`);
          } else {
            // Upsert tag - use whatsapp label id in name for matching
            const tagName = labelName || `Label ${labelId}`;
            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .ilike('name', `wa:${labelId}:%`)
              .single();

            if (existingTag) {
              await supabase
                .from('tags')
                .update({ name: `wa:${labelId}:${tagName}`, color: labelColor || '#3B82F6' })
                .eq('id', existingTag.id);
            } else {
              await supabase
                .from('tags')
                .insert({ name: `wa:${labelId}:${tagName}`, color: labelColor || '#3B82F6' });
            }
            console.log(`Label synced: ${tagName} (${labelColor})`);
          }
        }
      }
    }

    // =============================================
    // LABELS_ASSOCIATION — Label applied to chat
    // =============================================
    if (event === 'labels.association') {
      const labelId = data.labelId as string || (data.label as Record<string, unknown>)?.id as string;
      const chatId = data.chatId as string;
      const type = data.type as string; // add or remove

      if (labelId && chatId) {
        const phone = chatId.replace('@s.whatsapp.net', '').replace('@g.us', '');

        const { data: connection } = await supabase
          .from('whatsapp_connections')
          .select('id')
          .eq('instance_id', instance)
          .single();

        if (connection) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .eq('phone', phone)
            .eq('whatsapp_connection_id', connection.id)
            .single();

          const { data: tag } = await supabase
            .from('tags')
            .select('id')
            .ilike('name', `wa:${labelId}:%`)
            .single();

          if (contact && tag) {
            if (type === 'remove') {
              await supabase
                .from('contact_tags')
                .delete()
                .eq('contact_id', contact.id)
                .eq('tag_id', tag.id);
              console.log(`Label removed from ${phone}`);
            } else {
              // Add (upsert)
              const { data: existing } = await supabase
                .from('contact_tags')
                .select('id')
                .eq('contact_id', contact.id)
                .eq('tag_id', tag.id)
                .single();

              if (!existing) {
                await supabase
                  .from('contact_tags')
                  .insert({ contact_id: contact.id, tag_id: tag.id });
                console.log(`Label applied to ${phone}`);
              }
            }
          }
        }
      }
    }

    // =============================================
    // CALL — Incoming call
    // =============================================
    if (event === 'call') {
      const callData = data as Record<string, unknown>;
      const from = callData.from as string;
      const isVideo = callData.isVideo as boolean;
      const callStatus = callData.status as string;

      if (from) {
        const phone = from.replace('@s.whatsapp.net', '');

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
              .insert({ phone, name: phone, whatsapp_connection_id: connection.id })
              .select('id')
              .single();
            contact = newContact;
          }

          if (contact) {
            // Log call in calls table
            await supabase.from('calls').insert({
              contact_id: contact.id,
              whatsapp_connection_id: connection.id,
              direction: 'inbound',
              status: callStatus || 'ringing',
              started_at: new Date().toISOString(),
              notes: isVideo ? 'Chamada de vídeo' : 'Chamada de voz',
            });
            console.log(`Call registered from ${phone} (${isVideo ? 'video' : 'voice'})`);
          }
        }
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

// =============================================
// HELPER: Handle incoming message
// =============================================
async function handleIncomingMessage(
  supabase: ReturnType<typeof createClient>,
  instance: string,
  data: Record<string, unknown>,
  key: { remoteJid: string; fromMe: boolean; id: string },
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const remoteJid = key.remoteJid;
  const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  
  const message = data.message as Record<string, unknown> | undefined;
  let content = '';
  let messageType = 'text';
  let mediaUrl: string | null = null;

  if (message?.conversation) {
    content = message.conversation as string;
  } else if ((message?.extendedTextMessage as Record<string, unknown>)?.text) {
    content = (message.extendedTextMessage as Record<string, unknown>).text as string;
  } else if (message?.imageMessage) {
    messageType = 'image';
    const img = message.imageMessage as Record<string, unknown>;
    content = (img.caption as string) || '[Imagem]';
    mediaUrl = (img.url as string) || null;
  } else if (message?.videoMessage) {
    messageType = 'video';
    const vid = message.videoMessage as Record<string, unknown>;
    content = (vid.caption as string) || '[Vídeo]';
    mediaUrl = (vid.url as string) || null;
  } else if (message?.audioMessage) {
    messageType = 'audio';
    content = '[Áudio]';
    mediaUrl = (message.audioMessage as Record<string, unknown>).url as string || null;
  } else if (message?.documentMessage) {
    messageType = 'document';
    const doc = message.documentMessage as Record<string, unknown>;
    content = (doc.fileName as string) || '[Documento]';
    mediaUrl = (doc.url as string) || null;
  } else if (message?.locationMessage) {
    messageType = 'location';
    const loc = message.locationMessage as Record<string, unknown>;
    content = JSON.stringify({
      latitude: loc.degreesLatitude,
      longitude: loc.degreesLongitude,
    });
  } else if (message?.stickerMessage) {
    messageType = 'sticker';
    content = '[Sticker]';
    // Try direct URL first, then base64 field, then fetch via API
    const stickerMsg = message.stickerMessage as Record<string, unknown>;
    mediaUrl = (stickerMsg.url as string) || null;

    // If no direct URL, try to get from base64 in webhook data
    if (!mediaUrl && (data.base64 || stickerMsg.base64)) {
      const base64Data = (data.base64 as string) || (stickerMsg.base64 as string);
      try {
        // Decode base64 to binary and upload to storage
        const binaryStr = atob(base64Data.replace(/^data:image\/\w+;base64,/, ''));
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const fileName = `sticker_${Date.now()}_${key.id.replace(/[^a-zA-Z0-9]/g, '')}.webp`;
        const { error: uploadErr } = await supabase.storage
          .from('whatsapp-media')
          .upload(`stickers/${fileName}`, bytes, {
            contentType: 'image/webp',
            cacheControl: '31536000',
          });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(`stickers/${fileName}`);
          mediaUrl = urlData.publicUrl;
        } else {
          console.error('Sticker upload error:', uploadErr);
        }
      } catch (b64Err) {
        console.error('Sticker base64 decode error:', b64Err);
      }
    }

    // If still no URL, try fetching via Evolution API getBase64
    if (!mediaUrl) {
      try {
        const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
        const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
        if (evolutionUrl && evolutionKey) {
          const resp = await fetch(`${evolutionUrl}/chat/getBase64FromMediaMessage/${instance}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionKey,
            },
            body: JSON.stringify({
              message: { key, message: { stickerMessage: message.stickerMessage } },
              convertToMp4: false,
            }),
          });
          if (resp.ok) {
            const result = await resp.json();
            const b64 = result.base64 as string;
            if (b64) {
              const cleanB64 = b64.replace(/^data:image\/\w+;base64,/, '');
              const binaryStr = atob(cleanB64);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              const fileName = `sticker_${Date.now()}_${key.id.replace(/[^a-zA-Z0-9]/g, '')}.webp`;
              const { error: uploadErr } = await supabase.storage
                .from('whatsapp-media')
                .upload(`stickers/${fileName}`, bytes, {
                  contentType: 'image/webp',
                  cacheControl: '31536000',
                });
              if (!uploadErr) {
                const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(`stickers/${fileName}`);
                mediaUrl = urlData.publicUrl;
              }
            }
          }
        }
      } catch (apiErr) {
        console.error('Sticker API fetch error:', apiErr);
      }
    }

    console.log(`Sticker processed, mediaUrl: ${mediaUrl || 'null'}`);
  } else if (message?.reactionMessage) {
    messageType = 'reaction';
    content = (message.reactionMessage as Record<string, unknown>).text as string || '';
  } else if (message?.contactMessage || message?.contactsArrayMessage) {
    messageType = 'contact';
    content = '[Contato]';
  } else if (message?.pollCreationMessage) {
    messageType = 'poll';
    content = (message.pollCreationMessage as Record<string, unknown>).name as string || '[Enquete]';
  }

  const { data: connection } = await supabase
    .from('whatsapp_connections')
    .select('id')
    .eq('instance_id', instance)
    .single();

  if (!connection) return;

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
        name: (data.pushName as string) || phone,
        whatsapp_connection_id: connection.id,
      })
      .select('id')
      .single();
    contact = newContact;
  }

  if (!contact) return;

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
      created_at: (data.messageTimestamp as number)
        ? new Date((data.messageTimestamp as number) * 1000).toISOString()
        : new Date().toISOString(),
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
