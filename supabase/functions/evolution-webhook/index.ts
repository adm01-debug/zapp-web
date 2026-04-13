import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCors } from "../_shared/validation.ts";
import {
  isRecord, normalizeEventName, toEventRecords, normalizePhone, shouldUpdateStatus,
  getConnectionByInstance, getContactByPhone, fetchProfilePicFromApi, persistProfilePicture,
  handleReactionEvent,
  type WebhookPayload,
} from "../_shared/evolution-helpers.ts";
import {
  persistMediaToStorage, persistMediaViaApi, parseMessageContent,
} from "../_shared/evolution-media.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

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
      await handleConnectionUpdate(supabase, instance, baseData);
    }

    if (event === 'qrcode.updated') {
      const qrCode = (baseData.qrcode as Record<string, string>)?.base64;
      if (qrCode) {
        await supabase.from('whatsapp_connections')
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
          await handleReactionEvent(supabase, msg.reactionMessage as Record<string, unknown>, !!key.fromMe);
          continue;
        }

        if (!key.fromMe) {
          await handleIncomingMessage(supabase, instance, { ...baseData, ...entry }, key, supabaseUrl, supabaseServiceKey);
        } else {
          await handleOutgoingWhatsAppMessage(supabase, instance, { ...baseData, ...entry }, key);
        }
      }
    }

    if (event === 'send.message') {
      await handleSendMessage(supabase, instance, data, baseData);
    }

    if (event === 'messages.update') {
      await handleMessagesUpdate(supabase, instance, data, baseData);
    }

    if (event === 'messages.delete') {
      await handleMessagesDelete(supabase, instance, data, baseData);
    }

    if (event === 'contacts.upsert' || event === 'contacts.update') {
      await handleContactsUpsert(supabase, instance, data);
    }

    if (event === 'presence.update') {
      await handlePresenceUpdate(supabase, instance, data);
    }

    if (event === 'chats.upsert' || event === 'chats.update') {
      await handleChatsUpdate(supabase, instance, data);
    }

    if (event === 'groups.upsert' || event === 'group.update') {
      const groupData = isRecord(data) ? data : {};
      const groupJid = groupData.id as string;
      const subject = groupData.subject as string;
      if (groupJid && subject) console.log(`Group update: ${groupJid} — ${subject}`);
    }

    if (event === 'group.participants.update' || event === 'group-participants.update') {
      const participantData = isRecord(data) ? data : {};
      const groupJid = participantData.id as string;
      const participants = participantData.participants as string[];
      const action = participantData.action as string;
      if (groupJid) console.log(`Group ${groupJid} participants ${action}: ${participants?.join(', ')}`);
    }

    if (event === 'labels.edit') {
      await handleLabelsEdit(supabase, instance, data);
    }

    if (event === 'labels.association') {
      await handleLabelsAssociation(supabase, instance, data);
    }

    if (event === 'call') {
      await handleCallEvent(supabase, instance, data);
    }

    if (event === 'chats.delete') {
      await handleChatsDelete(supabase, instance, data);
    }

    if (event === 'application.startup') {
      await handleApplicationStartup(supabase, instance);
    }

    if (event === 'messages.set') {
      await handleMessagesSet(supabase, instance, data);
    }

    if (event === 'contacts.set') {
      await handleContactsSet(supabase, instance, data);
    }

    if (event === 'chats.set') {
      await handleChatsSet(supabase, instance, data);
    }

    if (event === 'messages.edited' || event === 'messages.edit') {
      await handleMessagesEdited(supabase, data, baseData);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Evolution webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─── Event Handlers ───

// deno-lint-ignore no-explicit-any
async function handleConnectionUpdate(supabase: any, instance: string, baseData: Record<string, unknown>) {
  const status = (baseData.status as string) === 'open' ? 'connected' :
    (baseData.status as string) === 'close' ? 'disconnected' : 'pending';

  const { data: prevConn } = await supabase.from('whatsapp_connections')
    .select('status, phone_number').eq('instance_id', instance).single();

  await supabase.from('whatsapp_connections')
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
    console.warn(`ALERT: Connection ${instance} DISCONNECTED`);
  }

  if (status === 'connected' && prevConn?.status !== 'connected') {
    await supabase.from('warroom_alerts').insert({
      alert_type: 'info',
      title: `🟢 Conexão ${instance} restaurada`,
      message: `A instância ${instance} reconectou com sucesso ao WhatsApp.`,
      source: 'evolution-webhook',
    });
    console.log(`Connection ${instance} RESTORED`);
  }
}

