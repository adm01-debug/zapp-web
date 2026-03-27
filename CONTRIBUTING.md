# Contribuindo para o Zapp Web

## Pré-requisitos

- Node.js 20+
- npm 10+
- Supabase CLI (para Edge Functions)

## Setup Local

```bash
# Clone o repositório
git clone <repo-url>
cd zapp-web

# Instale dependências
npm install

# Inicie o dev server
npm run dev
```

O servidor estará disponível em `http://localhost:8080`.

## Estrutura do Projeto

```
src/
├── components/     # Componentes React organizados por feature
├── hooks/          # Custom hooks (lógica de negócio + data fetching)
├── i18n/           # Internacionalização (pt/en/es)
├── integrations/   # Integrações externas (Supabase client + types)
├── lib/            # Utilidades e helpers
├── pages/          # Componentes de página (rotas)
├── test/           # Setup de testes, mocks, fixtures
├── types/          # Tipos TypeScript compartilhados
└── utils/          # Funções utilitárias

supabase/
├── functions/      # Edge Functions (Deno runtime)
│   ├── _shared/    # Utilitários compartilhados (CORS, JWT, logging, etc.)
│   └── */          # Uma pasta por função
├── migrations/     # Migrations SQL versionadas
└── config.toml     # Configuração do Supabase
```

## Workflow de Desenvolvimento

### Branches

- `main` — produção (protegida)
- `develop` — integração
- `feature/*` — novas features
- `fix/*` — correções de bugs
- `hotfix/*` — correções urgentes em produção

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona filtro de campanhas por status
fix: corrige cálculo de SLA para timezone BR
refactor: extrai lógica de CORS para shared handler
docs: atualiza README com instruções de deploy
chore(deps): atualiza supabase-js para 2.87.1
```

### Pull Requests

1. Crie uma branch a partir de `develop`
2. Faça suas alterações
3. Certifique-se que todos os checks passam:
   ```bash
   npm run lint
   npx tsc --noEmit
   npx vitest run
   npm run build
   ```
4. Abra um PR usando o template fornecido
5. Aguarde review de pelo menos 1 membro da equipe

## Padrões de Código

### TypeScript
- `strict: true` ativado — respeite null safety
- Evite `: any` — use tipos específicos
- Use `interface` para objetos, `type` para unions/intersections

### React
- Hooks customizados em `src/hooks/` para lógica reutilizável
- Componentes de UI puros em `src/components/ui/`
- Use `useTranslation()` para todas as strings de UI (sem hardcoded PT)

### Edge Functions
- Use `_shared/corsHandler.ts` para CORS (não duplique)
- Use `_shared/jwtVerifier.ts` para autenticação
- Use `_shared/structuredLogger.ts` para logging (não console.log)
- Use `_shared/validation.ts` para validação de input
- Use `_shared/healthCheck.ts` para health endpoints

### Testes
- Arquivo de teste ao lado do arquivo: `Component.tsx` → `__tests__/Component.test.tsx`
- Mock do Supabase: use `src/test/mocks/supabase.ts`
- Coverage mínimo: 60% lines/functions, 50% branches

## Segurança

- **Nunca** commite secrets, tokens ou credenciais
- Valide inputs no backend (Edge Functions), não apenas no frontend
- Revise RLS policies ao alterar schema do banco
- Use `_shared/ssrfGuard.ts` ao fazer requests externos

## Dúvidas

Abra uma issue com a label `question` ou entre em contato com a equipe.
