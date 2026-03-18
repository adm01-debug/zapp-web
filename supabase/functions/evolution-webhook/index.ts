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
    if (bytes.length < 100) return null;

    const fileName = `${phone}_${Date.now()}.jpg`;
    const storagePath = `avatars/${fileName}`;

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

    if (event === 'connection.update') {
      const status = (baseData.status as string) === 'open' ? 'connected' :
        (baseData.status as string) === 'close' ? 'disconnected' : 'pending';

      await supabase
        .from('whatsapp_connections')
        .update({ status, qr_code: null, updated_at: new Date().toISOString() })
        .eq('instance_id', instance);

      console.log(`Connection ${instance} status: ${status}`);
    }

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

    if (event === 'contacts.upsert' || event === 'contacts.update') {
      const contacts = Array.isArray(data) ? data : [data];
      for (const contact of contacts) {
        const contactData = contact as Record<string, unknown>;
        const jid = (contactData.id || contactData.remoteJid) as string;
        if (!jid) continue;

        const phone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
        const pushName = contactData.pushName as string || contactData.name as string;
        const profilePicUrl = contactData.profilePictureUrl as string || contactData.imgUrl as string;

        const { data: connection } = await supabase
          .from('whatsapp_connections')
          .select('id')
          .eq('instance_id', instance)
          .single();

        if (connection && pushName) {
          let permanentAvatarUrl: string | null = null;
          if (profilePicUrl && profilePicUrl.includes('pps.whatsapp.net')) {
            permanentAvatarUrl = await persistProfilePicture(supabase, phone, profilePicUrl);
          } else if (profilePicUrl) {
            permanentAvatarUrl = profilePicUrl;
          }

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

    if (event === 'presence.update') {
      const jid = data.id as string;
      const presences = data.presences as Record<string, unknown>;
      if (jid && presences) {
        console.log(`Presence update: ${jid}`, JSON.stringify(presences));
      }
    }

    if (event === 'chats.upsert' || event === 'chats.update') {
      const chats = Array.isArray(data) ? data : [data];
      for (const chat of chats) {
        const chatData = chat as Record<string, unknown>;
        const jid = chatData.id as string;
        if (!jid || jid.endsWith('@g.us')) continue;

        const phone = jid.replace('@s.whatsapp.net', '');
        const unreadCount = chatData.unreadCount as number;

        if (unreadCount !== undefined) {
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

    if (event === 'groups.upsert' || event === 'group.update') {
      const groupData = data as Record<string, unknown>;
      const groupJid = groupData.id as string;
      const subject = groupData.subject as string;
      if (groupJid && subject) {
        console.log(`Group update: ${groupJid} — ${subject}`);
      }
    }

    if (event === 'group-participants.update') {
      const groupJid = data.id as string;
      const participants = data.participants as string[];
      const action = data.action as string;
      if (groupJid) {
        console.log(`Group ${groupJid} participants ${action}: ${participants?.join(', ')}`);
      }
    }

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
            await supabase
              .from('tags')
              .delete()
              .eq('name', `wa:${labelId}:${labelName}`);
            console.log(`Label deleted: ${labelName}`);
          } else {
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

    if (event === 'labels.association') {
      const labelId = data.labelId as string || (data.label as Record<string, unknown>)?.id as string;
      const chatId = data.chatId as string;
      const type = data.type as string;

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
  } else if (message?.stickerMessage || (data.messageType as string) === 'stickerMessage') {
    messageType = 'sticker';
    content = '[Sticker]';

    const uploadBase64Sticker = async (base64Data: string): Promise<string | null> => {
      try {
        const cleanB64 = base64Data.replace(/^data:[^;]+;base64,/, '');
        const binaryStr = atob(cleanB64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        if (bytes.length < 50) return null;
        const fileName = `sticker_${Date.now()}_${key.id.replace(/[^a-zA-Z0-9]/g, '')}.webp`;
        const { error: uploadErr } = await supabase.storage
          .from('whatsapp-media')
          .upload(`stickers/${fileName}`, bytes, {
            contentType: 'image/webp',
            cacheControl: '31536000',
          });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(`stickers/${fileName}`);
          return urlData.publicUrl;
        }
        return null;
      } catch {
        return null;
      }
    };

    const b64Direct = (data.base64 as string)
      || ((message?.stickerMessage as Record<string, unknown>)?.base64 as string);
    if (b64Direct) {
      mediaUrl = await uploadBase64Sticker(b64Direct);
    }

    if (!mediaUrl) {
      const directMediaUrl = (data.mediaUrl as string)
        || ((message?.stickerMessage as Record<string, unknown>)?.mediaUrl as string);
      if (directMediaUrl && directMediaUrl.startsWith('http')) {
        try {
          const resp = await fetch(directMediaUrl, { signal: AbortSignal.timeout(10000) });
          if (resp.ok) {
            const arrayBuf = await resp.arrayBuffer();
            const bytes = new Uint8Array(arrayBuf);
            if (bytes.length > 100) {
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
        } catch (dlErr) {
          console.error('[STICKER] mediaUrl download error:', dlErr);
        }
      }
    }

    if (!mediaUrl) {
      try {
        const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
        const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
        if (evolutionUrl && evolutionKey) {
          const apiBody = {
            message: {
              key: data.key,
              message: data.message,
            },
            convertToMp4: false,
          };

          const apiUrl = `${evolutionUrl.replace(/\/+$/, '')}/chat/getBase64FromMediaMessage/${instance}`;
          const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionKey,
            },
            body: JSON.stringify(apiBody),
            signal: AbortSignal.timeout(15000),
          });

          if (resp.ok) {
            const result = await resp.json();
            const b64 = (result.base64 as string) || (result.data as string) || (result.media as string);
            if (b64) {
              mediaUrl = await uploadBase64Sticker(b64);
            }
          } else {
            console.error(`[STICKER] API error (${resp.status}):`, (await resp.text()).substring(0, 300));
          }
        }
      } catch (apiErr) {
        console.error('[STICKER] API fetch error:', apiErr);
      }
    }

    if (mediaUrl) {
      try {
        const { data: existing } = await supabase
          .from('stickers')
          .select('id')
          .eq('image_url', mediaUrl)
          .maybeSingle();

        if (!existing) {
          await supabase.from('stickers').insert({
            name: `Recebida ${new Date().toLocaleDateString('pt-BR')}`,
            image_url: mediaUrl,
            category: 'recebidas',
            is_favorite: false,
            use_count: 0,
          });
        }
      } catch (saveErr) {
        console.error('[STICKER] Failed to auto-save to library:', saveErr);
      }
    }
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

  let { data: contact } = await supabase
    .from('contacts')
    .select('id, avatar_url')
    .eq('phone', phone)
    .eq('whatsapp_connection_id', connection.id)
    .single();

  if (!contact) {
    let avatarUrl: string | null = null;
    const picUrl = await fetchProfilePicFromApi(instance, phone);
    if (picUrl) {
      avatarUrl = await persistProfilePicture(supabase, phone, picUrl);
    }

    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        phone,
        name: (data.pushName as string) || phone,
        avatar_url: avatarUrl,
        whatsapp_connection_id: connection.id,
      })
      .select('id, avatar_url')
      .single();
    contact = newContact;
  } else if (!contact.avatar_url || contact.avatar_url.includes('pps.whatsapp.net')) {
    const picUrl = await fetchProfilePicFromApi(instance, phone);
    if (picUrl) {
      const avatarUrl = await persistProfilePicture(supabase, phone, picUrl);
      if (avatarUrl) {
        await supabase.from('contacts').update({ avatar_url: avatarUrl }).eq('id', contact.id);
      }
    }
  }

  if (!contact) return;

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

  if (messageType === 'audio' && mediaUrl && insertedMessage) {
    await handleAudioTranscription(supabase, contact.id, insertedMessage.id, mediaUrl, supabaseUrl, supabaseServiceKey);
  }
}

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