// deno-lint-ignore no-explicit-any
async function handleSendMessage(supabase: any, instance: string, data: unknown, baseData: Record<string, unknown>) {
  for (const entry of toEventRecords(data, ['messages'])) {
    const keySource = isRecord(entry.key) ? entry.key : isRecord(baseData.key) ? baseData.key : null;
    const key = keySource as { remoteJid?: string; fromMe?: boolean; id?: string } | null;
    const externalId = key?.id;
    if (!externalId) continue;

    let updatedMessageId: string | null = null;
    const now = new Date().toISOString();

    const { data: existingMessage } = await supabase.from('messages')
      .select('id, status').eq('external_id', externalId).maybeSingle();

    if (existingMessage?.id) {
      if (shouldUpdateStatus(existingMessage.status, 'sent')) {
        await supabase.from('messages')
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
          const { data: pendingMessage } = await supabase.from('messages')
            .select('id').eq('contact_id', contact.id).eq('sender', 'agent')
            .eq('message_type', webhookMsgType).is('external_id', null)
            .gte('created_at', recentCutoff).order('created_at', { ascending: true })
            .limit(1).maybeSingle();

          if (pendingMessage?.id) {
            await supabase.from('messages')
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

// deno-lint-ignore no-explicit-any
async function handleMessagesUpdate(supabase: any, instance: string, data: unknown, baseData: Record<string, unknown>) {
  const statusMap: Record<string, string> = {
    'DELIVERY_ACK': 'delivered', 'READ': 'read', 'PLAYED': 'read', 'SERVER_ACK': 'sent', 'ERROR': 'failed',
  };
  const connection = await getConnectionByInstance(supabase, instance);

  for (const entry of toEventRecords(data, ['messages', 'updates', 'statuses'])) {
    const keySource = isRecord(entry.key) ? entry.key : isRecord(baseData.key) ? baseData.key : null;
    const key = keySource as { id?: string } | null;
    const rawStatus = (entry.status as string) || (baseData.status as string) || '';
    const newStatus = statusMap[rawStatus] || rawStatus.toLowerCase();

    if (newStatus && key?.id) {
      const now = new Date().toISOString();
      const { data: currentMessage } = await supabase.from('messages')
        .select('id, status').eq('external_id', key.id).maybeSingle();

      if (currentMessage?.id) {
        if (shouldUpdateStatus(currentMessage.status, newStatus)) {
          await supabase.from('messages').update({ status: newStatus, status_updated_at: now }).eq('id', currentMessage.id);
          console.log(`Message ${key.id} status: ${currentMessage.status} → ${newStatus}`);
        } else {
          console.log(`Message ${key.id} status skip: ${currentMessage.status} → ${newStatus} (would downgrade)`);
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

        const { error: insertError } = await supabase.from('messages').insert({
          content: '[Mensagem recebida]', message_type: 'text', sender: 'contact',
          external_id: key.id, status: newStatus, status_updated_at: now, created_at: now,
          contact_id: contactId, whatsapp_connection_id: connection?.id ?? null,
        });
        if (insertError) { console.error(`Error creating placeholder for message status ${key.id}:`, insertError); continue; }
        console.log(`Message ${key.id} placeholder created with status: ${newStatus}${contactId ? ` (contact: ${contactId})` : ' (orphan)'}`);
      }
    }
  }
}

// deno-lint-ignore no-explicit-any
async function handleMessagesDelete(supabase: any, instance: string, data: unknown, baseData: Record<string, unknown>) {
  const connection = await getConnectionByInstance(supabase, instance);
  for (const entry of toEventRecords(data, ['messages', 'keys'])) {
    const keySource = isRecord(entry.key)
      ? entry.key : (typeof entry.id === 'string' ? entry : null) ?? (isRecord(baseData.key) ? baseData.key : null);
    const key = keySource as { id?: string; remoteJid?: string } | null;
    if (!key?.id) continue;

    const now = new Date().toISOString();
    const { data: updatedMessages, error: updateError } = await supabase.from('messages')
      .update({ is_deleted: true, status: 'deleted', status_updated_at: now })
      .eq('external_id', key.id).select('id');

    if (updateError) { console.error(`Error deleting message ${key.id}:`, updateError); continue; }

    if (!updatedMessages?.length) {
      let contactId: string | null = null;
      if (connection?.id && key.remoteJid) {
        const phone = normalizePhone(key.remoteJid);
        if (phone) { const contact = await getContactByPhone(supabase, phone, connection.id); contactId = contact?.id ?? null; }
      }

      const { error: insertError } = await supabase.from('messages').insert({
        content: '[Mensagem apagada]', message_type: 'text', sender: 'contact',
        external_id: key.id, status: 'deleted', is_deleted: true, status_updated_at: now,
        created_at: now, contact_id: contactId, whatsapp_connection_id: connection?.id ?? null,
      });
      if (insertError) { console.error(`Error creating placeholder for deleted message ${key.id}:`, insertError); continue; }
    }
    console.log(`Message deleted: ${key.id}`);
  }
}

// deno-lint-ignore no-explicit-any
async function handleContactsUpsert(supabase: any, instance: string, data: unknown) {
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
          phone, name: pushName, avatar_url: permanentAvatarUrl || null, whatsapp_connection_id: connection.id,
        });
        if (insertErr && insertErr.code === '23505') {
          await supabase.from('contacts').update({
            name: pushName, avatar_url: permanentAvatarUrl || null,
            whatsapp_connection_id: connection.id, updated_at: new Date().toISOString(),
          }).eq('phone', phone);
        }
      }
      console.log(`Contact synced: ${phone} (${pushName}) avatar: ${permanentAvatarUrl ? 'saved' : 'none'}`);
    }
  }
}

// deno-lint-ignore no-explicit-any
async function handlePresenceUpdate(supabase: any, instance: string, data: unknown) {
  const presenceData = isRecord(data) ? data : {};
  const jid = (presenceData.id as string) || (presenceData.remoteJid as string);
  const presences = presenceData.presences as Record<string, Record<string, unknown>> | undefined;

  if (jid && !jid.endsWith('@g.us')) {
    let isComposing = false;
    if (presences) {
      for (const [, pState] of Object.entries(presences)) {
        if (pState?.lastKnownPresence === 'composing' || pState?.status === 'composing') { isComposing = true; break; }
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
          await channel.send({ type: 'broadcast', event: 'contact_typing', payload: { isTyping: isComposing, contactId: contact.id, timestamp: new Date().toISOString() } });
          supabase.removeChannel(channel);
          console.log(`Presence ${phone}: ${isComposing ? 'composing' : 'paused'}`);
        }
      }
    }
  }
}

