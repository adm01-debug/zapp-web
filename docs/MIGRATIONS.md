# Guia de Migrações de Banco de Dados

## Visão Geral

O projeto usa Supabase Migrations (baseado em golang-migrate) para gerenciar o schema do banco de dados PostgreSQL.

## Comandos Essenciais

```bash
# Listar migrações aplicadas
supabase migration list

# Criar nova migração
supabase migration new nome_da_migracao

# Aplicar migrações pendentes (local)
supabase db reset

# Aplicar em produção (via dashboard ou CLI)
supabase db push
```

## Estrutura de Migrações

- **Diretório**: `supabase/migrations/`
- **Formato**: `YYYYMMDDHHMMSS_descricao.sql`
- **Total**: 68 migrações (até abril 2026)

## Fases de Migração

| Fase | Data | Descrição |
|------|------|-----------|
| Inicial | Dez 2024 | Schema base (contacts, messages, profiles, queues) |
| Fase 2 | Dez 2025 | Expansão (campaigns, chatbots, pipeline, gamification) |
| Fase 3 | Mar 2026 | Integrações (VoIP, Bitrix, AI features) |
| Fase 4-9 | Mar 2026 | Segurança (RLS, indexes, dead letter queue, feature flags) |

## Rollback (DOWN Migrations)

O Supabase não suporta DOWN migrations nativamente. Para rollback:

### Opção 1: Reverter manualmente
```sql
-- Exemplo: reverter uma tabela
DROP TABLE IF EXISTS nome_da_tabela CASCADE;

-- Exemplo: reverter uma coluna
ALTER TABLE contacts DROP COLUMN IF EXISTS nova_coluna;

-- Exemplo: reverter um index
DROP INDEX IF EXISTS idx_nome;

-- Exemplo: reverter uma RLS policy
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

### Opção 2: Restaurar backup
```bash
# Via Supabase Dashboard > Settings > Database > Backups
# Point-in-time recovery disponível em planos Pro+
```

### Opção 3: Supabase Branching (recomendado para staging)
```bash
# Criar branch para testar migração
supabase branches create staging-test

# Se falhar, deletar o branch
supabase branches delete staging-test
```

## Boas Práticas

1. **Sempre teste migrações localmente** antes de aplicar em produção
2. **Use transações** para migrações multi-statement
3. **Nunca modifique** uma migração já aplicada
4. **Sempre adicione IF EXISTS/IF NOT EXISTS** para idempotência
5. **Documente** migrações com comentários SQL
6. **Crie índices CONCURRENTLY** em produção para evitar locks
7. **Backup antes de migrar** — use Point-in-time recovery

## Tabelas Críticas (não modificar sem revisão)

- `profiles` — dados de usuários e agentes
- `contacts` — contatos e leads
- `messages` — histórico de mensagens
- `whatsapp_connections` — conexões WhatsApp ativas
- `audit_logs` — logs de auditoria
- `feature_flags` — flags de funcionalidade

## RLS (Row Level Security)

Todas as tabelas com dados de usuário DEVEM ter RLS habilitado.
Ao criar novas tabelas, SEMPRE adicione:

```sql
ALTER TABLE nova_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON nova_tabela FOR SELECT
  USING (auth.uid() = user_id);
```
