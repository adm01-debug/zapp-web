

## Plan: Ferramentas Mutuamente Exclusivas no Header do Chat

### Problema
As ferramentas do header (Busca, Objeções, Universitários, Visão, Resumo) operam de forma independente — abrir uma não fecha a outra. Além disso, Objeções e Universitários usam `<Popover>` com estado interno, fora do controle do `dialogReducer`.

### Solução
Criar um estado centralizado de "ferramenta ativa" que garante exclusividade mútua, enquanto cada ferramenta preserva seu histórico/dados internos (não resetar estado ao fechar).

### Alterações

**1. `src/components/inbox/ChatPanel.tsx`**
- Definir um tipo `ActiveTool = 'chatSearch' | 'objections' | 'university' | 'aiAssistant' | 'summary' | null`
- Adicionar estado `const [activeTool, setActiveTool] = useState<ActiveTool>(null)`
- Criar `handleSetActiveTool(tool: ActiveTool)` que:
  - Se a ferramenta já está ativa → fecha (seta `null`)
  - Se outra ferramenta está ativa → fecha a anterior e abre a nova
- Sincronizar `activeTool` com os dialogs existentes (`chatSearch`, `aiAssistant`) via `useEffect` ou substituição direta
- Passar `activeTool` e `onSetActiveTool` para `ChatPanelHeader`
- Usar `activeTool` para controlar abertura de `ChatSearchBar`, `AIConversationAssistant`, `ConversationSummary`

**2. `src/components/inbox/chat/ChatPanelHeader.tsx`**
- Substituir os dois `<Popover>` independentes (Objeções e Universitários) por `<Popover open={activeTool === 'objections'} onOpenChange={...}>`
- Novos props: `activeTool` e `onSetActiveTool`
- Cada botão de ferramenta chama `onSetActiveTool('toolName')` em vez de lógica independente
- Os componentes `ObjectionDetector` e `UniversityHelp` continuam montados via `Suspense` — seu estado interno (análises, respostas) persiste enquanto o componente estiver montado

### Comportamento Final
- Clicar em qualquer ferramenta fecha automaticamente qualquer outra que esteja aberta
- Clicar na ferramenta já ativa fecha ela (toggle)
- O histórico/dados de cada ferramenta persiste (componentes não são desmontados, apenas ocultados quando aplicável; popovers mantêm cache via lazy load)

### Arquivos Modificados
1. `src/components/inbox/ChatPanel.tsx` — estado centralizado `activeTool`
2. `src/components/inbox/chat/ChatPanelHeader.tsx` — popovers controlados + novos props

