// Shared helpers for Evolution API webhook and sync functions

export interface WebhookPayload {
  event: string;
  instance: string;
  data: Record<string, unknown> | Record<string, unknown>[];
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeEventName(event?: string): string {
  return (event || '').trim().toLowerCase().replace(/_/g, '.');
}

export function toEventRecords(data: unknown, collectionKeys: string[] = []): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data)) return [];
  for (const key of collectionKeys) {
    const collection = data[key];
    if (Array.isArray(collection)) return collection.filter(isRecord);
  }
  return [data];
}

export function normalizePhone(rawJid?: string): string | null {
  if (!rawJid) return null;
  const sanitized = rawJid
    .trim()
    .replace(/:\d+(?=@)/, '')
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@broadcast', '')
    .replace('@lid', '')
    .replace(/^\+/, '');

  const digitsOnly = sanitized.replace(/\D/g, '');
  return digitsOnly || sanitized || null;
}

export function resolveBestJid(...candidates: Array<string | null | undefined>): string | null {
  const valid = candidates
    .map((candidate) => candidate?.trim())
    .filter((candidate): candidate is string => Boolean(candidate));

  if (valid.length === 0) return null;

  return valid.find((jid) => jid.includes('@s.whatsapp.net'))
    ?? valid.find((jid) => jid.includes('@g.us'))
    ?? valid.find((jid) => !jid.includes('@lid'))
    ?? valid[0]
    ?? null;
}

export const STATUS_PRIORITY: Record<string, number> = {
  'sending': 0, 'sent': 1, 'delivered': 2, 'read': 3, 'played': 3,
  'failed': -1, 'deleted': 99, 'received': 1,
};

export function shouldUpdateStatus(currentStatus: string | null, newStatus: string): boolean {
  if (!currentStatus) return true;
  if (newStatus === 'deleted' || newStatus === 'failed') return true;
  const currentPriority = STATUS_PRIORITY[currentStatus] ?? 0;
  const newPriority = STATUS_PRIORITY[newStatus] ?? 0;
  return newPriority > currentPriority;
}

// deno-lint-ignore no-explicit-any
export async function getConnectionByInstance(supabase: any, instance: string): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('whatsapp_connections')
    .select('id')
    .eq('instance_id', instance)
    .maybeSingle();
  return data;
}

// deno-lint-ignore no-explicit-any
export async function getContactByPhone(
  supabase: any,
  phone: string,
  connectionId: string
): Promise<{ id: string; avatar_url: string | null; assigned_to: string | null; name: string | null } | null> {
  const phonesVariants = [phone, `+${phone}`, phone.replace(/^\+/, '')];
  const uniquePhones = [...new Set(phonesVariants)];
  const { data } = await supabase
    .from('contacts')
    .select('id, avatar_url, assigned_to, name')
    .in('phone', uniquePhones)
    .eq('whatsapp_connection_id', connectionId)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function fetchProfilePicFromApi(instance: string, phone: string): Promise<string | null> {
  try {
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
    if (!evolutionUrl || !evolutionKey) return null;
    const baseUrl = evolutionUrl.replace(/\/+$/, '');
    const resp = await fetch(`${baseUrl}/chat/fetchProfilePictureUrl/${instance}`, {
      method: 'POST',
      headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone }),
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const result = await resp.json();
    return result?.profilePictureUrl || result?.picture || result?.url || null;
  } catch { return null; }
}

// deno-lint-ignore no-explicit-any
export async function persistProfilePicture(supabase: any, phone: string, profilePicUrl: string): Promise<string | null> {
  try {
    const response = await fetch(profilePicUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const blob = await response.arrayBuffer();
    const bytes = new Uint8Array(blob);
    if (bytes.length < 100) return null;

    const fileName = `${phone}_${Date.now()}.jpg`;
    const storagePath = `avatars/${fileName}`;

    const { data: oldFiles } = await supabase.storage.from('avatars').list('avatars', { search: phone });
    if (oldFiles?.length) {
      await supabase.storage.from('avatars').remove(oldFiles.map((f: { name: string }) => `avatars/${f.name}`));
    }

    const { error } = await supabase.storage.from('avatars').upload(storagePath, bytes, {
      contentType: 'image/jpeg', cacheControl: '604800', upsert: true,
    });
    if (error) { console.error('Avatar upload error:', error); return null; }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    return urlData.publicUrl;
  } catch (err) { console.error('Avatar persist error:', err); return null; }
}

// deno-lint-ignore no-explicit-any
export async function handleReactionEvent(supabase: any, reactionMessage: Record<string, unknown>, actorFromMe: boolean) {
  const emoji = (reactionMessage.text as string) || '';
  const reactKey = reactionMessage.key as Record<string, unknown> | undefined;
  if (!reactKey?.id) return;

  const targetExternalId = reactKey.id as string;
  const { data: targetMessage } = await supabase
    .from('messages').select('id, contact_id').eq('external_id', targetExternalId).maybeSingle();
  if (!targetMessage) { console.log(`Reaction target not found: ${targetExternalId}`); return; }

  if (emoji === '') {
    if (!actorFromMe) {
      await supabase.from('message_reactions').delete()
        .eq('message_id', targetMessage.id).eq('contact_id', targetMessage.contact_id);
      await supabase.from('messages').update({ updated_at: new Date().toISOString() }).eq('id', targetMessage.id);
      console.log(`Reaction removed on message ${targetExternalId}`);
    }
  } else if (!actorFromMe) {
    const { error: upsertErr } = await supabase.from('message_reactions').upsert(
      { message_id: targetMessage.id, contact_id: targetMessage.contact_id, emoji },
      { onConflict: 'message_id,contact_id,emoji' }
    );
    if (upsertErr) { console.error('Error upserting reaction:', upsertErr); }
    else {
      await supabase.from('messages').update({ updated_at: new Date().toISOString() }).eq('id', targetMessage.id);
      console.log(`Reaction synced: ${emoji} on message ${targetExternalId}`);
    }
  }
}
