# 🚀 Pronto Talk Suite

> Plataforma omnichannel de atendimento ao cliente com WhatsApp, IA integrada, CRM e automações.

**URL**: https://lovable.dev/projects/1d419c34-35ac-4a71-96a5-146ca1b3ebf2

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológico](#stack-tecnológico)
- [Setup Local](#setup-local)
- [Arquitetura](#arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades Principais](#funcionalidades-principais)
- [Edge Functions](#edge-functions)
- [Integrações](#integrações)
- [Segurança](#segurança)
- [Testes](#testes)
- [Deploy](#deploy)
- [Documentação Adicional](#documentação-adicional)

---

## Visão Geral

Pronto Talk Suite é uma plataforma completa de atendimento ao cliente que centraliza comunicações via WhatsApp, oferece sugestões de IA, CRM integrado, gamificação de agentes, dashboards analíticos e automações de fluxo.

### Público-alvo
- Equipes de atendimento ao cliente
- Gestores de suporte e vendas
- Empresas que usam WhatsApp Business como canal principal

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18, TypeScript 5, Vite 5 |
| **Estilização** | TailwindCSS 3, shadcn/ui, Framer Motion |
| **Estado** | TanStack React Query, Context API |
| **Backend** | Lovable Cloud (Auth, Database, Storage, Edge Functions, Realtime) |
| **IA** | Lovable AI (Gemini, GPT) via Edge Functions |
| **WhatsApp** | Evolution API v2.3.7+ |
| **CRM** | Bitrix24 API |
| **Áudio** | ElevenLabs (TTS, STT, SFX) |
| **Mapas** | Mapbox GL |
| **Email** | Resend |
| **VoIP** | SIP.js |

---

## Setup Local

```bash
# 1. Clone o repositório
git clone <repo-url>
cd pronto-talk-suite

# 2. Instale dependências
npm install  # ou bun install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

As variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) são configuradas automaticamente pelo Lovable Cloud.

---

## Arquitetura

```
┌─────────────────────────────────────────┐
│            React SPA (Vite)             │
│  ┌───────┐ ┌────────┐ ┌──────────────┐ │
│  │ Pages │ │ Hooks  │ │ Components   │ │
│  └───┬───┘ └───┬────┘ └──────┬───────┘ │
│      └─────────┼─────────────┘         │
│            ┌───┴───┐                    │
│            │ Query │ (TanStack)         │
│            └───┬───┘                    │
└────────────────┼────────────────────────┘
                 │ HTTPS
┌────────────────┼────────────────────────┐
│           Lovable Cloud                 │
│  ┌──────┐ ┌────┐ ┌─────────┐ ┌──────┐  │
│  │ Auth │ │ DB │ │ Storage │ │ Real │  │
│  └──────┘ └────┘ └─────────┘ │ time │  │
│  ┌────────────────────────┐  └──────┘  │
│  │    Edge Functions (42) │            │
│  └───────────┬────────────┘            │
└──────────────┼─────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───┴───┐ ┌───┴───┐ ┌────┴────┐
│Evolut.│ │Bitrix │ │Eleven   │
│ API   │ │  24   │ │ Labs    │
└───────┘ └───────┘ └─────────┘
```

### Decisões Arquiteturais (ADRs)

Veja `docs/decisions/` para decisões documentadas:
- **ADR-001**: React Query como gerenciador de estado do servidor
- **ADR-002**: RLS como camada primária de autorização
- **ADR-003**: Lazy loading de todas as rotas
- **ADR-004**: Evolution API webhook bridge

---

## Estrutura do Projeto

```
src/
├── components/          # Componentes organizados por feature (55+ módulos)
│   ├── auth/           # Autenticação (login, registro, MFA)
│   ├── inbox/          # Caixa de entrada e chat
│   ├── contacts/       # Gestão de contatos
│   ├── dashboard/      # Dashboards e métricas
│   ├── ai/             # Componentes de IA
│   ├── campaigns/      # Campanhas em massa
│   ├── automations/    # Automações e chatbot
│   ├── security/       # Audit logs, rate limiting
│   ├── gamification/   # Gamificação de agentes
│   └── ui/             # shadcn/ui + componentes base
├── hooks/              # 110+ hooks customizados
├── pages/              # Páginas/rotas da aplicação
├── lib/                # Utilitários (logger, helpers)
├── integrations/       # Cliente Supabase (auto-gerado)
├── types/              # Tipos compartilhados
└── i18n/               # Internacionalização

supabase/
├── functions/          # 42 Edge Functions
│   ├── _shared/        # Utilitários compartilhados (validação, CORS, logger)
│   ├── ai-*/           # Funções de IA (suggest-reply, summary, analysis, etc.)
│   ├── evolution-*/    # Integração WhatsApp
│   ├── elevenlabs-*/   # Integração de áudio
│   └── ...
├── migrations/         # Migrations SQL versionadas
└── config.toml         # Configuração do projeto

docs/
├── decisions/          # ADRs (Architecture Decision Records)
├── FUNCTIONALITIES_INVENTORY.md  # 350+ funções inventariadas
├── EVOLUTION_API_REFERENCE.md    # 60+ endpoints documentados
└── TECHNICAL_DOCUMENTATION.md    # Documentação técnica
```

---

## Funcionalidades Principais

### 💬 Atendimento Omnichannel
- Chat em tempo real via WhatsApp (Evolution API)
- Transferência entre agentes e filas
- Notas internas (whisper messages)
- Presença de digitação em tempo real
- Suporte a mídia (imagens, áudio, documentos, stickers)

### 🤖 IA Integrada
- Sugestão automática de respostas
- Resumo de conversas
- Análise de sentimento
- Auto-tagging de conversas
- Melhoria de tom de mensagens
- Classificação de tickets

### 📊 Analytics & Dashboards
- Dashboard em tempo real
- SLA tracking e alertas
- CSAT (pesquisa de satisfação)
- War room para incidentes
- Relatórios por agente/fila

### 👥 CRM & Contatos
- Gestão de contatos com campos customizáveis
- Pipeline de vendas (Kanban)
- Tags e segmentação
- Integração Bitrix24
- Carteira de clientes

### 🎮 Gamificação
- XP e níveis para agentes
- Achievements e conquistas
- Leaderboard
- Mini-games de treinamento

### 📢 Campanhas
- Disparo em massa via WhatsApp
- Segmentação de contatos
- Tracking de entrega/leitura

### 🔒 Segurança
- MFA (TOTP + WebAuthn/FIDO2)
- Rate limiting com backoff exponencial
- Geo-blocking (whitelist/blacklist)
- Audit logs completos
- 194+ políticas RLS

---

## Edge Functions

| Função | Descrição |
|--------|-----------|
| `ai-suggest-reply` | Sugestão de resposta via IA |
| `ai-conversation-summary` | Resumo automático de conversas |
| `ai-conversation-analysis` | Análise de sentimento e tópicos |
| `ai-enhance-message` | Melhoria de tom de mensagens |
| `ai-auto-tag` | Auto-tagging inteligente |
| `evolution-api` | Proxy seguro para Evolution API |
| `evolution-webhook` | Webhook de eventos WhatsApp |
| `external-db-bridge` | Proxy seguro para DBs externos |
| `chatbot-l1` | Chatbot nível 1 automatizado |
| `elevenlabs-tts` | Text-to-speech |
| `send-email` | Envio de emails via Resend |
| `webauthn` | Autenticação FIDO2/WebAuthn |
| `whatsapp-webhook` | Webhook do WhatsApp |

---

## Integrações

### WhatsApp (Evolution API)
- Conexão via QR Code
- Envio/recebimento de mensagens (texto, mídia, localização)
- Status de entrega (sent, delivered, read)
- Webhook para eventos em tempo real
- Health check automatizado

### Bitrix24
- Sincronização de contatos
- Pipeline de vendas
- OAuth2 token refresh automático

### ElevenLabs
- Text-to-speech multilíngue
- Speech-to-text (Scribe)
- Voice design customizado
- Sound effects

---

## Segurança

### Autenticação
- Email/senha com verificação HIBP no frontend
- MFA via TOTP e WebAuthn/FIDO2
- Brute force protection (lockout exponencial após 5 tentativas)
- Re-autenticação para ações sensíveis
- Detecção de novos dispositivos

### Autorização (RBAC)
- Roles: `admin`, `supervisor`, `agent`, `special_agent`
- Tabela separada `user_roles` com função `has_role()` SECURITY DEFINER
- 194+ políticas RLS no banco de dados
- Trigger anti-escalação de privilégios
- Permissões granulares (role_permissions)

### Proteção de Dados
- CORS restrito por origem (não wildcard)
- Rate limiting em Edge Functions
- IP blocking e geo-blocking
- Audit logs de ações sensíveis
- Credenciais protegidas por RLS (admin only)
- Tabelas sensíveis removidas do Realtime

---

## Testes

```bash
# Executar testes
npm test

# Com cobertura
npx vitest --coverage

# Testes específicos
npx vitest src/components/security/
```

**Framework**: Vitest + Testing Library  
**Arquivos**: ~164 arquivos de teste  
**Mock**: Mock centralizado do Supabase em `src/test/mocks/supabase.ts`

---

## Deploy

O deploy é gerenciado automaticamente pelo **Lovable**:
1. Edições no código disparam rebuild automático
2. Edge Functions são deployadas automaticamente
3. Migrations são aplicadas via ferramenta de migração

### URLs
- **Produção**: https://pronto-talk-suite.lovable.app

---

## Documentação Adicional

| Documento | Descrição |
|-----------|-----------|
| [`docs/FUNCTIONALITIES_INVENTORY.md`](docs/FUNCTIONALITIES_INVENTORY.md) | Inventário de 350+ funções |
| [`docs/EVOLUTION_API_REFERENCE.md`](docs/EVOLUTION_API_REFERENCE.md) | Referência de 60+ endpoints |
| [`docs/TECHNICAL_DOCUMENTATION.md`](docs/TECHNICAL_DOCUMENTATION.md) | Documentação técnica |
| [`docs/AUDIT_REPORT.md`](docs/AUDIT_REPORT.md) | Relatório de auditoria |
| [`docs/IMPROVEMENT_PLAN.md`](docs/IMPROVEMENT_PLAN.md) | Plano de melhorias |
| [`docs/decisions/`](docs/decisions/) | Decisões arquiteturais (ADRs) |

---

## Como Editar

Existem várias formas de editar esta aplicação:

1. **Lovable** (recomendado): Edite diretamente em [lovable.dev](https://lovable.dev/projects/1d419c34-35ac-4a71-96a5-146ca1b3ebf2)
2. **IDE local**: Clone o repositório e use seu editor preferido
3. **GitHub**: Faça edições diretamente no GitHub

---

*Construído com ❤️ usando [Lovable](https://lovable.dev)*
