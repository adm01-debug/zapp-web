

## Busca na Conversa (In-Chat Search) — estilo WhatsApp

### O que muda

O botão de lupa (🔍) no cabeçalho do chat deixará de abrir a busca global (Ctrl+K) e passará a abrir uma **barra de busca inline dentro da conversa**, permitindo pesquisar no histórico completo de mensagens, arquivos, links e mídias daquele contato específico.

### Como vai funcionar

1. Ao clicar na lupa, uma barra de busca aparece logo abaixo do cabeçalho (slide-down animado)
2. O usuário digita e os resultados filtram as mensagens da conversa em tempo real
3. Setas ↑↓ navegam entre os resultados encontrados (highlight amarelo na mensagem, com scroll automático)
4. Contador mostra "3 de 15 resultados"
5. Filtros rápidos por tipo: Todos, Textos, Imagens, Vídeos, Áudios, Documentos, Links
6. Botão X fecha a barra e limpa o highlight
7. Atalho Ctrl+F abre a busca na conversa (Ctrl+K continua abrindo a busca global)

### Arquivos a criar/modificar

1. **Novo: `src/components/inbox/chat/ChatSearchBar.tsx`**
   - Barra de busca inline com input, filtros por tipo de mídia, navegação entre resultados (setas ↑↓), contador de matches
   - Recebe as `messages` da conversa e faz busca local (texto no `content`, `media_url`, `transcription`)
   - Emite callback `onNavigateToMessage(messageId)` para scroll automático
   - Emite callback `onHighlightChange(messageIds)` para destacar mensagens encontradas

2. **Modificar: `src/components/inbox/ChatPanel.tsx`**
   - Substituir `showGlobalSearch` por `showChatSearch` (state boolean)
   - Conectar `onOpenSearch` ao novo state
   - Passar `messages` para `ChatSearchBar`
   - Passar highlight IDs para `ChatMessagesArea`
   - Adicionar listener de `Ctrl+F` para abrir busca na conversa

3. **Modificar: `src/components/inbox/chat/ChatPanelHeader.tsx`**
   - Atualizar tooltip de "Buscar (Ctrl+K)" → "Buscar na conversa (Ctrl+F)"
   - `onOpenSearch` continua igual, só muda o que é aberto

4. **Modificar: `src/components/inbox/chat/ChatMessagesArea.tsx`**
   - Aceitar prop `highlightedMessageIds?: Set<string>` e `activeHighlightId?: string`
   - Aplicar estilo de destaque (borda amarela / fundo amarelo translúcido) nas mensagens encontradas

5. **Modificar: `src/components/inbox/VirtualizedMessageList.tsx`**
   - Propagar highlight visual nas mensagens virtualizadas

### Detalhes técnicos

- A busca é 100% client-side sobre o array `messages[]` já carregado (inclui `content`, `transcription`, `media_url`)
- Filtro por tipo usa o campo `message_type` (text, image, video, audio, document) e regex para links
- Debounce de 200ms no input para performance
- Navegação com setas usa `scrollToMessage(id)` já existente no `VirtualizedMessageList`
- Para links: extrai URLs do conteúdo com regex `https?://\S+`

