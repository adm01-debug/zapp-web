import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Logger } from "../_shared/validation.ts";
import { validateWebhookRequest, logSecurityEvent } from "../_shared/webhook-security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-hub-signature, x-hub-signature-256',
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
  return rawJid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/^\+/, '');
}

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
  if (newStatus === 'deleted' || newStatus === 'failed') return true;
  const currentPriority = STATUS_PRIORITY[currentStatus] ?? 0;
  const newPriority = STATUS_PRIORITY[newStatus] ?? 0;
  return newPriority > currentPriority;
}

// deno-lint-ignore no-explicit-any
async function persistProfilePicture(
  supabase: any,
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
      await supabase.storage.from('avatars').remove(oldFiles.map((f: any) => `avatars/${f.name}`));
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

function isValidMediaBytes(bytes: Uint8Array, messageType: string): boolean {
  if (bytes.length < 4) return false;

  if (messageType === 'audio') {
    const isOgg = bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53;
    const isMp3 = (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) ||
                  (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33);
    const isWebm = bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3;
    const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    return isOgg || isMp3 || isWebm || isWav;
  }

  if (messageType === 'image') {
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    return isJpeg || isPng || isWebp;
  }

  if (messageType === 'video') {
    const isMp4 = bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
    const isWebm = bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3;
    return isMp4 || isWebm;
  }

  return true;
}

// deno-lint-ignore no-explicit-any
async function persistMediaToStorage(
  supabase: any,
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

    if (!isValidMediaBytes(bytes, messageType)) {
      console.warn(`[MEDIA] Downloaded ${messageType} file (${bytes.length} bytes) appears encrypted or corrupted`);
      return null;
    }

    const extMap: Record<string, string> = {
      image: 'jpg', video: 'mp4', audio: 'ogg', document: 'bin',
    };
    const contentTypeMap: Record<string, string> = {
      image: 'image/jpeg', video: 'video/mp4', audio: 'audio/ogg', document: 'application/octet-stream',
    };

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

// deno-lint-ignore no-explicit-any
async function persistMediaViaApi(
  supabase: any,
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

// deno-lint-ignore no-explicit-any
async function getConnectionByInstance(
  supabase: any,
  instance: string
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('whatsapp_connections')
    .select('id')
    .eq('instance_id', instance)
    .maybeSingle();
  return data;
}

// deno-lint-ignore no-explicit-any
async function getContactByPhone(
  supabase: any,
  phone: string,
  connectionId: string
): Promise<{ id: string; avatar_url: string | null; assigned_to: string | null; name: string | null } | null> {
  const phonesVariants = [phone, `+${phone}`, phone.replace(/^\+/, '')];
  const uniquePhones = [...new Set(phonesVariants)];
  
  const { data } = await supabase
    .from('contacts')
    .select('id, avatar_url, assigned_to, name')
    .in('phone', uniquePhones)
    .eq('whatsapp_connection_id', connectionId)
    .limit(1)
    .maybeSingle();
  return data;
}

// deno-lint-ignore no-explicit-any
async function handleReactionEvent(supabase: any, reactionMessage: Record<string, unknown>) {
  const emoji = (reactionMessage.text as string) || '';
  const reactKey = reactionMessage.key as Record<string, unknown> | undefined;
  if (!reactKey?.id) return;

  const targetExternalId = reactKey.id as string;
  const reactedByMe = reactKey.fromMe as boolean;

  const { data: targetMessage } = await supabase
    .from('messages')
    .select('id, contact_id')
    .eq('external_id', targetExternalId)
    .maybeSingle();

  if (!targetMessage) {
    console.log(`Reaction target not found: ${targetExternalId}`);
    return;
  }

  if (emoji === '') {
    if (!reactedByMe) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', targetMessage.id)
        .eq('contact_id', targetMessage.contact_id);
      console.log(`Reaction removed on message ${targetExternalId}`);
    }
  } else if (!reactedByMe) {
    const { error: upsertErr } = await supabase
      .from('message_reactions')
      .upsert(
        {
          message_id: targetMessage.id,
          contact_id: targetMessage.contact_id,
          emoji,
        },
        { onConflict: 'message_id,contact_id,emoji' }
      );
    if (upsertErr) {
      console.error('Error upserting reaction:', upsertErr);
    } else {
      console.log(`Reaction synced: ${emoji} on message ${targetExternalId}`);
    }
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // =============================================
  // SECURITY: HMAC Signature & Rate Limit Check
  // =============================================
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate webhook signature and rate limit
  const securityResult = await validateWebhookRequest(req, rawBody, {
    corsHeaders,
    enableHmac: true,
    enableRateLimit: true,
    rateLimitIdentifier: req.headers.get('x-forwarded-for')?.split(',')[0] || 'evolution-api',
    maxRequestsPerMinute: 300,
  });

  if (securityResult) {
    return securityResult;
  }

  logSecurityEvent({
    event: 'hmac_validation',
    success: true,
    details: {
      hasSignature: !!(req.headers.get('x-hub-signature-256') || req.headers.get('x-hub-signature')),
      payloadSize: rawBody.length,
    },
  });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = JSON.parse(rawBody);
    const event = normalizeEventName(payload.event);
    const instance = payload.instance;
    const data = payload.data ?? {};
    const baseData = isRecord(data) ? data : {};

    console.log('Evolution webhook received:', payload.event, '->', event, instance);

    if (event === 'connection.update') {
      const status = (baseData.status as string) === 'open' ? 'connected' :
        (baseData.status as string) === 'close' ? 'disconnected' : 'pending';

      const { data: prevConn } = await supabase
        .from('whatsapp_connections')
        .select('status, phone_number')
        .eq('instance_id', instance)
        .single();

      await supabase
        .from('whatsapp_connections')
        .update({ status, qr_code: null, updated_at: new Date().toISOString() })
        .eq('instance_id', instance);

      console.log(`Connection ${instance} status: ${status}`);

      if (status === 'disconnected' && prevConn?.status === 'connected') {
        const phone = prevConn.phone_number ? ` (${prevConn.phone_number})` : '';
        await supabase.from('warroom_alerts').insert({
          alert_type: 'critical',
          title: `🔴 Conexão ${instance} desconectou`,
          message: `A instância ${instance}${phone} perdeu conexão com o WhatsApp. Reconecte imediatamente para evitar perda de mensagens.`,
          source: 'evolution-webhook',
        });
        console.warn(`ALERT: Connection ${instance} DISCONNECTED - warroom alert created`);
      }

      if (status === 'connected' && prevConn?.status !== 'connected') {
        await supabase.from('warroom_alerts').insert({
          alert_type: 'info',
          title: `🟢 Conexão ${instance} restaurada`,
          message: `A instância ${instance} reconectou com sucesso ao WhatsApp.`,
          source: 'evolution-webhook',
        });
        console.log(`Connection ${instance} RESTORED - warroom alert created`);
      }
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
        if (!key) continue;

        const msg = (entry.message || baseData.message) as Record<string, unknown> | undefined;
        if (msg?.reactionMessage) {
          await handleReactionEvent(supabase, msg.reactionMessage as Record<string, unknown>);
          continue;
        }

        if (!key.fromMe) {
          await handleIncomingMessage(
            supabase,
            instance,
            { ...baseData, ...entry },
            key,
            supabaseUrl,
            supabaseServiceKey,
          );
        } else {
          await handleOutgoingWhatsAppMessage(
            supabase,
            instance,
            { ...baseData, ...entry },
            key,
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
              const msgPayload = entry.message || baseData.message;
              let webhookMsgType = 'text';
              if (isRecord(msgPayload)) {
                if (msgPayload.imageMessage) webhookMsgType = 'image';
                else if (msgPayload.videoMessage) webhookMsgType = 'video';
                else if (msgPayload.audioMessage) webhookMsgType = 'audio';
                else if (msgPayload.documentMessage || msgPayload.documentWithCaptionMessage) webhookMsgType = 'document';
                else if (msgPayload.stickerMessage) webhookMsgType = 'sticker';
              }

              const recentCutoff = new Date(Date.now() - 300_000).toISOString();
              const { data: pendingMessage } = await supabase
                .from('messages')
                .select('id')
                .eq('contact_id', contact.id)
                .eq('sender', 'agent')
                .eq('message_type', webhookMsgType)
                .is('external_id', null)
                .gte('created_at', recentCutoff)
                .order('created_at', { ascending: true })
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
            }
          } else {
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

            await supabase
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
            console.log(`Message ${key.id} placeholder created with status: ${newStatus}`);
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
          const { data: updatedMessages } = await supabase
            .from('messages')
            .update({ is_deleted: true, status: 'deleted', status_updated_at: now })
            .eq('external_id', key.id)
            .select('id');

          if (!updatedMessages?.length) {
            let contactId: string | null = null;
            if (connection?.id && key.remoteJid) {
              const phone = normalizePhone(key.remoteJid);
              if (phone) {
                const contact = await getContactByPhone(supabase, phone, connection.id);
                contactId = contact?.id ?? null;
              }
            }

            await supabase
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
            const { error: insertErr } = await supabase.from('contacts').insert({
              phone,
              name: pushName,
              avatar_url: permanentAvatarUrl || null,
              whatsapp_connection_id: connection.id,
            });
            if (insertErr && insertErr.code === '23505') {
              await supabase.from('contacts').update({
                name: pushName,
                avatar_url: permanentAvatarUrl || null,
                whatsapp_connection_id: connection.id,
                updated_at: new Date().toISOString(),
              }).eq('phone', phone);
            }
          }
          console.log(`Contact synced: ${phone} (${pushName})`);
        }
      }
    }

    if (event === 'presence.update') {
      const presenceData = isRecord(data) ? data : {};
      const jid = (presenceData.id as string) || (presenceData.remoteJid as string);
      const presences = presenceData.presences as Record<string, Record<string, unknown>> | undefined;

      if (jid && !jid.endsWith('@g.us')) {
        let isComposing = false;
        if (presences) {
          for (const [, pState] of Object.entries(presences)) {
            if (pState?.lastKnownPresence === 'composing' || pState?.status === 'composing') {
              isComposing = true;
              break;
            }
          }
        } else {
          const directStatus = presenceData.status as string || presenceData.lastKnownPresence as string;
          isComposing = directStatus === 'composing';
        }

        const phone = normalizePhone(jid);
        if (phone) {
          const connection = await getConnectionByInstance(supabase, instance);
          if (connection) {
            const contact = await getContactByPhone(supabase, phone, connection.id);
            if (contact) {
              const channel = supabase.channel(`typing:${contact.id}`);
              await channel.send({
                type: 'broadcast',
                event: 'contact_typing',
                payload: { isTyping: isComposing, contactId: contact.id, timestamp: new Date().toISOString() },
              });
              supabase.removeChannel(channel);
            }
          }
        }
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
      }
    }

    if (event === 'labels.edit') {
      const labelData = isRecord(data) ? data : {};
      const labelId = labelData.id as string;
      const labelName = labelData.name as string;
      const labelColor = labelData.color as string;
      const deleted = labelData.deleted as boolean;

      if (labelId) {
        if (deleted) {
          await supabase
            .from('tags')
            .delete()
            .eq('name', `wa:${labelId}:${labelName}`);
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
              .select('id, avatar_url, assigned_to, name')
              .single();
            contact = newContact;
          }

          if (contact) {
            const agentId = contact.assigned_to || null;

            await supabase.from('calls').insert({
              contact_id: contact.id,
              whatsapp_connection_id: connection.id,
              agent_id: agentId,
              direction: 'inbound',
              status: callStatus || 'ringing',
              started_at: new Date().toISOString(),
              notes: isVideo ? 'Chamada de vídeo' : 'Chamada de voz',
            });

            if (agentId) {
              const { data: agentProfile } = await supabase
                .from('profiles')
                .select('user_id, name')
                .eq('id', agentId)
                .single();

              const contactName = contact.name || phone;
              
              if (agentProfile?.user_id) {
                await supabase.from('notifications').insert({
                  user_id: agentProfile.user_id,
                  type: 'incoming_call',
                  title: isVideo ? '📹 Chamada de vídeo recebida' : '📞 Chamada de voz recebida',
                  message: `${contactName} está ligando para você`,
                  metadata: {
                    contact_id: contact.id,
                    phone,
                    is_video: isVideo,
                    call_status: callStatus,
                    whatsapp_connection_id: connection.id,
                    agent_profile_id: agentId,
                  },
                });
              }
            }
          }
        }
      }
    }

    if (event === 'chats.delete') {
      const chats = Array.isArray(data) ? data : [data];
      for (const chat of chats) {
        const chatData = isRecord(chat) ? chat : {};
        const jid = (chatData.id as string) || (chatData.remoteJid as string);
        if (!jid || jid.endsWith('@g.us')) continue;

        const phone = normalizePhone(jid);
        if (!phone) continue;

        const connection = await getConnectionByInstance(supabase, instance);
        if (!connection) continue;

        const contact = await getContactByPhone(supabase, phone, connection.id);
        if (contact) {
          const now = new Date().toISOString();
          await supabase
            .from('messages')
            .update({ is_deleted: true, status: 'deleted', status_updated_at: now })
            .eq('contact_id', contact.id);
        }
      }
    }

    if (event === 'application.startup') {
      console.log(`Application startup event from instance: ${instance}`);
      const { data: conn } = await supabase
        .from('whatsapp_connections')
        .select('id, status')
        .eq('instance_id', instance)
        .maybeSingle();

      if (conn && conn.status === 'disconnected') {
        await supabase
          .from('whatsapp_connections')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', conn.id);
      }
    }

    if (event === 'messages.set') {
      const messages = toEventRecords(data, ['messages']);
      const connection = await getConnectionByInstance(supabase, instance);
      if (connection && messages.length > 0) {
        let synced = 0;
        for (const entry of messages) {
          const keySource = isRecord(entry.key) ? entry.key : null;
          const key = keySource as { remoteJid?: string; fromMe?: boolean; id?: string } | null;
          if (!key?.id || !key.remoteJid || key.remoteJid.endsWith('@g.us')) continue;

          const { data: existing } = await supabase
            .from('messages')
            .select('id')
            .eq('external_id', key.id)
            .maybeSingle();
          if (existing) continue;

          const phone = normalizePhone(key.remoteJid);
          if (!phone) continue;

          const contact = await getContactByPhone(supabase, phone, connection.id);
          if (!contact) continue;

          const msg = entry.message as Record<string, unknown> | undefined;
          let content = '';
          let messageType = 'text';
          if (msg?.conversation) content = msg.conversation as string;
          else if ((msg?.extendedTextMessage as Record<string, unknown>)?.text) content = (msg.extendedTextMessage as Record<string, unknown>).text as string;
          else if (msg?.imageMessage) { messageType = 'image'; content = ((msg.imageMessage as Record<string, unknown>).caption as string) || '[Imagem]'; }
          else if (msg?.videoMessage) { messageType = 'video'; content = ((msg.videoMessage as Record<string, unknown>).caption as string) || '[Vídeo]'; }
          else if (msg?.audioMessage) { messageType = 'audio'; content = '[Áudio]'; }
          else if (msg?.documentMessage) { messageType = 'document'; content = ((msg.documentMessage as Record<string, unknown>).fileName as string) || '[Documento]'; }
          else if (msg?.stickerMessage) { messageType = 'sticker'; content = '[Sticker]'; }
          else continue;

          if (!content && messageType === 'text') continue;

          const ts = (entry.messageTimestamp as number)
            ? new Date((entry.messageTimestamp as number) * 1000).toISOString()
            : new Date().toISOString();

          await supabase.from('messages').insert({
            content,
            message_type: messageType,
            sender: key.fromMe ? 'agent' : 'contact',
            external_id: key.id,
            contact_id: contact.id,
            whatsapp_connection_id: connection.id,
            status: key.fromMe ? 'sent' : null,
            is_read: key.fromMe ? true : false,
            created_at: ts,
          });
          synced++;
        }
        console.log(`messages.set: synced ${synced} for ${instance}`);
      }
    }

    if (event === 'contacts.set') {
      const contacts = toEventRecords(data, ['contacts']);
      const connection = await getConnectionByInstance(supabase, instance);
      if (connection && contacts.length > 0) {
        let synced = 0;
        for (const contactData of contacts) {
          const jid = (contactData.id as string) || (contactData.remoteJid as string);
          if (!jid || jid.endsWith('@g.us') || jid.endsWith('@broadcast')) continue;

          const phone = normalizePhone(jid);
          if (!phone) continue;

          const pushName = (contactData.pushName as string) || (contactData.name as string) || (contactData.notify as string);
          if (!pushName) continue;

          const existing = await getContactByPhone(supabase, phone, connection.id);
          if (existing) continue;

          const { error: insertErr } = await supabase.from('contacts').insert({
            phone,
            name: pushName,
            whatsapp_connection_id: connection.id,
          });
          if (!insertErr) synced++;
        }
        console.log(`contacts.set: synced ${synced} for ${instance}`);
      }
    }

    if (event === 'chats.set') {
      const chats = toEventRecords(data, ['chats']);
      const connection = await getConnectionByInstance(supabase, instance);
      if (connection && chats.length > 0) {
        for (const chat of chats) {
          const jid = chat.id as string;
          if (!jid || jid.endsWith('@g.us')) continue;

          const phone = normalizePhone(jid);
          if (!phone) continue;

          const unreadCount = chat.unreadCount as number;
          if (unreadCount === 0) {
            const contact = await getContactByPhone(supabase, phone, connection.id);
            if (contact) {
              await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('contact_id', contact.id)
                .eq('sender', 'contact')
                .eq('is_read', false);
            }
          }
        }
      }
    }

    if (event === 'messages.edited' || event === 'messages.edit') {
      for (const entry of toEventRecords(data, ['messages'])) {
        const keySource = isRecord(entry.key) ? entry.key : isRecord(baseData.key) ? baseData.key : null;
        const key = keySource as { id?: string } | null;
        if (!key?.id) continue;

        const msg = (entry.message || baseData.message) as Record<string, unknown> | undefined;
        const editedContent =
          (msg?.conversation as string) ||
          ((msg?.extendedTextMessage as Record<string, unknown>)?.text as string) ||
          ((entry.editedMessage as Record<string, unknown>)?.conversation as string) ||
          null;

        if (!editedContent) continue;

        const { data: existing } = await supabase
          .from('messages')
          .select('id')
          .eq('external_id', key.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('messages')
            .update({
              content: editedContent,
              is_edited: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          console.log(`Message edited: ${key.id}`);
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

// deno-lint-ignore no-explicit-any
async function handleOutgoingWhatsAppMessage(
  supabase: any,
  instance: string,
  data: Record<string, unknown>,
  key: { remoteJid: string; fromMe: boolean; id: string },
) {
  const externalId = key.id;

  const { data: existingMessage } = await supabase
    .from('messages')
    .select('id')
    .eq('external_id', externalId)
    .maybeSingle();

  if (existingMessage) return;

  const phone = normalizePhone(key.remoteJid);
  if (!phone || key.remoteJid.includes('@g.us')) return;

  const connection = await getConnectionByInstance(supabase, instance);
  if (!connection) return;

  const contact = await getContactByPhone(supabase, phone, connection.id);
  if (!contact) return;

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
  } else if (message?.stickerMessage) {
    messageType = 'sticker';
    content = '[Sticker]';
  } else if (message?.reactionMessage) {
    return;
  }

  if (!content && messageType === 'text') return;

  if (mediaUrl && ['image', 'video', 'audio', 'document'].includes(messageType)) {
    const msgId = key.id.replace(/[^a-zA-Z0-9]/g, '');
    const permanentUrl = await persistMediaToStorage(supabase, mediaUrl, messageType, msgId);
    if (permanentUrl) {
      mediaUrl = permanentUrl;
    } else {
      const apiUrl = await persistMediaViaApi(supabase, instance, data, messageType, msgId);
      if (apiUrl) mediaUrl = apiUrl;
    }
  }

  const messageCreatedAt = (data.messageTimestamp as number)
    ? new Date((data.messageTimestamp as number) * 1000).toISOString()
    : new Date().toISOString();

  const recentCutoff = new Date(Date.now() - 60_000).toISOString();
  const { data: pendingMessage } = await supabase
    .from('messages')
    .select('id')
    .eq('contact_id', contact.id)
    .eq('sender', 'agent')
    .eq('message_type', messageType)
    .is('external_id', null)
    .gte('created_at', recentCutoff)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendingMessage?.id) {
    await supabase
      .from('messages')
      .update({ status: 'sent', external_id: externalId, status_updated_at: new Date().toISOString() })
      .eq('id', pendingMessage.id);
    return;
  }

  await supabase
    .from('messages')
    .insert({
      contact_id: contact.id,
      whatsapp_connection_id: connection.id,
      content,
      message_type: messageType,
      media_url: mediaUrl,
      sender: 'agent',
      external_id: externalId,
      status: 'sent',
      created_at: messageCreatedAt,
      agent_id: contact.assigned_to || null,
    });

  await supabase
    .from('contacts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', contact.id);
}

// deno-lint-ignore no-explicit-any
async function handleIncomingMessage(
  supabase: any,
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
  } else if (message?.reactionMessage) {
    return;
  } else if (message?.contactMessage || message?.contactsArrayMessage) {
    messageType = 'contact';
    content = '[Contato]';
  } else if (message?.pollCreationMessage) {
    messageType = 'poll';
    content = (message.pollCreationMessage as Record<string, unknown>).name as string || '[Enquete]';
  }

  if (mediaUrl && ['image', 'video', 'audio', 'document'].includes(messageType)) {
    const msgId = (key.id as string) || `${Date.now()}`;
    const permanentUrl = await persistMediaToStorage(supabase, mediaUrl, messageType, msgId);
    if (permanentUrl) {
      mediaUrl = permanentUrl;
    } else {
      const apiUrl = await persistMediaViaApi(supabase, instance, data, messageType, msgId);
      if (apiUrl) mediaUrl = apiUrl;
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
      .select('id, avatar_url, assigned_to, name')
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

    await supabase
      .from('messages')
      .update({
        contact_id: contact.id,
        whatsapp_connection_id: connection.id,
        content: existingMessage.status === 'deleted' ? existingMessage.content : content,
        message_type: messageType,
        media_url: mediaUrl,
        sender: 'contact',
        created_at: messageCreatedAt,
        status: preservedStatus,
      })
      .eq('id', existingMessage.id);

    if (messageType === 'audio' && mediaUrl) {
      await handleAudioTranscription(supabase, contact.id, existingMessage.id, mediaUrl, supabaseUrl, supabaseServiceKey);
    }
    return;
  }

  const { data: insertedMessage } = await supabase
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

  if (messageType === 'audio' && mediaUrl && insertedMessage) {
    await handleAudioTranscription(supabase, contact.id, insertedMessage.id, mediaUrl, supabaseUrl, supabaseServiceKey);
  }
}

// deno-lint-ignore no-explicit-any
async function handleAudioTranscription(
  supabase: any,
  contactId: string,
  messageId: string,
  mediaUrl: string,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
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
    } else {
      await supabase.from('messages').update({ transcription_status: 'failed' }).eq('id', messageId);
    }
  } catch {
    await supabase.from('messages').update({ transcription_status: 'failed' }).eq('id', messageId);
  }
}