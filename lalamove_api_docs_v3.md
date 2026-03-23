# Lalamove API v3 — Documentação Técnica Completa (Brasil)

> **Auditada em produção · 03/03/2026 · v3.0**
> Todas as informações validadas via chamadas reais à API de produção.

---

## ⚠️ ERRATA — Correções vs Documentação Oficial

> As 3 correções abaixo foram **testadas diretamente na API de produção** e divergem da documentação oficial Lalamove.

---

### Correção 1 — Campo de serviços: `services`, não `serviceTypes`

**Testado:** `GET /v3/cities` → impressão explícita de todas as keys do objeto cidade.

| Campo | Documentação oficial diz | Realidade em produção |
|-------|--------------------------|----------------------|
| Nome do campo | `serviceTypes` | `services` |
| Keys do objeto cidade | `locode, name, serviceTypes, ...` | **Apenas:** `locode, name, services` |
| `serviceTypes` presente? | Sim | `False` — campo **não existe** |
| `services` presente? | Não mencionado | `True` — este é o campo correto |

```
# Output real do teste em produção:
TODAS AS KEYS DO OBJETO CIDADE:
  ['locode', 'name', 'services']

  "serviceTypes" presente? False
  "services"     presente? True
```

```python
# ✅ Correto:
for city in response['data']:
    services = city['services']

# ❌ Errado — lança KeyError:
services = city['serviceTypes']
```

---

### Correção 2 — `driverId`: sempre string `""`, nunca `null`

**Testado:** POST order + polling GET order + GET order após status `ON_GOING`.

| Cenário | Doc oficial sugere | Realidade em produção |
|---------|--------------------|----------------------|
| Sem motorista (`ASSIGNING_DRIVER`) | `driverId: null` ou ausente | `driverId: ""` (string vazia) |
| Com motorista (`ON_GOING`) | `driverId: "123456"` | `driverId: "967219"` (string com ID) |
| Após cancelamento | `driverId: null` | `driverId: ""` (volta para string vazia) |
| `typeof driverId` | — | **Sempre `string`** — nunca `null`, nunca `undefined` |

```
# Output real do teste (impresso explicitamente):
driverId raw: "" | type: str
```

```javascript
// ✅ Verificação correta:
if (order.driverId !== "") {
  // motorista atribuído — pode chamar GET /drivers/{driverId}
}

// ❌ Verificações que falham:
if (order.driverId === null)  { }  // nunca verdadeiro
if (order.driverId == null)   { }  // nunca verdadeiro
```

---

### Correção 3 — `cancelParty` e `cancelledReason`: campos não existem na API BR

**Testado:** 2 cancelamentos distintos — sem motorista (`ASSIGNING_DRIVER`) **E** com motorista (`ON_GOING`, `driverId: "967219"`).

| Cenário de cancelamento | Doc oficial diz | Realidade em produção |
|-------------------------|-----------------|-----------------------|
| Sem motorista (`ASSIGNING_DRIVER`) | campos presentes | **AUSENTES** |
| Com motorista atribuído (`ON_GOING`) | campos presentes | **AUSENTES** |
| `cancelReason` (variação) | mencionado em alguns docs | **AUSENTE** |

```
# Output real — cancelamento com motorista ON_GOING (driverId: "967219"):
DELETE /v3/orders/3443169998154191792  →  204 No Content

GET /v3/orders/3443169998154191792:
  status: CANCELED
  ALL KEYS: ['orderId', 'quotationId', 'priceBreakdown', 'driverId',
             'shareLink', 'status', 'distance', 'stops', 'remarks']

  cancelParty:     "<<AUSENTE>>"
  cancelledReason: "<<AUSENTE>>"
  cancelReason:    "<<AUSENTE>>"
```

> Esses campos podem existir em outros mercados (HK, SG, MX), mas **não existem na API Brasil em produção**.

---

## Índice

