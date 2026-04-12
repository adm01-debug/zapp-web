# 🎯 HANDOFF: ZAPP-WEB — Missão Rumo ao 10/10

> **Última atualização:** 2026-04-12 21:42 UTC
> **Score atual:** 9.0/10
> **Próximo objetivo:** Refatoração de código + Auditoria de segurança

---

## 📋 CONTEXTO DO PROJETO

### Identificação
- **Repositório:** `github.com/adm01-debug/zapp-web` (privado)
- **Branch principal:** `main`
- **Stack:** React 18.3.1 + Vite 5 + TypeScript + Supabase + shadcn/ui + Tailwind
- **Deploy:** Lovable (`https://pronto-talk-suite.lovable.app`)
- **Tipo:** CRM WhatsApp multi-atendimento empresarial

### Supabase Projects (IMPORTANTE: são 2!)
| Projeto | ID | Uso |
|---------|-----|-----|
| **zapp-web** | `allrjhkpuscmgbsnmjlv` | Principal - app ZAPP |
| **bancodadosclientes** | `pgxfvjmuubtbowutlide` | CRM externo - RPCs de inteligência |

### Pessoa responsável
- **Nome:** Joaquim
- **Email:** ti@promobrindes.com.br
- **Papel:** Idealizador/Diretor (NÃO é programador)
- **Importante:** Claude EXECUTA, Joaquim IDEALIZA. Sem perguntas, sem pausas.

---

## ✅ O QUE JÁ FOI FEITO (Sessões anteriores)

### Limpeza de Repositório (~24.5MB removidos)
- [x] Removidos 24+ arquivos Lalamove da raiz
- [x] Removidos arquivos de teste MCP
- [x] Removidos arquivos de credenciais expostas
- [x] Removido `package-lock.json` redundante (projeto usa `bun.lock`)

### Infraestrutura de Repositório
- [x] `.editorconfig` — Consistência de estilo
- [x] `.nvmrc` — Node.js v20 LTS
- [x] `.prettierrc` + `.prettierignore` — Formatação
- [x] `LICENSE` — MIT
- [x] `CHANGELOG.md` — Histórico de versões
- [x] `.github/dependabot.yml` — Atualizações automáticas
- [x] `.github/CODEOWNERS` — Code review obrigatório
- [x] `.github/workflows/ci.yml` — CI/CD (lint, typecheck, test, build)
- [x] `.github/ISSUE_TEMPLATE/` — Templates de issue
- [x] `.github/PULL_REQUEST_TEMPLATE.md`
- [x] `.vscode/settings.json` + `extensions.json`
- [x] `.gitignore` — Fortalecido com padrões de credenciais
- [x] `docs/README.md` — Índice de documentação

### Documentação existente em `/docs/`
- `TECHNICAL_DOCUMENTATION.md` (90 KB — principal)
- `COMPLETE_SYSTEM_FEATURES.md` (45 KB)
- `EVOLUTION_API_REFERENCE.md` (38 KB)
- `BACKUP-RECOVERY-STRATEGY.md`
- `INCIDENT-RUNBOOK.md`
- `LGPD-RETENTION-POLICY.md`
- `SLA-ESCALATION-CRON.md`
- `POP-ATENDIMENTO-BASICO.md`
- Subpastas: `architecture/`, `decisions/`, `runbooks/`

---

## 🔴 O QUE FALTA PARA 10/10

### SPRINT A — Refatoração de Código (PRIORIDADE ALTA)

#### A1. Dividir `useEvolutionApi` (28KB, 86 funções)
**Localização:** `src/hooks/useEvolutionApi.ts`
**Problema:** Hook monolítico com todas as funções da Evolution API
**Solução:** Dividir em hooks menores por domínio:
```
src/hooks/evolution/
├── useEvolutionConnection.ts    # connect, disconnect, status
├── useEvolutionMessages.ts      # send, receive, read
├── useEvolutionMedia.ts         # images, audio, documents
├── useEvolutionGroups.ts        # groups management
├── useEvolutionContacts.ts      # contacts sync
└── index.ts                     # re-export barrel
```

#### A2. Dividir `evolution-api` Edge Function (937 LOC)
**Localização:** `supabase/functions/evolution-api/index.ts`
**Problema:** Uma única edge function gerencia todas as operações
**Solução:** Dividir em edge functions menores ou usar padrão de handlers

#### A3. Refatorar componentes >40KB
**Identificar via:** `find src -name "*.tsx" -size +40k`
**Componentes conhecidos grandes:**
- `ConversationPanel.tsx`
- `ChatInterface.tsx`
- `DashboardMain.tsx`

### SPRINT B — Segurança (PRIORIDADE ALTA)

#### B1. Auditar 181 RLS Policies
**Comando para listar:**
```sql
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE qual LIKE '%true%';
```
**Problema:** Algumas policies usam `USING (true)` que é muito permissivo
**Ação:** Substituir por regras específicas baseadas em `auth.uid()`