// deno-lint-ignore no-explicit-any
async function handleChatsUpdate(supabase: any, instance: string, data: unknown) {
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
          await supabase.from('messages').update({ is_read: true })
            .eq('contact_id', contact.id).eq('sender', 'contact').eq('is_read', false);
        }
      }
    }
    console.log(`Chat updated: ${jid}`);
  }
}

// deno-lint-ignore no-explicit-any
async function handleLabelsEdit(supabase: any, instance: string, data: unknown) {
  const labelData = isRecord(data) ? data : {};
  const labelId = labelData.id as string;
  const labelName = labelData.name as string;
  const labelColor = labelData.color as string;
  const deleted = labelData.deleted as boolean;
  if (!labelId) return;

  const connection = await getConnectionByInstance(supabase, instance);
  if (!connection) return;

  if (deleted) {
    await supabase.from('tags').delete().eq('name', `wa:${labelId}:${labelName}`);
    console.log(`Label deleted: ${labelName}`);
  } else {
    const tagName = labelName || `Label ${labelId}`;
    const { data: existingTag } = await supabase.from('tags').select('id').ilike('name', `wa:${labelId}:%`).maybeSingle();
    if (existingTag) {
      await supabase.from('tags').update({ name: `wa:${labelId}:${tagName}`, color: labelColor || '#3B82F6' }).eq('id', existingTag.id);
    } else {
      await supabase.from('tags').insert({ name: `wa:${labelId}:${tagName}`, color: labelColor || '#3B82F6' });
    }
    console.log(`Label synced: ${tagName} (${labelColor})`);
  }
}

