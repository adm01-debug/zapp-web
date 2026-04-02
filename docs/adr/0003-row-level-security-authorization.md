# ADR-0003: Row Level Security como Camada de Autorizacao

## Status
Aceito

## Contexto
Com Supabase, o frontend acessa o banco diretamente via client SDK. Precisamos garantir que usuarios so acessem dados autorizados sem depender exclusivamente de logica no frontend.

## Decisao
Utilizamos Row Level Security (RLS) do PostgreSQL como camada primaria de autorizacao:
- Todas as tabelas com dados de usuario tem RLS habilitado
- Policies baseadas em `auth.uid()` para isolamento por usuario
- Policies com JOINs para acesso baseado em organizacao/equipe
- Service role key usada apenas em Edge Functions para operacoes administrativas

## Consequencias

### Positivas
- Seguranca enforced no nivel do banco (impossivel bypassar via frontend)
- Eliminacao de middleware de autorizacao
- Auditavel via SQL (policies sao codigo)
- Performance: filtros aplicados no query planner

### Negativas
- Complexidade crescente com 84 tabelas (276 policies atuais)
- Dificuldade de testar policies isoladamente
- Debug de erros de permissao pode ser obscuro (retorna array vazio)
- Sem cobertura 100% ainda (47.6% das tabelas cobertas)

## Acoes Pendentes
- Expandir RLS para +20 tabelas criticas sem cobertura
- Criar suite de testes de RLS policies
- Documentar matriz de permissoes por role
