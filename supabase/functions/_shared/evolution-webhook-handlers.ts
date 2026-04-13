// Event handlers extracted from evolution-webhook/index.ts
// Handles: connection, status, contacts, presence, chats, labels, calls, bulk sets, edits

import {
  isRecord, normalizePhone, toEventRecords, shouldUpdateStatus,
  getConnectionByInstance, getContactByPhone, fetchProfilePicFromApi, persistProfilePicture,
} from "./evolution-helpers.ts";

// deno-lint-ignore no-explicit-any
export async function handleConnectionUpdate(supabase: any, instance: string, baseData: Record<string, unknown>) {
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
  }

  if (status === 'connected' && prevConn?.status !== 'connected') {
    await supabase.from('warroom_alerts').insert({
      alert_type: 'info',
      title: `🟢 Conexão ${instance} restaurada`,
      message: `A instância ${instance} reconectou com sucesso ao WhatsApp.`,
      source: 'evolution-webhook',
    });
  }
}

// deno-lint-ignore no-explicit-any
export async function handleSendMessage(supabase: any, instance: string, data: unknown, baseData: Record<string, unknown>) {
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
export async function handleMessagesUpdate(supabase: any, instance: string, data: unknown, baseData: Record<string, unknown>) {
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

        await supabase.from('messages').insert({
          content: '[Mensagem recebida]', message_type: 'text', sender: 'contact',
          external_id: key.id, status: newStatus, status_updated_at: now, created_at: now,
          contact_id: contactId, whatsapp_connection_id: connection?.id ?? null,
        });
      }
    }
  }
}

// deno-lint-ignore no-explicit-any
export async function handleMessagesDelete(supabase: any, instance: string, data: unknown, baseData: Record<string, unknown>) {
  const connection = await getConnectionByInstance(supabase, instance);
  for (const entry of toEventRecords(data, ['messages', 'keys'])) {
    const keySource = isRecord(entry.key)
      ? entry.key : (typeof entry.id === 'string' ? entry : null) ?? (isRecord(baseData.key) ? baseData.key : null);
    const key = keySource as { id?: string; remoteJid?: string } | null;
    if (!key?.id) continue;

    const now = new Date().toISOString();
    const { data: updatedMessages } = await supabase.from('messages')
      .update({ is_deleted: true, status: 'deleted', status_updated_at: now })
      .eq('external_id', key.id).select('id');

    if (!updatedMessages?.length) {
      let contactId: string | null = null;
      if (connection?.id && key.remoteJid) {
        const phone = normalizePhone(key.remoteJid);
        if (phone) { const contact = await getContactByPhone(supabase, phone, connection.id); contactId = contact?.id ?? null; }
      }

      await supabase.from('messages').insert({
        content: '[Mensagem apagada]', message_type: 'text', sender: 'contact',
        external_id: key.id, status: 'deleted', is_deleted: true, status_updated_at: now,
        created_at: now, contact_id: contactId, whatsapp_connection_id: connection?.id ?? null,
      });
    }
    console.log(`Message deleted: ${key.id}`);
  }
}

// deno-lint-ignore no-explicit-any
export async function handleContactsUpsert(supabase: any, instance: string, data: unknown) {
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
    }
  }
}

// deno-lint-ignore no-explicit-any
export async function handlePresenceUpdate(supabase: any, instance: string, data: unknown) {
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
        }
      }
    }
  }
}

// deno-lint-ignore no-explicit-any
export async function handleChatsUpdate(supabase: any, instance: string, data: unknown) {
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
  }
}

// deno-lint-ignore no-explicit-any
export async function handleLabelsEdit(supabase: any, instance: string, data: unknown) {
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
  } else {
    const tagName = labelName || `Label ${labelId}`;
    const { data: existingTag } = await supabase.from('tags').select('id').ilike('name', `wa:${labelId}:%`).maybeSingle();
    if (existingTag) {
      await supabase.from('tags').update({ name: `wa:${labelId}:${tagName}`, color: labelColor || '#3B82F6' }).eq('id', existingTag.id);
    } else {
      await supabase.from('tags').insert({ name: `wa:${labelId}:${tagName}`, color: labelColor || '#3B82F6' });
    }
  }
}

