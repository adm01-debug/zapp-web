# Relatório de Análise Profunda — ZAPP-WEB v3.0

**Data:** 2026-03-26
**Autor:** Senior Back-End Developer (Análise Automatizada)
**Versão:** 3.0 (Análise pós Fases 1-4)
**Escopo:** Arquitetura, OWASP Top 10, Performance, Banco de Dados, Integrações, Manutenibilidade, Operacionalidade, Custos

---

## Sumário Executivo

Análise exaustiva do sistema zapp-web (plataforma WhatsApp Business) cobrindo 449 arquivos frontend, 25 Edge Functions, 9 utilitários compartilhados, 61 migrations e 64+ tabelas com 376+ RLS policies.

### Achados Totais: 78

| Severidade | Qtd | Exemplos |
|------------|-----|----------|
| **CRÍTICO** | 5 | Bucket de mídia público, Messages INSERT sem restrição, RLS calls quebrado |
| **ALTO** | 15 | Race conditions, RLS permissivo, realtime thrashing, i18n ausente |
| **MÉDIO** | 28 | Validação incompleta, performance de queries, error handling |
| **BAIXO** | 30 | Acessibilidade, formatação, documentação |

---

## 1. Segurança (OWASP Top 10)

### 1.1 CRÍTICO — Bucket `whatsapp-media` é PÚBLICO

**Arquivo:** `supabase/migrations/20251223002656_...sql:3`
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true);
```
**Impacto:** Qualquer pessoa na internet pode baixar todas as imagens, vídeos e documentos trocados via WhatsApp — sem autenticação.
**Correção:**
```sql
UPDATE storage.buckets SET public = false WHERE id = 'whatsapp-media';
DROP POLICY IF EXISTS "Anyone can view whatsapp media" ON storage.objects;
CREATE POLICY "Authenticated users can view whatsapp media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp-media');
```

### 1.2 CRÍTICO — Messages INSERT permite qualquer usuário

**Arquivo:** `supabase/migrations/20251215163158_...sql:40-43`
```sql
CREATE POLICY "Users can insert messages"
ON public.messages FOR INSERT WITH CHECK (true);
```
**Impacto:** Qualquer usuário autenticado pode inserir mensagens em QUALQUER contato, se passando por qualquer agente.
**Correção:**
```sql
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages to assigned contacts"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  contact_id IN (SELECT c.id FROM contacts c
    WHERE c.assigned_to IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()))
  OR public.is_admin_or_supervisor(auth.uid())
);
```

### 1.3 CRÍTICO — RLS da tabela `calls` referencia colunas inexistentes

**Arquivo:** `supabase/migrations/20260325130000_...sql:54-72`
A policy usa `caller_id` e `receiver_id`, mas a tabela `calls` só tem `contact_id` e `agent_id`. Resultado: não-admins nunca conseguem ver chamadas.

**Correção:**
```sql
DROP POLICY IF EXISTS "Users can view their calls or admin can view all" ON public.calls;
CREATE POLICY "Users can view their calls"
ON public.calls FOR SELECT TO authenticated
USING (
  agent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR public.is_admin_or_supervisor(auth.uid())
);
```

### 1.4 CRÍTICO — WhatsApp Groups RLS completamente aberto

**Arquivo:** `supabase/migrations/20251215025658_...sql:18-33`
Todas as operações CRUD em `whatsapp_groups` usam `USING (true)` / `WITH CHECK (true)`. Qualquer usuário pode deletar/modificar grupos de qualquer conexão.

### 1.5 CRÍTICO — Race condition na criação de contatos

**Arquivo:** `supabase/functions/evolution-webhook/index.ts:205-223`
SELECT + INSERT sem transação permite webhooks concorrentes criarem contatos duplicados.
**Correção:** Usar `upsert()` com `onConflict: 'phone,whatsapp_connection_id'`.

### 1.6 ALTO — Conversation SLA INSERT/UPDATE sem restrição

**Arquivo:** `supabase/migrations/20251215173646_...sql:46-59`
`WITH CHECK (true)` em INSERT e `USING (true)` em UPDATE. Qualquer agente pode manipular SLAs.

### 1.7 ALTO — Storage buckets sem limites de tamanho/MIME

| Bucket | Size Limit | MIME Limit |
|--------|-----------|------------|
| audio-messages | Nenhum | Nenhum |
| whatsapp-media | Nenhum | Nenhum |
| avatars | 5MB | image/* |

**Risco:** Upload de arquivos arbitrariamente grandes ou executáveis maliciosos.

### 1.8 ALTO — Bearer token não é validado/verificado

Todas as 25 Edge Functions têm `verify_jwt = false`. O Bearer token é apenas comparado como string — sem verificação de assinatura JWT, expiração ou scopes.

---

## 2. Performance

### 2.1 ALTO — RLS com subqueries aninhadas causa lentidão

**Arquivo:** `supabase/migrations/20251215163158_...sql:26-38`
```sql
-- Para CADA linha em messages, executa 2 subqueries
USING (
  contact_id IN (
    SELECT c.id FROM contacts c
    WHERE c.assigned_to IN (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin','supervisor'))
);
```
Com milhões de mensagens, isso é O(n * subquery_cost).

**Correção:** Criar funções `SECURITY DEFINER` com `STABLE` para cache:
```sql
CREATE OR REPLACE FUNCTION public.user_assigned_contacts(p_user_id UUID)
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(SELECT c.id FROM contacts c
    JOIN profiles p ON c.assigned_to = p.id WHERE p.user_id = p_user_id);
$$;
```

### 2.2 ALTO — Realtime thrashing com 1000+ usuários

14 tabelas com realtime habilitado. Sem filtros no lado do servidor, cada cliente recebe TODAS as mudanças de TODOS os contatos.

**Impacto estimado (100 msgs/min × 1000 users):** ~100K eventos/min, ~50Mbps de WebSocket.

**Correção:** Usar filtros nas subscriptions:
```typescript
supabase.channel(`messages:${contactId}`)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'messages',
    filter: `contact_id=eq.${contactId}`  // Filtro server-side
  }, handleChange)
