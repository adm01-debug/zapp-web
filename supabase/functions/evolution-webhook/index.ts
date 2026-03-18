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
  // Remove JID suffix and any leading '+' for consistent storage
  return rawJid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/^\+/, '');
}

// Status hierarchy: higher number = more advanced status
const STATUS_PRIORITY: Record<string, number> = {
  'sending': 0,
  'sent': 1,
  'delivered': 2,
  'read': 3,
  'played': 3,
  'failed': -1,
  'deleted': 99,
  'received': 1,
};

function shouldUpdateStatus(currentStatus: string | null, newStatus: string): boolean {
  if (!currentStatus) return true;
  // Always allow 'deleted' and 'failed'
  if (newStatus === 'deleted' || newStatus === 'failed') return true;
  const currentPriority = STATUS_PRIORITY[currentStatus] ?? 0;
  const newPriority = STATUS_PRIORITY[newStatus] ?? 0;
  return newPriority > currentPriority;
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

    const baseUrl = evolutionUrl.replace(/\/+$/, '');
    const resp = await fetch(
      `${baseUrl}/chat/fetchProfilePictureUrl/${instance}`,
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

// Persist media (image/video/audio/document) to Supabase Storage
async function persistMediaToStorage(
  supabase: ReturnType<typeof createClient>,
  cdnUrl: string,
  messageType: string,
  messageId: string,
): Promise<string | null> {
  try {
    const resp = await fetch(cdnUrl, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      console.error(`[MEDIA] Download failed (${resp.status}) for ${messageType}`);
      return null;
    }

    const arrayBuf = await resp.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    if (bytes.length < 100) {
      console.error(`[MEDIA] File too small (${bytes.length} bytes)`);
      return null;
    }

    const extMap: Record<string, string> = {
      image: 'jpg', video: 'mp4', audio: 'ogg', document: 'bin',
    };
    const contentTypeMap: Record<string, string> = {
      image: 'image/jpeg', video: 'video/mp4', audio: 'audio/ogg', document: 'application/octet-stream',
    };

    // Try to detect content type from response
    const respContentType = resp.headers.get('content-type') || contentTypeMap[messageType] || 'application/octet-stream';
    let ext = extMap[messageType] || 'bin';
    if (respContentType.includes('png')) ext = 'png';
    else if (respContentType.includes('webp')) ext = 'webp';
    else if (respContentType.includes('mp4')) ext = 'mp4';
    else if (respContentType.includes('mpeg')) ext = 'mp3';
    else if (respContentType.includes('pdf')) ext = 'pdf';
    else if (respContentType.includes('opus')) ext = 'opus';

    const safeId = messageId.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${messageType}/${safeId}_${Date.now()}.${ext}`;

    const bucket = messageType === 'audio' ? 'audio-messages' : 'whatsapp-media';

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(fileName, bytes, {
        contentType: respContentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadErr) {
      console.error(`[MEDIA] Upload error for ${messageType}:`, uploadErr);
      return null;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    console.log(`[MEDIA] Persisted ${messageType} (${(bytes.length / 1024).toFixed(1)}KB) → ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (err) {
    console.error(`[MEDIA] persistMediaToStorage error:`, err);
    return null;
  }
}

// Persist media via Evolution API getBase64 fallback
async function persistMediaViaApi(
  supabase: ReturnType<typeof createClient>,
  instance: string,
  data: Record<string, unknown>,
  messageType: string,
  messageId: string,
): Promise<string | null> {
  try {
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
    if (!evolutionUrl || !evolutionKey) return null;

    const baseUrl = evolutionUrl.replace(/\/+$/, '');
    const resp = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
      body: JSON.stringify({ message: { key: data.key, message: data.message }, convertToMp4: false }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      console.error(`[MEDIA] getBase64 API error (${resp.status})`);
      return null;
    }

    const result = await resp.json();
    const b64 = (result.base64 as string) || (result.data as string) || (result.media as string);
    if (!b64) return null;

    // Remove data:... prefix if present
    const raw = b64.includes(',') ? b64.split(',')[1] : b64;
    const binaryStr = atob(raw);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    if (bytes.length < 100) return null;

    const mimeType = (result.mimetype as string) || 'application/octet-stream';
    let ext = 'bin';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('ogg') || mimeType.includes('opus')) ext = 'ogg';
    else if (mimeType.includes('mpeg')) ext = 'mp3';
    else if (mimeType.includes('pdf')) ext = 'pdf';

    const safeId = messageId.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${messageType}/${safeId}_${Date.now()}.${ext}`;
    const bucket = messageType === 'audio' ? 'audio-messages' : 'whatsapp-media';

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(fileName, bytes, { contentType: mimeType, cacheControl: '31536000', upsert: true });

    if (uploadErr) {
      console.error(`[MEDIA] base64 upload error:`, uploadErr);
      return null;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    console.log(`[MEDIA] Persisted ${messageType} via API (${(bytes.length / 1024).toFixed(1)}KB)`);
    return urlData.publicUrl;
  } catch (err) {
    console.error(`[MEDIA] persistMediaViaApi error:`, err);
    return null;
  }
}

// Helper to safely get connection by instance_id
async function getConnectionByInstance(
  supabase: ReturnType<typeof createClient>,
  instance: string
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('whatsapp_connections')
    .select('id')
    .eq('instance_id', instance)
    .maybeSingle();
  return data;
}

// Helper to safely get contact by phone + connection
async function getContactByPhone(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  connectionId: string
): Promise<{ id: string; avatar_url: string | null } | null> {
  // Try exact match first, then with/without '+' prefix
  const phonesVariants = [phone, `+${phone}`, phone.replace(/^\+/, '')];
  const uniquePhones = [...new Set(phonesVariants)];
  
  const { data } = await supabase
    .from('contacts')
    .select('id, avatar_url')
    .in('phone', uniquePhones)
    .eq('whatsapp_connection_id', connectionId)
    .limit(1)
    .maybeSingle();
  return data;
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
          .select('id, status')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existingMessage?.id) {
          if (shouldUpdateStatus(existingMessage.status, 'sent')) {
            await supabase
              .from('messages')
              .update({ status: 'sent', external_id: externalId, status_updated_at: now })
              .eq('id', existingMessage.id);
          }
          updatedMessageId = existingMessage.id;
        }

        if (!updatedMessageId) {
          const phone = normalizePhone(key.remoteJid);
          const connection = await getConnectionByInstance(supabase, instance);

          if (connection?.id && phone) {
            const contact = await getContactByPhone(supabase, phone, connection.id);

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

      const connection = await getConnectionByInstance(supabase, instance);

      for (const entry of toEventRecords(data, ['messages', 'updates', 'statuses'])) {
        const keySource = isRecord(entry.key) ? entry.key : isRecord(baseData.key) ? baseData.key : null;
        const key = keySource as { id?: string } | null;
        const rawStatus = (entry.status as string) || (baseData.status as string) || '';
        const newStatus = statusMap[rawStatus] || rawStatus.toLowerCase();

        if (newStatus && key?.id) {
          const now = new Date().toISOString();

          // First check current status to prevent downgrade
          const { data: currentMessage } = await supabase
            .from('messages')
            .select('id, status')
            .eq('external_id', key.id)
            .maybeSingle();

          if (currentMessage?.id) {
            if (shouldUpdateStatus(currentMessage.status, newStatus)) {
              await supabase
                .from('messages')
                .update({ status: newStatus, status_updated_at: now })
                .eq('id', currentMessage.id);
              console.log(`Message ${key.id} status: ${currentMessage.status} → ${newStatus}`);
            } else {
              console.log(`Message ${key.id} status skip: ${currentMessage.status} → ${newStatus} (would downgrade)`);
            }
          } else {
            // Create placeholder with contact_id if possible
            let contactId: string | null = null;
            if (connection?.id) {
              const remoteJid = (entry.remoteJid as string) || ((isRecord(entry.key) ? entry.key.remoteJid : null) as string);
              if (remoteJid) {
                const phone = normalizePhone(remoteJid);
                if (phone) {
                  const contact = await getContactByPhone(supabase, phone, connection.id);
                  contactId = contact?.id ?? null;
                }
              }
            }

            const { error: insertError } = await supabase
              .from('messages')
              .insert({
                content: '[Mensagem recebida]',
                message_type: 'text',
                sender: 'contact',
                external_id: key.id,
                status: newStatus,
                status_updated_at: now,
                created_at: now,
                contact_id: contactId,
                whatsapp_connection_id: connection?.id ?? null,
              });

            if (insertError) {
              console.error(`Error creating placeholder for message status ${key.id}:`, insertError);
              continue;
            }
            console.log(`Message ${key.id} placeholder created with status: ${newStatus}${contactId ? ` (contact: ${contactId})` : ' (orphan)'}`);
          }
        }
      }
    }

    if (event === 'messages.delete') {
      const connection = await getConnectionByInstance(supabase, instance);

      for (const entry of toEventRecords(data, ['messages', 'keys'])) {
        const keySource = isRecord(entry.key)
          ? entry.key
          : (typeof entry.id === 'string' ? entry : null) ?? (isRecord(baseData.key) ? baseData.key : null);
        const key = keySource as { id?: string; remoteJid?: string } | null;

        if (key?.id) {
          const now = new Date().toISOString();
          const { data: updatedMessages, error: updateError } = await supabase
            .from('messages')
            .update({ is_deleted: true, status: 'deleted', status_updated_at: now })
            .eq('external_id', key.id)
            .select('id');

          if (updateError) {
            console.error(`Error deleting message ${key.id}:`, updateError);
            continue;
          }

          if (!updatedMessages?.length) {
            // Try to resolve contact_id for placeholder
            let contactId: string | null = null;
            if (connection?.id && key.remoteJid) {
              const phone = normalizePhone(key.remoteJid);
              if (phone) {
                const contact = await getContactByPhone(supabase, phone, connection.id);
                contactId = contact?.id ?? null;
              }
            }

            const { error: insertError } = await supabase
              .from('messages')
              .insert({
                content: '[Mensagem apagada]',
                message_type: 'text',
                sender: 'contact',
                external_id: key.id,
                status: 'deleted',
                is_deleted: true,
                status_updated_at: now,
                created_at: now,
                contact_id: contactId,
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

        const connection = await getConnectionByInstance(supabase, instance);

        if (connection && pushName) {
          let permanentAvatarUrl: string | null = null;
          if (profilePicUrl && profilePicUrl.includes('pps.whatsapp.net')) {
            permanentAvatarUrl = await persistProfilePicture(supabase, phone, profilePicUrl);
          } else if (profilePicUrl) {
            permanentAvatarUrl = profilePicUrl;
          }

          const existing = await getContactByPhone(supabase, phone, connection.id);

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
      const presenceData = isRecord(data) ? data : {};
      const jid = presenceData.id as string;
      const presences = presenceData.presences as Record<string, unknown>;
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
          const connection = await getConnectionByInstance(supabase, instance);

          if (connection) {
            const contact = await getContactByPhone(supabase, phone, connection.id);

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
      const groupData = isRecord(data) ? data : {};
      const groupJid = groupData.id as string;
      const subject = groupData.subject as string;
      if (groupJid && subject) {
        console.log(`Group update: ${groupJid} — ${subject}`);
      }
    }

    if (event === 'group.participants.update' || event === 'group-participants.update') {
      const participantData = isRecord(data) ? data : {};
      const groupJid = participantData.id as string;
      const participants = participantData.participants as string[];
      const action = participantData.action as string;
      if (groupJid) {
        console.log(`Group ${groupJid} participants ${action}: ${participants?.join(', ')}`);
      }
    }

    if (event === 'labels.edit') {
      const labelData = isRecord(data) ? data : {};
      const labelId = labelData.id as string;
      const labelName = labelData.name as string;
      const labelColor = labelData.color as string;
      const deleted = labelData.deleted as boolean;

      if (labelId) {
        const connection = await getConnectionByInstance(supabase, instance);

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
              .maybeSingle();

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
      const assocData = isRecord(data) ? data : {};
      const labelId = assocData.labelId as string || (assocData.label as Record<string, unknown>)?.id as string;
      const chatId = assocData.chatId as string;
      const type = assocData.type as string;

      if (labelId && chatId) {
        const phone = chatId.replace('@s.whatsapp.net', '').replace('@g.us', '');

        const connection = await getConnectionByInstance(supabase, instance);

        if (connection) {
          const contact = await getContactByPhone(supabase, phone, connection.id);

          const { data: tag } = await supabase
            .from('tags')
            .select('id')
            .ilike('name', `wa:${labelId}:%`)
            .maybeSingle();

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
                .maybeSingle();

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
      const callData = isRecord(data) ? data : {};
      const from = callData.from as string;
      const isVideo = callData.isVideo as boolean;
      const callStatus = callData.status as string;

      if (from) {
        const phone = from.replace('@s.whatsapp.net', '');

        const connection = await getConnectionByInstance(supabase, instance);

        if (connection) {
          let contact = await getContactByPhone(supabase, phone, connection.id);

          if (!contact) {
            const { data: newContact } = await supabase
              .from('contacts')
              .insert({ phone, name: phone, whatsapp_connection_id: connection.id })
              .select('id, avatar_url')
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

  // Persist media files (image, video, audio, document) to permanent Storage
  if (mediaUrl && ['image', 'video', 'audio', 'document'].includes(messageType)) {
    const msgId = (key.id as string) || `${Date.now()}`;
    
    // Try direct download from CDN URL first
    const permanentUrl = await persistMediaToStorage(supabase, mediaUrl, messageType, msgId);
    if (permanentUrl) {
      mediaUrl = permanentUrl;
    } else {
      // Fallback: use Evolution API getBase64FromMediaMessage
      console.log(`[MEDIA] CDN download failed for ${messageType}, trying getBase64 API...`);
      const apiUrl = await persistMediaViaApi(supabase, instance, data, messageType, msgId);
      if (apiUrl) {
        mediaUrl = apiUrl;
      } else {
        console.error(`[MEDIA] Both persistence methods failed for ${messageType} ${msgId} — keeping CDN URL as fallback`);
      }
    }
  }

  const connection = await getConnectionByInstance(supabase, instance);
  if (!connection) return;

  let contact = await getContactByPhone(supabase, phone, connection.id);

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
  // Check global setting for auto-transcription
  const { data: globalSetting } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'auto_transcription_enabled')
    .maybeSingle();

  if (globalSetting?.value === 'false') return;

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
      const errText = await response.text();
      console.error('Transcription failed:', errText);
      await supabase.from('messages').update({ transcription_status: 'failed' }).eq('id', messageId);
    }
  } catch (err) {
    console.error('Transcription error:', err);
    await supabase.from('messages').update({ transcription_status: 'failed' }).eq('id', messageId);
  }
}
