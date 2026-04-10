

## Plan: Padronizar Layout das Ferramentas + Backdrop Translúcido

### Problema Identificado
Cada ferramenta usa um padrão de layout diferente:
- **Objeções/Universitários**: Popover flutuante (420px, dropdown)
- **Visão**: Painel lateral direito (w-80, full height)
- **Resumo**: Painel inline (embutido entre header e mensagens)
- **Busca**: Barra inline (abaixo do header)

Isso cria uma experiência fragmentada e inconsistente.

### Solução

**Layout Padrão Unificado**: Todas as 4 ferramentas de IA (Objeções, Universitários, Visão, Resumo) passam a usar o **mesmo padrão de painel lateral direito** (como a Visão já faz), com:
- Largura fixa: `w-80` (320px)
- Animação slide-in da direita
- Header padronizado: ícone + título + subtítulo + botão fechar
- `ScrollArea` como corpo
- Backdrop translúcido cobrindo o resto do chat

A **Busca** permanece como barra inline (padrão diferente por natureza — é um campo de input, não um painel de conteúdo).

### Alterações

**1. Criar componente `ToolPanel` wrapper** (`src/components/inbox/ai-tools/ToolPanel.tsx`)
- Componente reutilizável que encapsula o padrão: backdrop + painel lateral animado
- Props: `isOpen`, `onClose`, `icon`, `title`, `subtitle`, `children`
- Backdrop: `bg-black/40` cobrindo a área do chat (não a tela toda)
- Painel: `w-80`, `border-l`, animação `x: 300 → 0`
- Header: layout padronizado (ícone em caixa arredondada + texto + X)
- Body: `ScrollArea flex-1`

**2. Refatorar `ChatPanel.tsx`**
- Remover o bloco inline do `ConversationSummary` (linhas 398-409)
- Mover Resumo e manter Visão para renderizar via `ToolPanel` no mesmo slot lateral
- Objeções e Universitários saem dos Popovers do header e passam para `ToolPanel`

**3. Refatorar `ChatPanelHeader.tsx`**
- Remover os dois `<Popover>` de Objeções e Universitários
- Botões passam a ser simples toggles chamando `onSetActiveTool('objections')` / `onSetActiveTool('university')`
- Sem mais `PopoverContent` — o conteúdo agora vive no `ToolPanel` em `ChatPanel.tsx`

**4. Adaptar `ConversationSummary.tsx`**
- Remover wrapper Card/CardHeader próprio (será fornecido pelo `ToolPanel`)
- Exportar apenas o conteúdo interno (period selector, botão, resultado)

**5. Adaptar `ObjectionDetector.tsx` e `UniversityHelp.tsx`**
- Remover headers internos (já fornecidos pelo `ToolPanel`)
- Manter lógica e conteúdo intactos

### Resultado Visual
```text
┌──────────────────────────────────┬──────────┐
│  Header do Chat                  │          │
├──────────────────────────────────┤          │
│                                  │ ToolPanel│
│   Mensagens do Chat              │ (320px)  │
│   (com backdrop translúcido)     │          │
│                                  │ [Ícone]  │
│                                  │ Título   │
│                                  │ ──────── │
│                                  │ Conteúdo │
│                                  │          │
├──────────────────────────────────┤          │
│  Input                           │          │
└──────────────────────────────────┴──────────┘
```

### Arquivos Modificados
1. `src/components/inbox/ai-tools/ToolPanel.tsx` — **NOVO** — wrapper reutilizável
2. `src/components/inbox/ChatPanel.tsx` — render unificado das 4 ferramentas via ToolPanel
3. `src/components/inbox/chat/ChatPanelHeader.tsx` — remover Popovers, simplificar botões
4. `src/components/inbox/ConversationSummary.tsx` — remover Card wrapper externo
5. `src/components/inbox/ObjectionDetector.tsx` — remover header interno
6. `src/components/inbox/UniversityHelp.tsx` — remover header interno

