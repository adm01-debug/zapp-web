## Plano: Frontend para 5 Edge Functions backend-only

### 1. **Public API Dashboard** (nova view `api-dashboard`)
- Painel de gerenciamento de API keys
- Logs de requisições recentes (método, path, status, latência)
- Métricas de uso (requests/hora, erros, top endpoints)

### 2. **Gmail Webhook Monitor** (dentro de `gmail` ou `integrations`)
- Status do webhook (ativo/inativo)
- Últimos eventos recebidos (timestamp, tipo, status)
- Contador de emails processados

### 3. **Media Migration Tool** (dentro de `admin`)
- Botão para disparar migração de storage
- Progress bar com status da migração
- Log de arquivos migrados/erros

### 4. **Sicoob Bridge Dashboard** (dentro de `integrations`)
- Status da conexão com Sicoob
- Últimas mensagens processadas (bridge + reply)
- Métricas: mensagens enviadas/recebidas, erros

### 5. Registrar novas rotas no ViewRouter/Sidebar

Cada painel será um componente focado, conectado aos logs reais das Edge Functions via `supabase.functions.invoke()` ou queries na tabela `query_telemetry`/`audit_logs`.