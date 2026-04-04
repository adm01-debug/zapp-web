
# Plano: Frontend para 100% do Banco Externo CRM

## Situação Atual
- **6 RPCs** já criadas no banco externo (360°, busca, batch, sync, inteligência, RFM)
- **5 hooks** React consumindo essas RPCs
- **6 componentes** exibindo dados parciais
- Cobertura estimada: ~15% das 111 tabelas

## Estratégia: Bridge Segura via Edge Function

Como o banco externo é Supabase, e o `externalClient.ts` atual expõe a anon key no frontend, a melhor abordagem é **rotear TUDO pela Edge Function `external-db-bridge`** que já existe — ela faz proxy seguro com telemetria.

---

## Fase 1 — Mapeamento & Tipos (Foundation)
1. **Listar TODAS as tabelas** do banco externo via bridge
2. **Gerar tipos TypeScript** completos para cada tabela/entidade
3. Criar arquivo `src/types/externalDB.ts` com todos os tipos organizados por domínio

## Fase 2 — Hook Genérico de Acesso
1. Criar `useExternalDB` — hook universal para consultar qualquer tabela do banco externo via bridge
2. Suporte a: `select`, `filter`, `order`, `pagination`, `search`
3. Cache inteligente por tabela (staleTime configurável)

## Fase 3 — Página CRM 360° Dedicada (Nova)
1. Criar rota `/#crm360` com navegação por abas:
   - **Empresas** — tabela `companies` (57k registros) com busca, filtros e paginação
   - **Clientes** — tabela `customers` (52k) com dados financeiros completos
   - **Contatos** — tabela `contacts` (4.7k) com todos os campos
   - **Interações** — tabela `interactions` (10k+) com timeline
   - **RFM Scores** — `company_rfm_scores` com visualização gráfica
   - **Social Media** — `company_social_media` (99k) com cards
2. Cada aba com: busca, filtros avançados, exportação, paginação server-side

## Fase 4 — Painéis Expandidos no Inbox
1. Expandir `ExternalContact360Panel` com TODOS os campos que faltam
2. Expandir `ContactIntelligencePanel` com dados completos
3. Adicionar abas para: Histórico Completo, Dados Financeiros, Social Media

## Fase 5 — Admin: Visão Gerencial
1. Dashboard CRM no Admin com métricas agregadas
2. Visualização de todas as tabelas para auditoria/consulta
3. Exportação massiva de dados

---

## Abordagem Técnica
- **NÃO** expor `externalClient.ts` diretamente — usar bridge para segurança
- Tipos gerados a partir do schema real do banco
- Componentes modulares e reutilizáveis
- Paginação server-side obrigatória (tabelas com 50k+ registros)
- Cache React Query por entidade

## Estimativa
- Fase 1: ~30 min (tipos + mapeamento)
- Fase 2: ~20 min (hook genérico)
- Fase 3: ~2h (página dedicada com 6+ abas)
- Fase 4: ~1h (expansão painéis existentes)
- Fase 5: ~1h (admin dashboard)
