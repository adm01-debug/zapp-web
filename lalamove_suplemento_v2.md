# Lalamove Brasil — Suplemento Técnico v2
### Token Manager · Histórico de Pedidos (Paginação UAPI) · Flows n8n (F01–F04)
> **Gerado em:** 09/03/2026 | **Complementa:** `lalamove_documentacao_completa` (08/03/2026)  
> **Metodologia:** Evidence-First, Production-Tested | **Autor:** Pink e Cerébro

---

## ÍNDICE

1. [Token Manager — Automação de Sessão UAPI](#1-token-manager--automação-de-sessão-uapi)
2. [Histórico de Pedidos — Paginação UAPI](#2-histórico-de-pedidos--paginação-uapi)
3. [Análise de Negócio — 7.740 Pedidos](#3-análise-de-negócio--7740-pedidos)
4. [Flows n8n — Arquitetura e Implementação](#4-flows-n8n--arquitetura-e-implementação)
5. [Mapa de Campos — SPA 1690 Lalamove](#5-mapa-de-campos--spa-1690-lalamove)
6. [Guia de Deploy dos Flows](#6-guia-de-deploy-dos-flows)
7. [Arquivos Gerados](#7-arquivos-gerados)

---

## 1. Token Manager — Automação de Sessão UAPI

### 1.1 Contexto e Problema

A UAPI interna (`br-uapi.lalamove.com`) exige um **session token** obtido via login com telefone + senha. O token tem validade de **24 horas**. Como o endpoint `login_by_pwd` está bloqueado pelo WAF Argus (`ret=10010`), era necessário um mecanismo de renovação automática que não dependesse de intervenção humana.

### 1.2 Descoberta Crítica: `refresh_token`

O endpoint `_m=refresh_token` **não está bloqueado** pelo WAF e permite renovar a sessão sem recorrer ao Playwright:

| Situação | Método | Tempo |
|----------|--------|-------|
| Token < 20h | Cache local (`/tmp/lalamove_session.json`) | 0ms |
| Token entre 20h–24h | `refresh_token` (UAPI) | ~400ms |
| Token > 24h (expirado) | Playwright re-login headless | ~40s |

**Comportamento confirmado em produção:**
- `refresh_token` é **single-use** — cada chamada retorna um novo refresh token
- Só funciona enquanto o access token ainda está válido (dentro das 24h)
- O campo correto no JSON de sessão é `raw.refresh_token` (não `refresh_token` no nível raiz)

#### Chamada `refresh_token`

```
POST https://br-uapi.lalamove.com/index.php?_m=refresh_token&hcountry=20000&...
Body: token={ACCESS_TOKEN}&is_ep=1&hcountry=20000&hlang=pt_BR&city_id=21001
      &args={"refresh_token":"{REFRESH_TOKEN_ATUAL}"}
```

**Resposta:**
```json
{
  "ret": 0,
  "data": {
    "token": "novo_access_token",
    "raw": {
      "refresh_token": "novo_refresh_token_single_use"
    }
  }
}
```

### 1.3 Fluxo de Renovação

```
token_manager.py
   │
   ├─ [token < 20h] → retorna do cache local
   │
   ├─ [token 20h–24h] → POST refresh_token → salva novo par (access+refresh)
   │
   └─ [token > 24h ou falha] → Playwright headless → login_by_pwd → salva sessão completa
```

### 1.4 Uso do Token Manager

```bash
# Retorna token válido no stdout (uso em scripts)
python3 token_manager.py

# Status detalhado da sessão
python3 token_manager.py --check

# Forçar renovação (ignora cache)
python3 token_manager.py --refresh

# Servidor HTTP na porta 8765 (uso em n8n)
python3 token_manager.py --server
```

#### Endpoints HTTP (modo `--server`)

| Endpoint | Resposta |
|----------|---------|
| `GET /token` | `{"status":"ok","token":"...","user_fid":"qDdE35mo"}` |
| `GET /token?refresh=1` | Força renovação antes de retornar |
| `GET /status` | Idade da sessão, método de renovação, frescura |

### 1.5 Cron Job de Renovação Preventiva

Renovar às 00h e 20h evita expiração durante picos de uso (4h de margem antes das 24h):

```cron
0 0,20 * * * python3 /opt/lalamove/token_manager.py --refresh >> /var/log/lalamove_token.log 2>&1
```

### 1.6 Formato do Arquivo de Sessão

```json
{
  "token": "ACCESS_TOKEN_ATUAL",
  "raw": {
    "refresh_token": "REFRESH_TOKEN_SINGLE_USE"
  },
  "timestamp": 1741479600,
  "user_fid": "qDdE35mo",
  "ep_role": 1
}
```

> **Arquivo:** `/tmp/lalamove_session.json`

---

## 2. Histórico de Pedidos — Paginação UAPI

### 2.1 Problema: `order_repeat_list` Bloqueado pelo WAF

O endpoint esperado para listar pedidos na UAPI é `order_repeat_list`. Em produção com os headers do ambiente de container, este endpoint retorna HTTP 501 com `"Access blocked"` — bloqueio ativo pelo WAF Argus.

**Alternativa confirmada:** `order_list_new` — retorna os mesmos dados de pedidos sem ser bloqueado, com paginação cursor-based.

### 2.2 Endpoint `order_list_new`

```
POST https://br-uapi.lalamove.com/index.php
     ?_m=order_list_new&hcountry=20000&_su={su}&_t={ts}&device_id={id}
     &version=5.37.0&revision=53700&os=web&device_type=web

Body: token={TOKEN}&is_ep=1&hcountry=20000&hlang=pt_BR&city_id=21001
      &args={"limit":20,"last_id":"{CURSOR}"}
```

**Atenção WAF:** Enviar `args={"limit":20}` sem o campo `last_id` também aciona bloqueio. É obrigatório incluir `"last_id":""` (string vazia) na primeira página.

### 2.3 Mecânica de Paginação (Cursor-Based)

#### Página 1
```json
{"limit": 20, "last_id": ""}
```

#### Páginas Seguintes
```json
{
  "limit": 20,
  "last_id": "{last_id_retornado_pela_página_anterior}"
}
```

#### Formato do cursor `last_id`
```json
{
  "app": {
    "date": "YYYY-MM-DD HH:mm:ss",
    "_id": "XXXXXXXX",
    "recursion": 0
  },
  "mapp": {
    "_id": 0,
    "date": "",
    "recursion": 0
  }
}
```

#### Condições de Parada
| Condição | Descrição |
|----------|-----------|
| `data.is_end == 1` | Última página explícita |
| `data.order_base_info == []` | Sem mais pedidos |
| `data.last_id` idêntico ao anterior | Cursor não avançou |

### 2.4 Estrutura da Resposta

```json
{
  "ret": 0,
  "data": {
    "order_base_info": [ /* array de pedidos */ ],
    "is_end": 0,
    "last_id": "{cursor_próxima_página}",
    "order_datetime": { "UUID": "YYYY-MM-DD HH:mm:ss" }
  }
}
```

#### Campos Principais de Cada Pedido

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `order_uuid` | string | UUID longo do pedido |
| `order_status` | int | 0=Matching, 1=Em andamento, 2=Concluído, 3=Cancelado |
| `order_vehicle_name` | string | Nome do veículo (ex: "Carro Hatch") |
| `final_price_fen` | int | Preço final em centavos |
| `price_total_fen` | int | Preço total antes de desconto |
| `order_create_hts` | int | Timestamp de criação em ms |
| `order_create_time` | string | Data/hora formatada |
| `pay_type` | int | 3=Carteira corporativa, 4=Wallet, 31=Online |
| `driver` | object | Info do motorista (nome, telefone, placa) |
| `order_display_id_str` | string | ID de exibição |

### 2.5 Headers Obrigatórios (Anti-WAF)

Os seguintes headers são necessários para evitar bloqueio:

```
User-Agent: Mozilla/5.0 AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36
Content-Type: application/x-www-form-urlencoded; charset=utf-8
Origin: https://web.lalamove.com
Referer: https://web.lalamove.com/
X-LLM-LOCATION: BR
Accept: application/json, text/plain, */*
```

### 2.6 Performance e Limites

- **Sem rate limiting** detectado durante extração de 7.740 pedidos
- ~387 requisições para extrair histórico completo (20 pedidos/página)
- Token expirou durante a extração (após ~6.800 pedidos); renovação com `--refresh` e continuação do cursor sem perda de dados

---

## 3. Análise de Negócio — 7.740 Pedidos

Extração completa do histórico da conta Promo Brindes. Período: **setembro 2024 → março 2026**.

### 3.1 Volume e Status

| Status | Quantidade | % |
|--------|-----------|---|
| COMPLETED | 6.675 | 86,2% |
| CANCELLED | 1.049 | 13,6% |
| DRIVER_REJECTED | 11 | 0,1% |
| Outros | 5 | 0,1% |
| **Total** | **7.740** | **100%** |

### 3.2 Financeiro (Pedidos Concluídos)

| Métrica | Valor |
|---------|-------|
| Receita total | **R$ 536.358,03** |
| Ticket médio | R$ 80,35 |
| Ticket mediano | R$ 71,12 |
| Mínimo | R$ 7,56 |
| Máximo | R$ 437,37 |

### 3.3 Distribuição por Veículo

| Veículo | Pedidos | % |
|---------|---------|---|
| Carro Hatch (MPV) | 2.554 | 33,0% |
| Utilitário e Pick-Up | 1.454 | 18,8% |
| LalaPro | 1.448 | 18,7% |
| Carro | 874 | 11,3% |
| LalaGo | 644 | 8,3% |
| Van | 504 | 6,5% |
| Carreto | 231 | 3,0% |
| Outros | 31 | 0,4% |

### 3.4 Forma de Pagamento

- **ENT_WALLET** (Carteira Corporativa): 99,8% dos pedidos
- Pagamento avulso: 0,2%

### 3.5 Picos Mensais de Volume

| Mês | Pedidos |
|-----|---------|
| Abril/2025 | 632 |
| Outubro/2025 | 612 |
| Maio/2025 | 609 |
| Setembro/2025 | 522 |
| Março/2025 | 487 |

---

## 4. Flows n8n — Arquitetura e Implementação

Os 4 flows representam a **implementação completa** do ciclo de vida de uma entrega Lalamove integrada ao Bitrix24 (SPA 1690).

### 4.1 Diagrama do Ciclo Completo

```
SPA criado no Bitrix24 (funil 730 — LALAMOVE AUTOMÁTICO)
   │
   ├─ stage → PREPARATION
   │    └─ Automação B24 → POST /webhook/lalamove-cotacao
   │         └─ F01: Geocode endereços → POST /v3/quotations
   │              └─ Grava: quotationId + stopIds + preço + distância + tempo
   │
   ├─ stage → APPROVAL (aprovação humana)
   │    └─ Automação B24 → POST /webhook/lalamove-pedido
   │         └─ F02: Lê SPA → POST /v3/orders
   │              └─ Grava: orderId → muda stage para IN_PROCESS
   │
   ├─ Motorista aceita → Lalamove → POST /webhook/lalamove-eventos
   │    └─ F03: Valida HMAC → busca SPA por orderId → stage PREPARATION
   │
   ├─ Motorista em coleta → Lalamove → POST /webhook/lalamove-eventos
   │    └─ F03: stage IN_PROCESS
   │
   ├─ Entrega realizada → Lalamove → POST /webhook/lalamove-eventos
   │    └─ F03: stage WON → dispara F04
   │         └─ F04: GET /v3/orders/{id} → extrai fotos POD → stage WON + flags
   │
   └─ Cancelamento → Lalamove → POST /webhook/lalamove-eventos
        └─ F03: stage LOSE
```

### 4.2 F01 — Cotação

**Webhook:** `POST https://webhook.atomicabr.com.br/webhook/lalamove-cotacao`

| # | Node | Tipo | Função |
|---|------|------|--------|
| 1 | 🎯 Webhook Cotação | Webhook | Recebe spa_id + campos de endereço |
| 2 | 📥 Parse | Code | Valida campos obrigatórios, normaliza dados |
| 3 | 🌍 Geo Coleta | HTTP | Geocode endereço coleta via DistanceMatrix.ai |
| 4 | 🌍 Geo Entrega | HTTP | Geocode endereço entrega via DistanceMatrix.ai |
| 5 | 📐 Build Payload | Code | Monta body para `/v3/quotations` com coordenadas |
| 6 | 🔐 HMAC | Code | Gera assinatura HMAC-SHA256 com timestamp |
| 7 | 🚀 POST Quotation | HTTP | `POST rest.lalamove.com/v3/quotations` |
| 8 | 📊 Parse Quote | Code | Extrai quotationId, stopIds, preço, distância, tempo |
| 9 | 🔗 Build B24 | Code | Monta payload para `crm.item.update` |
| 10 | 💾 Bitrix24 Update | HTTP | Atualiza campos do SPA 1690 |
| 11 | ✅ Respond 200 | Respond | Retorna `{"ok":true,"quotationId":"..."}` |

**Campos gravados no SPA após F01:**
```
ufCrm276_1758655595 → quotationId
ufCrm276_1758654848 → stopId da coleta
ufCrm276_1758654830 → stopId da entrega
ufCrm276_1758654032 → valor total (ex: "46.81|BRL")
ufCrm276_1759402004059 → taxas especiais
ufCrm276_1759098131243 → distância (ex: "10.7 km")
ufCrm276_1759098064876 → tempo estimado (ex: "28 mins")
```

**Body de disparo (Automação Bitrix24):**
```json
{
  "spa_id": "{=ID}",
  "ufCrm276_1758913732": "{=ufCrm276_1758913732}",
  "ufCrm276_1758913724": "{=ufCrm276_1758913724}",
  "ufCrm276_1758913712": "{=ufCrm276_1758913712}",
  "ufCrm276_1758913684": "{=ufCrm276_1758913684}",
  "ufCrm276_1758913742": "{=ufCrm276_1758913742}",
  "ufCrm276_1758913748": "{=ufCrm276_1758913748}",
  "ufCrm276_1764346660": "{=ufCrm276_1764346660}",
  "categoryId": "{=CATEGORY_ID}"
}
```

### 4.3 F02 — Pedido

**Webhook:** `POST https://webhook.atomicabr.com.br/webhook/lalamove-pedido`

**Pré-requisito:** F01 deve ter sido executado (quotationId + stopIds gravados no SPA).

| # | Node | Tipo | Função |
|---|------|------|--------|
| 1 | 🎯 Webhook Pedido | Webhook | Recebe spa_id |
| 2 | 🔗 Get SPA | Code | Monta URL para `crm.item.get` |
| 3 | 📋 GET SPA | HTTP | Busca dados completos do SPA no Bitrix24 |
| 4 | 📐 Build Order | Code | Monta body para `/v3/orders` usando quotationId + stopIds do SPA |
| 5 | 🔐 HMAC | Code | Gera assinatura HMAC-SHA256 |
| 6 | 🚀 POST Order | HTTP | `POST rest.lalamove.com/v3/orders` |
| 7 | 📊 Parse Order | Code | Extrai orderId, shareLink, status |
| 8 | 🔗 Build B24 | Code | Monta payload update com orderId + stage IN_PROCESS |
| 9 | 💾 Bitrix24 Update | HTTP | Atualiza SPA: orderId + muda estágio |
| 10 | ✅ Respond 200 | Respond | Retorna `{"ok":true,"orderId":"..."}` |

**Body de disparo (Automação Bitrix24):**
```json
{
  "spa_id": "{=ID}",
  "categoryId": "{=CATEGORY_ID}"
}
```

### 4.4 F03 — Rastreamento (Webhook Lalamove → Bitrix24)

**Webhook (Lalamove → n8n):** `POST https://webhook.atomicabr.com.br/webhook/lalamove-eventos`

> Esta URL deve ser registrada no **Lalamove Dashboard → Configurações → Webhooks**.

**Validação de Assinatura HMAC:**
```javascript
const raw = `${timestamp}\r\nPOST\r\n/webhook/lalamove-eventos\r\n\r\n${bodyStr}`;
const expected = crypto.createHmac('sha256', SECRET_KEY).update(raw).digest('hex');
// Comparar com header: x-llm-signature
```

**Mapeamento eventType → estágio Bitrix24:**

| Evento Lalamove | Estágio B24 |
|----------------|-------------|
| `ORDER_ACCEPTED` | `PREPARATION` |
| `DRIVER_ARRIVED` | `IN_PROCESS` |
| `ORDER_PICKED_UP` | `IN_PROCESS` |
| `ORDER_COMPLETED` | `WON` |
| `ORDER_DELIVERED` | `WON` |
| `ORDER_CANCELLED` | `LOSE` |
| `DRIVER_REJECTED` | `LOSE` |

**Responde imediatamente 200** antes de processar (evita timeout do Lalamove).  
Para `ORDER_DELIVERED` / `ORDER_COMPLETED`, dispara F04 assincronamente.

### 4.5 F04 — POD (Proof of Delivery)

**Webhook (chamado pelo F03):** `POST https://webhook.atomicabr.com.br/webhook/lalamove-pod`

| # | Node | Tipo | Função |
|---|------|------|--------|
| 1 | 🎯 Webhook POD | Webhook | Recebe spa_id + orderId |
| 2 | 📥 Parse POD | Code | Valida inputs |
| 3 | 🔐 HMAC GET | Code | Assinatura HMAC para `GET /v3/orders/{id}` |
| 4 | 📦 GET Order | HTTP | `GET rest.lalamove.com/v3/orders/{orderId}` |
| 5 | 📊 Parse POD | Code | Extrai podImgUrls, signedByName, deliveredAt |
| 6 | 💾 B24 → WON | HTTP | Atualiza SPA: stage WON + flags de entrega |
| 7 | ✅ Respond 200 | Respond | Retorna `{"ok":true,"pod_images":N}` |

**Campos gravados no SPA após F04:**
```
stageId              → DT1690_{categoryId}:WON
ufCrm276_1760014914  → "Y" (flag "entregue")
ufCrm276_1760015259  → "Y" se tem fotos POD, "N" se não
```

### 4.6 Autenticação HMAC (REST API v3)

Todos os flows que chamam a REST API v3 usam o mesmo padrão de assinatura:

```javascript
const ts  = Date.now().toString();
const raw = `${ts}\r\n${method}\r\n${path}\r\n\r\n${bodyStr}`;
const sig = crypto.createHmac('sha256', SECRET_KEY).update(raw).digest('hex');
// Header: Authorization: hmac {API_KEY}:{ts}:{sig}
```

**Credenciais de produção:**
```
API_KEY    = pk_prod_d38621223012b9ec71d0634589126e3b
SECRET_KEY = sk_prod_v30Ci06vXqPeizCg6e461VZEymmFzMDAXZQwTm3NdYcwyLaS8nxrQEX0JKcp0mAM
BASE_URL   = https://rest.lalamove.com
MARKET     = BR
```

### 4.7 Serviço de Geocodificação

A geocodificação de endereços usa DistanceMatrix.ai (não Google Maps diretamente):

```
GET https://api.distancematrix.ai/maps/api/geocode/json
    ?address={ENDERECO_ENCODED}
    &key=k2sJYgCtHGjGpE460v53qqxFpugpJnnfmotnxvSAH45tK56natXvVbMzVthT1pnz
```

Resposta: `results[0].geometry.location.{lat, lng}`

### 4.8 Mapeamento Vehicle IDs → serviceType

| vehicle_id (Bitrix24) | serviceType (REST API v3) | Nome |
|----------------------|--------------------------|------|
| 120767 | `MOTORCYCLE` | Moto |
| 121120 | `MPV` | Carro Hatch |
| 666 | `VAN` | Utilitário/Pick-Up |
| 120768 | `TRUCK550` | Caminhão |

---

## 5. Mapa de Campos — SPA 1690 Lalamove

Campos confirmados via item #258 da conta de produção (Promo Brindes):

### 5.1 Campos de Input (vindos do SPA antes do F01)

| Campo UF | Descrição | Exemplo |
|----------|-----------|---------|
| `ufCrm276_1758913732` | Endereço de coleta | "Avenida Renata, 249..." |
| `ufCrm276_1758913724` | Endereço de entrega | "R. da Independência, 705..." |
| `ufCrm276_1758913712` | Telefone coleta | "1146375517" |
| `ufCrm276_1758913684` | Telefone destinatário | "551125651422" |
| `ufCrm276_1758913742` | Nome do destinatário | "Vinicius" |
| `ufCrm276_1758913748` | Referência / obs | "Gabriel - Expedição Entradas" |
| `ufCrm276_1764346660` | Tipo de veículo (array) | `["162"]` |

### 5.2 Campos Gravados pelo F01 (Cotação)

| Campo UF | Descrição | Exemplo |
|----------|-----------|---------|
| `ufCrm276_1758655595` | quotationId Lalamove | "3404756229468406604" |
| `ufCrm276_1758654848` | stopId coleta | "3404756229468406607" |
| `ufCrm276_1758654830` | stopId entrega | "3404756229468406608" |
| `ufCrm276_1758654032` | Valor total | "46.81\|BRL" |
| `ufCrm276_1759402004059` | Taxas especiais | "22\|BRL" |
| `ufCrm276_1759098131243` | Distância | "10.7 km" |
| `ufCrm276_1759098064876` | Tempo estimado | "28 mins" |

### 5.3 Campos Gravados pelo F02 (Pedido)

| Campo UF | Descrição | Exemplo |
|----------|-----------|---------|
| `ufCrm276_1758817942` | orderId Lalamove | "107114" |

### 5.4 Campos Gravados pelo F04 (POD)

| Campo UF | Descrição | Valores |
|----------|-----------|---------|
| `ufCrm276_1760014914` | Flag "entregue" | "Y" / "N" |
| `ufCrm276_1760015259` | Flag "tem foto POD" | "Y" / "N" |

### 5.5 Funis do SPA 1690

| ID | Nome | Tipo |
|----|------|------|
| 730 | LALAMOVE \| AUTOMÁTICO | Automatizado via flows |
| 1406 | LALAMOVE \| MANUAL | Operação manual |
| 876 | AGENDAMENTOS \| LALAMOVE | Entregas agendadas |
| 878 | ⏱ HISTÓRICO | Pedidos arquivados |

---

## 6. Guia de Deploy dos Flows

### 6.1 Pré-Requisitos

**Variáveis n8n** (`Settings → Variables`):

| Variável | Descrição | Como obter |
|----------|-----------|------------|
| `N8N_API_KEY` | API key do n8n | Settings → API → Create API Key |
| `B24_TOKEN` | Token webhook Bitrix24 | Bitrix24 → Aplicativos → Webhooks de entrada |

> O token B24 aparece na URL: `https://promobrindes.bitrix24.com.br/rest/1/{TOKEN}/crm.item.update`

### 6.2 Deploy Automático via Bootstrap

1. Importar `lalamove_bundle_import.json` no n8n (`Workflows → Import from File`)
2. Acessar o workflow **⚙️ LLM-BOOTSTRAP** importado
3. Clicar **▶️ Execute** — o Bootstrap cria e ativa os 4 flows via API interna do n8n
4. Verificar output: todos devem aparecer com `status: "CREATED"`

### 6.3 Registro do Webhook no Lalamove

URL a registrar: `https://webhook.atomicabr.com.br/webhook/lalamove-eventos`

Eventos a habilitar:
- `ORDER_ACCEPTED`
- `DRIVER_ARRIVED`
- `ORDER_PICKED_UP`
- `ORDER_DELIVERED`
- `ORDER_COMPLETED`
- `ORDER_CANCELLED`
- `DRIVER_REJECTED`

### 6.4 Automações no Bitrix24 (SPA 1690)

**Trigger F01 — Disparar cotação ao entrar em PREPARATION:**
- Estágio: `PREPARATION` (entrada)
- Ação: Chamada HTTP POST para `/webhook/lalamove-cotacao`
- Body: incluir todos os campos de endereço/telefone via macros `{=CAMPO}`

**Trigger F02 — Disparar pedido ao entrar em APPROVAL:**
- Estágio: `APPROVAL` (entrada)
- Ação: Chamada HTTP POST para `/webhook/lalamove-pedido`
- Body: `{"spa_id":"{=ID}","categoryId":"{=CATEGORY_ID}"}`

### 6.5 Teste End-to-End

```bash
# Testar F01 com dados reais do SPA #258
curl -X POST https://webhook.atomicabr.com.br/webhook/lalamove-cotacao \
  -H "Content-Type: application/json" \
  -d '{
    "spa_id": "258",
    "ufCrm276_1758913732": "Avenida Renata, 249 - Vila Formosa, São Paulo",
    "ufCrm276_1758913724": "Rua da Independência, 705 - Cambuci, São Paulo",
    "ufCrm276_1758913712": "1146375517",
    "ufCrm276_1758913684": "11935024030",
    "ufCrm276_1758913742": "Cliente Teste",
    "ufCrm276_1758913748": "Ref: OC-TESTE",
    "ufCrm276_1764346660": ["120767"],
    "categoryId": 730
  }'

# Resposta esperada:
# {"ok":true,"quotationId":"..."}
```

---


---

## 8. F04 v2 — POP + POD (09/03/2026)

### 8.1 Descoberta: Campo POP na Coleta

**Investigação conduzida em:** 09/03/2026 — testes em produção com pedidos reais.

A investigação identificou que o endpoint `GET /v3/orders/{orderId}` (REST API v3) retorna dois campos distintos para comprovantes fotográficos, um por parada (stop):

| Stop | Campo | Tipo | Conteúdo |
|------|-------|------|----------|
| `stops[0]` (coleta) | `POP` | Objeto | Proof of Pickup |
| `stops[N]` (entrega) | `POD` | Objeto | Proof of Delivery |

> **Nota:** O `order_detail` da UAPI (`br-uapi.lalamove.com`) retorna `ret=10002` (Erro de parâmetro) para todos os formatos de argumento testados. A fonte correta é **exclusivamente o REST API v3**.

### 8.2 Estrutura Real da Resposta (Confirmada em Produção)

```json
{
  "data": {
    "orderId": "3447430567770145555",
    "status": "COMPLETED",
    "stops": [
      {
        "address": "Av. Inajar de Souza, 1950 - Limão, SP",
        "POP": {
          "imageUrls": [
            "http://br-oimg.lalamove.com/appdriver/prd/appdriver/2026/03/09/177306...jpeg"
          ],
          "pickedUpAt": "2026-03-09T13:54:45.00Z"
        }
      },
      {
        "address": "Avenida Renata, 249 - Vila Formosa, SP",
        "POD": {
          "status": "DELIVERED",
          "image": "http://br-oimg.lalamove.com/appdriver/prd/appdriver/2026/03/09/177306...jpeg",
          "deliveredAt": "2026-03-09T14:55:07.00Z"
        }
      }
    ]
  }
}
```

### 8.3 Diferenças POP vs POD

| Atributo | POP (Coleta) | POD (Entrega) |
|----------|-------------|---------------|
| Campo no objeto stop | `POP` | `POD` |
| Campo das fotos | `imageUrls` (array `[]`) | `image` (string única) |
| Pode ter múltiplas fotos? | **Sim** | **Não** |
| Timestamp | `pickedUpAt` | `deliveredAt` |
| Campo de status | ausente | `status: "DELIVERED"` |

### 8.4 F04 v2 — Lógica Atualizada

O flow F04 foi atualizado para capturar ambos os campos e gerar um comentário de timeline no Bitrix24 com as URLs das fotos.

**Nodes (9 no total):**

```
🎯 Webhook POD
  → 📥 Parse Input          (valida spa_id + orderId)
  → 🔐 HMAC GET             (assina GET /v3/orders/{orderId})
  → 📦 GET Order            (HTTP GET REST API v3)
  → 📊 Parse POP+POD        (extrai stops[0].POP + stops[-1].POD)
  → 💾 B24 → WON            (atualiza stageId + flags)
  → 📝 Timeline Comment     (POST crm.timeline.comment.add com fotos)
  → ✅ Respond              (200 OK com contagem de fotos)
```

**Código do nó Parse POP+POD:**

```javascript
const stops = (o.data?.stops || o.stops || []);

// Stop 0 = COLETA → campo POP
const firstStop  = stops[0] || {};
const popImages  = firstStop.POP?.imageUrls || [];   // array de URLs
const pickedUpAt = firstStop.POP?.pickedUpAt || '';

// Stop final = ENTREGA → campo POD
const lastStop    = stops[stops.length - 1] || {};
const podImage    = lastStop.POD?.image || '';        // URL única (string)
const deliveredAt = lastStop.POD?.deliveredAt || '';

const hasPOD = !!podImage;
const hasPOP = popImages.length > 0;
```

**Formato do comentário de timeline gerado (exemplo):**

```
📦 Pedido Lalamove concluído — 3447430567770145555

📷 Foto de Coleta (POP):
  1. http://br-oimg.lalamove.com/appdriver/prd/.../177306....jpeg
  ⏱ Coletado em: 2026-03-09T13:54:45.00Z

✅ Foto de Entrega (POD):
  http://br-oimg.lalamove.com/appdriver/prd/.../177306....jpeg
  ⏱ Entregue em: 2026-03-09T14:55:07.00Z
```

### 8.5 Campos Bitrix24 Atualizados pelo F04 v2

| Campo | Field ID | Valor |
|-------|----------|-------|
| Stage | `stageId` | `DT1690_{category_id}:WON` |
| Flag Entregue | `ufCrm276_1760014914` | `'Y'` |
| Flag Tem POD | `ufCrm276_1760015259` | `'Y'` se `podImage` existe |
| Timeline | `crm.timeline.comment.add` | Texto com ambas as URLs |

> **Observação:** Não foram criados campos dedicados para POP no Bitrix24. As fotos de coleta são registradas via comentário de timeline, tornando-as visíveis no histórico do item sem necessidade de novos campos.

### 8.6 Arquivos Atualizados

| Arquivo | Versão | Mudanças |
|---------|--------|----------|
| `lalamove_f04_pod.json` | v2 | POP + POD + timeline comment (9 nodes) |
| `lalamove_f00_bootstrap.json` | v2 | Embarca F04 v2 |
| `lalamove_bundle_import.json` | v2 | Bundle completo atualizado |

## 7. Arquivos Gerados

### 7.1 Token Manager

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `lalamove_token_manager.py` | Python | Script principal (367 linhas) |
| `lalamove_cron_setup.sh` | Shell | Instalador do cron job |
| `lalamove_n8n_integration.md` | Markdown | Guia de integração com n8n |

### 7.2 Histórico de Pedidos

| Arquivo | Tipo | Tamanho | Descrição |
|---------|------|---------|-----------|
| `lalamove_order_history_full.json` | JSON | 21MB | 7.740 pedidos brutos |
| `lalamove_order_history_full.md` | Markdown | — | Relatório analítico |

### 7.3 Flows n8n

| Arquivo | Tipo | Nodes | Descrição |
|---------|------|-------|-----------|
| `lalamove_bundle_import.json` | JSON | — | Bundle completo (Bootstrap + F01–F04) |
| `lalamove_f00_bootstrap.json` | JSON | 3 | Bootstrap de deploy automático |
| `lalamove_f01_cotacao.json` | JSON | 12 | F01 — Cotação |
| `lalamove_f02_pedido.json` | JSON | 11 | F02 — Pedido |
| `lalamove_f03_rastreamento.json` | JSON | 12 | F03 — Rastreamento |
| `lalamove_f04_pod.json` | JSON | 9 | F04 v2 — POP + POD + Timeline Comment |
| `lalamove_setup_guide.html` | HTML | — | Guia visual de setup |

### 7.4 Documentação Anterior (Referência)

| Arquivo | Data | Conteúdo |
|---------|------|----------|
| `lalamove_documentacao_completa.*` | 08/03/2026 | Auditoria completa REST API v3 + UAPI |
| `lalamove_internal_api_map.*` | 08/03/2026 | Mapa de endpoints UAPI |
| `lalamove_deep_audit.*` | 08/03/2026 | Auditoria profunda + errata |
| `lalamove_api_docs_v3.*` | 08/03/2026 | Documentação REST API v3 |

---

*Documentação gerada por: Pink e Cerébro — Suplemento Técnico v2*  
*Data: 09/03/2026 | Metodologia: Evidence-First, Production-Tested*
