# Patches Técnicos Recomendados — P0 e P1

Este documento consolida as alterações prioritárias para eliminar os bloqueadores identificados na auditoria pré-produção.

---

## Patch 1 — Endurecer `supabase/config.toml`

### Objetivo
Fechar JWT em todas as Edge Functions sensíveis.

### Alteração recomendada
```toml
project_id = "allrjhkpuscmgbsnmjlv"

[functions.ai-conversation-summary]
verify_jwt = true

[functions.ai-conversation-analysis]
verify_jwt = true

[functions.ai-suggest-reply]
verify_jwt = true

[functions.ai-transcribe-audio]
verify_jwt = true

[functions.get-mapbox-token]
verify_jwt = false

[functions.whatsapp-webhook]
verify_jwt = false

[functions.sentiment-alert]
verify_jwt = true

[functions.evolution-api]
verify_jwt = true

[functions.evolution-webhook]
verify_jwt = false

[functions.bitrix-api]
verify_jwt = true

[functions.elevenlabs-tts]
verify_jwt = true

[functions.elevenlabs-scribe-token]
verify_jwt = true

[functions.send-rate-limit-alert]
verify_jwt = false

[functions.cleanup-rate-limit-logs]
verify_jwt = false

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

[functions.elevenlabs-tts-stream]
verify_jwt = true

[functions.elevenlabs-webhook]
verify_jwt = false

[functions.elevenlabs-dialogue]
verify_jwt = true

[functions.elevenlabs-voice-design]
verify_jwt = true

[functions.elevenlabs-sts]
verify_jwt = true

[functions.elevenlabs-sfx]
verify_jwt = true
```

### Observação
Webhooks externos reais podem permanecer sem JWT, desde que tenham validação própria de assinatura/segredo.

---

## Patch 2 — Validar assinatura no `whatsapp-webhook`

### Objetivo
Rejeitar POST forjado.

### Bloco utilitário sugerido
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

### Uso no POST
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
}

const rawPayload = JSON.parse(rawBody);
```

---

## Patch 3 — Autenticar o emissor no `evolution-webhook`

### Objetivo
Impedir que POSTs externos alterem o banco sem segredo válido.

### Bloco sugerido
```ts
import { getCorsHeaders } from "../_shared/validation.ts";

function isAuthorizedEvolutionWebhook(req: Request, payload: WebhookPayload): boolean {
  const expected = Deno.env.get('EVOLUTION_WEBHOOK_SECRET') || Deno.env.get('EVOLUTION_API_KEY');
  if (!expected) return false;

  const headerKey = req.headers.get('x-evolution-apikey') || req.headers.get('apikey');
  return headerKey === expected || payload.apikey === expected;
}
```

### Uso no handler
```ts
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: getCorsHeaders(req) });
}

if (req.method !== 'POST') {
  return new Response('Method not allowed', { status: 405, headers: getCorsHeaders(req) });
}

const payload: WebhookPayload = await req.json();

if (!isAuthorizedEvolutionWebhook(req, payload)) {
  return new Response(JSON.stringify({ error: 'Unauthorized webhook sender' }), {
    status: 403,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}
```

### Ajuste adicional
Substituir `corsHeaders` local por `getCorsHeaders(req)`.

---

## Patch 4 — Endurecer `evolution-api`

### Objetivo
Bloquear função administrativa para chamadores sem JWT/permissão.

### Medidas mínimas
1. trocar `corsHeaders` local por `getCorsHeaders(req)`;
2. manter `verify_jwt = true`;
3. validar o usuário e, para ações administrativas, exigir perfil `admin` ou `supervisor`.

### Exemplo de agrupamento de ações sensíveis
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

### Validação sugerida
```ts
const authHeader = req.headers.get('authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Missing authorization' }), {
    status: 401,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
  global: { headers: { Authorization: authHeader } },
});

const { data: authData } = await anonClient.auth.getUser();
const userId = authData.user?.id;
if (!userId) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}
```

Depois disso, resolver o perfil e bloquear `adminOnlyActions` para usuários sem papel apropriado.

---

## Patch 5 — Eliminar fallback perigoso em `sendMessage`

### Objetivo
Impedir envio pela conexão errada.

### Problema atual
Quando a conexão vinculada ao contato não está conectada, o código busca “a última conexão conectada” do sistema.

### Alteração recomendada
Remover completamente o fallback genérico.

### Comportamento desejado
- se o contato não tem `whatsapp_connection_id`, abortar com erro explícito;
- se a conexão vinculada está desconectada, abortar com erro explícito;
- nunca escolher automaticamente outra instância.

### Exemplo de regra
```ts
if (!contact?.whatsapp_connection_id) {
  throw new Error('Contato sem conexão WhatsApp vinculada');
}

