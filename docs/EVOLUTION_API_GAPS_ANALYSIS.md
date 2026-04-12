# 🔬 ZAPP-WEB × EVOLUTION API — ANÁLISE DE GAPS

> **Gerado em:** 2026-04-12  
> **Repositório:** adm01-debug/zapp-web  
> **Evolution API Version:** 1.0.1  

---

## 📊 PAINEL EXECUTIVO — COBERTURA DA API

| Categoria | Evolution API | ZAPP-WEB | Cobertura |
|-----------|--------------|----------|----------|
| **Mensagens** | 11 endpoints | 21 funções | ✅ **190%** |
| **Instância** | 13 endpoints | 13 funções | ✅ **100%** |
| **Chat Controller** | 17 endpoints | 9 funções | ⚠️ **53%** |
| **Grupos** | ~12 endpoints | 10 funções | ⚠️ **83%** |
| **Integrações** | 6 plataformas | 8+ plataformas | ✅ **133%** |
| **Event Streaming** | 4 sistemas | 5 sistemas | ✅ **125%** |
| **Validação Webhook** | 1 | 0 | 🔴 **0% CRÍTICO** |
| **Health Monitoring** | 1 | 0 | 🔴 **0% CRÍTICO** |

---

## ✅ IMPLEMENTAÇÕES COMPLETAS

### 1. Mensagens (`useEvolutionMessaging`)

| Evolution API | ZAPP-WEB | Status |
|--------------|----------|--------|
| sendText | `sendTextMessage` | ✅ |
| sendMedia | `sendMediaMessage` | ✅ |
| sendWhatsAppAudio | `sendAudioMessage` | ✅ |
| sendSticker | `sendStickerMessage` | ✅ |
| sendLocation | `sendLocationMessage` | ✅ |
| sendContact | `sendContactMessage` | ✅ |
| sendReaction | `sendReaction` | ✅ |
| sendPoll | `sendPollMessage` | ✅ |
| sendList | `sendListMessage` | ✅ |
| sendButtons | `sendButtonsMessage` | ✅ |
| sendStatus | `sendStatusMessage` | ✅ |
| **EXTRAS** | `sendTemplateMessage`, `sendPtvMessage`, `sendChatPresence` | ✅ Bônus |

### 2. Instância (`useEvolutionInstance`)

| Evolution API | ZAPP-WEB | Status |
|--------------|----------|--------|
| Create Instance | `createInstance` | ✅ |
| Fetch Instances | `listInstances` | ✅ |
| Instance Connect | `connectInstance` | ✅ |
| Connection State | `getInstanceStatus` | ✅ |
| Get Information | `getInstanceInfo` | ✅ |
| Restart Instance | `restartInstance` | ✅ |
| Logout Instance | `disconnectInstance` | ✅ |
| Delete Instance | `deleteInstance` | ✅ |
| Set Presence | `setPresence` | ✅ |
| Set/Get Settings | `setSettings`, `getSettings` | ✅ |
| Set/Get Webhook | `setWebhook`, `getWebhook` | ✅ |

### 3. Integrações (`useEvolutionIntegrations`)

| Plataforma | ZAPP-WEB Funções | Status |
|------------|-----------------|--------|
| Chatwoot | `set/get/deleteChatwoot` | ✅ |
| Typebot | `set/get/deleteTypebot`, `sessions`, `changeStatus`, `start` | ✅ |
| OpenAI | `set/get/deleteOpenAI` | ✅ |
| Dify | `set/get/deleteDify` | ✅ |
| Flowise | `set/get/deleteFlowise` | ✅ |
| Evolution Bot | `set/get/deleteEvolutionBot` | ✅ |
| **EvoAI** | `set/get/deleteEvoAI` | ✅ Bônus |
| **N8N** | `set/get/deleteN8N` | ✅ Bônus |

### 4. Event Streaming

| Sistema | ZAPP-WEB | Status |
|---------|----------|--------|
| RabbitMQ | `set/getRabbitMQ` | ✅ |
| SQS | `set/getSQS` | ✅ |
| Kafka | `set/getKafka` | ✅ |
| NATS | `set/getNats` | ✅ |
| Pusher | `set/getPusher` | ✅ Bônus |

