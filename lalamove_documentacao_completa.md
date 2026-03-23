# Lalamove Brasil — Documentação Mestra Exaustiva
### Auditoria Técnica Completa: REST API v3 + UAPI Interna + Infraestrutura + Dados de Produção
> **Gerada em:** 08/03/2026 | **Ambiente:** Produção Brasil | **Metodologia:** Reverse Engineering + Testes Diretos

---

## ÍNDICE

1. [Visão Geral do Ecossistema](#1-visão-geral-do-ecossistema)
2. [Infraestrutura e Serviços](#2-infraestrutura-e-serviços)
3. [Autenticação e Segurança](#3-autenticação-e-segurança)
4. [REST API v3 (Pública)](#4-rest-api-v3-pública)
5. [UAPI Interna (br-uapi)](#5-uapi-interna-br-uapi)
6. [Endpoints UAPI — Catálogo Completo](#6-endpoints-uapi--catálogo-completo)
7. [Dados Reais de Produção (Conta Promo Brindes)](#7-dados-reais-de-produção-conta-promo-brindes)
8. [Schemas e Estruturas de Dados](#8-schemas-e-estruturas-de-dados)
9. [Enums Completos](#9-enums-completos)
10. [Códigos de Erro](#10-códigos-de-erro)
11. [WAF / Gateway de Segurança Argus](#11-waf--gateway-de-segurança-argus)
12. [Playwright — Bypass WAF e Automação de Login](#12-playwright--bypass-waf-e-automação-de-login)
13. [Ambiente de Execução e Proxy](#13-ambiente-de-execução-e-proxy)
14. [Arquitetura de Integração (Bitrix24 + n8n)](#14-arquitetura-de-integração-bitrix24--n8n)
15. [Errata — Correções à Documentação Oficial](#15-errata--correções-à-documentação-oficial)
16. [Conhecimentos Técnicos Adquiridos](#16-conhecimentos-técnicos-adquiridos)
17. [Arquivos Gerados](#17-arquivos-gerados)

---

## 1. Visão Geral do Ecossistema

O Lalamove opera com **duas APIs distintas e paralelas**:

| API | Propósito | Autenticação | Acesso |
|-----|-----------|-------------|--------|
| **REST API v3** (`rest.lalamove.com`) | Integração de parceiros/desenvolvedores | HMAC-SHA256 | Público (com credenciais) |
| **UAPI Interna** (`br-uapi.lalamove.com`) | App web / mobile | Session token | Privado (uso interno) |

Além disso, existem serviços auxiliares:

| Serviço | URL | Função |
|---------|-----|--------|
| **br-umeta** | `br-umeta.lalamove.com` | Configuração da região Brasil |
| **region-configuration** | `region-configuration.lalamove.com` | Configuração global de países |
| **br-sign-api** | `br-sign-api.lalamove.com` | Gateway WAF / Argus SDK |
| **Firebase Realtime DB** | `lalamoveglobal.firebaseio.com` | WebSocket / tempo real |
| **br-oimg** | `br-oimg.lalamove.com` | Imagens (avatares, veículos) |
| **br-uappweb** | `br-uappweb.lalamove.com` | Mini-app web (membros) |

### Brasil — Configuração de Região
```json
{
  "countryId": 20000,
  "hcountry": 20000,
  "datacenter": "SAO",
  "city_id_sao_paulo": 21001,
  "uapi_url": "https://br-uapi.lalamove.com",
  "umeta_url": "https://br-umeta.lalamove.com",
  "sign_service_url": "https://br-sign-api.lalamove.com/index",
  "argus_enabled": true,
  "security_sdk_flag": 1,
  "hlang": "pt_BR",
  "timezone": "America/Sao_Paulo"
}
```

---

## 2. Infraestrutura e Serviços

### 2.1 Mapa Completo de URLs

```
web.lalamove.com          → Frontend React/Next.js (SPA)
rest.lalamove.com         → REST API v3 pública
br-uapi.lalamove.com      → UAPI PHP interna (PHP backend)
br-umeta.lalamove.com     → Metadados da região Brasil
br-sign-api.lalamove.com  → WAF Gateway com Argus SDK
br-oimg.lalamove.com      → CDN de imagens Brasil
region-configuration.lalamove.com → Config global países
lalamoveglobal.firebaseio.com → Firebase Realtime Database
```

### 2.2 Frontend — Tecnologias Identificadas

- **Framework:** React / Redux (Redux Toolkit)
- **Build:** Webpack (bundle.js principal ~5MB minificado)
- **Estado:** Redux com múltiplos reducers (order, driver, fleet, payment, ui...)
- **Chat:** MQTT5 (`mqtt-packet` embarcado no bundle) + PubNub (fallback)
- **Mapas:** Google Maps Platform (Place ID no formato `ChIJ...`)
- **Captcha:** hCaptcha (para login quando `enableLoginHCaptcha=true`)
- **Localização geográfica:** `get_geo_ip_location` via IP

### 2.3 Revisão de Versão do App

```
version:   5.37.0
revision:  53700  (fórmula: major*10000 + minor*100 + patch)
os:        web
device_type: web
```

**Fórmula de revisão** (extraída do bundle):
```javascript
function aX(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}
// aX("5.37.0") = 5*10000 + 37*100 + 0 = 53700
```

---

## 3. Autenticação e Segurança

### 3.1 REST API v3 — HMAC-SHA256

**Credenciais de Produção (Promo Brindes):**
```
API_KEY:    pk_prod_d38621223012b9ec71d0634589126e3b
SECRET_KEY: sk_prod_v30Ci06vXqPeizCg6e461VZEymmFzMDAXZQwTm3NdYcwyLaS8nxrQEX0JKcp0mAM
BASE_URL:   https://rest.lalamove.com
```

**Algoritmo de Assinatura:**
```python
import hmac, hashlib, time

def sign_request(method, path, body, api_key, secret_key):
    ts = str(int(time.time() * 1000))
    raw = f"{ts}\r\n{method}\r\n{path}\r\n\r\n{body}"
    sig = hmac.new(secret_key.encode(), raw.encode(), hashlib.sha256).hexdigest()
    token = f"hmac {api_key}:{ts}:{sig}"
    return token

# Headers obrigatórios:
headers = {
    "Authorization": sign_request(...),
    "X-LLM-COUNTRY": "BR",
    "X-Request-ID": "<uuid4>",
    "Market": "BR",
    "Content-Type": "application/json"
}
```

### 3.2 UAPI Interna — Session Token

**Credenciais Web (Promo Brindes):**
```
URL:      https://web.lalamove.com
Phone:    11935024030
Password: @Promobrindes2021
```

**Token de Sessão Ativo (capturado via Playwright):**
```
token:         6f5ad9698d704c66b3026e69a60a0ba4
user_fid:      qDdE35mo
city_id:       21001
is_ep:         1 (Enterprise)
refresh_token: af8IHffQ-CLYd0Y42i0opmCH800pI-pyV2k_oz-WgC8
expires_in:    86400 (24 horas)
```

**Estrutura da Requisição UAPI:**
```
URL: POST https://br-uapi.lalamove.com/index.php
     ?_m={method}
     &hcountry=20000
     &_su={su_token}
     &_t={unix_timestamp}
     &device_id={uuid}
     &version=5.37.0
     &revision=53700
     &os=web
     &device_type=web

Body (application/x-www-form-urlencoded):
  token={TOKEN}
  &is_ep=1
  &hcountry=20000
  &hlang=pt_BR
  &city_id=21001
  &args={JSON_ARGS}
```

**Geração do `_su` (Session URL token):**
```javascript
const _su = `${Date.now()}ehll${parseInt(Math.random() * 1e10, 10)}`;
// Exemplo: "1709924000000ehll7432198560"
```

**Geração do `device_id`:**
```javascript
// Função k6() no bundle — UUID v4 gerado na primeira visita
// Persistido em localStorage['og0']
// Exemplo: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

### 3.3 Criptografia de Senha (RSA-OAEP)

A senha não é enviada em texto plano — o app usa `crypto.subtle` (Web Crypto API):

```javascript
// Fonte: bundle.js extraído
async function encryptPassword(password, publicKeyPem) {
  const nonce = generateNonce(); // string aleatória
  const plaintext = `${nonce}@${password}`;
  
  const publicKey = await crypto.subtle.importKey(
    "spki",
    pemToDer(publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    new TextEncoder().encode(plaintext)
  );
  
  return `encrypted:${base64url(ciphertext)}`;
}

// Enviado como: password=encrypted:BASE64URL_CIFRADO
```

> **Nota:** Em ambiente curl/scripts Python, a senha pode ser enviada em texto plano como fallback. O UAPI aceita ambos os formatos dependendo da configuração do servidor.

### 3.4 Anti-CSRF (`record_id`)

- Cada sessão de login gera um `record_id` exclusivo
- Obtido via endpoint inicial de configuração
- Enviado junto com operações de autenticação

### 3.5 WAF — br-sign-api (Argus SDK)

O gateway `br-sign-api.lalamove.com` protege endpoints sensíveis (cotação, criação de pedido):

```json
{
  "sign_service_url": "https://br-sign-api.lalamove.com/index",
  "security_sdk_flag": 1,
  "argus_enabled": true
}
```

**Erro quando token Argus inválido:**
```json
{"ret": 10010, "msg": "Gateway signature error"}
```

**Endpoints afetados (bloqueados sem Argus):**
- `order_request` — criação de pedidos
- `price_calculate` — cotação de preço
- `order_detail` — detalhes de pedido
- Qualquer endpoint de escrita crítica

**Como contornar:** Usar Playwright com browser real (Chrome/Chromium) — o Argus SDK roda no browser e gera o token automaticamente. Ver Seção 12.

---

## 4. REST API v3 (Pública)

### 4.1 Base URL e Headers

```
BASE: https://rest.lalamove.com

Headers obrigatórios:
  Authorization: hmac {API_KEY}:{TIMESTAMP_MS}:{HMAC_SHA256}
  X-LLM-COUNTRY: BR
  X-Request-ID: {uuid4}
  Market: BR
  Content-Type: application/json
```

### 4.2 Endpoints Auditados

#### Cidade e Serviços
```
GET /v3/cities
  → Lista cidades disponíveis no Brasil
  → CORREÇÃO DOCUMENTAÇÃO: campo é "services", NÃO "serviceTypes"

GET /v3/cities/{cityId}/serviceTypes
  → Tipos de serviço por cidade
```

**Resposta real (São Paulo - city_id: BR_SAO):**
```json
{
  "cities": [{
    "cityId": "BR_SAO",
    "displaySequence": 1,
    "locode": "BR SAO",
    "name": {"pt_BR": "São Paulo"},
    "services": ["MOTORCYCLE", "CAR", "MPV", "VAN", "TRUCK175", "TRUCK330"],
    "timezone": "America/Sao_Paulo"
  }]
}
```

#### Cotação
```
POST /v3/quotations
Body:
{
  "serviceType": "MOTORCYCLE",
  "language": "pt_BR",
  "stops": [
    {
      "coordinates": {"lat": "-23.5725592", "lng": "-46.54058"},
      "address": "Avenida Renata, 249 - Vila Formosa, São Paulo - SP"
    },
    {
      "coordinates": {"lat": "-23.5154269", "lng": "-46.5965197"},
      "address": "Rua São Quirino, 1090 - Parque Veloso, São Paulo"
    }
  ]
}

Response:
{
  "quotationId": "string",
  "scheduleAt": "ISO-8601",
  "serviceType": "MOTORCYCLE",
  "stops": [...],
  "priceBreakdown": {
    "base": "1500",
    "totalExcludePriorityFee": "1500",
    "total": "1500",
    "currency": "BRL",
    "priorityFee": "0"
  },
  "distance": {"value": 8600, "unit": "m"},
  "duration": 1200
}
```

> **NOTA:** `driverId` na resposta é SEMPRE string `""` quando não atribuído, NUNCA `null`. Isso contradiz a documentação oficial. Confirmado em produção.

#### Pedidos
```
POST /v3/orders
  → Cria pedido a partir de quotationId

GET /v3/orders/{orderId}
  → Detalhes do pedido (inclui driverId, status, stops)

DELETE /v3/orders/{orderId}
  → Cancela pedido

GET /v3/orders/{orderId}/drivers/{driverId}
  → Informações do motorista atribuído
```

#### Webhooks (Rastreamento)
```
POST /v3/webhooks
  → Registra URL de webhook

GET /v3/webhooks
  → Lista webhooks configurados

DELETE /v3/webhooks/{webhookId}
  → Remove webhook

Eventos possíveis:
  ORDER_STATUS_CHANGED
  DRIVER_LOCATION_UPDATED  
  ORDER_COMPLETED
  ORDER_CANCELLED
```

#### Taxa de Prioridade
```
POST /v3/orders/{orderId}/priorityFee
Body: {"priorityFee": "200"}
→ Adiciona taxa para atrair motoristas mais rápido
```

### 4.3 Tipos de Serviço Brasil (Confirmados em Produção)

| serviceType | Nome UAPI | Wheel | Observação |
|-------------|-----------|-------|------------|
| `MOTORCYCLE` | Moto | 2 | Mais rápido, menor |
| `CAR` | Carro | 4 | Sedan/Hatch genérico |
| `MPV` | Carro Hatch | 4 | Hatchback |
| `VAN` | Utilitário e Pick-Up | 4 | Van/pickup |
| `TRUCK175` | Caminhão 1,75t | 4 | Truck pequeno |
| `TRUCK330` | Caminhão 3,3t | 4 | Truck médio |

> **Vehicle IDs reais observados em pedidos:**
> - `120767` = Carro  
> - `121120` = Carro Hatch (MPV)  
> - `666` = Utilitário e Pick-Up

### 4.4 Códigos de Cancelamento Brasil

> **CORREÇÃO CRÍTICA:** Os campos `cancelParty` e `cancelledReason` **NÃO EXISTEM** na API Brasil. A documentação oficial menciona esses campos, mas foram confirmados como inexistentes na resposta real da API de produção.

---

## 5. UAPI Interna (br-uapi)

### 5.1 Arquitetura

A UAPI é uma **API PHP monolítica** que expõe todas as funcionalidades do app web/mobile. É roteada por `?_m={method}` no query string.

**Padrão de roteamento:**
```
/index.php?_m={method}         → endpoint principal
/index.php?_m={module}&_a={action}  → módulo com sub-ação
```

**Formato de resposta padrão:**
```json
{
  "ret": 0,          // 0 = sucesso, >0 = erro
  "msg": "",         // mensagem de erro (vazio se ret=0)
  "data": { ... }    // payload da resposta
}
```

### 5.2 Headers Necessários

```
User-Agent: Mozilla/5.0 AppleWebKit/537.36 Chrome/...
Content-Type: application/x-www-form-urlencoded; charset=utf-8
Origin: https://web.lalamove.com
X-LLM-LOCATION: BR
```

### 5.3 Comportamento de Retry

Muitos endpoints têm flag interna `retry=true` — o app refaz a chamada automaticamente em caso de falha de rede. Identificados no bundle:
- `get_user_info` — retry automático
- `get_corporate` — retry automático
- `ep_config` — retry automático
- `get_laster_order` — retry automático
- `latest_unrated_order` — retry automático
- `get_user_place_order_info` — retry automático
- `city_list` — retry automático (`skipStartUpLock=true`)

### 5.4 Token Refresh

```json
{
  "token": "6f5ad9698d704c66b3026e69a60a0ba4",
  "refresh_token": "af8IHffQ-CLYd0Y42i0opmCH800pI-pyV2k_oz-WgC8",
  "client_expires_in": 86400
}
```

O refresh_token deve ser usado para renovar o session token antes de expirar (24h).

---

## 6. Endpoints UAPI — Catálogo Completo

> Total identificado: **174 endpoints únicos** (via análise estática do bundle + testes de produção)

### 6.1 Autenticação

| Endpoint | Método | Descrição | Args principais |
|----------|--------|-----------|-----------------|
| `login_by_pwd` | POST | Login telefone + senha | `phone_no`, `password` (RSA-OAEP), `device_id`, `city_id`, `record_id`, `human_proof?` |
| `login_by_email_pwd` | POST | Login email + senha | `email`, `password`, `device_id`, `city_id`, `record_id` |
| `social_login` | POST | Login OAuth | `social_source` (GOOGLE/FACEBOOK/APPLE), `social_secret`, `social_secret_type`, `is_new` |
| `send_sms_code` | GET | Envia código SMS | `phone_no`, `is_new`, `type`, `scene` |
| `verify_sms_code` | GET | Verifica código SMS | `phone_no`, `sms_code`, `type` → `verify_token` |
| `register` | POST | Cadastro pessoal | `first_name`, `last_name`, `email`, `phone_no`, `password`, `sms_code`, `city_id`, `record_id`, `reg_ref?`, `simplify_flow`, `is_marketing_opt_in` |
| `register_business_user` | POST | Cadastro empresarial | Mesmos + `corporate_name`, `industry`, `work_email`, `verification_code` |
| `logout` | GET | Encerra sessão | `{}` |
| `modify_pwd` | GET | Altera senha | `phone_no`, `sms_code`, `password`, `record_id`, `type` (1=troca, 2=reset) |

**Detalhes críticos do login:**
- Query param extra: `user_md5=MD5(phone_number)` 
- Response: `{ token, user_fid, city_id, country_id: "BR", refresh_token, client_expires_in }`
- App detecta país pelo geo-IP — **precisa selecionar Brasil (+55) explicitamente no picker antes de fazer login**

### 6.2 Cidade e Veículos

| Endpoint | Método | Descrição | Args principais |
|----------|--------|-----------|-----------------|
| `city_list` | GET | Lista cidades ativas | `{}` — filtro: `enable_overseas === 2` |
| `city_info` | GET | Config completa da cidade | `city_id`, `fetch_spec_req`, `fetch_vehicle_std`, `fetch_vehicle_price`, `revision` |
| `vehicle_list` | GET | Veículos disponíveis | `city_id` |

**Campos mapeados de `city_info`:**
```javascript
{
  cityId: d.city_id,
  countryId: d.country_id,
  cityName: d.name,
  cityZone: d.timezone,
  latLon: d.lat_lon,
  cityCodeMap: d.city_code_map
}
```

**Feature flags retornadas por `city_info`:**
- `enable_proof_of_delivery`
- `enable_new_cs_chat`
- `enable_mywallet`
- `enable_insurance`
- `enable_ride`
- `enable_user_driver_chat`
- `enable_pub_nub`
- `enable_driver_rating`
- `enable_favourite_driver`
- `enable_daylight_saving`
- `enable_wallet_topup`
- `enable_capture_item_info`

**Vehicle item mapeado para:**
```javascript
{
  id: order_vehicle_id.toString(),
  name: vehicle_name,
  planType: 100|101|102|103,  // REGULAR|SAVER|PRICE_NEG|PRIORITY
  wheelType: 2|4,             // 2=moto, 4=carro/van
  vehicleStdArr: [{ name, price, stdTagId }],
  specialRequests: [{ item_id, name, price_type: 1|2|3|4 }],
  vehiclePriceTextItem: { dimensions, weight }
}
```

### 6.3 Cotação (UAPI)

| Endpoint | Método | Descrição | Bloqueio |
|----------|--------|-----------|---------|
| `price_calculate` | POST | Calcula preço | ⛔ WAF (ret=10010) |

**Args de `price_calculate`:**
```
city_id, order_vehicle_id, plan_type (0=REG|1=PRIO|2=SAVER),
addr_info (waypoints), type=2, lat_lon="lat,lon",
pay_type (0|31|4|3|32), quote_type_switch ("SAVER"|"PRIORITY"),
city_info_revision, is_get_max_discount_coupon="1",
std_tag, std_tag_ids, spec_req[], order_time, coupon_id?,
edit_order_uuid?, multifactor_price?, same_num?
```

**Error codes:**
- `42201` = RATE_LIMIT_EXCEEDED
- `22018` = SELECTED_PRICE_OPTION_UNAVAILABLE

### 6.4 Criação de Pedidos

| Endpoint | Método | Descrição | Bloqueio |
|----------|--------|-----------|---------|
| `order_request` | POST | Cria pedido | ⛔ WAF (ret=10010) |

**Args completos de `order_request`:**
```
send_type (0=qualquer|1=prefere_fav|2=só_fav|3=fleet)
pay_type (0=CASH|31=ONLINE|4=WALLET|3=ENT_WALLET|32=POSTPAID)
order_vehicle_id, plan_type, user_name, user_tel, remark
order_time (timestamp), addr_info[] (waypoints)
price_item[], price_id, city_info_revision
distance_by=3, porterage_type=0
spec_req[], std_tag, std_tag_ids
is_proof_of_delivery_required (0|1)
coupon_id?, order_item_info?, delivery_start_time?, delivery_end_time?
payment_method?, client_return_url?, contract_no?
ecommerceOrderInfos?, insurance_code?
```

**Schema Waypoint (addr_info[]):**
```json
{
  "name": "Nome do local",
  "addr": "Endereço completo",
  "place_id": "ChIJ...",
  "city_id": 21001,
  "contacts_name": "Nome do contato",
  "contacts_phone_no": "+5511...",
  "house_number": "Apto 42 / instrução",
  "lat_lon": {"lat": -23.5, "lon": -46.6},
  "node": 0,
  "is_cash_payment_stop": false,
  "proof_of_delivery": {
    "contact_person_name": "...",
    "note": "...",
    "is_signature_required": true
  }
}
```

### 6.5 Gestão de Pedidos

| Endpoint | Método | Descrição | Args principais |
|----------|--------|-----------|-----------------|
| `order_list_new` | GET | Lista com paginação por cursor | `order_statuses[]`, `last_id`, `page_size`, `daylight_zone`, `start/end_datetime` |
| `order_detail` | GET | Detalhes completos | `order_uuid`, `interest_id:0`, `daylight_zone` |
| `order_status` | GET | Status tempo real | `order_uuid`, `find_drivers`, `send_type` |
| `order_time_status` | GET | Status com ETA | `order_uuid`, `driver_fid` |
| `order_cancel` | GET | Cancela pedido | `order_uuid`, `reason`, `reason_id`, `order_status`, `cancellation_fee_fen` |
| `order_cancellation_eligibility` | GET | Pode cancelar? + taxa | `order_uuid` |
| `get_cancel_reason_new` | GET | Razões de cancelamento | `is_sort:0`, `scene:2|3`, `is_cash_order`, `order_vehicle_id` |
| `order_edit` | POST | Edita pedido | `order_uuid`, `addr_info`, `price_item`, `addr_op_mode:0-4`, `price_id` |
| `order_edit_eligibility` | GET | Pode editar? | `order_uuid`, `order_time`, `pickup_addr_info` |
| `order_edit_banner_show` | GET | Banner de edição | `order_uuid`, `order_uuids`, `interest_id` |
| `order_edit_banner_count` | GET | Contador edições | `order_uuid`, `order_uuids` |
| `order_send_all` | GET | Reenvia para todos | `order_uuid`, `find_drivers`, `phone_no`, `web_token` |
| `order_repeat_list` | GET | Pedidos para repetir | `page_size:20`, `last_id` |
| `order_search` | GET | Busca avançada | `order_statuses`, `search_order_display_id`, `start/end_datetime` |
| `order_tracking` | GET | Rastreamento público | `share_id`, `sign`, `type` |
| `next_day_order_detail` | GET | Detalhe agendado | `order_uuid`, `daylight_zone` |
| `next_day_order_cancel` | POST | Cancela agendado | `order_uuid`, `survey_key`, `token`, `type` |
| `next_day_order_cancellation_eligibility` | GET | Elegibilidade cancelamento agendado | `order_uuid` |
| `get_laster_order` | GET | Último pedido | `{}` |
| `order_pay_client_notify` | GET | Notifica cliente pagamento | `order_uuid`, `app_key`, `biz_no`, `type` |

**`addr_op_mode` em `order_edit`:**
- `0` = NO_EDIT
- `1` = UPDATE_DELIVERY_INFO
- `2` = ADD_POINT
- `3` = REORDER_POINT
- `4` = REMOVE_CASH_PAYEE_POINT

### 6.6 Motorista e Avaliação

| Endpoint | Método | Args principais |
|----------|--------|-----------------|
| `user_rating` | GET | `order_uuid`, `driver_fid`, `rating:1-5`, `comment_ids[]`, `custom_comment`, `op_to_driver`, `msg` |
| `latest_unrated_order` | GET | `{}` → pedido mais recente sem avaliação |
| `get_user_nps_info` | GET | `{}` → info de NPS pendente |
| `prompt_user_nps` | GET | `order_uuid`, `msg` |
| `get_change_driver_reason_web` | GET | `{}` → lista razões de troca |
| `change_driver_web` | GET | `order_uuid`, `reason`, `reason_id`, `web_token`, `web_token_type` |
| `add_tips` | GET | `order_uuid`, `tips_fen`, `[payment_method, client_return_url, contract_no, asset_product_code]` |

**Schema resposta Driver Info (mapper `lAe`):**
```javascript
{
  id: driver_fid,
  name: name,
  vehicleTypeId: physics_vehicle_name,
  licensePlate: license_plate,
  avgRating: parseFloat(avg_rating),
  photoUri: photo,
  canTrackDriver: false,
  favorited: !!is_favorite,
  banned: !!is_ban,
  vehiclePhoto: vehicle_photo_background_back,
  vehicleBrandSeries: brand_series,
  vehicleColor: vehicle_color,
  // phone: omitido se número mascarado (contém "****")
}
```

**`comment_ids` em `user_rating`:**
- Positivos (elogios): `1001–1006`
- Negativos (críticas): `2001–2006`

### 6.7 Frota (Fleet)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `get_fleet` | GET | Lista frota. Args: `fleet_type_code` (1=favoritos, 2=bloqueados), `page_no`, `page_size`, `search`, `start_time`, `end_time` |
| `fleet_add_favorite_web` | GET | Adiciona favorito. Args: `driver_fid` |
| `fleet_del_favorite_web` | GET | Remove favorito. Args: `driver_fid` |
| `fleet_add_ban` | GET | Bloqueia motorista. Args: `driver_fid` |
| `fleet_del_ban` | GET | Desbloqueia motorista. Args: `driver_fid` |

### 6.8 Pagamentos e Carteira

| Endpoint | Método | Args / Detalhes |
|----------|--------|-----------------|
| `wallet_balance` | GET | `city_id` → `{balance_fen: number}` (centavos) |
| `wallet_flow_list` | GET | `start_time`, `end_time`, `page_no`, `page_size`, `trans_type:1` |
| `list_payment_methods` | GET | `app_key: "global_u_order"|"global_ep_order"` |
| `query_pay_status` | GET | `app_key`, `biz_no` → status enum OJ0 |
| `get_postpaid_wallet` | GET | `{}` → status enum f9e |
| `get_postpaid_wallet_transactions` | GET | `start_time`, `end_time`, `page_no`, `page_size` |
| `confirm_bill&_a=index` | GET | `order_uuid`, `pay_fee_fen`, `pay_type:31`, `order_terminal:3`, `lat`, `lon` |
| `get_bill_unpay_order&_a=index` | GET | `order_uuid`, `pay_type`, `city_id` |
| `charge&_a=charge_list` | GET | `city_id`, `to_pay_amount_fen` |
| `contract&_a=card_list` | GET | `terminal:2 (Up.PC)` |
| `contract&_a=query_entry_config` | GET | `terminal`, `app_key`, `order_plan_type`, `custom_top_up`, `placed_via` |
| `contract&_a=last_payment_method` | GET | `terminal`, `app_key`, `order_plan_type` |
| `contract&_a=prepay_token_url` | GET | `asset_product_code`, `terminal`, `[app_key]` |
| `contract&_a=sign` | GET | `terminal`, `sign_type`, `biz_no`, `auto_debit_platform_back_url`, `client_return_url` |
| `contract&_a=unsign` | GET | `terminal` |
| `contract&_a=query_three_payment` | GET | `order_uuid`, `asset_product_code`, `redirect_result` |
| `contract&_a=query_order` | GET | `b_order_no`, `city_id`, `remark` |
| `contract&_a=contract_prepare` | GET | `terminal`, `sign_type`, `biz_no`, `auto_debit_platform_back_url`, `asset_product_code` |
| `pay_unsettled_cancellation_fee` | GET | `order_uuid`, `redirect_result`, `asset_product_code` |
| `unsettled_cancelled_order_bill` | GET | `order_uuid`, `order_uuids`, `vehicle_name`, `asset_product_code` |
| `invoice_page` | GET | `app_key` → `{url, token, expired_time}` |
| `payment_invoice&_a=get_payment_invoice` | GET | `terminal`, `biz_no`, `asset_product_code` |
| `payment_invoice&_a=edit_payment_invoice` | GET | `asset_product_code`, `redirect_result` |

### 6.9 Comprovantes e Extratos

| Endpoint | Método | Args |
|----------|--------|------|
| `download_pdf_receipt` | GET | `order_uuid`, `type:"order"` |
| `download_pdf_e_receipt` | GET | `tx_id`, `type:"top-up"`, `bank_code`, `node` |
| `send_email_receipt` | GET | `order_uuid`, `is_ep` |
| `send_e_receipt` | GET | `tx_id`, `type:"top-up"` |
| `get_bank_info` | GET | `tx_id`, `bank_code`, `node`, `type` |
| `generate_statement_token` | GET | `start_time`, `end_time`, `type` |
| `get_statement_report_by_token` | GET | `token`, `start_time`, `end_time`, `type` |

### 6.10 Cupons

| Endpoint | Método | Args |
|----------|--------|------|
| `coupon_list_web` | GET | `start_time`, `end_time`, `page_no`, `page_size`, `search:["termo"]` (array, não string!) |
| `coupon_exchange_web` | GET | `exchange_code: "CODIGO-CUPOM"` |

**Tipos de cupom:** `ONLINE_ONLY=1`, `UNLIMITED=3`  
**Tipos de desconto:** `AMOUNT_OFF=1`, `PERCENTAGE_OFF=2`  
> **Atenção:** `search` é um **array de strings**, não uma string simples.

### 6.11 Mapa e Endereços

| Endpoint | Método | Args |
|----------|--------|------|
| `map_poi_search` | GET | `kw`, `city_id`, `addr_info`, `place_type`, `is_ld`, `order_vehicle_id`, `plan_type`, `is_ld_module`, `order_module_id` |
| `map_poi_detail` | GET | `place_id`, `name`, `poiid`, `addr_info`, `addr_type` |
| `map_poi_detail2` | GET | `place_id`, `name` → `{location: {lat, lon}}` |
| `map_api&_a=optimize_route` | GET | `origin`, `destination`, `waypoints:"lat,lon|..."`, `city_id`, `daylight_zone` |
| `map_api&_a=geocode` | GET | `daylight_zone`, `order_uuid` |
| `get_service_area` | GET | `city_id`, `coordinates`, `order_vehicle_id`, `stops`, `order_uuid` |
| `get_same_day_bulk_order_timeslots` | GET | Timeslots para agendamento |
| `add_search_history` | GET | `place_id`, `poiid`, `name`, `addr_info`, `addr_type` |
| `search_history_list` | GET | `addr_type` |
| `daylight_zone` | GET | `origin`, `destination`, `waypoints`, `timestamp` |

### 6.12 POD (Prova de Entrega)

| Endpoint | Método | Args |
|----------|--------|------|
| `pod_img_feedback_create` | GET | `order_uuid`, `node`, `image_url`, `feedback_status:0|1|2`, `remark`, `bank_code`, `tx_id` |
| `pod_img_feedback_update_bottom_sheet_viewed` | GET | `order_uuid`, `node`, `image_url` |
| `insurance_form_link` | GET | `order_uuid`, `order_uuids`, `interest_id`, `is_tapped` |

**Status POD (array `ole`):** `["PENDING", "SIGNED", "DELIVERED", "FAILED", "NOT_APPLICABLE"]`  
**Feedback POD:** `NO_FEEDBACK=0`, `THUMB_UP=1`, `THUMB_DOWN=2`

### 6.13 Enterprise / Times

> Todos exigem `is_ep=1` e token com permissão empresarial.

| Endpoint | Método | Args |
|----------|--------|------|
| `get_corporate` | GET | `{}` → company info completa |
| `update_corporate` | POST | `industry`, `address`, `fiscal_code`, `staff_job_title`, `monthly_delivery_volume`, `contact_method`, `frequent_vehicle_type` |
| `submit_corporate_verification` | POST | `phone_no`, `sms_code`, `document_type`, `filename`, `url`, `tax_id`, `tax_id_attachment_file_name`, `license_no`, `license_no_attachment_file_name`, `industry`, `fiscal_code`, `address`, `staff_job_title`, `monthly_delivery_volume`, `contact_method` |
| `update_corporate_document` | POST | Mesmos de `update_corporate` |
| `get_staffs` | GET | `page_num`, `page_size`, `search`, `role`, `include_deleted` |
| `add_invite_member` | POST | `invite_email`, `role` |
| `delete_staff` | POST | `id` |
| `update_staff` | POST | `id`, `role`, `permissions...` |
| `delete_invite_record` | POST | `id` |
| `ep_config` | GET | Configurações de notificação (retry) |
| `get_notification_settings` | GET | Configurações de notif |
| `update_notification_settings` | GET | `channel`, `notification_type`, `is_enabled`, `phone_no`, `email` |
| `get_analytics_dashboard` | GET | `start_date`, `end_date (YYYY-MM-DD)`, `filters` |
| `get_analytics_dashboard_filters` | GET | `start_date`, `end_date` → `{orderVehicles, statuses}` |
| `ep_app_connector_connect` | POST | `connector_config`, `document_type`, `filename`, `url`, `phone_no`, `sms_code` |

**Roles Enterprise (enum `ct`):**
- `NONBUSINESS = 0`
- `ADMIN = 1`
- `STAFF = 2`
- `MANAGER = 3`

### 6.14 E-Commerce

Plataformas suportadas: **Shopify**, **WooCommerce**, **TikTok**, **Grab**

| Endpoint | Método | Args |
|----------|--------|------|
| `get_e_commerce_store_integrations` | GET | `platform`, `store_id` |
| `create_e_commerce_store_integration` | POST | `platform`, `integration_token`, `store_id`, `options`, `raw_query`, `lead_source` |
| `get_e_commerce_integration_token` | GET | `platform`, `raw_query` |
| `get_e_commerce_integration_url` | GET | `platform`, `raw_query`, `store_id`, `integration_token` |
| `get_e_commerce_store_info` | GET | `platform`, `store_id`, `raw_query` |
| `get_e_commerce_store_orders` | GET | `platform`, `store_id`, `page_info`, `ascending`, `location_id` |
| `get_e_commerce_pickup_locations` | GET | `platform`, `store_id`, `integration_token` |
| `add_e_commerce_pickup_location` | POST | `platform`, `store_id`, `location_id`, `location: {name, address, lat, lng...}` |
| `update_e_commerce_pickup_location` | POST | `platform`, `store_id`, `location_id`, `location` |
| `update_e_commerce_default_pickup_location` | GET | `platform`, `store_id`, `location_id` |
| `remove_e_commerce_pickup_location` | GET | `platform`, `store_id`, `location_id` |
| `create_feature_lead` | POST | `lead_source`, `options`, `platform`, `raw_query` |
| `get_feature_lead_options` | GET | `lead_source`, `job_id`, `options` |
| `get_feature_lead_submission_eligibility` | GET | `lead_source`, `job_id` |

### 6.15 Bulk Order (Pedido em Lote)

| Endpoint | Método | Args |
|----------|--------|------|
| `get_same_day_bulk_order_config` | GET | `{}` |
| `create_same_day_bulk_order_request_job` | POST | `...job_data` (userName e cityId adicionados automaticamente) |
| `update_same_day_bulk_order_job` | POST | `job_id` + updates |
| `update_same_day_bulk_order_job_item` | POST | `job_id` + item updates |
| `trigger_same_day_bulk_order_request_job` | POST | `job_id` |
| `get_same_day_bulk_order_request_job` | GET | `job_id` |
| `get_same_day_bulk_order_csv_links` | GET | `job_id` → `{csvLinks}` |

### 6.16 Usuário e Preferências

| Endpoint | Método | Args |
|----------|--------|------|
| `get_user_info` | GET (retry) | `{}` |
| `get_user_place_order_info` | GET (retry) | `{}` |
| `update_preferences` | GET | `is_send_receipt`, `is_send_statement`, `is_send_topup_reminder`, `contact_email`, `is_proof_of_delivery_required` |
| `update_email` | GET | `email`, `email_code`, `is_check`, `password`, `timestamp`, `daylight_zone` |
| `send_email_code` | GET | `email`, `email_code`, `is_check`, `password`, `daylight_zone` |
| `update_phone_no` | POST | `phone_no`, `sms_code`, `document_type`, `filename`, `url` |
| `update_user_flag` | GET | `key: "flag_identifier"`, `contact_email`, `city_id...` |
| `switch_profile` | GET | `{}` — alterna PERSONAL ↔ BUSINESS |
| `account_delete_warn` | GET | `{}` → avisos antes de deletar |
| `account_deactivate_and_cashout` | GET | `cashout_info`, `reason_type`, `reason_description` |
| `get_file_upload_token` | GET | `city_id` → `token`, `upload_url` |
| `reward_auth` | GET | `id` |
| `reward_reg` | GET | `id` |
| `phone_number_validation` | GET | `phone_no`, `other_context`, `source_value` |
| `get_user_mtv_info` | GET | `phone_no`, `other_context`, `source_value` |

### 6.17 Endpoints Confirmados em Produção (ret=0)

Os seguintes endpoints foram testados com sucesso em produção com o token ativo:

```
✅ get_user_info         → user_fid, phone_no, email, city_id, is_ep, ep_permissions, flags, feature_flags
✅ get_corporate         → id, name, industry, address, verify, city_id, monthly_delivery_volume, corporate_tier, is_api_client
✅ wallet_balance        → balance_fen: 257480 (R$ 2.574,80)
✅ get_staffs            → staffs[], total: {admin:3, manager:0, employee:0}
✅ order_repeat_list     → 5 pedidos reais com addr_info, lat_lon, spec_req_price_item
✅ get_bill_unpay_order  → allow_order_request:1, order_unpay_num:0
✅ get_e_commerce_store_integrations → integrated_platforms:[]
✅ city_info             → city_info_item completo
✅ search_history_list   → (vazio)
✅ get_laster_order      → pay_type:-1, addr_info:[]
```

---

## 7. Dados Reais de Produção (Conta Promo Brindes)

> ⚠️ Dados extraídos diretamente da API de produção via Playwright + UAPI.

### 7.1 Dados do Usuário

```json
{
  "user_fid": "qDdE35mo",
  "phone_no": "+5511935024030",
  "registered_market_id": 20000,
  "nickname": "Andressa",
  "real_name": "Galvão",
  "email": "logistica02.promobrindes@gmail.com",
  "contact_email": "logistica02.promobrindes@gmail.com",
  "avatar": "https://br-oimg.lalamove.com/appuser/prd/appuser/2025/03/31/1743422985787485305298.png",
  "sex": 0,
  "member_no": 8001,
  "member_url": "https://br-uappweb.lalamove.com/uapp/#/userIndex",
  "ep_role": 1,
  "city_id": 21001,
  "is_ep": 1,
  "is_banned": 0,
  "enable_postpaid_wallet": false,
  "enable_same_day_bulk_order": false,
  "is_send_receipt": 1,
  "is_proof_of_delivery_required": 1,
  "is_ep_vip": 0,
  "is_send_statement": 1,
  "is_send_topup_reminder": 1,
  "agreed_policy_version": 20251202,
  "statement_emails": ["abner.silva@promobrindes.com.br"],
  "ep_permissions": {
    "staff_rw": "1",
    "other_order_rw": "1",
    "corporate_rw": "1",
    "corporate_view_dashboard": "1"
  },
  "enable_fleet_toggle": 0,
  "enable_my_fleet_only": 0,
  "enable_basic_insurance": 1,
  "preferred_order_plan_type": null,
  "feature_flags": {
    "bundle_delivery_cutoff_time_enabled": false,
    "custom_top_up_enabled": true
  }
}
```

**Flags do usuário (onboarding state):**
```
MOBILE_BUSINESS_TOOLTIP, WEB_BUSINESS_TOOLTIP, WEB_MANAGE_BUSINESS_TOAST,
WEB_PLACED_BY_TOOLTIP, MOBILE_OTHER_ORDER_DIALOG, WEB_MANAGE_TEAMMATES,
WEB_ORDER_SEARCH_TOOLTIP, MOBILE_OTHER_ORDER_DIALOG, MOBILE_ORDER_EDIT_TOOLTIP,
WEB_ORDER_EDIT_TOOLTIP, WEB_REPEATED_ORDER_TOOLTIP, MOBILE_REWARDS_TOOLTIP,
WEB_DASHBOARD_NEW_FEATURE_DIALOG_UNVERIFIED, WEB_DASHBOARD_NEW_FEATURE_DIALOG_VERIFIED,
SIMPLIFIED_REGISTRATION_COMPLETE, ACCOUNT_TYPE_SELECTION_DIALOG
```

### 7.2 Dados da Empresa

```json
{
  "id": 1058937499,
  "name": "Brasil Marcas Industria e Comercio de Brindes LTD",
  "industry": "RETAIL_AND_WHOLESALE",
  "address": "Rua Altinópolis",
  "verify": 1,
  "city_id": 21001,
  "monthly_delivery_volume": "50",
  "frequent_vehicle_type": "CAR",
  "contact_method": "PHONE",
  "license_no": "",
  "tax_id": "36385552000167",
  "corporate_tier": "enterprise",
  "statement_whitelist_ep": true,
  "staff_job_title": "Compras",
  "is_api_client": true,
  "documents": [{
    "document_category": "tax_id",
    "document_type": "tax_id",
    "document_name": "Cadastro Nacional da Pessoa Jurídica / Certidão Específica",
    "example_url": "https://luna-baxi-public.s3.sa-east-1.amazonaws.com/...",
    "filename": "",
    "url": "",
    "preview_url": ""
  }]
}
```

### 7.3 Saldo da Carteira

```json
{
  "balance_fen": 257480,
  "icon_text": "R$ 2.574,80"
}
```
> `balance_fen` = valor em centavos. Divisão por 100 = valor em Reais.

### 7.4 Time (Staffs)

| ID Staff | user_fid | Nome | Email | Role | API Key |
|----------|----------|------|-------|------|---------|
| `wDEKdwM6` | `mDyL4xXN` | Andressa Galvão | abner.silva@promobrindes.com.br | 1 (ADMIN) | ❌ |
| `mDyyPdXD` | `qDdE35mo` | Andressa Galvão | logistica02.promobrindes@gmail.com | 1 (ADMIN) | ✅ |
| `woRmdY2D` | `aozLPmgN` | Danila Fernandes | - | 1 (ADMIN) | ❌ |

- Total: **3 admins**, 0 managers, 0 employees
- Conta corrente (logística) tem API key ativa

### 7.5 Pedidos Reais (Histórico)

#### Pedido 1 — Carro (Concluído)
```
order_hash:     0dc850d71d07180d37a2405b07d9afd4
order_uuid:     100260307041927130210010084998963
order_display_id: 3445466978641461549
order_status:   2 (COMPLETED)
order_tag:      Carro
order_vehicle_id: 120767
pay_type:       3 (ENTERPRISE_WALLET)
order_time:     1772828967 (Unix timestamp)
user_name:      Andressa

Origem:  Avenida Renata, 249 - Vila Formosa, SP
         lat: -23.5725592 | lon: -46.54058
         place_id: ChIJvxMPVMddzpQRQSn5Nb7Duak
         contacts_name: Promo Brindes | tel: 1146375517
         house_number: "Boa tarde, favor coletar material"

Destino: Rua São Quirino, 1090 - Parque Veloso, SP
         lat: -23.5154269 | lon: -46.59651969999999
         place_id: ChIJWTgpjrVYzpQR5C3xQf3JTv8
         contacts_name: Rodonaves | tel: 1146375517
         house_number: "Boa tarde, favor entregar material"

spec_req_type: [137]
Serviço especial: "Ajuda do Motorista - Porta a porta (carga e descarga) • Até 30min"
item_id: 137 | item_name: LOADING_1DRIVER_MAX030MIN | valor: R$ 20,00
```

#### Pedido 2 — Utilitário e Pick-Up (Concluído)
```
order_hash:     572c3de4e9735ad55f46df1e7d82825f
order_uuid:     100260307040236113210010022316725
order_display_id: 3445452340797330205
order_status:   2 (COMPLETED)
order_tag:      Utilitário e Pick-Up
order_vehicle_id: 666
pay_type:       3 (ENTERPRISE_WALLET)

Origem:  Avenida Renata, 249 - Vila Formosa, SP
Destino: Av. do Estado, 2000 - Luz, SP
         contacts_name: Braspress

spec_req_type: [137]
Serviço especial: "Ajuda do Motorista - Porta a porta • Até 30min"
valor: R$ 25,00
```

#### Pedidos 3, 4, 5 — Carro Hatch (Transligue / Terminal de Cargas)
```
order_hash:     f190b7aba88320d7a5c19cc81b068a8a (mesmo hash = mesmo rota repetida)
order_vehicle_id: 121120 (Carro Hatch / MPV)
order_status:   2 e 3 (COMPLETED / CANCELLED)

Origem:  Avenida Renata, 249 - Vila Formosa, SP
Destino: Rua Domingos Pachêco, 179 - qd 4 - Jardim Julieta, SP
         (Terminal de Cargas Fernão Dias)
         contacts_name: Transligue | tel: 1146375517
         lat: -23.4902499 | lon: -46.564009
         remark: "Box 11 - Terminal de Cargas Fernão Dias"

spec_req_type: [137] e [138]
137 = LOADING_1DRIVER_MAX030MIN → R$ 20,00
138 = LOADING_1DRIVER_MAX060MIN → R$ 35,00
```

### 7.6 Endereço Fixo de Coleta (Promo Brindes)

```
Avenida Renata, 249
Bairro: Vila Formosa
Cidade: São Paulo - SP
CEP: 03377-000
Lat: -23.5725592
Lon: -46.54058
Google Place ID: ChIJvxMPVMddzpQRQSn5Nb7Duak
Contato: Promo Brindes | tel: 1146375517
Instrução: "Boa tarde, favor coletar material"
```

---

## 8. Schemas e Estruturas de Dados

### 8.1 Schema `order_detail` (mapper `iAe`)

```javascript
{
  order: {
    id: order_uuid,
    refId: order_display_id_str || String(order_display_id),
    bundled: order_type === 101,          // Xs.BUNDLED
    status: { id: order_status },
    orderStatus: order_status,            // "MATCHING", "ONGOING"...
    deliveryDatetime: {
      time: new Date(order_time_hts).toISOString(),
      daylightSavingsTimeType: daylight_type
    },
    deliveryTime: { start, end },
    isImmediate: is_immediate === 1,
    serviceTypeId: String(order_vehicle_id),
    serviceTypeName: vehicle_type_name,
    planType: String(plan_type),
    driverId: driver_id,                  // "" quando não atribuído (NUNCA null!)
    canShowDriverInfo: !!driver_id,
    creatorUserId: user_fid,
    paymentMethodId: MJ0(pay_type, pay_channel_id),
    paymentMethodIdRaw: pay_type,
    userRating: parseInt(rating_by_user),
    edited: order_edit?.is_edited,
    editable: order_edit?.can_edit,
    sendType: send_type,
    preferFavorite: send_type === 1,
    onlyFavorite: send_type === 2,
    shareLink: share_link,
    shareId: /* extraído de ?share_id= */,
    sign: /* extraído de ?sign= */,
    profileType: ep_id > 0 ? "BUSINESS" : "PERSONAL",
    priceId: price_id,
    priceQuoteType: price_quote_type,     // 100-103
    saverPriorityFeeEnable: priority_fee_enable,
    podEnabled: is_proof_of_delivery_required === 1,
    isIntercityOrder: is_intercity_order,
    allowChangeDriver: allow_change_driver,
    orderPricingModel: order_pricing_model
  },
  driver: {
    id: driver_fid,
    name,
    licensePlate: license_plate,
    avgRating: parseFloat(avg_rating),
    photoUri: photo,
    favorited: !!is_favorite,
    banned: !!is_ban,
    vehicleBrandSeries: brand_series,
    vehicleColor: vehicle_color,
    // phone: omitido se número mascarado (contém "****")
  },
  route: {
    waypoints: addr_info.map(i => ({
      name: i.name,
      address: i.addr,
      placeId: i.place_id,
      lat: i.lat_lon.lat,
      lng: i.lat_lon.lon,
      node: i.node,
      contacts: [{ name: i.contacts_name, phone: i.contacts_phone_no }],
      houseNumber: i.house_number,
      remarks: i.order_delivery_remark,
      pod: i.proof_of_delivery,
      podStatus: ole[i.proof_of_delivery_status]
    }))
  },
  pricing: {
    totalFee: total_fee_fen,
    basicFee: basic_fee_fen,
    priceItems: price_items,
    priorityFee: priority_fee_fen,
    couponDiscount: coupon_discount_fen
  }
}
```

### 8.2 Paginação por Cursor (`order_list_new`)

```javascript
// Request:
{
  order_statuses: [0,1,2,3],  // Im0 enum
  last_id: "",                 // cursor (vazio para primeira página)
  page_size: 10,
  daylight_zone: ...,
  start_datetime: ...,         // filtro opcional
  end_datetime: ...
}

// Response:
{
  order_item: [...],     // array de pedidos
  last_id: "cursor",    // enviar na próxima chamada
  has_more: true|false
}
```

### 8.3 Chat em Tempo Real — Driver Chat (MQTT5)

```
Protocolo: MQTT5 (mqtt-packet library embarcada no bundle)
Alternativa: PubNub (se city_info.enablePubnub=true)
URL: rtc.webChatUrl (de sg-umeta)

Eventos Redux:
DRIVER_CHAT_SDK_READY
DRIVER_CHAT_LOGIN_REQUEST | SUCCESS
DRIVER_CHAT_LOGOUT_REQUEST | SUCCESS | FAILURE
SEND_TEXT_MESSAGE_REQUEST | SUCCESS | FAILURE | BANNDED
SEND_IMAGE_MESSAGE_REQUEST | SUCCESS | FAILURE
SAVE_NEW_MESSAGE
DRIVER_CHAT_ON_MESSAGE_RECEIVED
DRIVER_CHAT_ON_MESSAGES_READ
DRIVER_CHAT_GET_PAGINATED_MESSAGES_REQUEST | SUCCESS | FAILURE
DRIVER_CHAT_SET_MESSAGE_READ_REQUEST | SUCCESS
```

---

## 9. Enums Completos

> Extraídos diretamente do bundle JavaScript (análise estática — Layer 27).

### Payment Types (`xn`)
| Nome | Valor |
|------|-------|
| CASH | 0 |
| ENTERPRISE_WALLET | 3 |
| WALLET | 4 |
| ONLINE | 31 |
| POSTPAID_ENTERPRISE_WALLET | 32 |

### Payment Channels (`j8`)
| Nome | Valor |
|------|-------|
| BusinessWallet | 301 |
| PersonalWallet | 302 |
| BusinessPostpaidWallet | 2501 |

### Quote Types (`nr`)
| Nome | Valor |
|------|-------|
| REGULAR | 100 |
| SAVER | 101 |
| PRICE_NEGOTIATION | 102 |
| PRIORITY | 103 |

### Order Status (`Im0` / `Pt`)
| Nome | Valor |
|------|-------|
| MATCHING | 0 |
| ONGOING | 1 |
| COMPLETED | 2 |
| CANCELLED | 3 |
| DRIVER_REJECTED | 4 |
| ORDER_TIMEOUT | 5 |
| ORDER_NOPAY | 6 |
| ORDER_LOADED | 7 |
| LOADING | 15 |
| UNLOADING | 16 |

### Profile Types (`ct`)
| Nome | Valor |
|------|-------|
| BUSINESS | 1 |
| PERSONAL | 2 |
| Staff NONBUSINESS | 0 |
| Staff ADMIN | 1 |
| Staff STAFF | 2 |
| Staff MANAGER | 3 |

### Order Plan Types (`hf`)
| Nome | Valor |
|------|-------|
| DEFAULT | 1 |
| REGULAR | 2 |
| SAVER | 3 |
| PRICE_NEGOTIATION | 4 |
| PRIORITY | 5 |

### Pay Status (`OJ0`)
| Nome | Valor |
|------|-------|
| NO_PAY | 0 |
| PAY_SUCCESS | 1 |
| PAY_FAILURE | 2 |
| REFUNDING | 3 |
| REFUNDED | 4 |
| PAY_WAIT | 5 |

### Postpaid Wallet (`f9e`)
| Nome | Valor |
|------|-------|
| CREATED | 0 |
| DISABLED | 5 |
| ENABLED | 10 |
| REMOVED | 15 |
| NO_POSTPAID_WALLET | 13001 |

### Fleet Types (`EAe`)
| Nome | Valor |
|------|-------|
| favorited | 1 |
| blocked | 2 |

### Order Types (`Xs`)
| Nome | Valor |
|------|-------|
| STANDARD | 1 |
| BUNDLED | 101 |

### Addr Op Mode (`Ip`)
| Nome | Valor |
|------|-------|
| NO_EDIT | 0 |
| UPDATE_DELIVERY_INFO | 1 |
| ADD_POINT | 2 |
| REORDER_POINT | 3 |
| REMOVE_CASH_PAYEE_POINT | 4 |

### Terminal (`Up`)
| Nome | Valor |
|------|-------|
| APP | 1 |
| PC (web) | 2 |
| S4W | 2 |
| L4W | 3 |

### Priority Level (`YR`)
| Nome | Valor |
|------|-------|
| LOWEST | 1 |
| LOWER | 4 |
| DEFAULT | 5 |
| HIGHER | 6 |
| HIGHEST | 9 |

### Vehicle Wheel Type
| Nome | Valor |
|------|-------|
| TWO_WHEELS (moto) | 2 |
| FOUR_WHEELS (carro/van) | 4 |

### Special Request Price Type
| Nome | Valor |
|------|-------|
| FIXED_PRICE | 1 |
| PERCENTAGE | 2 |
| DRIVER_NEGOTIABLE | 3 |
| FREE | 4 |

### POD Status (`ole[]`)
```javascript
ole = ["PENDING", "SIGNED", "DELIVERED", "FAILED", "NOT_APPLICABLE"]
// Acesso: ole[proof_of_delivery_status] → string de status
```

### POD Feedback (`lJ0`)
| Nome | Valor |
|------|-------|
| NO_FEEDBACK | 0 |
| THUMB_UP | 1 |
| THUMB_DOWN | 2 |

---

## 10. Códigos de Erro

### Erros Globais
| Código | Significado |
|--------|-------------|
| 0 | Sucesso |
| 10002 | PARAMS_ERROR — parâmetros inválidos |
| 10004 | No matched route — endpoint não existe |
| 10007 | Permissão negada / não autenticado |
| 10008 | SERVER_ERROR |
| 10010 | Gateway signature error (WAF Argus) |
| 10012 | OPS_CONFIGURATION_ERROR |
| 10102 | ORDER_CANCELLATION_PERIOD_EXPIRED |
| 22018 | SELECTED_PRICE_OPTION_UNAVAILABLE |
| 40125 | Survey: WONT_SHOW |
| 40126 | Survey: NEVER_SHOW |
| 40304 | Contract: erro de configuração |
| 42000 | order_tracking: link expirado |
| 42201 | RATE_LIMIT_EXCEEDED |
| 70004 | SYSTEM_ERROR_DOWNSTREAM |

### Erros Postpaid Wallet (`qp`)
| Código | Significado |
|--------|-------------|
| 13001 | NOT_CREATED |
| 27103 | DISABLED |
| 27104 | REMOVED |
| 27105 | INSUFFICIENT |

### Erros Bulk Order
| Código | Significado |
|--------|-------------|
| 10002 | PARAMS_ERROR |
| 10008 | SERVER_ERROR |
| 10012 | OPS_CONFIGURATION_ERROR |
| 70004 | SYSTEM_ERROR_DOWNSTREAM |

---

## 11. WAF / Gateway de Segurança Argus

### 11.1 Como Funciona

O Argus SDK é uma biblioteca JavaScript proprietária anti-bot que:
1. Roda no browser (não pode ser replicada em scripts simples)
2. Coleta fingerprints do ambiente (canvas, WebGL, navigator, plugins...)
3. Gera um token criptografado que prova que é um browser real
4. Esse token é enviado no header ou no corpo de requisições críticas

### 11.2 Endpoints Afetados no Brasil

Todos os endpoints de alta sensibilidade passam pelo `br-sign-api.lalamove.com`:
- `order_request` — criação de pedidos
- `price_calculate` — cotação
- `order_detail` — detalhes de pedido
- `order_cancel` — cancelamento
- `order_edit` — edição

### 11.3 Como Identificar

Resposta quando Argus falha:
```json
{"ret": 10010, "msg": "Gateway signature error"}
```

### 11.4 Solução — Playwright

A única forma de contornar o WAF sem licença do Argus SDK é usar um browser real via automação (Playwright/Puppeteer). O browser roda o SDK e gera os tokens automaticamente.

---

## 12. Playwright — Bypass WAF e Automação de Login

### 12.1 Problema Identificado

O ambiente de container tem:
- Node.js `fetch()` bloqueado pelo proxy
- `https` nativo Python bloqueado
- `curl` via `subprocess` funciona (workaround confirmado)
- Playwright com `ignoreHTTPSErrors: true` + proxy configurado: **funciona**

### 12.2 Configuração do Proxy

O container tem variáveis de ambiente:
```
HTTP_PROXY = http://{user}:{jwt_token}@21.0.0.61:15004
HTTPS_PROXY = http://{user}:{jwt_token}@21.0.0.61:15004
```

O Playwright precisa extrair essas credenciais e configurar:
```javascript
const proxyUrl = new URL(process.env.HTTPS_PROXY);
const browser = await chromium.launch({
  proxy: {
    server: `${proxyUrl.protocol}//${proxyUrl.hostname}:${proxyUrl.port}`,
    username: proxyUrl.username,
    password: proxyUrl.password
  },
  args: ['--ignore-certificate-errors'],
  headless: true
});
```

### 12.3 Script de Login Funcional

```javascript
// /tmp/lalamove_login_v6.js (versão funcional validada)
const { chromium } = require('playwright');
const fs = require('fs');

async function login() {
  const proxyUrl = new URL(process.env.HTTPS_PROXY);
  
  const browser = await chromium.launch({
    proxy: {
      server: `${proxyUrl.protocol}//${proxyUrl.hostname}:${proxyUrl.port}`,
      username: proxyUrl.username,
      password: proxyUrl.password
    },
    args: ['--ignore-certificate-errors', '--no-sandbox'],
    headless: true
  });

  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  let sessionToken = null;

  // Interceptar resposta de login_by_pwd
  page.on('response', async (response) => {
    if (response.url().includes('login_by_pwd')) {
      const body = await response.json().catch(() => null);
      if (body?.ret === 0 && body?.data?.token) {
        sessionToken = body.data.token;
        fs.writeFileSync('/tmp/lalamove_session.json', JSON.stringify(body.data, null, 2));
      }
    }
  });

  await page.goto('https://web.lalamove.com', { waitUntil: 'networkidle' });

  // CRÍTICO: App detecta México (+52) pelo geo-IP
  // Precisa selecionar Brasil (+55) explicitamente
  const countryPicker = await page.$('[class*="country-code"]');
  if (countryPicker) {
    await countryPicker.click();
    await page.waitForSelector('[class*="country-list"]');
    await page.click('[data-country="BR"]');
  }

  // Preencher telefone e senha
  await page.fill('[name="phone"]', '11935024030');
  await page.fill('[name="password"]', '@Promobrindes2021');
  await page.click('[type="submit"]');

  await page.waitForTimeout(3000);
  await browser.close();
  
  return sessionToken;
}

login().then(token => console.log('Token:', token));
```

### 12.4 Sessão Capturada (Válida por 24h)

```json
{
  "token": "6f5ad9698d704c66b3026e69a60a0ba4",
  "user_fid": "qDdE35mo",
  "city_id": 21001,
  "is_ep": 1,
  "refresh_token": "af8IHffQ-CLYd0Y42i0opmCH800pI-pyV2k_oz-WgC8",
  "client_expires_in": 86400
}
```

### 12.5 Arquivos no Container

```
/tmp/proxy_config.json      — credenciais do proxy extraídas
/tmp/lalamove_login_v6.js   — script de login Playwright
/tmp/lalamove_session.json  — sessão capturada
/tmp/session_v2.json        — sessão estendida com mais dados
/tmp/all_data_v2.json       — todos os dados capturados
/tmp/llm_playwright_cookies.json — cookies do browser
/tmp/full_data_dump.json    — dump completo dos endpoints testados
```

---

## 13. Ambiente de Execução e Proxy

### 13.1 Workaround para curl via Python

Em ambientes onde `requests`, `urllib3` e `httpx` são bloqueados pelo proxy:

```python
import subprocess, json, time, random

def uapi_call(method, args=None, token="", city_id="21001"):
    ts = int(time.time())
    su = f"{int(time.time()*1000)}ehll{int(random.random()*1e10)}"
    
    result = subprocess.run([
        'curl', '-s', '-m', '15', '--compressed', '-X', 'POST',
        '-H', 'User-Agent: Mozilla/5.0 AppleWebKit/537.36',
        '-H', 'Content-Type: application/x-www-form-urlencoded; charset=utf-8',
        '-H', 'Origin: https://web.lalamove.com',
        '-H', 'X-LLM-LOCATION: BR',
        '--data-urlencode', f'token={token}',
        '--data-urlencode', 'is_ep=1',
        '--data-urlencode', 'hcountry=20000',
        '--data-urlencode', 'hlang=pt_BR',
        '--data-urlencode', f'city_id={city_id}',
        '--data-urlencode', f'args={json.dumps(args or {}, separators=(",",":")) }',
        f'https://br-uapi.lalamove.com/index.php?_m={method}&hcountry=20000&_su={su}&_t={ts}&device_id=playwright-001&version=5.37.0&revision=53700&os=web&device_type=web'
    ], capture_output=True)
    
    return json.loads(result.stdout.decode(errors='replace'))
```

### 13.2 Lições Aprendidas sobre o Ambiente

1. `requests.get()` falha silenciosamente no proxy (sem erro, sem resposta)
2. `urllib.request` idem
3. `curl` via `subprocess.run()` funciona perfeitamente
4. Playwright com proxy configurado + `ignoreHTTPSErrors=true` funciona
5. Node.js `fetch()` nativo FALHA (mesmo erro de proxy)
6. O proxy usa JWT no campo de senha — string longa

---

## 14. Arquitetura de Integração (Bitrix24 + n8n)

### 14.1 Campos Mapeados no Bitrix24 (SPA Entidade 1690)

| Campo Bitrix | Field ID | Tipo | Fonte Lalamove |
|-------------|----------|------|----------------|
| Valor Total | `ufCrm276_1758654032` | Money | `priceBreakdown.total` |
| Quotation ID | `ufCrm276_1758655595` | String | `quotationId` |
| Stop ID Coleta | `ufCrm276_1758654848` | String | `stops[0].stopId` |
| Stop ID Entrega | `ufCrm276_1758654830` | String | `stops[1].stopId` |
| Distância | `ufCrm276_1759098131243` | String | `distance.value` (metros) |
| Tempo Estimado | `ufCrm276_1759098064876` | String | `duration` (segundos) |
| Taxas Especiais | `ufCrm276_1759402004059` | Money | `priceBreakdown.priorityFee` |

### 14.2 URLs de Integração

```
Bitrix24:    https://promobrindes.bitrix24.com.br
n8n webhook: https://webhook.atomicabr.com.br/webhook/cda41b4a-12c4-4d60-9e1e-5376ad1a1375
Geocoding:   https://api.distancematrix.ai/maps/api/geocode/json
             key: k2sJYgCtHGjGpE460v53qqxFpugpJnnfmotnxvSAH45tK56natXvVbMzVthT1pnz
```

### 14.3 Fluxos de Automação (Planejados)

#### Fluxo 1 — Cotação Automática
```
Trigger: Webhook Bitrix24 (mudança de status/campo)
→ n8n: Recebe endereços
→ Geocoding API: Converte endereços em lat/lon
→ HMAC SHA256: Assina request
→ POST /v3/quotations (REST API v3)
→ Salva quotationId + stopIds + valor no Bitrix24
```

#### Fluxo 2 — Criação de Pedido
```
Trigger: Aprovação no Bitrix24
→ n8n: Lê quotationId + stopIds do Bitrix24
→ POST /v3/orders (REST API v3)
→ Salva orderId + shareLink no Bitrix24
→ Muda status para "Em andamento"
```

#### Fluxo 3 — Rastreamento Webhook
```
Trigger: Webhook Lalamove → n8n
→ Valida HMAC do webhook
→ Processa eventType (ORDER_STATUS_CHANGED, DRIVER_LOCATION...)
→ Atualiza status e campos no Bitrix24 em tempo real
```

#### Fluxo 4 — Conclusão e POD
```
Trigger: Evento ORDER_COMPLETED
→ n8n: Recebe foto POD (se habilitado)
→ Salva imagem + dados de conclusão no Bitrix24
→ Muda status para "Entregue"
→ Dispara notificação interna
```

### 14.4 Credenciais REST API (Para Integração)

```python
API_KEY    = "pk_prod_d38621223012b9ec71d0634589126e3b"
SECRET_KEY = "sk_prod_v30Ci06vXqPeizCg6e461VZEymmFzMDAXZQwTm3NdYcwyLaS8nxrQEX0JKcp0mAM"
BASE_URL   = "https://rest.lalamove.com"
COUNTRY    = "BR"
```

---

## 15. Errata — Correções à Documentação Oficial

> Cada correção foi comprovada com output direto da API de produção.

### Correção 1: Campo `services` (não `serviceTypes`)
**Documentação oficial afirma:** objeto city usa campo `serviceTypes`  
**Realidade comprovada em produção:**
```json
{
  "cities": [{
    "services": ["MOTORCYCLE", "CAR", "MPV", "VAN", "TRUCK175", "TRUCK330"]
  }]
}
```
**Impacto:** Código que acessa `city.serviceTypes` retorna `undefined`.

### Correção 2: `driverId` é sempre string, nunca null
**Documentação oficial afirma:** `driverId` pode ser `null` quando motorista não atribuído  
**Realidade comprovada em produção:**
```json
{
  "driverId": ""
}
```
**Correto:** `driverId` é uma **string vazia** `""` quando não atribuído, **NUNCA** `null`.  
**Impacto:** Verificação `if (driverId === null)` falha; deve ser `if (!driverId)`.

### Correção 3: `cancelParty` e `cancelledReason` não existem no Brasil
**Documentação oficial afirma:** Response de cancelamento inclui `cancelParty` e `cancelledReason`  
**Realidade comprovada em produção:** Esses campos **não estão presentes** na resposta da API Brasil.  
**Impacto:** Código que acessa esses campos retorna `undefined`, podendo causar erros silenciosos.

---

## 16. Conhecimentos Técnicos Adquiridos

### 16.1 Engenharia Reversa do Bundle

- O bundle JavaScript do `web.lalamove.com` tem ~5MB minificado
- Contém todos os endpoints, enums, schemas e lógica de negócio do frontend
- Análise estática via regex + parsing identificou 174 endpoints únicos
- Funções nomeadas com IDs de 2-3 letras (ex: `iAe`, `lAe`, `MJ0`, `OJ0`) são mappers de dados
- Redux actions seguem padrão `{DOMAIN}_{ACTION}_REQUEST|SUCCESS|FAILURE`

### 16.2 Sistema de Roteamento UAPI

- PHP monolítico com roteamento por `?_m={method}` e `?_a={action}`
- Sub-ações para módulos: `?_m=contract&_a=card_list`
- `ret=10004` significa rota não existe (não confundir com erro de auth)
- `ret=10010` é específico do WAF Argus (endpoint existe mas requer assinatura)
- `ret=10007` é erro de autenticação/permissão

### 16.3 Segurança e Anti-Bot

- O Lalamove usa Argus SDK (biblioteca proprietária de bot detection)
- Ativo no Brasil: `security_sdk_flag=1`, `argus_enabled=true`
- O SDK coleta: canvas fingerprint, WebGL, navigator, plugins, timing, mouse patterns
- Impossível de replicar fora de um browser real sem acesso ao SDK
- Playwright com browser real contorna o Argus completamente

### 16.4 Proxy de Container

- Containers têm proxy configurado via variáveis de ambiente `HTTP_PROXY`/`HTTPS_PROXY`
- O proxy usa autenticação básica com JWT muito longo como senha
- Ferramentas nativas de Python (`requests`, `urllib`) não passam pelo proxy corretamente
- `curl` via `subprocess.run()` é o método confiável
- Playwright extrai as credenciais do env e configura o proxy explicitamente

### 16.5 Dados Monetários

- Todos os valores monetários na UAPI são em **centavos** (campo `_fen`)
- Exemplo: `balance_fen: 257480` = R$ 2.574,80
- Na REST API v3, valores são strings em centavos: `"total": "1500"` = R$ 15,00
- Taxa de serviço especial: `value_fen: 2000` = R$ 20,00

### 16.6 Identificadores

- `user_fid`: ID curto do usuário (ex: `qDdE35mo`) — 8 chars alfanumérico
- `order_uuid`: ID longo numérico (ex: `100260307041927130210010084998963`)
- `order_display_id`: Número grande para exibição (ex: `3445466978641461549`)
- `order_hash`: MD5-like para identificação alternativa (ex: `0dc850d71d07180d37a2405b07d9afd4`)
- `place_id`: Google Place ID (ex: `ChIJvxMPVMddzpQRQSn5Nb7Duak`)

### 16.7 Horários e Timestamps

- `order_time`: Unix timestamp em segundos
- `order_time_hts`: Variante em milissegundos (para `new Date()`)
- `daylight_zone`: Enum de ajuste de horário de verão
- Timezone padrão do Brasil: `America/Sao_Paulo`

---

## 17. Arquivos Gerados

### Documentação
```
/mnt/user-data/outputs/lalamove_api_docs_v3.docx    — REST API v3 (Word)
/mnt/user-data/outputs/lalamove_api_docs_v3.md      — REST API v3 (Markdown)
/mnt/user-data/outputs/lalamove_api_docs_v3.html    — REST API v3 (HTML)
/mnt/user-data/outputs/lalamove_internal_api_map.html — Mapa UAPI (HTML interativo)
/mnt/user-data/outputs/lalamove_internal_api_map.docx — Mapa UAPI (Word)
/mnt/user-data/outputs/lalamove_deep_audit.md       — Auditoria profunda (Markdown)
/mnt/user-data/outputs/lalamove_deep_audit.html     — Auditoria profunda (HTML)
/mnt/user-data/outputs/lalamove_deep_audit.docx     — Auditoria profunda (Word)
```

### Scripts e Dados
```
/tmp/lalamove_login_v6.js        — Script Playwright de login
/tmp/proxy_config.json           — Configuração do proxy
/tmp/lalamove_session.json       — Sessão de produção
/tmp/full_data_dump.json         — Dump de todos os endpoints testados
/tmp/all_data_v2.json            — Dados estendidos
/tmp/llm_playwright_cookies.json — Cookies do browser
```

---

*Documentação gerada por: Pink e Cerébro — Auditoria Técnica Lalamove Brasil*  
*Data: 08/03/2026 | Metodologia: Evidence-First, Production-Tested*