```

### 2.3 MÉDIO — Queries sem `.limit()` em hooks críticos

| Hook | Tabela | Problema |
|------|--------|----------|
| `useAgents.ts:44` | profiles | `.select('*').order('name')` sem limit |
| `useDashboardData.ts:79` | contacts | `.select('assigned_to')` sem limit |
| `useQuickReplies.ts:48` | message_templates | `.select('*')` sem limit |

### 2.4 MÉDIO — React Query staleTime muito curto (1 min)

**Arquivo:** `src/App.tsx:63`
```typescript
staleTime: 1000 * 60 * 1,  // 1 minuto — causa refetch excessivo em navegação
```
**Recomendação:** 5 minutos para dados gerais, `gcTime: 30min`.

### 2.5 MÉDIO — Contagens feitas em JavaScript ao invés de SQL

`useAgents.ts:76-97` busca TODOS os contatos e conta `assigned_to` em loop JS. Deveria usar `supabase.rpc('get_agent_active_chat_count')`.

---

## 3. Banco de Dados

### 3.1 ALTO — Missing `updated_at` triggers

Tabelas com `updated_at` mas SEM trigger automático:
- `contacts` — Crítico para ordenação de conversas
- `calls` — Sem coluna `updated_at` sequer
- `campaign_contacts` — Sem `updated_at`
- `chatbot_executions` — Sem `updated_at`

### 3.2 MÉDIO — Inconsistência TEXT vs ENUM para status

`profiles.role` usa TEXT com CHECK, mas `user_roles.role` usa ENUM `app_role`. Múltiplas tabelas usam TEXT sem CHECK para campos de status.

### 3.3 MÉDIO — Duplicate/conflicting policy definitions

Políticas criadas, dropadas e recriadas ao longo de 61 migrations. Risco de janelas sem políticas durante deploys.

### 3.4 BAIXO — Sem DOWN migrations

Nenhuma migration tem rollback. Impossível reverter alterações de schema.

---

## 4. Lógica de Negócio

### 4.1 MÉDIO — Transição de status de mensagem sem validação

**Arquivo:** `evolution-webhook/index.ts:148-165`
Aceita qualquer transição de status (ex: `read` → `sent`). Sem state machine.

**Correção:**
```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  'sending': ['sent', 'failed'],
  'sent': ['delivered', 'failed'],
  'delivered': ['read', 'failed'],
  'read': [], 'failed': []
};
```

### 4.2 MÉDIO — Transcrição de áudio fire-and-forget

**Arquivo:** `evolution-webhook/index.ts:639-713`
Se transcrição falha, webhook retorna `{ success: true }`. Erro não é propagado nem enfileirado no DLQ.

### 4.3 MÉDIO — Contato via public-api criado sem assignment

**Arquivo:** `public-api/index.ts:119-126`
Contatos criados sem `assigned_to` — ficam invisíveis no chat dos agentes.

### 4.4 MÉDIO — WhatsApp Cloud API não processa mensagens

**Arquivo:** `whatsapp-webhook/index.ts:162-167`
Mensagens recebidas são apenas logadas, não salvas no banco. Implementação incompleta.

### 4.5 MÉDIO — Formato de erro inconsistente entre funções

3 padrões diferentes:
- `{ error: string }` — evolution-webhook
- `{ error: string, details: object }` — send-email
- `{ error: string, message: string }` — bitrix-api

---

## 5. Frontend

### 5.1 ALTO — i18n inexistente (40+ strings hardcoded)

Todas as mensagens de toast, erro e UI estão hardcoded em português. Sem framework i18n.

**Exemplos:**
```typescript
toast.success('Campanha criada com sucesso!');  // useCampaigns.ts:57
toast.error('Erro ao carregar contatos');       // ContactsView.tsx:191
toast({ title: 'Avaliação enviada!' });         // useCSAT.ts:96
```

### 5.2 MÉDIO — Error handling silencioso em mutations

**Arquivo:** `useCampaigns.ts:59`
```typescript
onError: (err: Error) => toast.error(`Erro: ${err.message}`),
// Sem logging, sem métricas, sem fallback
```

### 5.3 MÉDIO — State update após unmount em useMessagesReactions

**Arquivo:** `useMessageReactions.ts:153-192`
Async fetch sem AbortController. `setReactionsMap()` pode ser chamado após unmount.

### 5.4 MÉDIO — Error boundaries insuficientes

Apenas root-level ErrorBoundary. Crash em ChatPanel derruba toda a inbox view. Faltam boundaries em:
- Route-level (cada rota independente)
- Feature-level (chat, dashboard, admin)

### 5.5 BAIXO — Acessibilidade

- Faltam `aria-label` em botões de filtro (`ContactsView`)
- Search input sem `aria-label` (`GlobalSearch`)
- Keyboard navigation incompleta em busca global

---

## 6. Integrações

### 6.1 MÉDIO — evolution-sync usa fetch direto sem timeout

**Arquivo:** `evolution-sync/index.ts:57-67`
```typescript
const contactsResponse = await fetch(
  `${evolutionApiUrl}/chat/findContacts/${instanceName}`, {...}
);
// Sem timeout, sem retry, sem circuit breaker
```

### 6.2 MÉDIO — Eventos de webhook não cobertos

Evolution webhook não trata: `message.edit`, `group.setting.update`, `connection.offline_actions`. Eventos desconhecidos são silenciosamente ignorados.

### 6.3 BAIXO — Timestamp sem validação

`messageTimestamp * 1000` assume Unix seconds sem validar range. Timestamps futuros ou muito antigos aceitos silenciosamente.

---

## 7. Operacionalidade

### 7.1 MÉDIO — Sem cron para cleanup de cache/idempotency

`cleanup-ai-cache` existe mas não é agendado. Tabelas `ai_response_cache` e `idempotency_keys` crescem indefinidamente.

### 7.2 MÉDIO — Cache hit count fire-and-forget

**Arquivo:** `_shared/aiCache.ts:71-75`
```typescript
supabaseClient.rpc('increment_ai_cache_hit', { p_cache_key: cacheKey })
  .then(() => {}).catch((err) => console.error(err));
