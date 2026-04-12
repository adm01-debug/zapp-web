# 📡 ZAPP-WEB — WEBHOOK EVENTS DOCUMENTATION

> **Versão:** 1.0  
> **Última atualização:** 2026-04-12  
> **Evolution API Version:** 1.0.1

---

## 🎯 VISÃO GERAL

O ZAPP-WEB recebe eventos do WhatsApp através de webhooks configurados na Evolution API. Este documento detalha quais eventos são processados, seus payloads e as ações tomadas pelo sistema.

---

## 📥 ENDPOINT DE RECEBIMENTO

```
POST https://[PROJECT_ID].supabase.co/functions/v1/evolution-sync
```

### Headers Esperados

| Header | Descrição |
|--------|-----------|
| `Content-Type` | `application/json` |
| `x-evolution-signature` | HMAC-SHA256 do body (⚠️ validação pendente) |
| `x-evolution-instance` | Nome da instância |

---

## ✅ EVENTOS SUPORTADOS

### 1. `MESSAGES_UPSERT`

**Quando dispara:** Nova mensagem recebida ou enviada.

**Payload:**
```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "wpp2",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "ABCDEF123456"
    },
    "pushName": "João Silva",
    "message": {
      "conversation": "Olá, bom dia!"
    },
    "messageTimestamp": 1712950800,
    "messageType": "conversation"
  }
}
```

**Ações no ZAPP-WEB:**
1. Busca ou cria contato pelo `remoteJid`
2. Insere em `messages_whatsapp` com `external_id = key.id`
3. Atualiza `contacts_whatsapp.last_message_at`
4. Se `fromMe = false`, incrementa contador de não lidas
5. Dispara análise de sentimento via OpenAI (se habilitado)
6. Sincroniza com CRM externo (`sync_interaction_from_zapp`)

**Tabelas afetadas:**
- `contacts_whatsapp`
- `messages_whatsapp`
- `crm_interactions` (externo)

---

### 2. `MESSAGES_UPDATE`

**Quando dispara:** Mensagem atualizada (status de entrega/leitura).

**Payload:**
```json
{
  "event": "MESSAGES_UPDATE",
  "instance": "wpp2",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "id": "ABCDEF123456"
    },
    "update": {
      "status": 3
    }
  }
}
```

**Status codes:**
| Code | Significado |
|------|-------------|
| 0 | ERROR |
| 1 | PENDING |
| 2 | SERVER_ACK (enviada) |
| 3 | DELIVERY_ACK (entregue) |
| 4 | READ (lida) |
| 5 | PLAYED (áudio ouvido) |

**Ações no ZAPP-WEB:**
1. Busca mensagem por `external_id`
2. Atualiza campo `status`
3. Emite evento realtime para UI

**Tabelas afetadas:**
- `messages_whatsapp`

---

### 3. `CONNECTION_UPDATE`

**Quando dispara:** Status da conexão WhatsApp muda.

**Payload:**
```json
{
  "event": "CONNECTION_UPDATE",
  "instance": "wpp2",
  "data": {
    "state": "open",
    "statusReason": 200
  }
}
```

**States possíveis:**
| State | Significado |
|-------|-------------|
| `connecting` | Conectando... |
| `open` | Conectado |
| `close` | Desconectado |
| `refused` | Conexão recusada |

**Ações no ZAPP-WEB:**
1. Atualiza `instances.connection_status`
2. Se `state = close`, agenda reconexão automática
3. Notifica admins se desconexão persistir > 5min

**Tabelas afetadas:**
- `instances`
- `system_notifications`

---

### 4. `QRCODE_UPDATED`

**Quando dispara:** Novo QR Code gerado para conexão.

**Payload:**
```json
{
  "event": "QRCODE_UPDATED",
  "instance": "wpp2",
  "data": {
    "qrcode": {
      "base64": "data:image/png;base64,...",
      "code": "2@..."
    }
  }
}
```

**Ações no ZAPP-WEB:**
1. Emite via Realtime para UI
2. Exibe QR Code na tela de configuração
3. Inicia timeout de 60s para expiração

**Tabelas afetadas:**
- Nenhuma (apenas realtime)

---

### 5. `MESSAGES_DELETE`

**Quando dispara:** Mensagem apagada.

**Payload:**
```json
{
  "event": "MESSAGES_DELETE",
  "instance": "wpp2",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "id": "ABCDEF123456"
    }
  }
}
```

