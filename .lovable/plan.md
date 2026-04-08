

# Painel Admin de SLA Granular

## Situação Atual
A tabela `sla_configurations` tem apenas campos globais: `name`, `priority`, `first_response_minutes`, `resolution_minutes`. Não há como vincular um SLA a um cliente específico, cargo, grupo, fila ou agente.

## O que será construído

Um sistema de **regras de SLA granulares** com hierarquia de prioridade, onde configurações mais específicas sobrescrevem as mais genéricas.

### Hierarquia (da mais específica para a mais genérica):
1. **Cliente individual** (contact_id)
2. **Empresa/Grupo** (company)
3. **Cargo do contato** (job_title)
4. **Tipo de contato** (contact_type)
5. **Fila** (queue_id)
6. **Agente** (assigned_to / profile_id)
7. **Prioridade global** (configuração atual — fallback)

---

### 1. Migração de banco de dados

Nova tabela `sla_rules` com escopo granular:

```sql
CREATE TABLE public.sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  first_response_minutes INTEGER NOT NULL DEFAULT 5,
  resolution_minutes INTEGER NOT NULL DEFAULT 60,
  priority INTEGER NOT NULL DEFAULT 0,  -- maior = mais prioritário
  
  -- Escopos (nullable — NULL = não filtra por esse critério)
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  company TEXT,
  job_title TEXT,
  contact_type TEXT,
  queue_id UUID REFERENCES queues(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Com RLS: leitura para autenticados, escrita para admin/supervisor.

### 2. Novo componente: `SLARulesManager`

Painel admin em abas/seções:
- **Por Cliente**: busca de contato + definir prazos individuais
- **Por Empresa**: dropdown das empresas existentes
- **Por Cargo**: dropdown dos cargos existentes
- **Por Tipo de Contato**: cliente, lead, fornecedor, etc.
- **Por Fila**: dropdown das filas
- **Por Agente**: dropdown dos agentes
- **Global**: link para o `SLAConfigurationManager` existente

Cada seção mostra lista de regras existentes com edição inline, criação e exclusão.

### 3. Hook `useApplicableSLA`

Função que, dado um contato, resolve qual SLA se aplica seguindo a hierarquia de prioridade. Será usada pelo `SLAIndicator` para mostrar os prazos corretos.

### 4. Integração no Dashboard SLA

O `SLARulesManager` será adicionado como uma aba "Regras Granulares" ao lado da configuração global existente.

---

### Detalhes técnicos

**Arquivos a criar:**
- `supabase/migrations/xxx_sla_rules.sql` — tabela + RLS + trigger updated_at
- `src/components/settings/SLARulesManager.tsx` — painel admin completo
- `src/hooks/useSLARules.ts` — CRUD das regras
- `src/hooks/useApplicableSLA.ts` — resolver SLA por hierarquia

**Arquivos a editar:**
- `src/components/queues/SLADashboard.tsx` — adicionar aba/seção do novo painel
- `src/components/inbox/SLAIndicator.tsx` — usar `useApplicableSLA` ao invés de prazos fixos

