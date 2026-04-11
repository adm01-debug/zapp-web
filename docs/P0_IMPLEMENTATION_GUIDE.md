# Guia de Implementação P0 — ZAPP WEB

Este guia traz as alterações exatas a serem aplicadas nos arquivos críticos para fechar os bloqueadores de produção.

---

## 1. `supabase/config.toml`

Substituir os trechos abaixo para exigir JWT nas funções sensíveis.

```toml
[functions.ai-conversation-summary]
verify_jwt = true

[functions.ai-conversation-analysis]
verify_jwt = true

[functions.ai-suggest-reply]
verify_jwt = true

[functions.ai-transcribe-audio]
verify_jwt = true

[functions.sentiment-alert]
verify_jwt = true

[functions.evolution-api]
verify_jwt = true

[functions.bitrix-api]
verify_jwt = true

[functions.evolution-sync]
verify_jwt = true

[functions.ai-enhance-message]
verify_jwt = true

[functions.classify-audio-meme]
verify_jwt = true

[functions.classify-emoji]
verify_jwt = true

[functions.classify-sticker]
verify_jwt = true

[functions.elevenlabs-tts]
verify_jwt = true

[functions.elevenlabs-scribe-token]
verify_jwt = true

[functions.elevenlabs-tts-stream]
verify_jwt = true

[functions.elevenlabs-dialogue]
verify_jwt = true

[functions.elevenlabs-voice-design]
verify_jwt = true

[functions.elevenlabs-sts]
verify_jwt = true

[functions.elevenlabs-sfx]
verify_jwt = true
```

Manter sem JWT apenas webhooks públicos reais ou jobs controlados externamente.

---

## 2. `supabase/functions/whatsapp-webhook/index.ts`

### Adicionar utilitário antes do `serve`

```ts
async function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const provided = signatureHeader.replace('sha256=', '');
  if (provided.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
```

### No bloco `POST`, trocar o parse direto por:

```ts
const rawBody = await req.text();
const appSecret = Deno.env.get('WHATSAPP_APP_SECRET');

if (appSecret) {
  const valid = await verifyWhatsAppSignature(
    rawBody,
    req.headers.get('x-hub-signature-256'),
    appSecret,
  );

  if (!valid) {
    log.warn('Invalid WhatsApp webhook signature');
    return new Response('Forbidden', { status: 403, headers: getCorsHeaders(req) });
  }
} else {
  log.warn('WHATSAPP_APP_SECRET not configured; POST signature verification skipped');
}

const rawPayload = JSON.parse(rawBody);
const parsed = WhatsAppWebhookSchema.safeParse(rawPayload);
```

---

## 3. `supabase/functions/evolution-webhook/index.ts`

### Ajustar imports
Trocar:
```ts
import { Logger } from "../_shared/validation.ts";
```
por:
```ts
import { Logger, getCorsHeaders } from "../_shared/validation.ts";
```

### Remover `corsHeaders` local com `*`
Não usar mais o objeto local de CORS. Sempre usar `getCorsHeaders(req)`.

### Adicionar autenticação do emissor
Adicionar antes do `serve`:

```ts
function isAuthorizedEvolutionWebhook(req: Request, payload: WebhookPayload): boolean {
  const expected = Deno.env.get('EVOLUTION_WEBHOOK_SECRET') || Deno.env.get('EVOLUTION_API_KEY');
  if (!expected) return false;

  const headerKey = req.headers.get('x-evolution-apikey') || req.headers.get('apikey');
  return headerKey === expected || payload.apikey === expected;
}
```

### No início do handler
Trocar por:

```ts
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();

    if (!isAuthorizedEvolutionWebhook(req, payload)) {
      return new Response(JSON.stringify({ error: 'Unauthorized webhook sender' }), {
        status: 403,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
```

### Todas as respostas JSON devem usar `getCorsHeaders(req)`
Exemplo:

```ts
return new Response(JSON.stringify({ success: true }), {
  status: 200,
  headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
});
```

---

## 4. `supabase/functions/evolution-api/index.ts`

### Ajustar imports
Trocar:
```ts
import { Logger } from "../_shared/validation.ts";
```
por:
```ts
import { Logger, getCorsHeaders } from "../_shared/validation.ts";
```

### Remover `corsHeaders` local com `*`
Não usar mais `Access-Control-Allow-Origin: '*'`.

### Substituir preflight
```ts
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: getCorsHeaders(req) });
}
```

### Adicionar controle de ações administrativas
Adicionar próximo da resolução de `action`:

```ts
const adminOnlyActions = new Set([
  'create-instance',
  'delete-instance',
  'disconnect',
  'restart-instance',
  'set-webhook',
  'set-chatwoot',
  'set-typebot',
  'set-openai',
  'set-dify',
  'set-flowise',
  'set-evolution-bot',
  'set-rabbitmq',
  'set-sqs',
  'set-proxy',
  'set-evoai',
  'set-n8n',
  'set-kafka',
  'set-nats',
  'set-pusher',
]);
```