// deno-lint-ignore no-explicit-any
async function handleLabelsAssociation(supabase: any, instance: string, data: unknown) {
  const assocData = isRecord(data) ? data : {};
  const labelId = assocData.labelId as string || (assocData.label as Record<string, unknown>)?.id as string;
  const chatId = assocData.chatId as string;
  const type = assocData.type as string;
  if (!labelId || !chatId) return;

  const phone = chatId.replace('@s.whatsapp.net', '').replace('@g.us', '');
  const connection = await getConnectionByInstance(supabase, instance);
  if (!connection) return;

  const contact = await getContactByPhone(supabase, phone, connection.id);
  const { data: tag } = await supabase.from('tags').select('id').ilike('name', `wa:${labelId}:%`).maybeSingle();

  if (contact && tag) {
    if (type === 'remove') {
      await supabase.from('contact_tags').delete().eq('contact_id', contact.id).eq('tag_id', tag.id);
      console.log(`Label removed from ${phone}`);
    } else {
      const { data: existing } = await supabase.from('contact_tags').select('id')
        .eq('contact_id', contact.id).eq('tag_id', tag.id).maybeSingle();
      if (!existing) {
        await supabase.from('contact_tags').insert({ contact_id: contact.id, tag_id: tag.id });
        console.log(`Label applied to ${phone}`);
      }
    }
  }
}

// deno-lint-ignore no-explicit-any
async function handleCallEvent(supabase: any, instance: string, data: unknown) {
  const callData = isRecord(data) ? data : {};
  const from = callData.from as string;
  const isVideo = callData.isVideo as boolean;
  const callStatus = callData.status as string;
  if (!from) return;

  const phone = from.replace('@s.whatsapp.net', '');
  const connection = await getConnectionByInstance(supabase, instance);
  if (!connection) return;

  let contact = await getContactByPhone(supabase, phone, connection.id);
  if (!contact) {
    const { data: newContact } = await supabase.from('contacts')
      .insert({ phone, name: phone, whatsapp_connection_id: connection.id })
      .select('id, avatar_url, assigned_to, name').single();
    contact = newContact;
  }
  if (!contact) return;

  const agentId = contact.assigned_to || null;
  await supabase.from('calls').insert({
    contact_id: contact.id, whatsapp_connection_id: connection.id, agent_id: agentId,
    direction: 'inbound', status: callStatus || 'ringing', started_at: new Date().toISOString(),
    notes: isVideo ? 'Chamada de vídeo' : 'Chamada de voz',
  });

  if (agentId) {
    const { data: agentProfile } = await supabase.from('profiles')
      .select('user_id, name').eq('id', agentId).single();
    const contactName = contact.name || phone;
    if (agentProfile?.user_id) {
      await supabase.from('notifications').insert({
        user_id: agentProfile.user_id, type: 'incoming_call',
        title: isVideo ? '📹 Chamada de vídeo recebida' : '📞 Chamada de voz recebida',
        message: `${contactName} está ligando para você`,
        metadata: { contact_id: contact.id, phone, is_video: isVideo, call_status: callStatus, whatsapp_connection_id: connection.id, agent_profile_id: agentId },
      });
      console.log(`Call routed to agent ${agentProfile.name || agentId} from ${contactName}`);
    }
  } else {
    console.log(`Call registered from ${phone} (no assigned agent)`);
  }
}

// deno-lint-ignore no-explicit-any
async function handleChatsDelete(supabase: any, instance: string, data: unknown) {
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
      const { count } = await supabase.from('messages')
        .update({ is_deleted: true, status: 'deleted', status_updated_at: now })
        .eq('contact_id', contact.id).select('id');
      console.log(`Chat deleted: ${jid} — ${count ?? 0} messages marked as deleted`);
    }
  }
}

// deno-lint-ignore no-explicit-any
async function handleApplicationStartup(supabase: any, instance: string) {
  console.log(`Application startup event from instance: ${instance}`);
  const { data: conn } = await supabase.from('whatsapp_connections')
    .select('id, status').eq('instance_id', instance).maybeSingle();
  if (conn && conn.status === 'disconnected') {
    await supabase.from('whatsapp_connections')
      .update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', conn.id);
    console.log(`Instance ${instance} startup: status set to pending`);
  }
}

