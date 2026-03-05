import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
      console.log(`[Sync] Fetching contacts from instance ${instanceName}, page ${page}, offset ${offset}`);

      // Fetch contacts from Evolution API
      const contactsResponse = await fetch(
        `${evolutionApiUrl}/chat/findContacts/${instanceName}?page=${page}&offset=${offset}`,
        { method: 'GET', headers: { 'apikey': evolutionApiKey } }
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
        `${evolutionApiUrl}/chat/findMessages/${instanceName}?remoteJid=${remoteJid}&page=1&offset=50`,
        { method: 'GET', headers: { 'apikey': evolutionApiKey } }
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
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED',
              'CONTACTS_UPSERT',
              'CONTACTS_UPDATE',
              'PRESENCE_UPDATE',
              'CALL',
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

      // Step 3: Import contacts (first 3 pages = 300 contacts)
      let totalSynced = 0;
      for (let p = 1; p <= 3; p++) {
        try {
          const contactsResponse = await fetch(
            `${evolutionApiUrl}/chat/findContacts/${instanceName}?page=${p}&offset=100`,
            { method: 'GET', headers: { 'apikey': evolutionApiKey } }
          );

          if (!contactsResponse.ok) break;
          const contactsData = await contactsResponse.json();
          if (!Array.isArray(contactsData) || contactsData.length === 0) break;

          for (const contact of contactsData) {
            const remoteJid = contact.id || contact.remoteJid || '';
            if (remoteJid.includes('@g.us') || remoteJid.includes('@broadcast') || !remoteJid.includes('@')) continue;

            const phone = remoteJid.replace('@s.whatsapp.net', '');
            if (!phone || phone.length < 6) continue;

            const name = contact.pushName || contact.name || contact.verifiedName || phone;

            // Simple insert, ignore duplicates
            await supabase
              .from('contacts')
              .insert({
                phone,
                name,
                avatar_url: contact.profilePictureUrl || null,
                whatsapp_connection_id: conn!.id,
              })
              .select('id')
              .maybeSingle();

            totalSynced++;
          }
        } catch (e) {
          console.warn(`[FullSync] Page ${p} error:`, e);
          break;
        }
      }
      results.contacts = { synced: totalSynced };

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
                'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE',
                'QRCODE_UPDATED', 'CONTACTS_UPSERT', 'PRESENCE_UPDATE',
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

    return new Response(JSON.stringify({ error: 'Unknown action', validActions: ['sync-contacts', 'sync-messages', 'setup-webhook', 'cleanup-mock', 'full-sync'] }), {
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