1. [Autenticação HMAC SHA256](#1-autenticação-hmac-sha256)
2. [Cidades e Serviços Disponíveis no Brasil](#2-cidades-e-serviços-disponíveis-no-brasil)
3. [Cotações (Quotations)](#3-cotações-quotations)
4. [Pedidos (Orders)](#4-pedidos-orders)
5. [Priority Fee](#5-priority-fee)
6. [Motorista (Driver)](#6-motorista-driver)
7. [Webhook](#7-webhook)
8. [Códigos de Erro](#8-códigos-de-erro)
9. [Rate Limits](#9-rate-limits)
10. [Referência de Preços Reais](#10-referência-de-preços-reais)

---

## 1. Autenticação HMAC SHA256

Toda requisição exige autenticação via HMAC SHA256. **Nenhum endpoint é público.**

### Cabeçalhos obrigatórios

| Header | Valor | Descrição |
|--------|-------|-----------|
| `Authorization` | `hmac {API_KEY}:{TIMESTAMP}:{SIGNATURE}` | Token de autenticação |
| `Market` | `BR` | Mercado Brasil — obrigatório |
| `Request-ID` | UUID v4 único por requisição | Idempotência e rastreabilidade |
| `Content-Type` | `application/json` | Obrigatório em POST e PATCH |

### Algoritmo de assinatura

```
TIMESTAMP  = milissegundos Unix  (ex: "1772553742000")

RAW_STRING = TIMESTAMP
           + "\r\n" + METHOD       (GET | POST | PATCH | DELETE)
           + "\r\n" + PATH         (/v3/quotations, etc.)
           + "\r\n\r\n"
           + BODY_JSON            (string vazia "" se sem body)

SIGNATURE  = HMAC-SHA256(SECRET_KEY, RAW_STRING)
Authorization: hmac {API_KEY}:{TIMESTAMP}:{SIGNATURE}
```

> ⚠️ Para GET e DELETE sem body: `BODY_JSON = ""`, mas os `\r\n\r\n` finais **devem** estar presentes.

### Implementação Node.js

```javascript
const crypto = require('crypto');

function buildHeaders(method, path, body = null) {
  const ts  = Date.now().toString();
  const raw = `${ts}\r\n${method}\r\n${path}\r\n\r\n${body ? JSON.stringify(body) : ''}`;
  const sig = crypto.createHmac('sha256', SECRET_KEY).update(raw).digest('hex');
  return {
    'Authorization': `hmac ${API_KEY}:${ts}:${sig}`,
    'Market': 'BR',
    'Request-ID': crypto.randomUUID(),
    'Content-Type': 'application/json',
  };
}
```

### Implementação Python

```python
import hmac, hashlib, time, uuid, json

def build_headers(method, path, body=None):
    ts  = str(int(time.time() * 1000))
    raw = f'{ts}\r\n{method}\r\n{path}\r\n\r\n{json.dumps(body) if body else ""}'
    sig = hmac.new(SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return {
        'Authorization': f'hmac {API_KEY}:{ts}:{sig}',
        'Market': 'BR',
        'Request-ID': str(uuid.uuid4()),
        'Content-Type': 'application/json',
    }
```

---

## 2. Cidades e Serviços Disponíveis no Brasil

**Endpoint:** `GET /v3/cities` · **Rate limit:** 300 req/janela

> ❌ **CORREÇÃO:** O campo se chama `"services"` — **não** `"serviceTypes"`. `city['serviceTypes']` lança `KeyError`.

### 16 cidades cobertas (confirmado em produção)

| Locode | Cidade |
|--------|--------|
| BR AJU | Aracaju |
| BR BEL | Belém |
| BR BHZ | Belo Horizonte |
| BR BSB | Brasília |
| BR CWB | Curitiba |
| BR FLN | Florianópolis |
| BR FOR | Fortaleza |
| BR GYN | Goiânia |
| BR MAO | Manaus |
| BR POA | Porto Alegre |
| BR RAO | Ribeirão Preto |
| BR REC | Recife |
| BR RIO | Rio de Janeiro |
| BR SAO | Sao Paulo & Campinas |
| BR SLZ | São Luís |
| BR SSA | Salvador |

### Estrutura real do objeto cidade

```json
// Keys reais (APENAS 3 campos):
{ "locode": "BR SAO", "name": "Sao Paulo & Campinas", "services": [...] }

// Cada item de services:
{
  "key": "LALAPRO",
  "description": "...",
  "dimensions": {
    "length": {"value": "0.4", "unit": "m"},
    "width":  {"value": "0.4", "unit": "m"},
    "height": {"value": "0.3", "unit": "m"}
  },
  "load": {"value": "20", "unit": "kg"},
  "specialRequests": [{"name": "WAITING_TIME_030MIN", ...}],
  "deliveryItemSpecification": {}
}
```

### Todos os 14 serviceTypes disponíveis no Brasil

| serviceType | Carga máx. | Dimensões (L×W×H) | Suporta `item`? | Disponibilidade |
|-------------|-----------|-------------------|-----------------|-----------------|
| `LALAGO` | 20 kg | 0.3×0.4×0.3 m | Não | Todas as cidades |
| `LALAPRO` | 20 kg | 0.4×0.4×0.3 m | Não | **Apenas SP e RIO** |
| `LALAGOFOUR` | 20 kg | 0.3×0.4×0.3 m | Não | BHZ, CWB, RIO, SP |
| `CAR` | 300 kg | 1.2×0.8×0.6 m | Não | Todas as cidades |
| `CARFOURH` | 300 kg | 1.2×0.8×0.6 m | Não | **Apenas SP** |
| `HATCHBACK` | 200 kg | 1×0.7×0.6 m | Não | Todas as cidades |
| `HATCHFOURH` | 200 kg | 1×0.7×0.6 m | Não | **Apenas SP** |
| `UV_FIORINO` | 500 kg | 1.8×1.3×1.1 m | ✅ Sim | BHZ/CWB/FOR/POA/RIO/SP/GYN/FLN/RAO/SSA |
| `UV_4H` | 500 kg | 1.8×1.3×1.1 m | Não | BHZ/CWB/FOR/POA/RIO/SP/GYN/FLN/RAO/SSA |
| `VAN` | 1000 kg | 2.7×1.8×1.6 m | ✅ Sim | BHZ, BSB, CWB, POA, RIO, SP |
| `VANFOURH` | 1000 kg | 2.7×1.8×1.6 m | Não | BHZ, RIO, SP |
| `TRUCK330` | 1500 kg | 3×1.8×2 m (SP) / 2×2×2.5 m (RIO) | ✅ Sim | BHZ/BSB/CWB/FOR/POA/RIO/SP |
| `TRUCK3_5T` | 2500 kg | 4×2.2×2.2 m | Não | **⚠️ Apenas SP** |
| `TRUCK_6H` | 1500 kg | 3×1.8×2 m (SP) / 2×2×2.5 m (RIO) | Não | BHZ, RIO, SP |

> ⚠️ `TRUCK330` e `TRUCK_6H` têm dimensões **diferentes** por cidade: `3×1.8×2 m` em SP, `2×2×2.5 m` no RIO.

### Todos os 28 specialRequests disponíveis

| specialRequest | Descrição | Veículos que aceitam |
|----------------|-----------|----------------------|
| `THERMAL_BAG_1` | Bolsa térmica | LALAGO, LALAPRO |
| `RETURN` | Viagem de retorno | CAR, HATCHBACK, LALAGO, LALAPRO |
| `WAITING_TIME_030MIN` | Tempo de espera: até 30 min | CAR, HATCHBACK, LALAGO, LALAPRO, TRUCK330, UV_FIORINO, VAN |
| `WAITING_TIME_060MIN` | Tempo de espera: até 1h | CAR, HATCHBACK, LALAGO, LALAPRO, TRUCK330, UV_FIORINO, VAN |
| `WAITING_TIME_1` | Tempo de espera: até 1,5h | CAR, HATCHBACK, LALAGO, LALAPRO, TRUCK330, UV_FIORINO, VAN |
| `LOADING_1DRIVER_MAX030MIN` | Ajuda motorista: até 30 min | CAR, HATCHBACK, UV_FIORINO, VAN |
| `LOADING_1DRIVER_MAX060MIN` | Ajuda motorista: até 1h | CAR, HATCHBACK, TRUCK330, TRUCK3_5T, UV_FIORINO, VAN |
| `LOADING_1DRIVER_MAX090MIN` | Ajuda motorista: até 1,5h | CAR, HATCHBACK, UV_FIORINO, VAN |
| `LOADING_1DRIVER_MAX120MIN` | Ajuda motorista: até 2h | TRUCK330, TRUCK3_5T, VAN |
| `LOADING_1DRIVER_MAX180MIN` | Ajuda motorista: até 3h | TRUCK330, TRUCK3_5T, VAN |
| `LOADING_1DRIVER1HELPER_MAX060MIN` | Motorista + ajudante: até 1h | TRUCK330, TRUCK3_5T, VAN |
| `LOADING_1DRIVER1HELPER_MAX120MIN` | Motorista + ajudante: até 2h | TRUCK330, TRUCK3_5T |
| `LOADING_1DRIVER1HELPER_MAX180MIN` | Motorista + ajudante: até 3h | TRUCK330, TRUCK3_5T |
| `LOADING_1DRIVER1HELPER` | Motorista + ajudante (porta-a-porta) | TRUCK_6H |
| `HOUSE_MOVING_MAX120MIN` | Mudança residencial: até 2h | TRUCK330 |
| `HOUSE_MOVING_MAX180MIN` | Mudança residencial: até 3h | TRUCK330 |
| `HOUSE_MOVING_MAX240MIN` | Mudança residencial: até 4h | TRUCK330 |
| `REFRIGERATED_VEHICLE` | Refrigerado (-1°C a -15°C) | UV_FIORINO — ⚠️ Apenas SP |
| `INSULATED_VEHICLE` | Isotérmico (temperatura controlada) | UV_FIORINO — ⚠️ Apenas SP |
| `FROZEN_VEHICLE` | Congelado (abaixo de -15°C) | UV_FIORINO — ⚠️ Apenas SP |
| `HOURLY_RENTAL_1` | Hora extra +1h | CARFOURH, HATCHFOURH, VANFOURH |
| `HOURLY_RENTAL_2` | Hora extra +2h | CARFOURH, HATCHFOURH, VANFOURH |
| `HOURLY_RENTAL_3` | Hora extra +3h | CARFOURH, HATCHFOURH, VANFOURH |
| `HOURLY_RENTAL_4` | Hora extra +4h | VANFOURH |
| `RENTAL_TIME_1HR` | Tempo extra +1h (locação) | LALAGOFOUR, TRUCK_6H, UV_4H, VANFOURH |
| `RENTAL_TIME_2HR` | Tempo extra +2h (locação) | LALAGOFOUR, TRUCK_6H, UV_4H, VANFOURH |
| `RENTAL_TIME_3HR` | Tempo extra +3h (locação) | LALAGOFOUR, VANFOURH |
| `RENTAL_TIME_4HR` | Tempo extra +4h (locação) | CARFOURH, HATCHFOURH, TRUCK_6H, UV_4H, VANFOURH |

### Campo `item` (deliveryItemSpecification)

Apenas `TRUCK330`, `UV_FIORINO` e `VAN` processam o campo `item`. Os demais aceitam sem erro mas ignoram silenciosamente.

| serviceType | `weight` (valores aceitos) |
|-------------|---------------------------|
| `TRUCK330` | `LESS_THAN_300_KG` \| `300_KG_TO_750_KG` \| `750_KG_TO_1500_KG` |
| `UV_FIORINO` | `LESS_THAN_100_KG` \| `100_KG_TO_250_KG` \| `250_KG_TO_500_KG` |
| `VAN` | `LESS_THAN_200_KG` \| `200_KG_TO_500_KG` \| `500_KG_TO_1000_KG` |

**`categories`** (todos): `FOOD_PRODUCTS_OR_GROCERY`, `CONSTRUCTION_MATERIALS_OR_PARTS`, `RETAIL_AND_WHOLESALE_`, `FURNITURE_OR_HOME_APPLIANCES`, `FRAGILE_ITEMS`

**`handlingInstructions`** (todos): `FRAGILE_OR_HANDLE_WITH_CARE`, `DO_NOT_STACK`, `KEEP_UPRIGHT`, `KEEP_DRY`, `NO_BENDING`

---

## 3. Cotações (Quotations)

### `POST /v3/quotations`

```json
{
  "data": {
    "serviceType": "LALAPRO",
    "language": "pt_BR",
    "scheduleAt": "2026-03-04T10:00:00.000Z",
    "isRouteOptimized": false,
    "specialRequests": ["WAITING_TIME_030MIN"],
    "stops": [
      {
        "coordinates": { "lat": "-23.5589", "lng": "-46.6345" },
        "address": "R. Clímaco Barbosa, 665 - Cambuci, SP"
      },
      {
        "coordinates": { "lat": "-23.5401", "lng": "-46.6066" },
        "address": "Av. Renata, 249 - Belenzinho, SP"
      }
    ],
    "item": {
      "quantity": "5",
      "weight": "LESS_THAN_300_KG",
      "categories": ["FURNITURE_OR_HOME_APPLIANCES"],
      "handlingInstructions": ["FRAGILE_OR_HANDLE_WITH_CARE"]
    }
  }
}
```

**Response `201 Created`:**

```json
{
  "data": {
    "quotationId": "3443167815824261304",
    "scheduleAt":  "2026-03-03T16:01:03.00Z",
    "expiresAt":   "2026-03-03T16:06:04.00Z",
    "serviceType": "LALAPRO",
    "language":    "PT_BR",
    "isRouteOptimized": false,
    "stops": [
      {
        "stopId": "3443167815824261305",
        "coordinates": { "lat": "-23.5589000", "lng": "-46.6345000" },
        "address": "R. Clímaco Barbosa, 665 - Cambuci, SP"
      }
    ],
    "priceBreakdown": {
      "base":                    "22.32",
      "specialRequests":         "90.00",
      "multiStopSurcharge":      "3.00",
      "totalBeforeOptimization": "52.93",
      "totalExcludePriorityFee": "28.02",
      "total":                   "28.02",
      "currency":                "BRL"
    },
    "distance": { "value": "4580", "unit": "m" }
  }
}
```

| Campo | Detalhe |
|-------|---------|
| `quotationId` / `stopId` | Sempre strings de **19 dígitos** |
| `language` retornado | Sempre em maiúsculas: `PT_BR` |
| `scheduleAt` retornado | Formato `.00Z` (2 decimais, não 3) |
| `expiresAt` | Cotação expira em **~5 minutos** |
| `specialRequests` no breakdown | Presente **somente** se houver SRs |
| `multiStopSurcharge` | Presente **somente** com 3+ paradas |
| Limite de paradas | **Sem limite documentado** — 17 paradas testadas → 201 ✅ |

### `GET /v3/quotations/{quotationId}`

Retorna estrutura idêntica ao POST 201. Útil para verificar validade antes de criar o pedido.

---

## 4. Pedidos (Orders)

### `POST /v3/orders`

```json
{
  "data": {
    "quotationId": "3443167915355095673",
    "isPODEnabled": true,
    "sender": {
      "stopId": "3443167915355095675",
      "name":   "Nome Remetente",
      "phone":  "+5511955550001"
    },
    "recipients": [
      {
        "stopId":  "3443167915355095676",
        "name":    "Nome Destinatário",
        "phone":   "+5511944440002",
        "remarks": "Instrução linha 1\r\nLinha 2"
      }
    ],
    "metadata": {
      "pedido_interno": "12345",
      "sistema":        "bitrix24"
    }
  }
}
```

**Response `201 Created`:**

```json
{
  "data": {
    "orderId":    "3443160224863834408",
    "quotationId":"3443167915355095673",
    "priceBreakdown": {
      "base": "22.32",
      "totalExcludePriorityFee": "22.32",
      "total": "22.32",
      "currency": "BRL"
    },
    "driverId":  "",
    "shareLink": "https://share.lalamove.com/?BR1002...",
    "status":    "ASSIGNING_DRIVER",
    "distance":  { "value": "4574", "unit": "m" },
    "stops": [
      {
        "coordinates": { "lat": "-23.5589000", "lng": "-46.6345000" },
        "address": "R. Climaco Barbosa, 665 - Cambuci, SP",
        "name":    "Nome Remetente",
        "phone":   "11955550001",
        "delivery_code": { "value": "", "status": "Not Applicable" }
      },
      {
        "coordinates": { "lat": "-23.5401000", "lng": "-46.6066000" },
        "address": "Av. Renata, 249 - Belenzinho, SP",
        "name":    "Nome Destinatário",
        "phone":   "11944440002",
        "POD":     { "status": "PENDING" },
        "delivery_code": { "value": "", "status": "Not Applicable" }
      }
    ],
    "metadata": { "pedido_interno": "12345" },
    "remarks":  ["Instrução linha 1", "Linha 2"]
  }
}
```

### Campos críticos confirmados em produção

| Campo | Comportamento real |
|-------|--------------------|
| `driverId` | **Sempre string.** `""` sem motorista, `"967219"` com motorista. **Nunca `null`.** Checar: `driverId !== ""` |
| `isPODEnabled` | **Não retornado** no response. Confirmar via `stops[n].POD.status === "PENDING"` |
| `remarks` | Retornado como **array** de strings. O `\r\n` do input vira separador de itens |
| `phone` | Retornado **sem `+55`**. Ex: `"+5511955550001"` → `"11955550001"` |
| `stops[n].stopId` | **Ausente** no response do order — presente apenas na cotação |
| `cancelParty` | **Não existe** na API BR — ausente mesmo após cancelamento com motorista `ON_GOING` |
| `cancelledReason` | **Não existe** na API BR — testado nos dois cenários (sem e com motorista) |
| `delivery_code` | Campo não documentado em todos os stops: `{"value":"","status":"Not Applicable"}` |

### Fluxo de status

```
ASSIGNING_DRIVER  →  ON_GOING  →  PICKED_UP  →  DELIVERING  →  COMPLETED
      │                                                              │
      ├──→  REJECTED  (nenhum motorista disponível)                 └──→ CANCELED
      ├──→  EXPIRED   (pedido expirou)
      └──→  CANCELED  (cancelado pelo cliente)
```

### `PATCH /v3/orders/{orderId}` — Editar pedido

> ❌ Pedidos em `ASSIGNING_DRIVER` não podem ser editados → `422 ERR_ORDER_EDIT: "Cannot edit order"`

### `DELETE /v3/orders/{orderId}` — Cancelar pedido

- ✅ Sucesso: `204 No Content`, body vazio
- ❌ Pedido já cancelado: `422 ERR_CANCELLATION: "Cannot cancel order."`
- ❌ Campos `cancelParty` e `cancelledReason` **não existem** no response pós-cancelamento

---

## 5. Priority Fee

### `POST /v3/orders/{orderId}/priority-fee`

```json
{ "data": { "priorityFee": "5" } }
```

**Response `200 OK`** — retorna o order completo com `priorityFee` no breakdown:

```json
{
  "base": "22.32",
  "priorityFee": "5.00",
  "totalExcludePriorityFee": "22.32",
  "total": "27.32",
  "currency": "BRL"
}
```

> ✅ `priorityFee` só pode ser **aumentado**, nunca reduzido.
> ❌ Reduzir: `422 ERR_INVALID_TIPS` — *"The amount you attempted to add should be higher than previous priority fee."*

---

## 6. Motorista (Driver)

### `GET /v3/orders/{orderId}/drivers/{driverId}`

> ⚠️ Só chamar quando `driverId !== ""`. Com string vazia retorna `404 ERR_DRIVER_NOT_FOUND`.

```javascript
// ✅ Verificação correta:
const order = await getOrder(orderId);
if (order.driverId !== "") {
  const driver = await getDriver(orderId, order.driverId);
}

// ❌ NUNCA fazer — driverId nunca é null:
if (order.driverId === null) { ... }
```

---

## 7. Webhook

### `PATCH /v3/webhook`

```json
{ "data": { "url": "https://seu-dominio.com/webhook/lalamove" } }
```

- **Sucesso:** `200 OK`
- **Rate limit header:** `ratelimits-limit-patchweb`

> ❌ `GET /v3/webhook` → `405 Method Not Allowed` — não é possível consultar a URL configurada via API.

### Eventos de webhook

| Evento | Quando ocorre |
|--------|--------------|
| `ASSIGNING_DRIVER` | Pedido criado, aguardando motorista |
| `ON_GOING` | Motorista aceitou, a caminho da coleta |
| `PICKED_UP` | Carga coletada |
| `DELIVERING` | Em rota de entrega |
| `COMPLETED` | Entrega confirmada |
| `CANCELED` | Pedido cancelado |
| `REJECTED` | Nenhum motorista disponível |
| `EXPIRED` | Pedido expirou sem atribuição |

---

## 8. Códigos de Erro

**Estrutura padrão:**

```json
{
  "errors": [
    {
      "id":      "ERR_INVALID_FIELD",
      "message": "Descrição legível",
      "detail":  "/data/campo"
    }
  ]
}
```

> O campo `detail` (JSON pointer) está presente **apenas** em erros `ERR_INVALID_FIELD`.

### Tabela de erros confirmados em produção

| HTTP | `errors[0].id` | Quando ocorre |
|------|---------------|---------------|
| 422 | `ERR_INVALID_FIELD` | Campo inválido, faltando ou valor não aceito |
| 422 | `ERR_INVALID_QUOTATION_ID` | `quotationId` inexistente ou expirado (>5 min) |
| 422 | `ERR_ORDER_EDIT` | PATCH em pedido não editável |
| 422 | `ERR_CANCELLATION` | DELETE em pedido já cancelado |
| 422 | `ERR_INVALID_TIPS` | `priorityFee` menor ou igual ao valor atual |
| 404 | `ERR_ORDER_NOT_FOUND` | `orderId` não existe |
| 404 | `ERR_DRIVER_NOT_FOUND` | `driverId` inválido |
| 502 | *(sem `errors[]`)* | Auth inválida — gateway retorna 502 genérico |

### Mensagens reais de `ERR_INVALID_FIELD`

| `detail` | `message` retornado |
|----------|---------------------|
| `/data/stops` | `"minimum 2 items required, but found 1 items"` |
| `/data/serviceType` | `"value must be one of \"CAR\", \"LALAPRO\", ..."` (lista completa dos 14 tipos) |
| `/data/scheduleAt` | `"'2020-01-01T...' is not valid. Date cannot be a past date or more than 30 days in advance."` |
| `/data/specialRequests/0` | `"value must be one of \"WAITING_TIME_030MIN\", ..."` (lista dos SRs válidos para o serviceType) |

---

## 9. Rate Limits

```
ratelimits-limit-{endpoint}      → máximo de requisições por janela
ratelimits-remaining-{endpoint}  → requisições restantes
ratelimits-reset-{endpoint}      → Unix timestamp do reset

Confirmados em produção:
  ratelimits-limit-getcities:      300
  ratelimits-remaining-getcities:  299
  ratelimits-reset-getcities:      1772552584
  ratelimits-limit-patchweb:       (presente no PATCH /v3/webhook)
```

---

## 10. Referência de Preços Reais (SP, ~4,5 km)

> Preços capturados em produção em 03/03/2026.

| serviceType | Preço base | specialRequest | Total |
|-------------|-----------|----------------|-------|
| HATCHBACK | R$ 16,97 | — | R$ 16,97 |
| LALAPRO | R$ 22,32 | — | R$ 22,32 |
| VAN | R$ 75,53 | — | R$ 75,53 |
| UV_FIORINO | R$ 39,41 | REFRIGERATED_VEHICLE (+R$ 85,00) | R$ 124,41 |
| TRUCK330 | R$ 110,00 | LOADING_1DRIVER1HELPER_MAX060MIN (+R$ 90,00) | R$ 200,00 |
| LALAPRO 3 paradas* | R$ 25,02 | multiStopSurcharge (+R$ 3,00) | R$ 28,02 |

\* Com `isRouteOptimized: true`. Sem otimização, `totalBeforeOptimization` seria R$ 52,93.

---

*Documentação auditada em produção · 03/03/2026 · Lalamove API v3 Brasil · v3.0*