// deno-lint-ignore no-explicit-any
async function handleMessagesSet(supabase: any, instance: string, data: unknown) {
  const messages = toEventRecords(data, ['messages']);
  if (messages.length === 0) { console.log(`messages.set: no messages in payload for ${instance}`); return; }

  const connection = await getConnectionByInstance(supabase, instance);
  if (!connection) return;

  let synced = 0, skipped = 0;
  for (const entry of messages) {
    const keySource = isRecord(entry.key) ? entry.key : null;
    const key = keySource as { remoteJid?: string; fromMe?: boolean; id?: string } | null;
    if (!key?.id || !key.remoteJid || key.remoteJid.endsWith('@g.us')) { skipped++; continue; }

    const { data: existing } = await supabase.from('messages').select('id').eq('external_id', key.id).maybeSingle();
    if (existing) { skipped++; continue; }

    const phone = normalizePhone(key.remoteJid);
    if (!phone) { skipped++; continue; }
    const contact = await getContactByPhone(supabase, phone, connection.id);
    if (!contact) { skipped++; continue; }

    const msg = entry.message as Record<string, unknown> | undefined;
    let content = '', messageType = 'text';
    if (msg?.conversation) content = msg.conversation as string;
    else if ((msg?.extendedTextMessage as Record<string, unknown>)?.text) content = (msg!.extendedTextMessage as Record<string, unknown>).text as string;
    else if (msg?.imageMessage) { messageType = 'image'; content = ((msg.imageMessage as Record<string, unknown>).caption as string) || '[Imagem]'; }
    else if (msg?.videoMessage) { messageType = 'video'; content = ((msg.videoMessage as Record<string, unknown>).caption as string) || '[Vídeo]'; }
    else if (msg?.audioMessage) { messageType = 'audio'; content = '[Áudio]'; }
    else if (msg?.documentMessage) { messageType = 'document'; content = ((msg.documentMessage as Record<string, unknown>).fileName as string) || '[Documento]'; }
    else if (msg?.stickerMessage) { messageType = 'sticker'; content = '[Sticker]'; }
    else { skipped++; continue; }
    if (!content && messageType === 'text') { skipped++; continue; }

    const ts = (entry.messageTimestamp as number) ? new Date((entry.messageTimestamp as number) * 1000).toISOString() : new Date().toISOString();
    await supabase.from('messages').insert({
      content, message_type: messageType, sender: key.fromMe ? 'agent' : 'contact',
      external_id: key.id, contact_id: contact.id, whatsapp_connection_id: connection.id,
      status: key.fromMe ? 'sent' : null, is_read: key.fromMe ? true : false, created_at: ts,
    });
    synced++;
  }
  console.log(`messages.set: synced ${synced}, skipped ${skipped} for ${instance}`);
}

// deno-lint-ignore no-explicit-any
async function handleContactsSet(supabase: any, instance: string, data: unknown) {
  const contacts = toEventRecords(data, ['contacts']);
  if (contacts.length === 0) { console.log(`contacts.set: no contacts in payload for ${instance}`); return; }

  const connection = await getConnectionByInstance(supabase, instance);
  if (!connection) return;

  let synced = 0, skipped = 0;
  for (const contactData of contacts) {
    const jid = (contactData.id as string) || (contactData.remoteJid as string);
    if (!jid || jid.endsWith('@g.us') || jid.endsWith('@broadcast')) { skipped++; continue; }
    const phone = normalizePhone(jid);
    if (!phone) { skipped++; continue; }
    const pushName = (contactData.pushName as string) || (contactData.name as string) || (contactData.notify as string);
    if (!pushName) { skipped++; continue; }
    const existing = await getContactByPhone(supabase, phone, connection.id);
    if (existing) { skipped++; continue; }

    const { error: insertErr } = await supabase.from('contacts').insert({ phone, name: pushName, whatsapp_connection_id: connection.id });
    if (insertErr && insertErr.code === '23505') { skipped++; continue; }
    if (insertErr) { console.error(`contacts.set insert error for ${phone}:`, insertErr); skipped++; continue; }
    synced++;
  }
  console.log(`contacts.set: synced ${synced}, skipped ${skipped} for ${instance}`);
}

// deno-lint-ignore no-explicit-any
async function handleChatsSet(supabase: any, instance: string, data: unknown) {
  const chats = toEventRecords(data, ['chats']);
  const connection = await getConnectionByInstance(supabase, instance);
  if (!connection || chats.length === 0) return;

  let processed = 0;
  for (const chat of chats) {
    const jid = chat.id as string;
    if (!jid || jid.endsWith('@g.us')) continue;
    const phone = normalizePhone(jid);
    if (!phone) continue;
    const unreadCount = chat.unreadCount as number;
    if (unreadCount === 0) {
      const contact = await getContactByPhone(supabase, phone, connection.id);
      if (contact) {
        await supabase.from('messages').update({ is_read: true })
          .eq('contact_id', contact.id).eq('sender', 'contact').eq('is_read', false);
        processed++;
      }
    }
  }
  console.log(`chats.set: processed ${processed} of ${chats.length} for ${instance}`);
}

