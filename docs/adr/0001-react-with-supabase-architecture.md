# ADR-0001: React SPA com Supabase como Backend

## Status
Aceito

## Contexto
Precisavamos de uma arquitetura que permitisse desenvolvimento rapido de um CRM/WhatsApp multi-atendente com real-time, autenticacao, storage e edge functions sem gerenciar servidores.

## Decisao
Adotamos React (Vite + TypeScript) como frontend SPA com Supabase como backend-as-a-service, incluindo:
- PostgreSQL com Row Level Security (RLS) para autorizacao
- Supabase Auth para autenticacao (email/password)
- Supabase Realtime para mensagens e presenca
- Supabase Edge Functions (Deno) para logica de negocio server-side
- Supabase Storage para arquivos e midias

## Consequencias

### Positivas
- Time-to-market rapido sem backend customizado
- RLS garante seguranca a nivel de banco
- Realtime nativo para chat e notificacoes
- Edge Functions permitem logica server-side quando necessario
- Hosting e scaling gerenciados pelo Supabase

### Negativas
- Vendor lock-in parcial (mitigado por ser open-source)
- Complexidade de RLS policies em escala (84 tabelas)
- Edge Functions tem cold start
- Limitacoes de queries complexas vs ORM tradicional

## Alternativas Consideradas
- Next.js + API Routes: overhead de SSR desnecessario para SPA
- Firebase: menos controle sobre banco relacional
- Backend customizado (Node/Express): mais flexivel mas muito mais trabalho
