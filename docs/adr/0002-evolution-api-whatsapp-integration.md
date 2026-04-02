# ADR-0002: Evolution API para Integracao WhatsApp

## Status
Aceito

## Contexto
O sistema precisa enviar e receber mensagens WhatsApp em tempo real, gerenciar multiplas conexoes (instancias) e suportar midia, grupos e funcionalidades avancadas do WhatsApp.

## Decisao
Adotamos a Evolution API como middleware WhatsApp, acessada via Supabase Edge Functions:
- Cada conexao WhatsApp = 1 instancia Evolution API
- Webhooks da Evolution API -> Edge Functions -> banco Supabase
- Envio de mensagens: Frontend -> Edge Function -> Evolution API
- QR Code: gerado pela Evolution API, exibido no frontend

## Consequencias

### Positivas
- API REST padronizada para WhatsApp
- Suporte a multiplas instancias simultaneas
- Suporte a midia, localizacao, contatos, reacoes
- Integracao com bots (Typebot, OpenAI, Dify, Flowise)
- Open-source e self-hosted

### Negativas
- Dependencia de servico externo (ponto unico de falha)
- Necessidade de monitoramento da Evolution API
- Reconexao automatica nem sempre confiavel
- Sem circuit breaker implementado (gap identificado)

## Mitigacoes Planejadas
- Implementar circuit breaker pattern nas Edge Functions
- Health checks periodicos das instancias
- Retry com backoff exponencial em falhas transientes
