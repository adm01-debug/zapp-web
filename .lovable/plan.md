

# Plano: Sincronização em Massa de Mensagens Antigas do WhatsApp

## O que existe hoje

A Edge Function `evolution-sync` ja possui a action `sync-messages` que usa a Evolution API (`/chat/findMessages/{instance}`) para buscar historico. Porem:
- Funciona para **1 contato por vez** (exige `contactPhone`)
- Busca apenas **50 mensagens** por contato
- Nao ha botao na UI para disparar a sincronizacao
- O `full-sync` atual sincroniza apenas **contatos**, nao mensagens

## O que sera feito

### 1. Criar action `sync-all-messages` na Edge Function `evolution-sync`

Nova action que:
- Busca todos os contatos do banco vinculados a instancia
- Para cada contato, chama `/chat/findMessages/{instance}` com `offset: 200` (mais mensagens)
- Deduplica por `external_id` (ja existente)
- Processa mensagens enviadas (`fromMe: true` -> sender `agent`) e recebidas
- Retorna progresso (total processado, sincronizado, pulados)
- Processa em lotes de 20 contatos para evitar timeout

### 2. Adicionar botao "Sincronizar Historico" na UI

Adicionar na tela de conexoes WhatsApp (ou no inbox) um botao que:
- Chama `supabase.functions.invoke('evolution-sync', { body: { action: 'sync-all-messages', instanceName } })`
- Mostra progresso com toast/loading
- Permite re-executar para buscar mais contatos

### 3. Incluir mensagens no `full-sync`

Apos sincronizar contatos no `full-sync`, tambem sincronizar as ultimas 50 mensagens de cada contato importado.

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/evolution-sync/index.ts` | Nova action `sync-all-messages` + incluir sync de mensagens no `full-sync` |
| Componente de conexoes WhatsApp (a identificar) | Botao "Sincronizar Historico" |

## Detalhes tecnicos

- A Evolution API endpoint `/chat/findMessages/{instance}` aceita `page` e `offset` para paginacao
- Deduplicacao via `external_id` (campo unico por mensagem do WhatsApp)
- Timeout da Edge Function: ~60s — processamento em lotes com resposta parcial
- Mensagens com `key.fromMe = true` serao salvas como `sender: 'agent'`
- Tipos suportados: text, image, video, audio, document, sticker (ja implementados no sync existente)