### Validar usuário autenticado e papel
Adicionar antes do `try` principal de roteamento:

```ts
const authHeader = req.headers.get('authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Missing authorization' }), {
    status: 401,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
if (!anonKey) {
  return new Response(JSON.stringify({ error: 'SUPABASE_ANON_KEY not configured' }), {
    status: 500,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

const authClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },
});

const { data: authData } = await authClient.auth.getUser();
const userId = authData.user?.id;
if (!userId) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

if (adminOnlyActions.has(String(action))) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile || !['admin', 'supervisor'].includes(String(profile.role))) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
}
```

### Todas as respostas devem usar `getCorsHeaders(req)`
Aplicar em todo o arquivo.

---

## 5. `src/hooks/useRealtimeMessages.ts`

### Objetivo
Eliminar fallback perigoso de conexão errada em `sendMessage`.

### Remover este comportamento
Não buscar mais “a última conexão conectada” quando a conexão do contato estiver desconectada.

### Substituir pela lógica abaixo
```ts
const { data: contact } = await supabase
  .from('contacts')
  .select('phone, whatsapp_connection_id')
  .eq('id', contactId)
  .single();

if (!contact?.whatsapp_connection_id) {
  await supabase.from('messages').update({ status: 'failed' }).eq('id', data.id);
  throw new Error('Contato sem conexão WhatsApp vinculada');
}

const { data: linkedConnection } = await supabase
  .from('whatsapp_connections')
  .select('id, instance_id, status')
  .eq('id', contact.whatsapp_connection_id)
  .single();

if (!linkedConnection?.instance_id || linkedConnection.status !== 'connected') {
  await supabase
    .from('messages')
    .update({ status: 'failed', whatsapp_connection_id: contact.whatsapp_connection_id })
    .eq('id', data.id);

  throw new Error('A conexão vinculada ao contato não está ativa');
}

const resolvedConnectionId = linkedConnection.id;
const connection = {
  instance_id: linkedConnection.instance_id,
  status: linkedConnection.status,
};
```

---

## 6. `src/hooks/useMessages.ts`

### Objetivo
Evitar corrida em troca rápida de contato.

### Adicionar ref
```ts
const requestIdRef = useRef(0);
```

### No começo de `fetchMessages`
```ts
const requestId = ++requestIdRef.current;
```

### Antes de qualquer `setMessages`, `setError` e `setLoading`
Usar guard:

```ts
if (!mountedRef.current || requestId !== requestIdRef.current) return;
```

### Exemplo de bloco final correto
```ts
if (mountedRef.current && requestId === requestIdRef.current) {
  setMessages(mappedMessages);
}
```

```ts
if (mountedRef.current && requestId === requestIdRef.current) {
  setError(err instanceof Error ? err.message : 'Failed to fetch messages');
}
```

```ts
if (mountedRef.current && requestId === requestIdRef.current) {
  setLoading(false);
}
```

---

## 7. `src/components/inbox/ConversationTasksPanel.tsx`

### Objetivo
Bloquear criação sem ownership e tratar erro corretamente.

### Padrão recomendado
```ts
if (!profileId) {
  toast.error('Perfil ainda não carregado. Tente novamente em alguns segundos.');
  return;
}

try {
  setAdding(true);
  const { error } = await supabase.from('conversation_tasks').insert({
    contact_id: contactId,
    title: newTitle.trim(),
    priority,
    status: 'pending',
    created_by: profileId,
    assigned_to: profileId,
  });

  if (error) throw error;
  setNewTitle('');
  await loadTasks();
} catch (err) {
  toast.error('Erro ao salvar tarefa.');
} finally {
  setAdding(false);
}
```

### Inputs e botão
Desabilitar quando `!profileId || adding`.

---

## 8. `src/components/inbox/RemindersPanel.tsx`

Aplicar o mesmo padrão de robustez do painel de tarefas.

### Padrão recomendado
```ts
if (!profileId) {
  toast.error('Perfil ainda não carregado. Tente novamente em alguns segundos.');
  return;
}

try {
  setSaving(true);
  // insert/update reminder
  await loadReminders();
} catch (err) {
  toast.error('Erro ao salvar lembrete.');
} finally {
  setSaving(false);
}
```

---

## 9. `package.json`

### Adicionar scripts de teste
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

---

## 10. Evidência final necessária
Depois das alterações:
1. rodar lint;
2. rodar build;
3. validar webhook legítimo e webhook inválido;
4. validar envio com conexão correta e erro com conexão errada;
5. validar troca rápida de conversa sem sobrescrita stale.