// deno-lint-ignore no-explicit-any
async function handleMessagesEdited(supabase: any, data: unknown, baseData: Record<string, unknown>) {
  for (const entry of toEventRecords(data, ['messages'])) {
    const keySource = isRecord(entry.key) ? entry.key : isRecord(baseData.key) ? baseData.key : null;
    const key = keySource as { id?: string } | null;
    if (!key?.id) continue;

    const msg = (entry.message || baseData.message) as Record<string, unknown> | undefined;
    const editedContent = (msg?.conversation as string) ||
      ((msg?.extendedTextMessage as Record<string, unknown>)?.text as string) ||
      ((entry.editedMessage as Record<string, unknown>)?.conversation as string) || null;

    if (!editedContent) { console.log(`messages.edited: no content found for ${key.id}`); continue; }

    const { data: existing } = await supabase.from('messages').select('id').eq('external_id', key.id).maybeSingle();
    if (existing) {
      await supabase.from('messages').update({ content: editedContent, is_edited: true, updated_at: new Date().toISOString() }).eq('id', existing.id);
      console.log(`Message edited: ${key.id}`);
    } else {
      console.log(`messages.edited: message ${key.id} not found in DB`);
    }
  }
}

// deno-lint-ignore no-explicit-any
async function handleOutgoingWhatsAppMessage(
  supabase: any, instance: string, data: Record<string, unknown>,
  key: { remoteJid: string; fromMe: boolean; id: string },
) {
  const externalId = key.id;
  const { data: existingMessage } = await supabase.from('messages').select('id').eq('external_id', externalId).maybeSingle();
  if (existingMessage) return;

  const phone = normalizePhone(key.remoteJid);
  if (!phone || key.remoteJid.includes('@g.us')) return;

  const connection = await getConnectionByInstance(supabase, instance);
  if (!connection) return;

  const contact = await getContactByPhone(supabase, phone, connection.id);
  if (!contact) { console.log(`[FROM_ME] No contact found for ${phone}, skipping`); return; }

  const message = data.message as Record<string, unknown> | undefined;
  const parsed = parseMessageContent(message, data);
  if (parsed.messageType === 'reaction') return;
  if (!parsed.content && parsed.messageType === 'text') return;

  let { mediaUrl } = parsed;
  if (mediaUrl && ['image', 'video', 'audio', 'document'].includes(parsed.messageType)) {
    const msgId = key.id.replace(/[^a-zA-Z0-9]/g, '');
    const permanentUrl = await persistMediaToStorage(supabase, mediaUrl, parsed.messageType, msgId);
    if (permanentUrl) mediaUrl = permanentUrl;
    else { const apiUrl = await persistMediaViaApi(supabase, instance, data, parsed.messageType, msgId); if (apiUrl) mediaUrl = apiUrl; }
  }

  const messageCreatedAt = (data.messageTimestamp as number)
    ? new Date((data.messageTimestamp as number) * 1000).toISOString() : new Date().toISOString();

  const recentCutoff = new Date(Date.now() - 60_000).toISOString();
  const { data: pendingMessage } = await supabase.from('messages').select('id')
    .eq('contact_id', contact.id).eq('sender', 'agent').eq('message_type', parsed.messageType)
    .is('external_id', null).gte('created_at', recentCutoff)
    .order('created_at', { ascending: true }).limit(1).maybeSingle();

  if (pendingMessage?.id) {
    await supabase.from('messages').update({ status: 'sent', external_id: externalId, status_updated_at: new Date().toISOString() }).eq('id', pendingMessage.id);
    console.log(`[FROM_ME] Linked pending message ${pendingMessage.id} to external ${externalId}`);
    return;
  }

  const { error: msgError } = await supabase.from('messages').insert({
    contact_id: contact.id, whatsapp_connection_id: connection.id, content: parsed.content,
    message_type: parsed.messageType, media_url: mediaUrl, sender: 'agent', external_id: externalId,
    status: 'sent', created_at: messageCreatedAt, agent_id: contact.assigned_to || null,
  }).select('id').single();

  if (msgError) { console.error('[FROM_ME] Error inserting outgoing message:', msgError); return; }
  await supabase.from('contacts').update({ updated_at: new Date().toISOString() }).eq('id', contact.id);
  console.log(`[FROM_ME] Synced outgoing message from WhatsApp phone to ${phone} (${parsed.messageType})`);
}

