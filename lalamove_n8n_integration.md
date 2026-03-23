# Integração n8n ↔ Lalamove Token Manager

## Arquitetura

```
n8n workflow
    │
    ├─ GET http://token-server:8765/token
    │      ↓
    │  token_manager.py (servidor HTTP)
    │      ├─ Cache válido? → retorna token imediatamente
    │      ├─ Expirado? → refresh_token API (< 1s)
    │      └─ refresh falhou? → Playwright re-login (45s)
    │
    └─ Usa token para chamar UAPI Lalamove
```

## Opção 1 — Servidor HTTP (recomendado para n8n)

### Iniciar o servidor
```bash
python3 /opt/lalamove/token_manager.py --server --port 8765
```

### No n8n: HTTP Request node
```
Method: GET
URL:    http://localhost:8765/token
```

**Response:**
```json
{
  "status": "ok",
  "token": "9c2e40f6c213401c...",
  "user_fid": "qDdE35mo",
  "saved_at": "2026-03-09T00:44:49",
  "method": "cache"
}
```

### Force refresh (quando necessário):
```
GET http://localhost:8765/token?refresh=1
```

### Verificar status:
```
GET http://localhost:8765/status
```

---

## Opção 2 — Execute Command node no n8n

```
Command: python3 /opt/lalamove/token_manager.py
```
Retorna apenas o token no stdout (ideal para `set` em variável).

---

## Opção 3 — Variável de ambiente no n8n

Em qualquer node que usa o token, adicionar um sub-workflow:

```
1. Execute Command: python3 /opt/lalamove/token_manager.py
2. Set: {{ $json.stdout.trim() }} → variável "lalamoveToken"
3. HTTP Request para UAPI com token={{ $vars.lalamoveToken }}
```

---

## Cron no n8n (renovação agendada)

Criar workflow com Schedule Trigger a cada 20h:
```
Schedule Trigger (every 20h)
    └─ Execute Command: python3 /opt/lalamove/token_manager.py --refresh
```

---

## Exemplo: Workflow cotação com token automático

```
1. Bitrix24 Trigger (webhook)
2. HTTP Request → GET http://localhost:8765/token
3. Set node → token = {{ $json.token }}
4. HTTP Request → POST https://rest.lalamove.com/v3/quotations
   Headers:
     Authorization: hmac {{ $vars.apiKey }}:{{ $timestamp }}:{{ $hmac }}
     X-LLM-COUNTRY: BR
   Body: { serviceType, stops }
5. Bitrix24 → atualizar campos
```

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `LALAMOVE_SESSION_FILE` | `/tmp/lalamove_session.json` | Arquivo de sessão |
| `LALAMOVE_LOG_FILE` | `/tmp/lalamove_token_manager.log` | Log |

---

## Cron job (servidor Linux)

```bash
# Renovar token às 00h e 20h todos os dias
0 0,20 * * * python3 /opt/lalamove/token_manager.py --refresh >> /var/log/lalamove_token.log 2>&1
```

---

## Fluxo de renovação em detalhe

```
get_valid_token()
├── Token em cache, < 20h → retorna imediatamente (0ms)
├── Token em cache, > 20h mas ainda válido via API:
│   ├── refresh_token API → novo token + novo refresh_token (< 500ms)
│   └── Se falhar → mantém token atual (ainda válido)
└── Token inválido/expirado:
    ├── refresh_token API → retorna "Token expired" (< 500ms)
    └── Playwright re-login → novo token (30-60s) ← fallback garantido
```

---

## Notas de produção

- **refresh_token é de uso único**: cada uso gera um novo refresh_token
- **Janela de renovação**: refresh_token SÓ funciona enquanto o token ainda é válido
- **Por isso renovamos às 20h**: token expira às 24h, renovamos 4h antes
- **Se o cron não rodou por >24h**: Playwright é acionado automaticamente