// deno-lint-ignore no-explicit-any
export async function handleLabelsAssociation(supabase: any, instance: string, data: unknown) {
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
    } else {
      const { data: existing } = await supabase.from('contact_tags').select('id')
        .eq('contact_id', contact.id).eq('tag_id', tag.id).maybeSingle();
      if (!existing) {
        await supabase.from('contact_tags').insert({ contact_id: contact.id, tag_id: tag.id });
      }
    }
  }
}

// deno-lint-ignore no-explicit-any
export async function handleCallEvent(supabase: any, instance: string, data: unknown) {
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
    if (agentProfile?.user_id) {
      await supabase.from('notifications').insert({
        user_id: agentProfile.user_id, type: 'incoming_call',
        title: isVideo ? '📹 Chamada de vídeo recebida' : '📞 Chamada de voz recebida',
        message: `${contact.name || phone} está ligando para você`,
        metadata: { contact_id: contact.id, phone, is_video: isVideo, call_status: callStatus, whatsapp_connection_id: connection.id, agent_profile_id: agentId },
      });
    }
  }
}

// deno-lint-ignore no-explicit-any
export async function handleChatsDelete(supabase: any, instance: string, data: unknown) {
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
      await supabase.from('messages')
        .update({ is_deleted: true, status: 'deleted', status_updated_at: now })
        .eq('contact_id', contact.id);
    }
  }
}

// deno-lint-ignore no-explicit-any
export async function handleApplicationStartup(supabase: any, instance: string) {
  console.log(`Application startup event from instance: ${instance}`);
  const { data: conn } = await supabase.from('whatsapp_connections')
    .select('id, status').eq('instance_id', instance).maybeSingle();
  if (conn && conn.status === 'disconnected') {
    await supabase.from('whatsapp_connections')
      .update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', conn.id);
  }
}

// deno-lint-ignore no-explicit-any
export async function handleMessagesSet(supabase: any, instance: string, data: unknown) {
  const messages = toEventRecords(data, ['messages']);
  if (messages.length === 0) return;

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
export async function handleContactsSet(supabase: any, instance: string, data: unknown) {
  const contacts = toEventRecords(data, ['contacts']);
  if (contacts.length === 0) return;

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
    if (insertErr) { skipped++; continue; }
    synced++;
  }
  console.log(`contacts.set: synced ${synced}, skipped ${skipped} for ${instance}`);
}

// deno-lint-ignore no-explicit-any
export async function handleChatsSet(supabase: any, instance: string, data: unknown) {
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
export async function handleMessagesEdited(supabase: any, data: unknown, baseData: Record<string, unknown>) {
  for (const entry of toEventRecords(data, ['messages'])) {
    const keySource = isRecord(entry.key) ? entry.key : isRecord(baseData.key) ? baseData.key : null;
    const key = keySource as { id?: string } | null;
    if (!key?.id) continue;

    const msg = (entry.message || baseData.message) as Record<string, unknown> | undefined;
    const editedContent = (msg?.conversation as string) ||
      ((msg?.extendedTextMessage as Record<string, unknown>)?.text as string) ||
      ((entry.editedMessage as Record<string, unknown>)?.conversation as string) || null;

    if (!editedContent) continue;

    const { data: existing } = await supabase.from('messages').select('id').eq('external_id', key.id).maybeSingle();
    if (existing) {
      await supabase.from('messages').update({ content: editedContent, is_edited: true, updated_at: new Date().toISOString() }).eq('id', existing.id);
      console.log(`Message edited: ${key.id}`);
    }
  }
}