**Ações no ZAPP-WEB:**
1. Marca mensagem como `deleted_at = NOW()`
2. ⚠️ **Não propaga para UI em tempo real** (gap identificado)

**Tabelas afetadas:**
- `messages_whatsapp`

---

## 🔴 EVENTOS NÃO IMPLEMENTADOS

### `PRESENCE_UPDATE`

**Quando dispara:** Contato fica online/offline, digitando.

**Payload esperado:**
```json
{
  "event": "PRESENCE_UPDATE",
  "instance": "wpp2",
  "data": {
    "id": "5511999999999@s.whatsapp.net",
    "presences": {
      "5511999999999@s.whatsapp.net": {
        "lastKnownPresence": "available",
        "lastSeen": 1712950800
      }
    }
  }
}
```

**Status:** 🔴 NÃO IMPLEMENTADO

**Ação sugerida:**
1. Atualizar `contacts_whatsapp.last_seen_at`
2. Exibir indicador de "online" na UI

---

### `CHATS_UPDATE`

**Quando dispara:** Chat arquivado, fixado, etc.

**Status:** 🔴 NÃO IMPLEMENTADO

---

### `CONTACTS_UPDATE`

**Quando dispara:** Contato atualiza foto, nome, status.

**Status:** 🔴 NÃO IMPLEMENTADO

**Ação sugerida:**
1. Atualizar `contacts_whatsapp.name`, `profile_picture_url`

---

### `LABELS_ASSOCIATION`

**Quando dispara:** Etiqueta adicionada/removida de chat.

**Status:** 🔴 NÃO IMPLEMENTADO

**Ação sugerida:**
1. Sincronizar etiquetas do WhatsApp Business com `contact_labels`

---

### `CALL`

**Quando dispara:** Chamada de voz/vídeo recebida.

**Payload esperado:**
```json
{
  "event": "CALL",
  "instance": "wpp2",
  "data": {
    "from": "5511999999999@s.whatsapp.net",
    "isVideo": false,
    "isGroup": false,
    "status": "offer"
  }
}
```

**Status:** 🔴 NÃO IMPLEMENTADO

**Ação sugerida:**
1. Registrar em `call_history`
2. Notificar atendente
3. Opcionalmente rejeitar automaticamente

---

### `TYPEBOT_*`

**Eventos:** `TYPEBOT_START`, `TYPEBOT_CHANGE_STATUS`

**Status:** 🔴 NÃO IMPLEMENTADO

---

## 🔐 SEGURANÇA — PENDÊNCIAS

### Validação de Assinatura (NÃO IMPLEMENTADO)

⚠️ **CRÍTICO:** Qualquer requisição pode ser aceita como webhook válido.

**Implementação sugerida:**

```typescript
// supabase/functions/evolution-sync/index.ts

const WEBHOOK_SECRET = Deno.env.get('EVOLUTION_WEBHOOK_SECRET');

const validateSignature = (body: string, signature: string): boolean => {
  const hmac = createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get('x-evolution-signature') || '';
  
  if (!validateSignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  // Process webhook...
});
```

---

## 📊 MÉTRICAS DE MONITORAMENTO

| Métrica | Como calcular |
|---------|---------------|
| Webhooks recebidos/hora | `COUNT(*)` em logs |
| Taxa de sucesso | `COUNT(status=200) / COUNT(*)` |
| Latência média | `AVG(processing_time)` |
| Eventos por tipo | `GROUP BY event_type` |

---

## 🛠️ TROUBLESHOOTING

### Mensagens não aparecem na UI

1. Verificar se webhook está configurado na Evolution API
2. Verificar logs da edge function `evolution-sync`
3. Verificar se `external_id` não está duplicado

### QR Code não aparece

1. Verificar canal Realtime do Supabase
2. Verificar se evento `QRCODE_UPDATED` está chegando

### Conexão cai frequentemente

1. Verificar estabilidade da Evolution API
2. Verificar se celular não está desconectando WhatsApp Web
3. Verificar se webhook de `CONNECTION_UPDATE` está sendo processado

---

## 📚 REFERÊNCIAS

- [Evolution API Documentation](https://doc.evolution-api.com)
- [ADR-004: Evolution API Webhook Bridge](./decisions/ADR-004-evolution-api-webhook-bridge.md)
- [EVOLUTION_API_REFERENCE.md](./EVOLUTION_API_REFERENCE.md)
