import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchProfilePicFromApi(instance: string, phone: string): Promise<string | null> {
  try {
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
    if (!evolutionUrl || !evolutionKey) return null;

    const resp = await fetch(
      `${evolutionUrl}/chat/fetchProfilePictureUrl/${instance}`,
      {
        method: 'POST',
        headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: phone }),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error(`fetchProfilePic failed for ${phone} on ${instance}: ${resp.status} ${text}`);
      return null;
    }
    const result = await resp.json();
    return result?.profilePictureUrl || result?.picture || result?.url || null;
  } catch (err) {
    console.error(`fetchProfilePic error for ${phone}:`, err);
    return null;
  }
}

async function persistProfilePicture(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  profilePicUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(profilePicUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const blob = await response.arrayBuffer();
    const bytes = new Uint8Array(blob);
    if (bytes.length < 100) return null;

    const fileName = `${phone}_${Date.now()}.jpg`;
    const storagePath = `avatars/${fileName}`;

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all contacts without avatar or with expired WhatsApp CDN URLs
    // Exclude @lid contacts (internal WhatsApp IDs, not real phone numbers)
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, phone, name, avatar_url, whatsapp_connection_id')
      .not('whatsapp_connection_id', 'is', null)
      .not('phone', 'like', '%@lid')
      .or('avatar_url.is.null,avatar_url.like.%pps.whatsapp.net%')
      .order('created_at', { ascending: false })
      .limit(200);

    if (contactsError) throw contactsError;
    if (!contacts?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0, updated: 0, message: 'Todos os contatos já possuem avatar.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${contacts.length} contacts needing avatars`);

    // Get unique connection IDs and their instance IDs
    const connectionIds = [...new Set(contacts.map(c => c.whatsapp_connection_id).filter(Boolean))];
    const { data: connections } = await supabase
      .from('whatsapp_connections')
      .select('id, instance_id')
      .in('id', connectionIds)
      .eq('status', 'connected');

    console.log(`Found ${connections?.length || 0} active connections:`, JSON.stringify(connections));

    if (!connections?.length) {
      return new Response(JSON.stringify({ success: false, message: 'Nenhuma conexão WhatsApp ativa encontrada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map connection ID -> instance_id
    const connectionMap = new Map(connections.map(c => [c.id, c.instance_id]));

    let updated = 0;
    let failed = 0;
    let skipped = 0;
    const processed = contacts.length;

    // Process in batches of 5 to avoid rate limits
    for (let i = 0; i < contacts.length; i += 5) {
      const batch = contacts.slice(i, i + 5);

      await Promise.allSettled(batch.map(async (contact) => {
        const instanceId = connectionMap.get(contact.whatsapp_connection_id);
        if (!instanceId) { 
          skipped++; 
          console.log(`Skipped ${contact.phone}: no instance_id for connection ${contact.whatsapp_connection_id}`);
          return; 
        }

        try {
          const picUrl = await fetchProfilePicFromApi(instanceId, contact.phone);
          if (!picUrl) { failed++; return; }

          const permanentUrl = await persistProfilePicture(supabase, contact.phone, picUrl);
          if (!permanentUrl) { failed++; return; }

          await supabase
            .from('contacts')
            .update({ avatar_url: permanentUrl })
            .eq('id', contact.id);

          updated++;
          console.log(`Updated avatar for ${contact.name} (${contact.phone})`);
        } catch (err) {
          console.error(`Error processing ${contact.phone}:`, err);
          failed++;
        }
      }));

      // Rate limit: wait 1s between batches
      if (i + 5 < contacts.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      updated,
      failed,
      skipped,
      message: `${updated} avatares atualizados de ${processed} contatos processados.`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Batch avatar fetch error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
