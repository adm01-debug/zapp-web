

## Plano: Adicionar Seletor de Período com Calendário ao Resumo de Conversa

### Problema Atual
O componente `ConversationSummary` e a geração de resumo no `ChatPanel` enviam TODAS as mensagens para a IA, sem permitir filtrar por período. O `AIConversationAssistant` já possui essa funcionalidade. O objetivo é replicar essa mesma experiência no fluxo de resumo.

### Implementação

**1. Adicionar seletor de período ao `ConversationSummary.tsx`**
- Importar `Calendar`, `Select`, `format`, `ptBR`, `DateRange`
- Adicionar estado para `analysisPeriod`, `customDateFrom`, `customDateTo`
- Reutilizar a mesma lógica de `filterMessagesByPeriod` do `AIConversationAssistant`
- Renderizar o seletor de período (dropdown com as mesmas opções: Qualquer data, Última interação, Hoje, 3/7/14/30/90 dias, Período personalizado)
- Quando "Período personalizado" selecionado, exibir calendário inline com modo `range` (De/Até) identico ao do AIConversationAssistant
- Mostrar contagem de mensagens filtradas vs total
- Ajustar `canGenerateSummary` para usar `filteredMessages.length >= 10`

**2. Atualizar `ChatPanel.tsx`**
- Passar período/filtro para a chamada do `ai-conversation-summary` edge function
- Filtrar mensagens antes de enviar para a API

**3. UI do Calendário Personalizado**
- Grid 2 colunas com "De" e "Até" (labels de data selecionada)
- Calendário `mode="range"` com `locale={ptBR}`, desabilitar datas futuras
- Botão "Limpar" quando datas selecionadas
- Estilo consistente com o AIConversationAssistant (rounded-xl, border-border/60, bg-muted/20)

### Arquivos Modificados
1. `src/components/inbox/ConversationSummary.tsx` — Adicionar seletor de período + calendário + filtro de mensagens
2. `src/components/inbox/ChatPanel.tsx` — Atualizar `handleGenerateSummary` para passar mensagens filtradas

### Detalhes Técnicos
- Extrair `filterMessagesByPeriod` e `getLastConversationStart` do `AIConversationAssistant.tsx` para um utilitário compartilhado ou duplicar inline
- Manter o mínimo de 10 mensagens para resumo (vs 5 para análise)
- O calendário usa `pointer-events-auto` conforme padrão shadcn