---

## 🔴 GAPS CRÍTICOS

### GAP-1: Chat Controller — 53% coberto

| Endpoint | Status | Impacto |
|----------|--------|---------|
| **Pin/Unpin Chat** | 🔴 MISSING | Fixar conversas importantes |
| **Star/Unstar Message** | 🔴 MISSING | Marcar mensagens favoritas |
| **Clear Chat** | 🔴 MISSING | Limpar histórico |
| **Disappearing Messages** | 🔴 MISSING | Mensagens temporárias |

### GAP-2: Grupos — 83% coberto

| Endpoint | Status | Impacto |
|----------|--------|---------|
| **Find Groups (listar todos)** | 🔴 MISSING | Ver todos os grupos |
| **Update Group Settings** | 🔴 MISSING | Quem pode enviar msgs, admins |
| **Accept Invite** | 🔴 MISSING | Aceitar convite por link |

### GAP-3: Webhook Events

| Evento | Status |
|--------|--------|
| `MESSAGES_UPSERT` | ✅ |
| `MESSAGES_UPDATE` | ✅ |
| `QRCODE_UPDATED` | ✅ |
| `CONNECTION_UPDATE` | ✅ |
| `MESSAGES_DELETE` | ⚠️ Parcial |
| `PRESENCE_UPDATE` | 🔴 MISSING |
| `CHATS_UPDATE` | 🔴 MISSING |
| `CONTACTS_UPDATE` | 🔴 MISSING |
| `LABELS_ASSOCIATION` | 🔴 MISSING |
| `CALL` | 🔴 MISSING |
| `TYPEBOT_*` | 🔴 MISSING |

### GAP-4: Segurança — CRÍTICO

| Item | Status |
|------|--------|
| Validação de assinatura webhook | 🔴 MISSING |
| Rate limiting robusto | ⚠️ Básico |
| Logging estruturado | ⚠️ Parcial |

---

## 📋 PLANO DE AÇÃO — 4 SPRINTS

### Sprint 1: Segurança e Observabilidade (2 semanas)

- [x] Documentar gaps no repositório
- [x] Criar `docs/WEBHOOK_EVENTS.md`
- [ ] Implementar validação de assinatura de webhook
- [ ] Adicionar logging estruturado em edge functions
- [ ] Criar health check endpoint

### Sprint 2: Completude da API (2 semanas)

- [ ] Implementar Pin/Unpin Chat
- [ ] Implementar Star/Unstar Message
- [ ] Implementar Find Groups
- [ ] Implementar tratamento de `PRESENCE_UPDATE`
- [ ] Implementar tratamento de `CALL` events

### Sprint 3: Resiliência (2 semanas)

- [ ] Implementar retry com exponential backoff
- [ ] Criar fila de dead-letter para mensagens falhas
- [ ] Implementar reconciliação de mensagens
- [ ] Adicionar alertas de desconexão

### Sprint 4: Testes e Documentação (2 semanas)

- [ ] Criar testes E2E para fluxo de mensagens
- [ ] Criar testes para cada webhook event
- [ ] Documentar todos os endpoints implementados
- [ ] Criar runbook de troubleshooting

---

## 📁 Arquivos Relevantes

| Hook | Path | Linhas |
|------|------|--------|
| Orchestrador | `src/hooks/useEvolutionApi.ts` | 47 |
| Core | `src/hooks/evolution/useEvolutionApiCore.ts` | ~100 |
| Instance | `src/hooks/evolution/useEvolutionInstance.ts` | ~120 |
| Messaging | `src/hooks/evolution/useEvolutionMessaging.ts` | ~200 |
| Integrations | `src/hooks/evolution/useEvolutionIntegrations.ts` | ~500 |
| Groups | `src/hooks/evolution/useEvolutionGroups.ts` | ~150 |

---

**Conclusão:** Cobertura excelente em mensagens e integrações, gaps críticos em segurança e completude do Chat Controller.
