import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active WhatsApp connections with instance IDs
    const { data: connections } = await supabase
      .from('whatsapp_connections')
      .select('id, instance_id')
      .eq('status', 'connected')
      .limit(10);

    const instanceMap = new Map<string, string>();
    for (const conn of connections || []) {
      if (conn.instance_id) instanceMap.set(conn.id, conn.instance_id);
    }

    // Find all messages with WhatsApp CDN URLs
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, media_url, message_type, external_id, contact_id, whatsapp_connection_id')
      .not('media_url', 'is', null)
      .or('media_url.like.%mmg.whatsapp.net%,media_url.like.%pps.whatsapp.net%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Query error:', error);
      // Fallback: simple query without joins
      return await migrateSimple(supabase, corsHeaders);
    }

    if (!messages?.length) {
      return new Response(JSON.stringify({ 
        success: true, processed: 0, migrated: 0, 
        message: 'Todas as mídias já estão no Storage permanente.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${messages.length} messages with CDN URLs to migrate`);

    let migrated = 0;
    let failed = 0;
    const details: string[] = [];

    for (const msg of messages) {
      try {
        // Method 1: Direct CDN download
        let permanentUrl = await downloadAndUpload(supabase, msg.media_url, msg.message_type, msg.id);
        
        // Method 2: Evolution API getBase64 fallback
        if (!permanentUrl && evolutionUrl && evolutionKey && msg.external_id) {
          const connId = msg.whatsapp_connection_id;
          const instance = connId ? instanceMap.get(connId) : null;
          
          // If no direct connection, try all instances
          const instancesToTry = instance ? [instance] : Array.from(instanceMap.values());
          
          for (const inst of instancesToTry) {
            console.log(`[MIGRATE] Trying getBase64 API for ${msg.id} on instance ${inst}`);
            permanentUrl = await getBase64Fallback(
              supabase, evolutionUrl, evolutionKey, inst,
              msg.external_id, msg.message_type, msg.id
            );
            if (permanentUrl) break;
          }
        }

        if (permanentUrl) {
          await supabase
            .from('messages')
            .update({ media_url: permanentUrl })
            .eq('id', msg.id);
          migrated++;
          details.push(`✅ ${msg.message_type} ${msg.id.substring(0, 8)}`);
        } else {
          failed++;
          details.push(`❌ ${msg.message_type} ${msg.id.substring(0, 8)} (irrecuperável)`);
        }
      } catch (err) {
        console.error(`[MIGRATE] Error for ${msg.id}:`, err);
        failed++;
        details.push(`❌ ${msg.message_type} ${msg.id.substring(0, 8)} (erro)`);
      }

      // Rate limit between items
      await new Promise(r => setTimeout(r, 300));
    }

    return new Response(JSON.stringify({
      success: true,
      processed: messages.length,
      migrated,
      failed,
      details,
      message: migrated > 0 
        ? `${migrated} mídias migradas para Storage permanente.`
        : `Nenhuma mídia pôde ser recuperada. ${failed} arquivos com URLs expiradas.`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Migration error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function downloadAndUpload(
  supabase: ReturnType<typeof createClient>,
  cdnUrl: string,
  messageType: string,
  messageId: string,
): Promise<string | null> {
  try {
    const resp = await fetch(cdnUrl, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      console.error(`[MIGRATE] Download failed for ${messageId}: ${resp.status}`);
      return null;
    }

    const arrayBuf = await resp.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    if (bytes.length < 100) {
      console.error(`[MIGRATE] File too small for ${messageId}`);
      return null;
    }

    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    const ext = detectExtension(contentType, messageType);
    return await uploadToStorage(supabase, bytes, contentType, messageType, messageId, ext);
  } catch (err) {
    console.error(`[MIGRATE] Download error for ${messageId}:`, err);
    return null;
  }
}

async function getBase64Fallback(
  supabase: ReturnType<typeof createClient>,
  evolutionUrl: string,
  evolutionKey: string,
  instance: string,
  externalId: string,
  messageType: string,
  messageId: string,
): Promise<string | null> {
  try {
    const baseUrl = evolutionUrl.replace(/\/+$/, '');
    const resp = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
      body: JSON.stringify({ 
        message: { key: { id: externalId } },
        convertToMp4: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[MIGRATE] getBase64 API error (${resp.status}): ${errText.substring(0, 200)}`);
      return null;
    }

    const result = await resp.json();
    const b64 = (result.base64 as string) || (result.data as string) || (result.media as string);
    if (!b64) {
      console.error(`[MIGRATE] No base64 in API response for ${messageId}`);
      return null;
    }

    const raw = b64.includes(',') ? b64.split(',')[1] : b64;
    const binaryStr = atob(raw);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    if (bytes.length < 100) return null;

    const mimeType = (result.mimetype as string) || 'application/octet-stream';
    const ext = detectExtension(mimeType, messageType);
    return await uploadToStorage(supabase, bytes, mimeType, messageType, messageId, ext);
  } catch (err) {
    console.error(`[MIGRATE] getBase64 error for ${messageId}:`, err);
    return null;
  }
}

function detectExtension(contentType: string, messageType: string): string {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('ogg') || contentType.includes('opus')) return 'ogg';
  if (contentType.includes('mpeg')) return 'mp3';
  if (contentType.includes('pdf')) return 'pdf';
  
  const defaults: Record<string, string> = { image: 'jpg', video: 'mp4', audio: 'ogg', document: 'bin' };
  return defaults[messageType] || 'bin';
}

async function uploadToStorage(
  supabase: ReturnType<typeof createClient>,
  bytes: Uint8Array,
  contentType: string,
  messageType: string,
  messageId: string,
  ext: string,
): Promise<string | null> {
  const safeId = messageId.replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `${messageType}/${safeId}_${Date.now()}.${ext}`;
  const bucket = messageType === 'audio' ? 'audio-messages' : 'whatsapp-media';

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(fileName, bytes, { contentType, cacheControl: '31536000', upsert: true });

  if (uploadErr) {
    console.error(`[MIGRATE] Upload error:`, uploadErr);
    return null;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
  console.log(`[MIGRATE] ${messageType} ${messageId.substring(0, 8)} → ${urlData.publicUrl} (${(bytes.length / 1024).toFixed(1)}KB)`);
  return urlData.publicUrl;
}

async function migrateSimple(
  supabase: ReturnType<typeof createClient>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, media_url, message_type, external_id')
    .not('media_url', 'is', null)
    .or('media_url.like.%mmg.whatsapp.net%,media_url.like.%pps.whatsapp.net%')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!messages?.length) {
    return new Response(JSON.stringify({ success: true, processed: 0, migrated: 0, message: 'Nada a migrar.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let migrated = 0;
  let failed = 0;

  for (const msg of messages) {
    const url = await downloadAndUpload(supabase, msg.media_url, msg.message_type, msg.id);
    if (url) {
      await supabase.from('messages').update({ media_url: url }).eq('id', msg.id);
      migrated++;
    } else {
      failed++;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return new Response(JSON.stringify({ success: true, processed: messages.length, migrated, failed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
