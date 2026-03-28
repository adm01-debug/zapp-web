# Zapp Web — WhatsApp Business Platform

Multi-tenant WhatsApp business communication platform built with React, TypeScript, Supabase, and Evolution API.

## Features

- **Multi-channel WhatsApp messaging** — Send and receive messages via Evolution API
- **Contact management** — Import, organize, and segment contacts with tags
- **Campaign engine** — Schedule and execute bulk messaging campaigns with rate limiting
- **Conversation queues** — Route and distribute conversations across agents
- **CRM pipeline** — Sales deals, activities, and pipeline management
- **Chatbot builder** — Visual flow builder with AI-powered responses
- **Quick replies** — Reusable message templates with shortcuts
- **Reports & analytics** — SLA tracking, agent performance, campaign metrics
- **Knowledge base** — Searchable articles and files for agent support
- **Multi-language** — Portuguese, English, and Spanish (i18n)
- **WebAuthn/Passkeys** — Passwordless authentication support
- **Feature flags** — Runtime feature toggling per organization

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript (strict), Vite |
| UI | shadcn/ui, Radix UI, Tailwind CSS |
| State | React Query (TanStack Query) |
| Backend | Supabase (Auth, Database, Edge Functions, Realtime) |
| Edge Functions | Deno runtime, 28 functions, 14 shared utilities |
| Messaging API | Evolution API (WhatsApp) |
| AI | OpenAI GPT integration for chatbot |
| CI/CD | GitHub Actions (lint, typecheck, test, security audit, build) |

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm 9+
- Supabase CLI (for edge functions development)

### Installation

```sh
# Clone the repository
git clone <repository-url>
cd zapp-web

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

For edge functions, configure in Supabase Dashboard:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`
- `OPENAI_API_KEY` (for AI chatbot features)

## Project Structure

```
src/
  components/     # React components organized by feature
  hooks/          # Custom React hooks (data fetching, UI logic)
  pages/          # Route pages
  services/       # API service layer
  utils/          # Utility functions
  validations/    # Shared Zod schemas
  constants/      # Centralized constants (timing, pagination)
  i18n/           # Internationalization (pt, en, es)
  types/          # TypeScript type definitions
  integrations/   # Supabase client and type definitions

supabase/
  functions/      # 28 Deno edge functions
    _shared/      # 14 shared utilities (CORS, auth, logging, etc.)
  migrations/     # Database migrations
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build |

## Security

- Row Level Security (RLS) on all tables
- JWT verification on edge functions
- SSRF guard for external API calls
- Rate limiting on auth endpoints
- HMAC webhook signature verification
- PII masking in structured logs
- Automated security audit in CI pipeline

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, branch naming, commit conventions, and code standards.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full deployment runbook including rollback procedures and health checks.

## License

Private — All rights reserved.