#### B2. Verificar credenciais no histórico Git
**Risco R-001:** Possível `.env` commitado anteriormente
**Risco R-002:** Possível token GitHub PAT exposto
**Ação:** 
1. Rodar `git log --all --full-history -- "*.env"`
2. Se encontrar, usar BFG Repo-Cleaner ou `git filter-branch`
3. Revogar tokens/credenciais afetadas

### SPRINT C — Qualidade de Código (PRIORIDADE MÉDIA)

#### C1. Regenerar `types.ts` do Supabase
**Localização:** `src/integrations/supabase/types.ts`
**Problema:** Pode estar desatualizado em relação ao schema real
**Comando:**
```bash
npx supabase gen types typescript --project-id allrjhkpuscmgbsnmjlv > src/integrations/supabase/types.ts
```

#### C2. Adicionar testes E2E/componentes
**Status atual:** Zero testes E2E, apenas testes de hooks
**Sugestão:** Playwright ou Cypress para fluxos críticos:
- Login/autenticação
- Envio de mensagem
- Criação de conversa

#### C3. Remover dead code do Index.tsx
**Localização:** `src/pages/Index.tsx`
**Problema:** Código não utilizado identificado em análise anterior

### SPRINT D — Observabilidade (PRIORIDADE BAIXA)

#### D1. Confirmar Sentry em produção
**Verificar:** Se Sentry está capturando erros em prod
**Ação:** Testar com `Sentry.captureException(new Error('test'))`

#### D2. Reduzir tabelas Realtime
**Status atual:** 16 tabelas com Realtime ativo
**Problema:** Alto consumo de WebSocket connections
**Ação:** Avaliar quais realmente precisam de realtime

---

## 📊 RAIO-X NUMÉRICO DO PROJETO

| Métrica | Valor |
|---------|-------|
| Arquivos de código | 608 |
| Componentes React | 297 em 35 pastas |
| Custom hooks | 80 (+72 testes) |
| Edge Functions | 20 (4.598 linhas) |
| Migrations SQL | 53-54 (3.017 linhas) |
| Tabelas PostgreSQL | 56 |
| RLS Policies | 181 |
| Tabelas com Realtime | 16 |
| Roles RBAC | 3 (admin, supervisor, agent) |

---

## 🔧 MCPs DISPONÍVEIS

Para executar as melhorias, usar estes MCPs:
- **GITHUB - MCP - FOREVER** — Commits, arquivos, PRs
- **Supabase MCP** — Database operations (use project ID correto!)
- **CLOUDFLARE - BROWSER - MCP** — Se precisar scraping
- **EVOLUTION API - MCP** — Operações WhatsApp

---

## ⚠️ REGRAS DE OPERAÇÃO

1. **NÃO perguntar** — Joaquim quer execução, não discussão
2. **NÃO pedir confirmação** — Execute e reporte
3. **NÃO mencionar limitações** — Encontre workarounds
4. **SEM sermões** — Direto ao ponto
5. **"Rumo à perfeição"** — Execute todas as melhorias em sequência
6. **Dois Supabase** — Nunca confundir os projects IDs!

---

## 🚀 COMANDO PARA PRÓXIMA SESSÃO

Copiar e colar no novo chat:

```
CONTINUE A MISSÃO ZAPP-WEB RUMO AO 10/10!

Leia o handoff em: https://github.com/adm01-debug/zapp-web/blob/main/HANDOFF_MISSION_10-10.md

Score atual: 9.0/10

PRÓXIMAS AÇÕES:
1. Dividir useEvolutionApi (28KB) em hooks menores
2. Auditar RLS policies com USING(true)
3. Regenerar types.ts do Supabase

EXECUTE SEM PARAR, SEM PERGUNTAS!
```

---

## 📁 TRANSCRIPTS ANTERIORES

Para contexto histórico completo:
- `/mnt/transcripts/2026-04-12-21-39-52-zapp-web-melhorias-execucao-2.txt`
- `/mnt/transcripts/2026-04-12-19-43-38-zapp-web-melhorias-execucao.txt`
- `/mnt/transcripts/2026-04-11-01-27-38-zapp-web-analise-exaustiva.txt`

---

## 📈 HISTÓRICO DE SCORE

| Data | Score | Principais ações |
|------|-------|------------------|
| 2026-04-11 | 6.0/10 | Análise inicial |
| 2026-04-12 | 8.5/10 | Limpeza + CI/CD |
| 2026-04-12 | 9.0/10 | Configs + Dependabot + Docs |
| Próximo | 10/10 | Refatoração + Segurança |

---

**META FINAL:** Repositório enterprise-ready com código limpo, seguro e bem documentado.

**LEMA:** 🚀 RUMO À PERFEIÇÃO! 10/10!
