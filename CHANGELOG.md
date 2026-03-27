# Changelog

Todas as mudanças notáveis do projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- JWT verification centralizado para todas as Edge Functions (`_shared/jwtVerifier.ts`)
- CORS handler centralizado com rejeição de origens desconhecidas (`_shared/corsHandler.ts`)
- SSRF guard com whitelist de hosts permitidos (`_shared/ssrfGuard.ts`)
- Structured logging em 25/26 Edge Functions (`_shared/structuredLogger.ts`)
- Health checks em 25/26 Edge Functions (`_shared/healthCheck.ts`)
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- CI/CD pipeline com GitHub Actions (lint, typecheck, test, build, deploy)
- Coverage config com thresholds (60% lines/functions, 50% branches)
- DLQ processor para reprocessar mensagens falhadas
- Testes E2E para fluxos críticos (`src/test/e2e/critical-flows.test.tsx`)
- Dependabot para atualização automática de dependências
- PR template e issue templates
- CONTRIBUTING.md com guia completo de desenvolvimento

### Corrigido
- CORS não mais faz fallback para primeira origin — rejeita origens desconhecidas
- Rate limiter com eviction para prevenir memory leak (MAX_ENTRIES=10000)
- Dead Letter Queue com proteção contra loops infinitos (MAX_DEPTH=3)
- Race condition na criação de contatos (upsert com constraint unique)
- Queries sem limite em hooks frontend (adicionado .limit())
- tsconfig.app.json agora com `strict: true`

### Segurança
- Migration de segurança: bucket whatsapp-media privado, RLS scoped, storage limits
- Input validation em 8+ Edge Functions
- Idempotency em whatsapp-webhook e evolution-webhook

## [0.1.0] - 2026-03-27

### Adicionado
- Sistema completo de WhatsApp Business Platform
- 26 Edge Functions para API backend
- 89 tabelas com 248 RLS policies
- Dashboard com métricas em tempo real
- Inbox com chat em tempo real via Supabase Realtime
- Sistema de campanhas (CRUD)
- Sistema de chatbot L1 com IA
- Integração com Evolution API
- Integração com Bitrix24
- Sistema de gamificação para agentes
- i18n com suporte a pt/en/es
- MFA (autenticação multi-fator)
- WebAuthn (passkeys)
