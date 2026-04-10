

# Implementar Filtro de Calendário Premium em Todas as Ferramentas de IA

## Situacao Atual

| Ferramenta | Filtro de Data Atual |
|---|---|
| Monitoramento de Objecoes | Nenhum - usa `lastMessages` sem filtro |
| Ajuda dos Universitarios | Nenhum - usa `messages` com filtro por remetente |
| Assistente IA | Select dropdown + calendario inline (funcional, mas visual basico) |
| Resumo da Conversa | Select dropdown + calendario inline (funcional, mas visual basico) |

## Objetivo

Unificar todas as 4 ferramentas com o mesmo componente de filtro de periodo premium (layout side-by-side com atalhos + calendarios duplos), conforme o design ja implementado no `ChatSearchBar`.

## Plano de Implementacao

### 1. Criar componente reutilizavel `PeriodFilterSelector`

Novo arquivo: `src/components/inbox/ai-tools/PeriodFilterSelector.tsx`

- Extrair a logica compartilhada de filtro de periodo (tipos, constantes, funcoes `filterMessagesByPeriod`, `getLastConversationStart`, `startOfDay`) que hoje esta duplicada em `AIConversationAssistant.tsx` e `ConversationSummary.tsx`.
- UI: Select dropdown com as opcoes de periodo + quando "Personalizado" for selecionado, exibir o layout premium side-by-side (sidebar de atalhos a esquerda + calendarios duplos DE/ATE a direita) dentro de um painel expansivel.
- Props: `period`, `onPeriodChange`, `customFrom`, `customTo`, `onCustomRangeChange`, `messageCount`, `totalCount`.

### 2. Refatorar Assistente IA (`AIConversationAssistant.tsx`)

- Remover logica duplicada de filtro (tipos, constantes, funcoes).
- Substituir o bloco de Select + calendario inline pelo novo `PeriodFilterSelector`.
- Manter toda a logica de analise inalterada.

### 3. Refatorar Resumo da Conversa (`ConversationSummary.tsx`)

- Mesma refatoracao: remover duplicacao, usar `PeriodFilterSelector`.
- Manter logica de geracao de resumo inalterada.

### 4. Adicionar filtro ao Monitoramento de Objecoes (`ObjectionDetector.tsx`)

- Alterar props: receber `allMessages` (com timestamps) alem de `lastMessages`.
- Adicionar estado de periodo e `PeriodFilterSelector`.
- Filtrar mensagens pelo periodo antes de enviar para analise.
- Atualizar `ChatPanelHeader.tsx` e `AIToolsPopover.tsx` para passar `allMessages`.

### 5. Adicionar filtro a Ajuda dos Universitarios (`UniversityHelp.tsx`)

- Adicionar estado de periodo e `PeriodFilterSelector`.
- Filtrar `messages` pelo periodo selecionado antes de aplicar o filtro por remetente.
- O componente ja recebe mensagens com `timestamp` — basta aplicar o filtro.

### 6. Atualizar testes

- Atualizar `ConversationSummary.test.tsx` para o novo componente de filtro.

## Detalhes Tecnicos

- O componente `PeriodFilterSelector` usara o `Calendar` de `@/components/ui/calendar` com `mode="single"` para cada calendario (DE e ATE), identico ao pattern do `ChatSearchBar`.
- Layout side-by-side: sidebar 160px com atalhos (Ultima conversa, Hoje, 3d, 7d, 14d, 30d, 90d) + area principal com calendarios duplos.
- Classes CSS: `bg-muted/30`, `uppercase tracking-widest`, `pointer-events-auto`.
- A logica de "Ultima conversa" (gap > 4h) sera centralizada no componente compartilhado.

## Arquivos Afetados

- `src/components/inbox/ai-tools/PeriodFilterSelector.tsx` (novo)
- `src/components/inbox/AIConversationAssistant.tsx` (refatorar)
- `src/components/inbox/ConversationSummary.tsx` (refatorar)
- `src/components/inbox/ObjectionDetector.tsx` (adicionar filtro)
- `src/components/inbox/UniversityHelp.tsx` (adicionar filtro)
- `src/components/inbox/AIToolsPopover.tsx` (atualizar props)
- `src/components/inbox/chat/ChatPanelHeader.tsx` (atualizar props)
- `src/components/inbox/__tests__/ConversationSummary.test.tsx` (atualizar)

