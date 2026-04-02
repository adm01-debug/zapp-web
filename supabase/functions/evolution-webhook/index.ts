import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { checkIdempotency, completeIdempotency, failIdempotency, generateIdempotencyKey } from '../_shared/idempotency.ts';
import { enqueueToDeadLetter } from '../_shared/deadLetterQueue.ts';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { serverError } from '../_shared/errorResponse.ts';
import { ValidationError, validationErrorResponse } from '../_shared/validation.ts';

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

const logger = createStructuredLogger('evolution-webhook');

serve(async (req) => {
  const requestTimer = logger.startTimer('request');
  logger.setRequestContext(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'evolution-webhook', getCorsHeaders(req));
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: getCorsHeaders(req) });
  }

  // Verify webhook authenticity via API key
  const webhookApiKey = req.headers.get('apikey') || req.headers.get('x-api-key') || '';
  const expectedApiKey = Deno.env.get('EVOLUTION_API_KEY') || '';
  if (expectedApiKey && webhookApiKey !== expectedApiKey) {
    logger.warn('Invalid webhook API key received');
    return new Response(
      JSON.stringify({ error: 'Unauthorized webhook request' }),
      { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }

  let idempotencyKey: string | null = null;
  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();

    // Validate required webhook fields
    if (!payload || typeof payload !== 'object') {
      throw new ValidationError('Invalid webhook payload: expected object');
    }
    if (!payload.event || typeof payload.event !== 'string') {
      throw new ValidationError('Invalid webhook payload: missing event field');
    }
    if (!payload.instance || typeof payload.instance !== 'string') {
      throw new ValidationError('Invalid webhook payload: missing instance field');
    }

    logger.info('Webhook received', { event: payload.event, instance: payload.instance });

    const { event, instance, data } = payload;

    // Generate idempotency key from event data
    const messageKey = (data.key as Record<string, string>)?.id || '';
    idempotencyKey = await generateIdempotencyKey(instance, event, messageKey, payload.date_time || '');

    const { isDuplicate, cachedResponse } = await checkIdempotency(supabase, idempotencyKey, 'evolution-webhook');
    if (isDuplicate && cachedResponse) {
      logger.info('Duplicate webhook detected, returning cached response');
      return new Response(JSON.stringify(cachedResponse.body), {
        status: cachedResponse.status,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

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
          // Upsert contact to prevent race condition duplicates
          const upsertData: Record<string, unknown> = {
            phone,
            name: pushName,
            whatsapp_connection_id: connection.id,
            updated_at: new Date().toISOString(),
          };
          if (profilePicUrl) upsertData.avatar_url = profilePicUrl;

          await supabase.from('contacts').upsert(upsertData, {
            onConflict: 'phone,whatsapp_connection_id',
            ignoreDuplicates: false,
          });
          console.log(`Contact synced: ${phone} (${pushName})`);
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
          // Upsert contact to prevent race condition duplicates
          const { data: upsertedCallContact } = await supabase
            .from('contacts')
            .upsert({ phone, name: phone, whatsapp_connection_id: connection.id, updated_at: new Date().toISOString() }, {
              onConflict: 'phone,whatsapp_connection_id',
              ignoreDuplicates: false,
            })
            .select('id')
            .single();

          let contact = upsertedCallContact;
          if (!contact) {
            const { data: existing } = await supabase.from('contacts').select('id').eq('phone', phone).eq('whatsapp_connection_id', connection.id).single();
            contact = existing;
          }

          if (contact) {
            // Map Evolution API call statuses to our schema
            const statusMap: Record<string, string> = {
              'ringing': 'ringing',
              'offer': 'ringing',
              'accept': 'answered',
              'reject': 'missed',
              'timeout': 'missed',
              'end': 'ended',
            };
            const mappedStatus = statusMap[callStatus] || callStatus || 'ringing';

            if (mappedStatus === 'ringing') {
              // New incoming call - create record
              await supabase.from('calls').insert({
                contact_id: contact.id,
                whatsapp_connection_id: connection.id,
                direction: 'inbound',
                status: 'ringing',
                started_at: new Date().toISOString(),
                notes: isVideo ? 'Chamada de vídeo' : 'Chamada de voz',
              });
              console.log(`Call registered from ${phone} (${isVideo ? 'video' : 'voice'})`);
            } else {
              // Status update — find latest ringing call from this contact and update
              const { data: existingCall } = await supabase
                .from('calls')
                .select('id')
                .eq('contact_id', contact.id)
                .eq('whatsapp_connection_id', connection.id)
                .eq('direction', 'inbound')
                .in('status', ['ringing', 'answered'])
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (existingCall) {
                const updateData: Record<string, unknown> = { status: mappedStatus };
                if (mappedStatus === 'answered') {
                  updateData.answered_at = new Date().toISOString();
                }
                if (mappedStatus === 'ended' || mappedStatus === 'missed') {
                  updateData.ended_at = new Date().toISOString();
                }
                await supabase.from('calls').update(updateData).eq('id', existingCall.id);
                console.log(`Call ${existingCall.id} updated to ${mappedStatus}`);
              }
            }
          }
        }
      }
    }

    const responseBody = { success: true };
    if (supabase && idempotencyKey) {
      await completeIdempotency(supabase, idempotencyKey, 200, responseBody);
    }

    requestTimer.end({ event: payload.event, instance: payload.instance });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      logger.warn('Webhook validation failed', { error: (error as Error).message });
      return validationErrorResponse(error, getCorsHeaders(req));
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack || '' : '';
    logger.error('Evolution webhook error', { error: message });
    requestTimer.end({ error: message });

    // Mark idempotency as failed so it can be retried
    if (supabase && idempotencyKey) {
      await failIdempotency(supabase, idempotencyKey);
    }

    // Enqueue to dead letter queue for retry
    if (supabase) {
      try {
        await enqueueToDeadLetter(supabase, {
          sourceFunction: 'evolution-webhook',
          eventType: 'unknown',
          payload: { error: message },
          errorMessage: message,
          errorStack: stack,
        });
      } catch (dlqError) {
        console.error('Failed to enqueue to DLQ:', dlqError);
      }
    }

    return serverError('Webhook processing error', getCorsHeaders(req));
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
    mediaUrl = (message.stickerMessage as Record<string, unknown>).url as string || null;
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

  // Upsert contact to prevent race condition duplicates
  const { data: upsertedContact } = await supabase
    .from('contacts')
    .upsert({
      phone,
      name: (data.pushName as string) || phone,
      whatsapp_connection_id: connection.id,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'phone,whatsapp_connection_id',
      ignoreDuplicates: false,
    })
    .select('id')
    .single();

  // Fallback: if upsert doesn't return (ignoreDuplicates edge case), fetch existing
  let contact = upsertedContact;
  if (!contact) {
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .eq('whatsapp_connection_id', connection.id)
      .single();
    contact = existingContact;
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
