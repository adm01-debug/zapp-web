import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================
// EVOLUTION API v2 — FULL INTEGRATION (60+ endpoints)
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const evolutionApiUrl = (Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/+$/, '');
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

  if (!evolutionApiUrl || !evolutionApiKey) {
    return new Response(
      JSON.stringify({ 
        error: 'Evolution API not configured',
        message: 'Please configure EVOLUTION_API_URL and EVOLUTION_API_KEY secrets'
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // action is the last segment: e.g. "create-instance", "send-text", etc.
  const action = pathParts[pathParts.length - 1];

  const json = async () => {
    try { return await req.json(); } catch { return {}; }
  };

  // Helper to proxy requests to Evolution API
  const proxy = async (
    path: string,
    method: string = 'POST',
    body?: unknown,
    instanceInPath?: string
  ): Promise<Response> => {
    const fullUrl = instanceInPath
      ? `${evolutionApiUrl}${path}/${instanceInPath}`
      : `${evolutionApiUrl}${path}`;

    const opts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
    };
    if (body && method !== 'GET') {
      opts.body = JSON.stringify(body);
    }

    console.log(`[Evolution API] ${method} ${fullUrl}`);
    const response = await fetch(fullUrl, opts);
    
    // Safely handle non-JSON responses
    let data: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { rawResponse: text, status: response.status };
      }
    }

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  };

  try {
    const body = await json();
    const instance = body.instanceName || body.instance;

    // =============================================
    // 1. INSTANCE MANAGEMENT
    // =============================================

    // POST /instance/create
    if (action === 'create-instance') {
      const response = await proxy('/instance/create', 'POST', {
        instanceName: instance,
        qrcode: body.qrcode ?? true,
        integration: body.integration || 'WHATSAPP-BAILEYS',
        token: body.token,
        number: body.number,
        businessId: body.businessId,
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        webhook: body.webhook,
        chatwoot: body.chatwoot,
        typebot: body.typebot,
        proxy: body.proxy,
      });
      return response;
    }

    // GET /instance/fetchInstances
    if (action === 'list-instances') {
      const instanceFilter = body.instanceName ? `?instanceName=${body.instanceName}` : '';
      return await proxy(`/instance/fetchInstances${instanceFilter}`, 'GET');
    }

    // GET /instance/connect/{instance}
    if (action === 'connect') {
      const fullUrl = `${evolutionApiUrl}/instance/connect/${instance}`;
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey },
      });
      const data = await response.json();

      // Save QR code to database
      if (data.qrcode) {
        await supabase
          .from('whatsapp_connections')
          .update({
            qr_code: data.qrcode.base64,
            status: 'pending',
            instance_id: instance,
          })
          .eq('instance_id', instance);
      }

      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /instance/connectionState/{instance}
    if (action === 'status') {
      const fullUrl = `${evolutionApiUrl}/instance/connectionState/${instance}`;
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey },
      });
      const data = await response.json();

      const status = data.state === 'open' ? 'connected' : 'disconnected';
      await supabase
        .from('whatsapp_connections')
        .update({ status, qr_code: null })
        .eq('instance_id', instance);

      return new Response(JSON.stringify({ ...data, status }), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /instance/info/{instance}
    if (action === 'instance-info') {
      return await proxy(`/instance/info/${instance}`, 'GET');
    }

    // PUT /instance/restart/{instance}
    if (action === 'restart-instance') {
      return await proxy(`/instance/restart/${instance}`, 'PUT');
    }

    // DELETE /instance/logout/{instance}
    if (action === 'disconnect') {
      const fullUrl = `${evolutionApiUrl}/instance/logout/${instance}`;
      const response = await fetch(fullUrl, {
        method: 'DELETE',
        headers: { 'apikey': evolutionApiKey },
      });
      const data = await response.json();

      await supabase
        .from('whatsapp_connections')
        .update({ status: 'disconnected' })
        .eq('instance_id', instance);

      return new Response(JSON.stringify(data), {
        status: response.ok ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /instance/delete/{instance}
    if (action === 'delete-instance') {
      return await proxy(`/instance/delete/${instance}`, 'DELETE', body);
    }

    // POST /instance/setPresence/{instance}
    if (action === 'set-presence') {
      return await proxy(`/instance/setPresence/${instance}`, 'POST', {
        presence: body.presence, // available | unavailable | composing | recording | paused
      });
    }

    // =============================================
    // 2. SETTINGS
    // =============================================

    // POST /settings/set/{instance}
    if (action === 'set-settings') {
      return await proxy(`/settings/set/${instance}`, 'POST', {
        rejectCall: body.rejectCall,
        msgCall: body.msgCall,
        groupsIgnore: body.groupsIgnore,
        alwaysOnline: body.alwaysOnline,
        readMessages: body.readMessages,
        readStatus: body.readStatus,
        syncFullHistory: body.syncFullHistory,
      });
    }

    // GET /settings/find/{instance}
    if (action === 'get-settings') {
      return await proxy(`/settings/find/${instance}`, 'GET');
    }

    // =============================================
    // 3. WEBHOOK MANAGEMENT
    // =============================================

    // POST /webhook/set/{instance}
    if (action === 'set-webhook') {
      return await proxy(`/webhook/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        url: body.url,
        webhookByEvents: body.webhookByEvents ?? true,
        webhookBase64: body.webhookBase64 ?? false,
        events: body.events || [
          'APPLICATION_STARTUP', 'QRCODE_UPDATED', 'CONNECTION_UPDATE',
          'MESSAGES_SET', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE',
          'SEND_MESSAGE', 'CONTACTS_SET', 'CONTACTS_UPSERT', 'CONTACTS_UPDATE',
          'PRESENCE_UPDATE', 'CHATS_SET', 'CHATS_UPSERT', 'CHATS_UPDATE', 'CHATS_DELETE',
          'GROUPS_UPSERT', 'GROUP_UPDATE', 'GROUP_PARTICIPANTS_UPDATE',
          'NEW_JWT_TOKEN', 'TYPEBOT_START', 'TYPEBOT_CHANGE_STATUS',
          'LABELS_EDIT', 'LABELS_ASSOCIATION', 'CALL',
        ],
      });
    }

    // GET /webhook/find/{instance}
    if (action === 'get-webhook') {
      return await proxy(`/webhook/find/${instance}`, 'GET');
    }

    // =============================================
    // 4. MESSAGE SENDING (ALL TYPES)
    // =============================================

    // POST /message/sendText/{instance}
    if (action === 'send-text') {
      return await proxy(`/message/sendText/${instance}`, 'POST', {
        number: body.number,
        text: body.text,
        delay: body.delay,
        quoted: body.quoted,
        mentionsEveryOne: body.mentionsEveryOne,
        mentioned: body.mentioned,
      });
    }

    // POST /message/sendMedia/{instance}
    if (action === 'send-media') {
      return await proxy(`/message/sendMedia/${instance}`, 'POST', {
        number: body.number,
        mediatype: body.mediaType || body.mediatype,
        mimetype: body.mimetype,
        caption: body.caption,
        media: body.mediaUrl || body.media,
        fileName: body.fileName,
        delay: body.delay,
      });
    }

    // POST /message/sendWhatsAppAudio/{instance}
    if (action === 'send-audio') {
      return await proxy(`/message/sendWhatsAppAudio/${instance}`, 'POST', {
        number: body.number,
        audio: body.mediaUrl || body.audio,
        encoding: body.encoding ?? true,
        delay: body.delay,
      });
    }

    // POST /message/sendSticker/{instance}
    if (action === 'send-sticker') {
      return await proxy(`/message/sendSticker/${instance}`, 'POST', {
        number: body.number,
        sticker: body.sticker || body.mediaUrl,
      });
    }

    // POST /message/sendLocation/{instance}
    if (action === 'send-location') {
      return await proxy(`/message/sendLocation/${instance}`, 'POST', {
        number: body.number,
        name: body.locationName || body.name,
        address: body.locationAddress || body.address,
        latitude: body.latitude,
        longitude: body.longitude,
      });
    }

    // POST /message/sendContact/{instance}
    if (action === 'send-contact') {
      return await proxy(`/message/sendContact/${instance}`, 'POST', {
        number: body.number,
        contact: body.contact, // Array of { fullName, wuid, phoneNumber, organization, email, url }
      });
    }

    // POST /message/sendReaction/{instance}
    if (action === 'send-reaction') {
      return await proxy(`/message/sendReaction/${instance}`, 'POST', {
        key: body.key, // { remoteJid, fromMe, id }
        reaction: body.reaction, // emoji or empty string to remove
      });
    }

    // POST /message/sendPoll/{instance}
    if (action === 'send-poll') {
      return await proxy(`/message/sendPoll/${instance}`, 'POST', {
        number: body.number,
        name: body.name || body.question,
        selectableCount: body.selectableCount || 1,
        values: body.values || body.options,
      });
    }

    // POST /message/sendList/{instance}
    if (action === 'send-list') {
      return await proxy(`/message/sendList/${instance}`, 'POST', {
        number: body.number,
        title: body.title,
        description: body.description,
        footer: body.footer,
        buttonText: body.buttonText,
        sections: body.sections,
      });
    }

    // POST /message/sendButtons/{instance}
    if (action === 'send-buttons') {
      return await proxy(`/message/sendButtons/${instance}`, 'POST', {
        number: body.number,
        title: body.title,
        description: body.description,
        footer: body.footer,
        buttons: body.buttons,
      });
    }

    // POST /message/sendStatus/{instance}
    if (action === 'send-status') {
      return await proxy(`/message/sendStatus/${instance}`, 'POST', body);
    }

    // POST /message/sendTemplate/{instance} (Cloud API)
    if (action === 'send-template') {
      return await proxy(`/message/sendTemplate/${instance}`, 'POST', {
        number: body.number,
        template: body.template,
      });
    }

    // POST /message/markMessageAsRead/{instance}
    if (action === 'mark-read') {
      return await proxy(`/message/markMessageAsRead/${instance}`, 'POST', {
        readMessages: body.readMessages || [body.key],
      });
    }

    // POST /message/markMessageAsUnread/{instance}
    if (action === 'mark-unread') {
      return await proxy(`/message/markMessageAsUnread/${instance}`, 'POST', {
        readMessages: body.readMessages || [body.key],
      });
    }

    // POST /message/archiveChat/{instance}
    if (action === 'archive-chat') {
      return await proxy(`/message/archiveChat/${instance}`, 'POST', {
        lastMessage: body.lastMessage,
        chat: body.chat,
        archive: body.archive ?? true,
      });
    }

    // DELETE /message/delete/{instance}
    if (action === 'delete-message') {
      return await proxy(`/message/delete/${instance}`, 'DELETE', {
        id: body.id,
        remoteJid: body.remoteJid,
        fromMe: body.fromMe,
      });
    }

    // PUT /message/update/{instance}
    if (action === 'update-message') {
      return await proxy(`/message/update/${instance}`, 'PUT', {
        number: body.number,
        key: body.key,
        text: body.text,
      });
    }

    // =============================================
    // 5. CHAT MANAGEMENT
    // =============================================

    // POST /chat/findChats/{instance}
    if (action === 'find-chats') {
      return await proxy(`/chat/findChats/${instance}`, 'POST', {
        where: body.where || {},
      });
    }

    // POST /chat/findMessages/{instance}
    if (action === 'find-messages') {
      return await proxy(`/chat/findMessages/${instance}`, 'POST', {
        where: body.where || {},
        page: body.page,
        offset: body.offset,
      });
    }

    // GET /chat/findStatusMessage/{instance}
    if (action === 'find-status-messages') {
      return await proxy(`/chat/findStatusMessage/${instance}`, 'GET');
    }

    // POST /chat/findContacts/{instance}
    if (action === 'find-contacts') {
      return await proxy(`/chat/findContacts/${instance}`, 'POST', {
        where: body.where || {},
      });
    }

    // POST /chat/whatsappNumbers/{instance}
    if (action === 'check-numbers') {
      return await proxy(`/chat/whatsappNumbers/${instance}`, 'POST', {
        numbers: body.numbers,
      });
    }

    // POST /chat/getBase64FromMediaMessage/{instance}
    if (action === 'get-media-base64') {
      return await proxy(`/chat/getBase64FromMediaMessage/${instance}`, 'POST', {
        message: body.message,
        convertToMp4: body.convertToMp4 ?? false,
      });
    }

    // DELETE /chat/deleteMessageForEveryone/{instance}
    if (action === 'delete-for-everyone') {
      return await proxy(`/chat/deleteMessageForEveryone/${instance}`, 'DELETE', body);
    }

    // PUT /chat/updateMessage/{instance}
    if (action === 'edit-message') {
      return await proxy(`/chat/updateMessage/${instance}`, 'PUT', body);
    }

    // =============================================
    // 6. GROUP MANAGEMENT
    // =============================================

    // POST /group/create/{instance}
    if (action === 'create-group') {
      return await proxy(`/group/create/${instance}`, 'POST', {
        subject: body.subject,
        description: body.description,
        participants: body.participants,
      });
    }

    // GET /group/fetchAllGroups/{instance}?getParticipants=false
    if (action === 'list-groups') {
      return await proxy(`/group/fetchAllGroups/${instance}?getParticipants=${body.getParticipants ?? 'false'}`, 'GET');
    }

    // GET /group/findGroupInfos/{instance}?groupJid=...
    if (action === 'group-info') {
      return await proxy(`/group/findGroupInfos/${instance}?groupJid=${body.groupJid}`, 'GET');
    }

    // GET /group/participants/{instance}?groupJid=...
    if (action === 'group-participants') {
      return await proxy(`/group/participants/${instance}?groupJid=${body.groupJid}`, 'GET');
    }

    // PUT /group/updateGroupSubject/{instance}
    if (action === 'update-group-name') {
      return await proxy(`/group/updateGroupSubject/${instance}`, 'PUT', {
        groupJid: body.groupJid,
        subject: body.subject,
      });
    }

    // PUT /group/updateGroupDescription/{instance}
    if (action === 'update-group-description') {
      return await proxy(`/group/updateGroupDescription/${instance}`, 'PUT', {
        groupJid: body.groupJid,
        description: body.description,
      });
    }

    // PUT /group/updateParticipant/{instance}
    if (action === 'update-participants') {
      return await proxy(`/group/updateParticipant/${instance}`, 'PUT', {
        groupJid: body.groupJid,
        action: body.action, // add | remove | promote | demote
        participants: body.participants,
      });
    }

    // PUT /group/updateSetting/{instance}
    if (action === 'update-group-setting') {
      return await proxy(`/group/updateSetting/${instance}`, 'PUT', {
        groupJid: body.groupJid,
        action: body.action, // announcement | not_announcement | locked | unlocked
      });
    }

    // GET /group/inviteCode/{instance}?groupJid=...
    if (action === 'group-invite-code') {
      return await proxy(`/group/inviteCode/${instance}?groupJid=${body.groupJid}`, 'GET');
    }

    // PUT /group/revokeInviteCode/{instance}
    if (action === 'revoke-invite-code') {
      return await proxy(`/group/revokeInviteCode/${instance}`, 'PUT', {
        groupJid: body.groupJid,
      });
    }

    // GET /group/inviteInfo/{instance}?inviteCode=...
    if (action === 'invite-info') {
      return await proxy(`/group/inviteInfo/${instance}?inviteCode=${body.inviteCode}`, 'GET');
    }

    // POST /group/acceptInviteCode/{instance}
    if (action === 'accept-invite') {
      return await proxy(`/group/acceptInviteCode/${instance}`, 'POST', {
        inviteCode: body.inviteCode,
      });
    }

    // DELETE /group/leaveGroup/{instance}
    if (action === 'leave-group') {
      return await proxy(`/group/leaveGroup/${instance}`, 'DELETE', {
        groupJid: body.groupJid,
      });
    }

    // PUT /group/updateGroupPicture/{instance}
    if (action === 'update-group-picture') {
      return await proxy(`/group/updateGroupPicture/${instance}`, 'PUT', {
        groupJid: body.groupJid,
        image: body.image,
      });
    }

    // POST /group/toggleEphemeral/{instance}
    if (action === 'toggle-ephemeral') {
      return await proxy(`/group/toggleEphemeral/${instance}`, 'POST', {
        groupJid: body.groupJid,
        expiration: body.expiration, // 0 (off) | 86400 (24h) | 604800 (7d) | 7776000 (90d)
      });
    }

    // =============================================
    // 7. PROFILE MANAGEMENT
    // =============================================

    // GET /profile/fetchProfile/{instance}
    if (action === 'fetch-profile') {
      return await proxy(`/profile/fetchProfile/${instance}`, 'GET');
    }

    // PUT /profile/updateProfileName/{instance}
    if (action === 'update-profile-name') {
      return await proxy(`/profile/updateProfileName/${instance}`, 'PUT', {
        name: body.name,
      });
    }

    // PUT /profile/updateProfileStatus/{instance}
    if (action === 'update-profile-status') {
      return await proxy(`/profile/updateProfileStatus/${instance}`, 'PUT', {
        status: body.status,
      });
    }

    // PUT /profile/updateProfilePicture/{instance}
    if (action === 'update-profile-picture') {
      return await proxy(`/profile/updateProfilePicture/${instance}`, 'PUT', {
        picture: body.picture,
      });
    }

    // DELETE /profile/removeProfilePicture/{instance}
    if (action === 'remove-profile-picture') {
      return await proxy(`/profile/removeProfilePicture/${instance}`, 'DELETE');
    }

    // GET /profile/fetchProfilePicture/{instance}?number=...
    if (action === 'fetch-profile-picture') {
      return await proxy(`/profile/fetchProfilePicture/${instance}?number=${body.number}`, 'GET');
    }

    // POST /profile/fetchBusinessProfile/{instance}
    if (action === 'fetch-business-profile') {
      return await proxy(`/profile/fetchBusinessProfile/${instance}`, 'POST', {
        number: body.number,
      });
    }

    // PUT /profile/updatePrivacySettings/{instance}
    if (action === 'update-privacy') {
      return await proxy(`/profile/updatePrivacySettings/${instance}`, 'PUT', {
        readreceipts: body.readreceipts,
        profile: body.profile,
        status: body.status,
        online: body.online,
        last: body.last,
        groupadd: body.groupadd,
      });
    }

    // =============================================
    // 8. LABELS (ETIQUETAS)
    // =============================================

    // GET /label/findLabels/{instance}
    if (action === 'find-labels') {
      return await proxy(`/label/findLabels/${instance}`, 'GET');
    }

    // POST /label/handleLabel/{instance}
    if (action === 'handle-label') {
      return await proxy(`/label/handleLabel/${instance}`, 'POST', {
        number: body.number,
        labelId: body.labelId,
        action: body.action, // add | remove
      });
    }

    // =============================================
    // 9. CHATWOOT INTEGRATION
    // =============================================

    // POST /chatwoot/set/{instance}
    if (action === 'set-chatwoot') {
      return await proxy(`/chatwoot/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        accountId: body.accountId,
        token: body.token,
        url: body.url,
        signMsg: body.signMsg ?? true,
        reopenConversation: body.reopenConversation ?? true,
        conversationPending: body.conversationPending ?? false,
        nameInbox: body.nameInbox,
        mergeBrazilContacts: body.mergeBrazilContacts ?? true,
        importContacts: body.importContacts ?? true,
        importMessages: body.importMessages ?? true,
        daysLimitImportMessages: body.daysLimitImportMessages ?? 7,
        signDelimiter: body.signDelimiter,
        autoCreate: body.autoCreate ?? false,
      });
    }

    // GET /chatwoot/find/{instance}
    if (action === 'get-chatwoot') {
      return await proxy(`/chatwoot/find/${instance}`, 'GET');
    }

    // DELETE /chatwoot/delete/{instance}
    if (action === 'delete-chatwoot') {
      return await proxy(`/chatwoot/delete/${instance}`, 'DELETE');
    }

    // =============================================
    // 10. TYPEBOT INTEGRATION
    // =============================================

    // POST /typebot/set/{instance}
    if (action === 'set-typebot') {
      return await proxy(`/typebot/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        url: body.url,
        typebot: body.typebot,
        expire: body.expire ?? 20,
        keywordFinish: body.keywordFinish ?? '#fim',
        delayMessage: body.delayMessage ?? 1000,
        unknownMessage: body.unknownMessage,
        listeningFromMe: body.listeningFromMe ?? false,
        stopBotFromMe: body.stopBotFromMe ?? true,
        keepOpen: body.keepOpen ?? false,
        debounceTime: body.debounceTime ?? 10,
        triggerType: body.triggerType,
        triggerOperator: body.triggerOperator,
        triggerValue: body.triggerValue,
      });
    }

    // GET /typebot/find/{instance}
    if (action === 'get-typebot') {
      return await proxy(`/typebot/find/${instance}`, 'GET');
    }

    // DELETE /typebot/delete/{instance}
    if (action === 'delete-typebot') {
      return await proxy(`/typebot/delete/${instance}`, 'DELETE');
    }

    // GET /typebot/fetchSessions/{instance}
    if (action === 'typebot-sessions') {
      const params = body.typebotId ? `?typebotId=${body.typebotId}` : '';
      return await proxy(`/typebot/fetchSessions/${instance}${params}`, 'GET');
    }

    // POST /typebot/changeStatus/{instance}
    if (action === 'typebot-change-status') {
      return await proxy(`/typebot/changeStatus/${instance}`, 'POST', {
        remoteJid: body.remoteJid,
        status: body.status, // opened | paused | closed
      });
    }

    // POST /typebot/startTypebot/{instance}
    if (action === 'start-typebot') {
      return await proxy(`/typebot/startTypebot/${instance}`, 'POST', {
        remoteJid: body.remoteJid,
        url: body.url,
        typebot: body.typebot,
        variables: body.variables,
      });
    }

    // =============================================
    // 11. OPENAI INTEGRATION
    // =============================================

    // POST /openai/set/{instance}
    if (action === 'set-openai') {
      return await proxy(`/openai/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        openAiApiKey: body.openAiApiKey,
        expire: body.expire ?? 30,
        keywordFinish: body.keywordFinish ?? '#sair',
        delayMessage: body.delayMessage ?? 1000,
        listeningFromMe: body.listeningFromMe ?? false,
        stopBotFromMe: body.stopBotFromMe ?? true,
        speechToText: body.speechToText ?? false,
        botType: body.botType ?? 'chatCompletion',
        assistantId: body.assistantId,
        model: body.model ?? 'gpt-4o',
        systemMessage: body.systemMessage,
        maxTokens: body.maxTokens ?? 500,
        temperature: body.temperature ?? 0.7,
        triggerType: body.triggerType ?? 'all',
        triggerOperator: body.triggerOperator,
        triggerValue: body.triggerValue,
        functionUrl: body.functionUrl,
      });
    }

    // GET /openai/find/{instance}
    if (action === 'get-openai') {
      return await proxy(`/openai/find/${instance}`, 'GET');
    }

    // DELETE /openai/delete/{instance}
    if (action === 'delete-openai') {
      return await proxy(`/openai/delete/${instance}`, 'DELETE');
    }

    // =============================================
    // 12. DIFY INTEGRATION
    // =============================================

    // POST /dify/set/{instance}
    if (action === 'set-dify') {
      return await proxy(`/dify/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        apiUrl: body.apiUrl,
        apiKey: body.apiKey,
        botType: body.botType ?? 'chatBot',
        expire: body.expire ?? 30,
        triggerType: body.triggerType ?? 'all',
        keywordFinish: body.keywordFinish,
        listeningFromMe: body.listeningFromMe ?? false,
        stopBotFromMe: body.stopBotFromMe ?? true,
        speechToText: body.speechToText ?? false,
      });
    }

    // GET /dify/find/{instance}
    if (action === 'get-dify') {
      return await proxy(`/dify/find/${instance}`, 'GET');
    }

    // DELETE /dify/delete/{instance}
    if (action === 'delete-dify') {
      return await proxy(`/dify/delete/${instance}`, 'DELETE');
    }

    // =============================================
    // 13. FLOWISE INTEGRATION
    // =============================================

    // POST /flowise/set/{instance}
    if (action === 'set-flowise') {
      return await proxy(`/flowise/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        apiUrl: body.apiUrl,
        apiKey: body.apiKey,
        chatflowId: body.chatflowId,
        expire: body.expire ?? 30,
        triggerType: body.triggerType,
        triggerValue: body.triggerValue,
      });
    }

    // GET /flowise/find/{instance}
    if (action === 'get-flowise') {
      return await proxy(`/flowise/find/${instance}`, 'GET');
    }

    // DELETE /flowise/delete/{instance}
    if (action === 'delete-flowise') {
      return await proxy(`/flowise/delete/${instance}`, 'DELETE');
    }

    // =============================================
    // 14. EVOLUTION BOT INTEGRATION
    // =============================================

    // POST /evolutionBot/set/{instance}
    if (action === 'set-evolution-bot') {
      return await proxy(`/evolutionBot/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        expire: body.expire ?? 10,
        keywordFinish: body.keywordFinish ?? '#sair',
        delayMessage: body.delayMessage ?? 800,
        triggerType: body.triggerType,
        triggerOperator: body.triggerOperator,
        triggerValue: body.triggerValue,
        unknownMessage: body.unknownMessage,
        listeningFromMe: body.listeningFromMe ?? false,
        stopBotFromMe: body.stopBotFromMe ?? true,
        apiUrl: body.apiUrl,
        apiKey: body.apiKey,
      });
    }

    // GET /evolutionBot/find/{instance}
    if (action === 'get-evolution-bot') {
      return await proxy(`/evolutionBot/find/${instance}`, 'GET');
    }

    // DELETE /evolutionBot/delete/{instance}
    if (action === 'delete-evolution-bot') {
      return await proxy(`/evolutionBot/delete/${instance}`, 'DELETE');
    }

    // =============================================
    // 15. RABBITMQ / SQS INTEGRATIONS
    // =============================================

    // POST /rabbitmq/set/{instance}
    if (action === 'set-rabbitmq') {
      return await proxy(`/rabbitmq/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        events: body.events,
      });
    }

    // GET /rabbitmq/find/{instance}
    if (action === 'get-rabbitmq') {
      return await proxy(`/rabbitmq/find/${instance}`, 'GET');
    }

    // POST /sqs/set/{instance}
    if (action === 'set-sqs') {
      return await proxy(`/sqs/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        events: body.events,
      });
    }

    // GET /sqs/find/{instance}
    if (action === 'get-sqs') {
      return await proxy(`/sqs/find/${instance}`, 'GET');
    }

    // =============================================
    // 16. TEMPLATE MANAGEMENT (Cloud API)
    // =============================================

    // POST /template/create/{instance}
    if (action === 'create-template') {
      return await proxy(`/template/create/${instance}`, 'POST', body);
    }

    // GET /template/find/{instance}
    if (action === 'find-templates') {
      return await proxy(`/template/find/${instance}`, 'GET');
    }

    // DELETE /template/delete/{instance}
    if (action === 'delete-template') {
      return await proxy(`/template/delete/${instance}`, 'DELETE', body);
    }

    // =============================================
    // 17. BLOCK/UNBLOCK CONTACTS
    // =============================================

    // POST /chat/updateBlockStatus/{instance}
    if (action === 'update-block-status') {
      return await proxy(`/chat/updateBlockStatus/${instance}`, 'POST', {
        number: body.number,
        status: body.status, // 'block' | 'unblock'
      });
    }

    // =============================================
    // 18. SEND PTV (Video Note / Circular Video)
    // =============================================

    // POST /message/sendPtv/{instance}
    if (action === 'send-ptv') {
      return await proxy(`/message/sendPtv/${instance}`, 'POST', {
        number: body.number,
        video: body.video || body.mediaUrl,
        delay: body.delay,
      });
    }

    // =============================================
    // 19. OFFER CALL (Simulate Call)
    // =============================================

    // POST /call/offerCall/{instance}
    if (action === 'offer-call') {
      return await proxy(`/call/offerCall/${instance}`, 'POST', {
        number: body.number,
        isVideo: body.isVideo ?? false,
        callDuration: body.callDuration ?? 5,
      });
    }

    // =============================================
    // 20. SEND PRESENCE (Per Chat)
    // =============================================

    // POST /chat/sendPresence/{instance}
    if (action === 'send-chat-presence') {
      return await proxy(`/chat/sendPresence/${instance}`, 'POST', {
        number: body.number,
        presence: body.presence, // composing | recording | paused
        delay: body.delay ?? 1200,
      });
    }

    // =============================================
    // 21. BUSINESS CATALOG & COLLECTIONS
    // =============================================

    // POST /business/getCatalog/{instance}
    if (action === 'get-catalog') {
      return await proxy(`/business/getCatalog/${instance}`, 'POST', {
        number: body.number,
        limit: body.limit,
        cursor: body.cursor,
      });
    }

    // POST /business/getCollections/{instance}
    if (action === 'get-collections') {
      return await proxy(`/business/getCollections/${instance}`, 'POST', {
        number: body.number,
        limit: body.limit,
        cursor: body.cursor,
      });
    }

    // =============================================
    // 22. PROXY CONFIGURATION
    // =============================================

    // POST /proxy/set/{instance}
    if (action === 'set-proxy') {
      return await proxy(`/proxy/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        host: body.host,
        port: body.port,
        protocol: body.protocol, // http | https | socks5
        username: body.username,
        password: body.password,
      });
    }

    // GET /proxy/find/{instance}
    if (action === 'get-proxy') {
      return await proxy(`/proxy/find/${instance}`, 'GET');
    }

    // =============================================
    // 23. EVO AI INTEGRATION
    // =============================================

    // POST /evoai/set/{instance}
    if (action === 'set-evoai') {
      return await proxy(`/evoai/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        apiUrl: body.apiUrl,
        apiKey: body.apiKey,
        agentId: body.agentId,
        expire: body.expire ?? 30,
        triggerType: body.triggerType ?? 'all',
        triggerOperator: body.triggerOperator,
        triggerValue: body.triggerValue,
        keywordFinish: body.keywordFinish,
        delayMessage: body.delayMessage ?? 1000,
        unknownMessage: body.unknownMessage,
        listeningFromMe: body.listeningFromMe ?? false,
        stopBotFromMe: body.stopBotFromMe ?? true,
        keepOpen: body.keepOpen ?? false,
        debounceTime: body.debounceTime ?? 10,
        speechToText: body.speechToText ?? false,
      });
    }

    // GET /evoai/find/{instance}
    if (action === 'get-evoai') {
      return await proxy(`/evoai/find/${instance}`, 'GET');
    }

    // DELETE /evoai/delete/{instance}
    if (action === 'delete-evoai') {
      return await proxy(`/evoai/delete/${instance}`, 'DELETE');
    }

    // =============================================
    // 24. N8N INTEGRATION
    // =============================================

    // POST /n8n/set/{instance}
    if (action === 'set-n8n') {
      return await proxy(`/n8n/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        webhookUrl: body.webhookUrl,
        expire: body.expire ?? 30,
        triggerType: body.triggerType ?? 'all',
        triggerOperator: body.triggerOperator,
        triggerValue: body.triggerValue,
        keywordFinish: body.keywordFinish,
        delayMessage: body.delayMessage ?? 1000,
        unknownMessage: body.unknownMessage,
        listeningFromMe: body.listeningFromMe ?? false,
        stopBotFromMe: body.stopBotFromMe ?? true,
        keepOpen: body.keepOpen ?? false,
        debounceTime: body.debounceTime ?? 10,
      });
    }

    // GET /n8n/find/{instance}
    if (action === 'get-n8n') {
      return await proxy(`/n8n/find/${instance}`, 'GET');
    }

    // DELETE /n8n/delete/{instance}
    if (action === 'delete-n8n') {
      return await proxy(`/n8n/delete/${instance}`, 'DELETE');
    }

    // =============================================
    // 25. EVENT STREAMING (Kafka, NATS, Pusher)
    // =============================================

    // Kafka
    if (action === 'set-kafka') {
      return await proxy(`/kafka/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        events: body.events,
      });
    }
    if (action === 'get-kafka') {
      return await proxy(`/kafka/find/${instance}`, 'GET');
    }

    // NATS
    if (action === 'set-nats') {
      return await proxy(`/nats/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        events: body.events,
      });
    }
    if (action === 'get-nats') {
      return await proxy(`/nats/find/${instance}`, 'GET');
    }

    // Pusher
    if (action === 'set-pusher') {
      return await proxy(`/pusher/set/${instance}`, 'POST', {
        enabled: body.enabled ?? true,
        appId: body.appId,
        key: body.key,
        secret: body.secret,
        cluster: body.cluster,
        events: body.events,
      });
    }
    if (action === 'get-pusher') {
      return await proxy(`/pusher/find/${instance}`, 'GET');
    }

    // =============================================
    // DEFAULT: Unknown action
    // =============================================
    return new Response(JSON.stringify({ error: 'Unknown action', action }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Evolution API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