const { data: linkedConnection } = await supabase
  .from('whatsapp_connections')
  .select('id, instance_id, status')
  .eq('id', contact.whatsapp_connection_id)
  .single();

if (!linkedConnection?.instance_id || linkedConnection.status !== 'connected') {
  throw new Error('A conexão vinculada ao contato não está ativa');
}
```

---

## Patch 6 — Corrigir corrida em `useMessages`

### Objetivo
Evitar que resposta de fetch antigo sobrescreva o contato atual.

### Implementação sugerida
Adicionar `requestIdRef`.

```ts
const requestIdRef = useRef(0);

const fetchMessages = useCallback(async () => {
  const requestId = ++requestIdRef.current;

  if (!contactId || !mountedRef.current) {
    if (mountedRef.current) {
      setMessages([]);
      setLoading(false);
    }
    return;
  }

  try {
    setLoading(true);
    setError(null);

    // ... fetch paginado ...

    if (!mountedRef.current || requestId !== requestIdRef.current) return;
    setMessages(mappedMessages);
  } catch (err) {
    if (!mountedRef.current || requestId !== requestIdRef.current) return;
    setError(err instanceof Error ? err.message : 'Failed to fetch messages');
  } finally {
    if (mountedRef.current && requestId === requestIdRef.current) {
      setLoading(false);
    }
  }
}, [contactId]);
```

---

## Patch 7 — Reduzir risco de truncamento no inbox global

### Objetivo
Evitar perda de cobertura com volume alto.

### Ajuste recomendado
Substituir limites rígidos por estratégia incremental.

### Opção mínima
- manter 500/1000 como primeira carga visual;
- adicionar banner/telemetria quando houver truncamento;
- buscar contactos faltantes por janela de atividade;
- suportar paginação adicional por scroll ou filtro.

### Telemetria sugerida
```ts
if ((seededContacts?.length ?? 0) === SEEDED_CONTACT_LIMIT) {
  log.warn('Inbox contacts may be truncated', { limit: SEEDED_CONTACT_LIMIT });
}

if ((recentMessages?.length ?? 0) === RECENT_MESSAGES_LIMIT) {
  log.warn('Recent messages may be truncated', { limit: RECENT_MESSAGES_LIMIT });
}
```

---

## Patch 8 — Robustecer painéis de Tarefas e Lembretes

### Objetivo
Evitar criação sem ownership e melhorar tratamento de erro.

### Exemplo para `ConversationTasksPanel`
```ts
if (!profileId) {
  toast.error('Perfil ainda não carregado. Tente novamente em alguns segundos.');
  return;
}

try {
  setSaving(true);
  const { error } = await supabase.from('conversation_tasks').insert({
    contact_id: contactId,
    created_by: profileId,
    assigned_to: profileId,
    title: newTitle.trim(),
    priority,
    status: 'pending',
  });

  if (error) throw error;
  await loadTasks();
} catch (err) {
  toast.error('Erro ao salvar tarefa.');
} finally {
  setSaving(false);
}
```

Aplicar lógica equivalente em `RemindersPanel`.

---

## Patch 9 — Suíte mínima de regressão

### Objetivo
Criar base de proteção para deploys.

### Ajustes recomendados
Adicionar scripts no `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

### Casos mínimos
1. `useMessages` ignora resposta stale.
2. `useRealtimeMessages` não duplica mensagem.
3. `sendMessage` falha quando conexão vinculada está inativa.
4. `ConversationTasksPanel` não cria sem `profileId`.
5. `whatsapp-webhook` rejeita assinatura inválida.

---

## Patch 10 — Atualizar documentação de superfície

### Objetivo
Eliminar divergência entre inventário e sistema real.

### Ações
- alinhar número real de functions no inventário;
- alinhar lista de módulos/rotas/views;
- adicionar tabela de exposição externa: função, finalidade, auth, segredo.

---

## Ordem de implementação recomendada
1. Patch 1 — config JWT.
2. Patch 2 — assinatura WhatsApp.
3. Patch 3 — autenticação Evolution webhook.
4. Patch 4 — hardening evolution-api.
5. Patch 5 — remover fallback de conexão errada.
6. Patch 6 — corrida em `useMessages`.
7. Patch 7 — truncamento inbox.
8. Patch 8 — painéis contextuais.
9. Patch 9 — testes automatizados.
10. Patch 10 — documentação.

---

## Critério de aceite técnico
A rodada P0/P1 só é considerada concluída quando:
- as alterações estiverem em PR aprovado;
- houver evidência de teste manual e automatizado para cada patch crítico;
- staging validar envio, recebimento, webhook legítimo e rejeição de webhook inválido;
- nenhuma mensagem puder sair por conexão não vinculada ao contato.
