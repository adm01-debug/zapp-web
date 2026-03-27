# Guia de Deploy — Zapp Web

## Pré-requisitos

- Node.js 20+
- npm 10+
- Supabase CLI (`npm i -g supabase`)
- Acesso ao projeto Supabase (variáveis de ambiente configuradas)

## Ambientes

| Ambiente | Branch | URL |
|----------|--------|-----|
| Development | `develop` | localhost:8080 |
| Staging | `develop` | staging.zapp.com |
| Production | `main` | app.zapp.com |

## Deploy Frontend

### Automático (via CI/CD)

1. Merge PR para `develop` → deploy automático para staging
2. Merge `develop` para `main` → deploy automático para produção (com approval gate)

### Manual

```bash
# Build
npm ci
npm run build

# O diretório dist/ contém o build otimizado
# Faça upload para seu CDN/hosting (Vercel, Netlify, etc.)
```

## Deploy Edge Functions

```bash
# Deploy todas as funções
supabase functions deploy

# Deploy uma função específica
supabase functions deploy evolution-webhook

# Verificar status
supabase functions list
```

## Deploy Migrations

```bash
# Aplicar migrations pendentes
supabase db push

# Verificar migrations aplicadas
supabase migration list

# Reverter última migration (CUIDADO)
supabase migration repair --status reverted <version>
```

## Rollback

### Frontend
```bash
# Voltar para o último deploy estável
# Via Vercel/Netlify: use o dashboard para promover deploy anterior
# Via manual: re-deploy o último artefato de build
```

### Edge Functions
```bash
# Re-deploy versão anterior
git checkout <commit-hash> -- supabase/functions/<function-name>/
supabase functions deploy <function-name>
```

### Database
```bash
# ATENÇÃO: Sempre faça backup antes de reverter
# As migrations NÃO têm DOWN automático
# Para reverter, crie uma nova migration corretiva:
supabase migration new revert_<feature_name>
# Escreva o SQL reverso manualmente
supabase db push
```

## Health Checks

Após cada deploy, verifique:

```bash
# Edge Functions health
curl -s https://<project>.supabase.co/functions/v1/health | jq

# Funções individuais
curl -s https://<project>.supabase.co/functions/v1/evolution-webhook/health | jq
curl -s https://<project>.supabase.co/functions/v1/chatbot-l1/health | jq

# Frontend
curl -s https://app.zapp.com -o /dev/null -w "%{http_code}"
```

## Variáveis de Ambiente

### Frontend (.env)
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Edge Functions (Supabase Secrets)
```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set EVOLUTION_API_URL=...
supabase secrets set EVOLUTION_API_KEY=...
supabase secrets set ALLOWED_ORIGINS=https://app.zapp.com,https://staging.zapp.com
```

## Procedimento de Incidente

1. **Detectar**: Alerta via health check ou monitoramento
2. **Avaliar**: Verificar logs (`supabase functions logs <name>`)
3. **Mitigar**: Rollback se necessário (ver seção acima)
4. **Comunicar**: Notificar equipe no canal de incidentes
5. **Investigar**: Análise de causa raiz
6. **Post-mortem**: Documentar e criar issues para prevenção

## Checklist Pré-Deploy

- [ ] Todos os testes passam (`npm run test`)
- [ ] Build funciona (`npm run build`)
- [ ] Lint sem erros (`npm run lint`)
- [ ] TypeScript compila (`npx tsc --noEmit`)
- [ ] Migrations revisadas por 2+ pessoas
- [ ] Variáveis de ambiente atualizadas
- [ ] Health checks preparados
- [ ] Plano de rollback definido