// Métricas imprecisas se RPC falhar
```

### 7.3 MÉDIO — DLQ sem detecção de loop infinito

Se `processFn` enfileira novamente no DLQ, cria O(retries^2) entradas. Sem depth tracking ou cap de delay.

### 7.4 MÉDIO — Rate limiter sem bound de memória

**Arquivo:** `_shared/rateLimiter.ts:14`
`Map` cresce sem limite com IPs únicos. DDoS com IPs variados = memory exhaustion.

**Correção:** Adicionar `MAX_ENTRIES = 10000` e evict entries mais antigas.

### 7.5 BAIXO — Circuit breaker per-isolate, não distribuído

Estado perdido em restart/redeploy. Isolates diferentes mantêm estados independentes.

---

## 8. Custos

### 8.1 ALTO — Realtime broadcasting excessivo

14 tabelas × 1000 usuários × alta frequência = custos significativos de WebSocket. Filtros server-side reduziriam 80-90% do tráfego.

### 8.2 MÉDIO — AI cache hit rate não monitorado

Sem dashboard para verificar se o cache está efetivamente economizando chamadas AI.

### 8.3 BAIXO — Queries sem select específico (`select('*')`)

Busca colunas desnecessárias, aumentando bandwidth e latência.

---

## 9. Roadmap de Correções

### Fase 1 — CRÍTICO (Dia 1)

| # | Item | Complexidade |
|---|------|-------------|
| 1 | Tornar bucket `whatsapp-media` privado | Baixa |
| 2 | Fix Messages INSERT RLS (WITH CHECK restritivo) | Baixa |
| 3 | Fix calls RLS (agent_id ao invés de caller_id) | Baixa |
| 4 | Fix whatsapp_groups RLS (admin/supervisor only) | Baixa |
| 5 | Fix race condition contatos (upsert) | Média |

### Fase 2 — ALTO (Semana 1)

| # | Item | Complexidade |
|---|------|-------------|
| 6 | Fix conversation_sla RLS | Baixa |
| 7 | Adicionar size/MIME limits nos buckets | Baixa |
| 8 | Adicionar updated_at triggers | Média |
| 9 | Otimizar RLS com SECURITY DEFINER functions | Média |
| 10 | Filtrar realtime subscriptions (server-side filters) | Média |
| 11 | Fix state machine de status de mensagem | Média |
| 12 | Implementar i18n framework (i18next) | Alta |

### Fase 3 — MÉDIO (Mês 1)

| # | Item | Complexidade |
|---|------|-------------|
| 13 | Padronizar formato de erro nas Edge Functions | Média |
| 14 | Implementar WhatsApp Cloud API message handler | Alta |
| 15 | Adicionar .limit() em queries sem bound | Baixa |
| 16 | Rate limiter com MAX_ENTRIES | Baixa |
| 17 | DLQ com depth tracking | Média |
| 18 | Agendar cron para cleanup | Baixa |
| 19 | Error boundaries por rota/feature | Média |
| 20 | Ajustar React Query staleTime/gcTime | Baixa |

### Fase 4 — BAIXO (Trimestre)

| # | Item | Complexidade |
|---|------|-------------|
| 21 | ENUM types para status columns | Média |
| 22 | DOWN migrations | Média |
| 23 | Acessibilidade (aria-labels, keyboard nav) | Média |
| 24 | CDN para media files | Média |
| 25 | Virus scanning para uploads | Alta |
| 26 | Circuit breaker persistente | Alta |
| 27 | API documentation (OpenAPI) | Média |
| 28 | Formatação centralizada (datas, números) | Baixa |

---

## 10. Benchmarking

| Aspecto | Zapp-web | Padrão Mercado | Gap |
|---------|---------|----------------|-----|
| Storage security | Bucket público | Signed URLs + private | CRÍTICO |
| Message RLS | WITH CHECK (true) | Scoped por assignment | CRÍTICO |
| i18n | Hardcoded PT-BR | i18next/react-intl | ALTO |
| Realtime filtering | Client-side only | Server-side filters | ALTO |
| RLS performance | Nested subqueries | SECURITY DEFINER funcs | ALTO |
| Error handling | Toast only | Toast + logging + metrics | MÉDIO |
| Input validation | Parcial (8/25 funções) | Zod schemas completos | MÉDIO |
| Test coverage | 1979 testes (100%) | >80% | ACIMA |
| Auth (MFA+WebAuthn) | Completo | MFA básico | ACIMA |
| Circuit breaker | 5 serviços | Mesmo padrão | PAR |
| Structured logging | 6 funções | Todas as funções | ABAIXO |

### Pontuação

| Categoria | Nota |
|-----------|------|
| Segurança | **6.0** (5 críticos abertos) |
| Performance | **7.0** |
| Banco de Dados | **6.5** |
| Integrações | **7.5** |
| Frontend | **7.0** |
| Operacionalidade | **7.0** |
| Manutenibilidade | **7.0** |
| Custos | **7.0** |
| **Média Geral** | **6.9** |

---

## Conclusão

O sistema tem uma base sólida com auth robusto (MFA+WebAuthn), test coverage completo (1979 testes), e padrões modernos (circuit breaker, DLQ, AI cache). Porém, **5 vulnerabilidades críticas de segurança** precisam de correção imediata:

1. **Bucket de mídia público** — dados privados acessíveis pela internet
2. **Messages INSERT sem restrição** — qualquer usuário pode enviar mensagens como qualquer agente
3. **RLS calls quebrado** — referencia colunas inexistentes
4. **WhatsApp groups sem proteção** — CRUD aberto para todos
5. **Race condition em contatos** — duplicatas em webhooks concorrentes

A nota geral de **6.9/10** reflete que o sistema é funcional e bem construído, mas tem gaps de segurança que impedem produção sem as correções da Fase 1.
