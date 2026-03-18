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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all messages with WhatsApp CDN URLs
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, media_url, message_type, external_id')
      .not('media_url', 'is', null)
      .or('media_url.like.%mmg.whatsapp.net%,media_url.like.%pps.whatsapp.net%')
      .order('created_at', { ascending: false })
      .limit(50); // Process in batches of 50

    if (error) throw error;
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

    for (let i = 0; i < messages.length; i += 5) {
      const batch = messages.slice(i, i + 5);

      await Promise.allSettled(batch.map(async (msg) => {
        try {
          const resp = await fetch(msg.media_url, { signal: AbortSignal.timeout(15000) });
          if (!resp.ok) {
            console.error(`[MIGRATE] Download failed for ${msg.id}: ${resp.status}`);
            failed++;
            return;
          }

          const arrayBuf = await resp.arrayBuffer();
          const bytes = new Uint8Array(arrayBuf);
          if (bytes.length < 100) {
            console.error(`[MIGRATE] File too small for ${msg.id}`);
            failed++;
            return;
          }

          const contentType = resp.headers.get('content-type') || 'application/octet-stream';
          let ext = 'bin';
          if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
          else if (contentType.includes('png')) ext = 'png';
          else if (contentType.includes('webp')) ext = 'webp';
          else if (contentType.includes('mp4')) ext = 'mp4';
          else if (contentType.includes('ogg') || contentType.includes('opus')) ext = 'ogg';
          else if (contentType.includes('mpeg')) ext = 'mp3';
          else if (contentType.includes('pdf')) ext = 'pdf';

          const safeId = msg.id.replace(/[^a-zA-Z0-9]/g, '');
          const msgType = msg.message_type || 'media';
          const fileName = `${msgType}/${safeId}_${Date.now()}.${ext}`;
          const bucket = msgType === 'audio' ? 'audio-messages' : 'whatsapp-media';

          const { error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(fileName, bytes, {
              contentType,
              cacheControl: '31536000',
              upsert: true,
            });

          if (uploadErr) {
            console.error(`[MIGRATE] Upload error for ${msg.id}:`, uploadErr);
            failed++;
            return;
          }

          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

          await supabase
            .from('messages')
            .update({ media_url: urlData.publicUrl })
            .eq('id', msg.id);

          migrated++;
          console.log(`[MIGRATE] ${msgType} ${msg.id} → ${urlData.publicUrl} (${(bytes.length / 1024).toFixed(1)}KB)`);
        } catch (err) {
          console.error(`[MIGRATE] Error for ${msg.id}:`, err);
          failed++;
        }
      }));

      // Rate limit
      if (i + 5 < messages.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: messages.length,
      migrated,
      failed,
      remaining: messages.length - migrated - failed,
      message: `${migrated} mídias migradas para Storage permanente.`,
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