// deno-lint-ignore no-explicit-any
async function handleIncomingMessage(
  supabase: any, instance: string, data: Record<string, unknown>,
  key: { remoteJid: string; fromMe: boolean; id: string },
  supabaseUrl: string, supabaseServiceKey: string
) {
  const phone = key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  const message = data.message as Record<string, unknown> | undefined;
  const parsed = parseMessageContent(message, data);
  if (parsed.messageType === 'reaction') return;

  let { mediaUrl } = parsed;
  const { content, messageType } = parsed;

  // Special sticker handling
  if (messageType === 'sticker') {
    mediaUrl = await handleStickerMedia(supabase, instance, data, message, key);
  }

  // Persist media files
  if (mediaUrl && ['image', 'video', 'audio', 'document'].includes(messageType)) {
    const msgId = key.id || `${Date.now()}`;
    const permanentUrl = await persistMediaToStorage(supabase, mediaUrl, messageType, msgId);
    if (permanentUrl) mediaUrl = permanentUrl;
    else {
      console.log(`[MEDIA] CDN download failed for ${messageType}, trying getBase64 API...`);
      const apiUrl = await persistMediaViaApi(supabase, instance, data, messageType, msgId);
      if (apiUrl) mediaUrl = apiUrl;
      else console.error(`[MEDIA] Both persistence methods failed for ${messageType} ${msgId}`);
    }
  }

  const connection = await getConnectionByInstance(supabase, instance);
  if (!connection) return;

  let contact = await getContactByPhone(supabase, phone, connection.id);

  if (!contact) {
    let avatarUrl: string | null = null;
    const picUrl = await fetchProfilePicFromApi(instance, phone);
    if (picUrl) avatarUrl = await persistProfilePicture(supabase, phone, picUrl);
    const { data: newContact } = await supabase.from('contacts').insert({
      phone, name: (data.pushName as string) || phone, avatar_url: avatarUrl, whatsapp_connection_id: connection.id,
    }).select('id, avatar_url').single();
    contact = newContact;
  } else if (!contact.avatar_url || contact.avatar_url.includes('pps.whatsapp.net')) {
    const picUrl = await fetchProfilePicFromApi(instance, phone);
    if (picUrl) {
      const avatarUrl = await persistProfilePicture(supabase, phone, picUrl);
      if (avatarUrl) await supabase.from('contacts').update({ avatar_url: avatarUrl }).eq('id', contact.id);
    }
  }

  if (!contact) return;

  const messageCreatedAt = (data.messageTimestamp as number)
    ? new Date((data.messageTimestamp as number) * 1000).toISOString() : new Date().toISOString();

  const { data: existingMessage } = await supabase.from('messages')
    .select('id, status, content').eq('external_id', key.id).maybeSingle();

  if (existingMessage?.id) {
    const preservedStatus = existingMessage.status && existingMessage.status !== 'received' ? existingMessage.status : 'received';
    const preservedContent = existingMessage.status === 'deleted' ? (existingMessage.content || '[Mensagem apagada]') : content;
    await supabase.from('messages').update({
      contact_id: contact.id, whatsapp_connection_id: connection.id, content: preservedContent,
      message_type: messageType, media_url: mediaUrl, sender: 'contact', created_at: messageCreatedAt, status: preservedStatus,
    }).eq('id', existingMessage.id);
    console.log(`Message reconciled from ${phone} (${messageType})`);
    if (messageType === 'audio' && mediaUrl) await handleAudioTranscription(supabase, contact.id, existingMessage.id, mediaUrl, supabaseUrl, supabaseServiceKey);
    return;
  }

  const { data: insertedMessage, error: msgError } = await supabase.from('messages').insert({
    contact_id: contact.id, whatsapp_connection_id: connection.id, content,
    message_type: messageType, media_url: mediaUrl, sender: 'contact', external_id: key.id,
    status: 'received', created_at: messageCreatedAt,
  }).select('id').single();

  if (msgError) { console.error('Error inserting message:', msgError); return; }
  console.log(`Message saved from ${phone} (${messageType})`);
  if (messageType === 'audio' && mediaUrl && insertedMessage) await handleAudioTranscription(supabase, contact.id, insertedMessage.id, mediaUrl, supabaseUrl, supabaseServiceKey);
}

