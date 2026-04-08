import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CORS headers - built dynamically per request for origin validation
const ALLOWED_ORIGINS = [
  'https://pronto-talk-suite.lovable.app',
  'https://id-preview--1d419c34-35ac-4a71-96a5-146ca1b3ebf2.lovable.app',
];

function getCorsHeaders(req?: Request) {
  const origin = req?.headers?.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

const corsHeaders = getCorsHeaders();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const evolutionApiUrl = (Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/+$/, '');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!evolutionApiUrl || !evolutionApiKey) {
    return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'sync-contacts';
    const instanceName = body.instanceName || 'wpp2';
    const page = body.page || 1;
    const offset = body.offset || 100;

    // =============================================
    // 1. SYNC CONTACTS FROM EVOLUTION API
    // =============================================
    if (action === 'sync-contacts') {
      console.log(`[Sync] Fetching contacts from instance ${instanceName}`);

      // Fetch contacts from Evolution API (POST with where clause)
      const contactsResponse = await fetch(
        `${evolutionApiUrl}/chat/findContacts/${instanceName}`,
        { 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
          body: JSON.stringify({ where: {} }),
        }
      );

      if (!contactsResponse.ok) {
        const errText = await contactsResponse.text();
        throw new Error(`Evolution API error [${contactsResponse.status}]: ${errText}`);
      }

      const contacts = await contactsResponse.json();
      console.log(`[Sync] Fetched ${Array.isArray(contacts) ? contacts.length : 0} contacts`);

      if (!Array.isArray(contacts) || contacts.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'No more contacts to sync',
          synced: 0,
          page 
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get or create the WhatsApp connection for this instance
      let { data: connection } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('instance_id', instanceName)
        .maybeSingle();

      if (!connection) {
        const { data: newConn } = await supabase
          .from('whatsapp_connections')
          .insert({
            name: instanceName,
            instance_id: instanceName,
            status: 'connected',
            phone_number: '',
          })
          .select('id')
          .single();
        connection = newConn;
      }

      if (!connection) {
        throw new Error('Could not create/find WhatsApp connection');
      }

      let synced = 0;
      let skipped = 0;

      for (const contact of contacts) {
        // Skip groups and broadcast
        const remoteJid = contact.id || contact.remoteJid || '';
        if (remoteJid.includes('@g.us') || remoteJid.includes('@broadcast') || !remoteJid.includes('@')) {
          skipped++;
          continue;
        }

        const phone = remoteJid.replace('@s.whatsapp.net', '');
        if (!phone || phone.length < 6) {
          skipped++;
          continue;
        }

        const name = contact.pushName || contact.name || contact.verifiedName || phone;
        const profilePictureUrl = contact.profilePictureUrl || null;

        // Upsert contact
        const { error: upsertError } = await supabase
          .from('contacts')
          .upsert({
            phone,
            name,
            avatar_url: profilePictureUrl,
            whatsapp_connection_id: connection.id,
          }, {
            onConflict: 'phone,whatsapp_connection_id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          // If unique constraint fails, try update
          const { error: updateError } = await supabase
            .from('contacts')
            .update({
              name,
              avatar_url: profilePictureUrl,
            })
            .eq('phone', phone)
            .eq('whatsapp_connection_id', connection.id);

          if (updateError) {
            console.warn(`[Sync] Failed to upsert contact ${phone}:`, updateError.message);
            skipped++;
            continue;
          }
        }

        synced++;
      }

      console.log(`[Sync] Page ${page}: synced ${synced}, skipped ${skipped}`);

      return new Response(JSON.stringify({
        success: true,
        synced,
        skipped,
        page,
        totalFetched: contacts.length,
        hasMore: contacts.length >= offset,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =============================================
    // 2. SYNC RECENT MESSAGES
    // =============================================
    if (action === 'sync-messages') {
      const contactPhone = body.contactPhone;
      
      if (!contactPhone) {
        throw new Error('contactPhone is required');
      }

      console.log(`[Sync] Fetching messages for ${contactPhone} from ${instanceName}`);

      const remoteJid = contactPhone.includes('@') ? contactPhone : `${contactPhone}@s.whatsapp.net`;
      
      const messagesResponse = await fetch(
        `${evolutionApiUrl}/chat/findMessages/${instanceName}`,
        { 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
          body: JSON.stringify({
            where: { key: { remoteJid } },
            page: 1,
            offset: 50,
          }),
        }
      );

      if (!messagesResponse.ok) {
        const errText = await messagesResponse.text();
        throw new Error(`Evolution API error [${messagesResponse.status}]: ${errText}`);
      }

      const messagesData = await messagesResponse.json();
      const messages = Array.isArray(messagesData) ? messagesData : messagesData.messages || [];
      
      console.log(`[Sync] Fetched ${messages.length} messages for ${contactPhone}`);

      // Find connection and contact
      const { data: connection2 } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('instance_id', instanceName)
        .maybeSingle();

      if (!connection2) {
        throw new Error('WhatsApp connection not found');
      }

      const phone = contactPhone.replace('@s.whatsapp.net', '');
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', phone)
        .eq('whatsapp_connection_id', connection2.id)
        .maybeSingle();

      if (!contact) {
        throw new Error(`Contact not found for phone ${phone}`);
      }

      let synced = 0;
      for (const msg of messages) {
        const key = msg.key || {};
        const externalId = key.id;
        if (!externalId) continue;

        // Check if already exists
        const { data: existing } = await supabase
          .from('messages')
          .select('id')
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) continue;

        // Parse message content
        const messageObj = msg.message || {};
        let content = '';
        let messageType = 'text';
        let mediaUrl: string | null = null;

        if (messageObj.conversation) {
          content = messageObj.conversation;
        } else if (messageObj.extendedTextMessage?.text) {
          content = messageObj.extendedTextMessage.text;
        } else if (messageObj.imageMessage) {
          messageType = 'image';
          content = messageObj.imageMessage.caption || '[Imagem]';
        } else if (messageObj.videoMessage) {
          messageType = 'video';
          content = messageObj.videoMessage.caption || '[Vídeo]';
        } else if (messageObj.audioMessage) {
          messageType = 'audio';
          content = '[Áudio]';
        } else if (messageObj.documentMessage) {
          messageType = 'document';
          content = messageObj.documentMessage.fileName || '[Documento]';
        } else if (messageObj.stickerMessage) {
          messageType = 'sticker';
          content = '[Sticker]';
        } else if (messageObj.reactionMessage) {
          continue; // Skip reactions
        } else {
          content = '[Mensagem não suportada]';
        }

        const sender = key.fromMe ? 'agent' : 'contact';
        const createdAt = msg.messageTimestamp 
          ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString();

        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            contact_id: contact.id,
            whatsapp_connection_id: connection2.id,
            content,
            message_type: messageType,
            media_url: mediaUrl,
            sender,
            external_id: externalId,
            is_read: true,
            status: 'read',
            created_at: createdAt,
          });

        if (!insertError) synced++;
      }

      return new Response(JSON.stringify({
        success: true,
        synced,
        totalFetched: messages.length,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =============================================
    // 3. SETUP WEBHOOK
    // =============================================
    if (action === 'setup-webhook') {
      const webhookUrl = body.webhookUrl || `${supabaseUrl}/functions/v1/evolution-webhook`;

      console.log(`[Sync] Setting up webhook for ${instanceName}: ${webhookUrl}`);

      const webhookResponse = await fetch(
        `${evolutionApiUrl}/webhook/set/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            webhookByEvents: true,
            webhookBase64: false,
            events: [
              'APPLICATION_STARTUP', 'QRCODE_UPDATED', 'CONNECTION_UPDATE',
              'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE',
              'SEND_MESSAGE', 'CONTACTS_UPSERT', 'CONTACTS_UPDATE',
              'PRESENCE_UPDATE', 'CHATS_UPSERT', 'CHATS_UPDATE',
              'GROUPS_UPSERT', 'GROUP_UPDATE', 'GROUP_PARTICIPANTS_UPDATE',
              'LABELS_EDIT', 'LABELS_ASSOCIATION', 'CALL',
            ],
          }),
        }
      );

      const webhookData = await webhookResponse.json();

      return new Response(JSON.stringify({
        success: webhookResponse.ok,
        webhook: webhookData,
      }), {
        status: webhookResponse.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =============================================
    // 4. CLEANUP MOCK DATA
    // =============================================
    if (action === 'cleanup-mock') {
      console.log('[Sync] Cleaning up mock data...');

      // Delete mock messages (those linked to mock contacts)
      const { data: mockContacts } = await supabase
        .from('contacts')
        .select('id')
        .like('id', 'c1000001-%');

      if (mockContacts && mockContacts.length > 0) {
        const mockIds = mockContacts.map(c => c.id);

        // Delete messages for mock contacts
        const { error: msgDelErr } = await supabase
          .from('messages')
          .delete()
          .in('contact_id', mockIds);

        // Delete mock contact tags
        const { error: tagDelErr } = await supabase
          .from('contact_tags')
          .delete()
          .in('contact_id', mockIds);

        // Delete mock contact notes
        const { error: noteDelErr } = await supabase
          .from('contact_notes')
          .delete()
          .in('contact_id', mockIds);

        // Delete mock contacts
        const { error: contactDelErr } = await supabase
          .from('contacts')
          .delete()
          .in('id', mockIds);

        console.log('[Sync] Mock data cleanup complete', {
          msgDelErr, tagDelErr, noteDelErr, contactDelErr,
          mockContactsRemoved: mockIds.length,
        });

        return new Response(JSON.stringify({
          success: true,
          removed: mockIds.length,
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        removed: 0,
        message: 'No mock data found',
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =============================================
    // 5. FULL SYNC (cleanup + import + webhook)
    // =============================================
    if (action === 'full-sync') {
      const results: Record<string, unknown> = {};

      // Step 1: Cleanup mock data
      console.log('[FullSync] Step 1: Cleaning mock data...');
      const { data: mockContacts } = await supabase
        .from('contacts')
        .select('id')
        .like('id', 'c1000001-%');

      if (mockContacts && mockContacts.length > 0) {
        const mockIds = mockContacts.map(c => c.id);
        await supabase.from('messages').delete().in('contact_id', mockIds);
        await supabase.from('contact_tags').delete().in('contact_id', mockIds);
        await supabase.from('contact_notes').delete().in('contact_id', mockIds);
        await supabase.from('contacts').delete().in('id', mockIds);
        results.cleanup = { removed: mockIds.length };
      } else {
        results.cleanup = { removed: 0 };
      }

      // Step 2: Get or create connection
      let { data: conn } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('instance_id', instanceName)
        .maybeSingle();

      if (!conn) {
        const { data: newConn } = await supabase
          .from('whatsapp_connections')
          .insert({
            name: instanceName,
            instance_id: instanceName,
            status: 'connected',
            phone_number: '',
          })
          .select('id')
          .single();
        conn = newConn;
      }

      // Step 3: Import contacts from Evolution API
      let totalSynced = 0;
      let totalSkipped = 0;
      try {
        const contactsResponse = await fetch(
          `${evolutionApiUrl}/chat/findContacts/${instanceName}`,
          { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
            body: JSON.stringify({ where: {} }),
          }
        );

        if (contactsResponse.ok) {
          const contactsList = await contactsResponse.json();
          console.log(`[FullSync] Fetched ${contactsList.length} contacts`);

          const validContacts: { phone: string; name: string; avatar_url: string | null; whatsapp_connection_id: string }[] = [];
          
          for (const c of contactsList) {
            const jid = c.remoteJid || '';
            // Only import @s.whatsapp.net contacts (skip @lid, @g.us, @broadcast)
            if (!jid.endsWith('@s.whatsapp.net')) { totalSkipped++; continue; }
            if (c.isGroup) { totalSkipped++; continue; }

            const phone = jid.replace('@s.whatsapp.net', '');
            if (!phone || phone.length < 6) { totalSkipped++; continue; }

            const name = (c.pushName && c.pushName.trim()) || phone;
            validContacts.push({
              phone, name,
              avatar_url: c.profilePicUrl || null,
              whatsapp_connection_id: conn!.id,
            });
          }

          console.log(`[FullSync] ${validContacts.length} valid, ${totalSkipped} skipped`);

          // Insert up to 500 to avoid timeout
          const limit = Math.min(validContacts.length, 500);
          for (let i = 0; i < limit; i++) {
            const ct = validContacts[i];
            const { error: insErr } = await supabase.from('contacts').insert(ct);
            if (!insErr) {
              totalSynced++;
            } else if (insErr.code === '23505') {
              await supabase.from('contacts')
                .update({ name: ct.name, avatar_url: ct.avatar_url })
                .eq('phone', ct.phone)
                .eq('whatsapp_connection_id', ct.whatsapp_connection_id);
              totalSynced++;
            }
          }
        } else {
          console.error(`[FullSync] findContacts error:`, await contactsResponse.text());
        }
      } catch (e) {
        console.warn('[FullSync] Contact sync error:', e);
      }
      results.contacts = { synced: totalSynced, skipped: totalSkipped };

      // Step 4: Setup webhook
      const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;
      try {
        const webhookResponse = await fetch(
          `${evolutionApiUrl}/webhook/set/${instanceName}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey,
            },
            body: JSON.stringify({
              enabled: true,
              url: webhookUrl,
              webhookByEvents: true,
              webhookBase64: false,
              events: [
                'APPLICATION_STARTUP', 'QRCODE_UPDATED', 'CONNECTION_UPDATE',
                'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE',
                'SEND_MESSAGE', 'CONTACTS_UPSERT', 'CONTACTS_UPDATE',
                'PRESENCE_UPDATE', 'CHATS_UPSERT', 'CHATS_UPDATE',
                'GROUPS_UPSERT', 'GROUP_UPDATE', 'GROUP_PARTICIPANTS_UPDATE',
                'LABELS_EDIT', 'LABELS_ASSOCIATION', 'CALL',
              ],
            }),
          }
        );
        results.webhook = { success: webhookResponse.ok, url: webhookUrl };
      } catch (e) {
        results.webhook = { success: false, error: String(e) };
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =============================================
    // 6. SYNC ALL MESSAGES (bulk history sync)
    // =============================================
    if (action === 'sync-all-messages') {
      console.log(`[SyncAll] Starting bulk message sync for instance ${instanceName}`);

      // Find connection
      const { data: conn } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('instance_id', instanceName)
        .maybeSingle();

      if (!conn) {
        throw new Error('WhatsApp connection not found for instance ' + instanceName);
      }

      // Get all contacts for this connection
      const { data: allContacts, error: contactsErr } = await supabase
        .from('contacts')
        .select('id, phone')
        .eq('whatsapp_connection_id', conn.id)
        .order('updated_at', { ascending: false })
        .limit(500);

      if (contactsErr) throw new Error('Failed to fetch contacts: ' + contactsErr.message);
      if (!allContacts || allContacts.length === 0) {
        return new Response(JSON.stringify({ success: true, message: 'No contacts found', totalSynced: 0 }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[SyncAll] Processing ${allContacts.length} contacts`);

      let totalSynced = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      const batchSize = 20;
      const messagesPerContact = body.messagesPerContact || 200;

      for (let batchStart = 0; batchStart < allContacts.length; batchStart += batchSize) {
        const batch = allContacts.slice(batchStart, batchStart + batchSize);

        for (const contact of batch) {
          try {
            const remoteJid = `${contact.phone}@s.whatsapp.net`;

            const msgResponse = await fetch(
              `${evolutionApiUrl}/chat/findMessages/${instanceName}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
                body: JSON.stringify({
                  where: { key: { remoteJid } },
                  page: 1,
                  offset: messagesPerContact,
                }),
              }
            );

            if (!msgResponse.ok) {
              const errText = await msgResponse.text();
              console.warn(`[SyncAll] API error for ${contact.phone}: ${errText}`);
              totalErrors++;
              continue;
            }

            const msgData = await msgResponse.json();
            const messages = Array.isArray(msgData) ? msgData : msgData.messages || [];

            for (const msg of messages) {
              const key = msg.key || {};
              const externalId = key.id;
              if (!externalId) continue;

              // Skip if already exists
              const { data: existing } = await supabase
                .from('messages')
                .select('id')
                .eq('external_id', externalId)
                .maybeSingle();

              if (existing) { totalSkipped++; continue; }

              // Parse message
              const messageObj = msg.message || {};
              let content = '';
              let messageType = 'text';
              let mediaUrl: string | null = null;

              if (messageObj.conversation) {
                content = messageObj.conversation;
              } else if (messageObj.extendedTextMessage?.text) {
                content = messageObj.extendedTextMessage.text;
              } else if (messageObj.imageMessage) {
                messageType = 'image';
                content = messageObj.imageMessage.caption || '[Imagem]';
              } else if (messageObj.videoMessage) {
                messageType = 'video';
                content = messageObj.videoMessage.caption || '[Vídeo]';
              } else if (messageObj.audioMessage) {
                messageType = 'audio';
                content = '[Áudio]';
              } else if (messageObj.documentMessage) {
                messageType = 'document';
                content = messageObj.documentMessage.fileName || '[Documento]';
              } else if (messageObj.stickerMessage) {
                messageType = 'sticker';
                content = '[Sticker]';
              } else if (messageObj.reactionMessage) {
                continue;
              } else {
                content = '[Mensagem não suportada]';
              }

              const sender = key.fromMe ? 'agent' : 'contact';
              const createdAt = msg.messageTimestamp
                ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
                : new Date().toISOString();

              const { error: insertError } = await supabase
                .from('messages')
                .insert({
                  contact_id: contact.id,
                  whatsapp_connection_id: conn.id,
                  content,
                  message_type: messageType,
                  media_url: mediaUrl,
                  sender,
                  external_id: externalId,
                  is_read: true,
                  status: 'read',
                  created_at: createdAt,
                });

              if (!insertError) totalSynced++;
            }
          } catch (e) {
            console.warn(`[SyncAll] Error syncing ${contact.phone}:`, e);
            totalErrors++;
          }
        }
      }

      console.log(`[SyncAll] Done: synced=${totalSynced}, skipped=${totalSkipped}, errors=${totalErrors}`);

      return new Response(JSON.stringify({
        success: true,
        totalSynced,
        totalSkipped,
        totalErrors,
        totalContacts: allContacts.length,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action', validActions: ['sync-contacts', 'sync-messages', 'sync-all-messages', 'setup-webhook', 'cleanup-mock', 'full-sync'] }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Sync] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
