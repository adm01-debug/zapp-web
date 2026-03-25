import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || '');
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

interface BitrixRequest {
  action: string;
  entityType?: 'lead' | 'contact' | 'deal' | 'activity' | 'call';
  entityId?: string;
  data?: Record<string, any>;
  filters?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  try {
    const BITRIX_WEBHOOK_URL = Deno.env.get('BITRIX_WEBHOOK_URL');
    const BITRIX_DOMAIN = Deno.env.get('BITRIX_DOMAIN');

    if (!BITRIX_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({ 
          error: 'Bitrix não configurado', 
          message: 'Configure BITRIX_WEBHOOK_URL nas configurações' 
        }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const { action, entityType, entityId, data, filters }: BitrixRequest = await req.json();
    console.log(`Bitrix API action: ${action}, entityType: ${entityType}`);

    let endpoint = '';
    let method = 'GET';
    let body: Record<string, any> | null = null;

    // Map entity types to Bitrix API methods
    const entityMap: Record<string, string> = {
      lead: 'crm.lead',
      contact: 'crm.contact',
      deal: 'crm.deal',
      activity: 'crm.activity',
      call: 'telephony.externalcall',
    };

    const bitrixEntity = entityType ? entityMap[entityType] : '';

    switch (action) {
      // === LEADS ===
      case 'list':
        endpoint = `${bitrixEntity}.list`;
        body = { filter: filters || {}, select: ['*', 'UF_*'] };
        break;

      case 'get':
        endpoint = `${bitrixEntity}.get`;
        body = { id: entityId };
        break;

      case 'create':
        endpoint = `${bitrixEntity}.add`;
        body = { fields: data };
        break;

      case 'update':
        endpoint = `${bitrixEntity}.update`;
        body = { id: entityId, fields: data };
        break;

      case 'delete':
        endpoint = `${bitrixEntity}.delete`;
        body = { id: entityId };
        break;

      // === TELEPHONY ===
      case 'register_call':
        endpoint = 'telephony.externalcall.register';
        body = {
          USER_PHONE_INNER: data?.userPhoneInner,
          USER_ID: data?.userId,
          PHONE_NUMBER: data?.phoneNumber,
          TYPE: data?.type || 1, // 1 = outgoing, 2 = incoming
          CALL_START_DATE: data?.callStartDate || new Date().toISOString(),
          CRM_CREATE: data?.crmCreate || 1,
        };
        break;

      case 'finish_call':
        endpoint = 'telephony.externalcall.finish';
        body = {
          CALL_ID: data?.callId,
          USER_ID: data?.userId,
          DURATION: data?.duration,
          STATUS_CODE: data?.statusCode || 200,
          ADD_TO_CHAT: data?.addToChat || 0,
        };
        break;

      case 'attach_record':
        endpoint = 'telephony.externalCall.attachRecord';
        body = {
          CALL_ID: data?.callId,
          FILENAME: data?.filename,
          FILE_CONTENT: data?.fileContent,
        };
        break;

      // === SYNC ===
      case 'sync_contacts':
        // Sync contacts from Bitrix to local database
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch contacts from Bitrix
        const contactsResponse = await fetch(`${BITRIX_WEBHOOK_URL}/crm.contact.list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filter: filters || {},
            select: ['ID', 'NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'COMPANY_ID', 'POST']
          }),
        });
        const contactsData = await contactsResponse.json();

        if (contactsData.result) {
          const syncResults = [];
          for (const bitrixContact of contactsData.result) {
            const phone = bitrixContact.PHONE?.[0]?.VALUE || '';
            if (!phone) continue;

            // Upsert contact in local database
            const { data: upsertedContact, error } = await supabase
              .from('contacts')
              .upsert({
                phone: phone.replace(/\D/g, ''),
                name: bitrixContact.NAME || 'Sem nome',
                surname: bitrixContact.LAST_NAME,
                email: bitrixContact.EMAIL?.[0]?.VALUE,
                company: bitrixContact.COMPANY_ID,
                job_title: bitrixContact.POST,
                notes: `Bitrix ID: ${bitrixContact.ID}`,
              }, { 
                onConflict: 'phone',
                ignoreDuplicates: false 
              })
              .select()
              .single();

            if (!error) {
              syncResults.push(upsertedContact);
            }
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              synced: syncResults.length,
              total: contactsData.result.length 
            }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }
        break;

      case 'push_contact':
        // Push local contact to Bitrix
        const pushResponse = await fetch(`${BITRIX_WEBHOOK_URL}/crm.contact.add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              NAME: data?.name,
              LAST_NAME: data?.surname,
              PHONE: data?.phone ? [{ VALUE: data.phone, VALUE_TYPE: 'WORK' }] : [],
              EMAIL: data?.email ? [{ VALUE: data.email, VALUE_TYPE: 'WORK' }] : [],
              POST: data?.jobTitle,
            }
          }),
        });
        const pushData = await pushResponse.json();
        
        return new Response(
          JSON.stringify({ success: true, bitrixId: pushData.result }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );

      case 'create_lead_from_conversation':
        // Create lead from WhatsApp conversation
        const leadResponse = await fetch(`${BITRIX_WEBHOOK_URL}/crm.lead.add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              TITLE: data?.title || `Lead WhatsApp - ${data?.contactName}`,
              NAME: data?.contactName,
              PHONE: data?.phone ? [{ VALUE: data.phone, VALUE_TYPE: 'WORK' }] : [],
              SOURCE_ID: 'WEB',
              SOURCE_DESCRIPTION: 'WhatsApp via Lovable',
              COMMENTS: data?.conversationSummary,
              UF_CRM_WHATSAPP_CONTACT_ID: data?.contactId,
            }
          }),
        });
        const leadData = await leadResponse.json();
        
        return new Response(
          JSON.stringify({ success: true, leadId: leadData.result }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Ação não suportada', action }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
    }

    // Make request to Bitrix API
    if (endpoint) {
      console.log(`Calling Bitrix: ${BITRIX_WEBHOOK_URL}/${endpoint}`);
      
      const bitrixResponse = await fetch(`${BITRIX_WEBHOOK_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await bitrixResponse.json();
      console.log('Bitrix response:', JSON.stringify(responseData).substring(0, 500));

      if (responseData.error) {
        return new Response(
          JSON.stringify({ 
            error: responseData.error, 
            error_description: responseData.error_description 
          }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: responseData.result, total: responseData.total }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint não definido' }),
      { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Bitrix API error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