// deno-lint-ignore no-explicit-any
async function handleStickerMedia(
  supabase: any, instance: string, data: Record<string, unknown>,
  message: Record<string, unknown> | undefined, key: { id: string }
): Promise<string | null> {
  let mediaUrl: string | null = null;

  const uploadBase64Sticker = async (base64Data: string): Promise<string | null> => {
    try {
      const cleanB64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      const binaryStr = atob(cleanB64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      if (bytes.length < 50) return null;
      const fileName = `sticker_${Date.now()}_${key.id.replace(/[^a-zA-Z0-9]/g, '')}.webp`;
      const { error: uploadErr } = await supabase.storage.from('whatsapp-media').upload(`stickers/${fileName}`, bytes, { contentType: 'image/webp', cacheControl: '31536000' });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(`stickers/${fileName}`);
        return urlData.publicUrl;
      }
      return null;
    } catch { return null; }
  };

  const b64Direct = (data.base64 as string) || ((message?.stickerMessage as Record<string, unknown>)?.base64 as string);
  if (b64Direct) mediaUrl = await uploadBase64Sticker(b64Direct);

  if (!mediaUrl) {
    const directMediaUrl = (data.mediaUrl as string) || ((message?.stickerMessage as Record<string, unknown>)?.mediaUrl as string);
    if (directMediaUrl && directMediaUrl.startsWith('http')) {
      try {
        const resp = await fetch(directMediaUrl, { signal: AbortSignal.timeout(10000) });
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          const bytes = new Uint8Array(arrayBuf);
          if (bytes.length > 100) {
            const fileName = `sticker_${Date.now()}_${key.id.replace(/[^a-zA-Z0-9]/g, '')}.webp`;
            const { error: uploadErr } = await supabase.storage.from('whatsapp-media').upload(`stickers/${fileName}`, bytes, { contentType: 'image/webp', cacheControl: '31536000' });
            if (!uploadErr) { const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(`stickers/${fileName}`); mediaUrl = urlData.publicUrl; }
          }
        }
      } catch (dlErr) { console.error('[STICKER] mediaUrl download error:', dlErr); }
    }
  }

  if (!mediaUrl) {
    try {
      const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
      const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
      if (evolutionUrl && evolutionKey) {
        const apiUrl = `${evolutionUrl.replace(/\/+$/, '')}/chat/getBase64FromMediaMessage/${instance}`;
        const resp = await fetch(apiUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
          body: JSON.stringify({ message: { key: data.key, message: data.message }, convertToMp4: false }),
          signal: AbortSignal.timeout(15000),
        });
        if (resp.ok) {
          const result = await resp.json();
          const b64 = (result.base64 as string) || (result.data as string) || (result.media as string);
          if (b64) mediaUrl = await uploadBase64Sticker(b64);
        } else { console.error(`[STICKER] API error (${resp.status}):`, (await resp.text()).substring(0, 300)); }
      }
    } catch (apiErr) { console.error('[STICKER] API fetch error:', apiErr); }
  }

  // Auto-save sticker to library
  if (mediaUrl) {
    try {
      const { data: existing } = await supabase.from('stickers').select('id').eq('image_url', mediaUrl).maybeSingle();
      if (!existing) {
        let category = 'recebidas';
        try {
          const classifyResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/classify-sticker`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
            body: JSON.stringify({ image_url: mediaUrl }), signal: AbortSignal.timeout(20000),
          });
          if (classifyResp.ok) { const classifyResult = await classifyResp.json(); category = classifyResult.category || 'recebidas'; console.log(`[STICKER] AI classified as: ${category}`); }
        } catch (classifyErr) { console.error('[STICKER] Classification failed, using default:', classifyErr); }
        await supabase.from('stickers').insert({ name: `Recebida ${new Date().toLocaleDateString('pt-BR')}`, image_url: mediaUrl, category, is_favorite: false, use_count: 0 });
      }
    } catch (saveErr) { console.error('[STICKER] Failed to auto-save to library:', saveErr); }
  }

  return mediaUrl;
}

// deno-lint-ignore no-explicit-any
async function handleAudioTranscription(supabase: any, contactId: string, messageId: string, mediaUrl: string, supabaseUrl: string, supabaseServiceKey: string) {
  const { data: globalSetting } = await supabase.from('global_settings')
    .select('value').eq('key', 'auto_transcription_enabled').maybeSingle();
  if (globalSetting?.value === 'false') return;

  await supabase.from('messages').update({ transcription_status: 'processing' }).eq('id', messageId);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-transcribe-audio`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
      body: JSON.stringify({ audioUrl: mediaUrl, messageId }),
    });

    if (response.ok) {
      const result = await response.json();
      await supabase.from('messages').update({ transcription: result.text, transcription_status: 'completed' }).eq('id', messageId);
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
