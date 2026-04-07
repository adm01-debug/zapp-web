
# Copiloto de Voz IA

## Arquitetura
O copiloto usa **ElevenLabs Conversational AI** (já integrado) para voz bidirecional + **Lovable AI Gateway** para inteligência/raciocínio sobre dados do sistema.

## Componentes

### 1. Edge Function: `voice-copilot`
- Recebe comandos transcritos do agente ElevenLabs via client tools
- Consulta dados do sistema (contatos, conversas, métricas, filas)
- Executa ações (atribuir conversa, criar nota, buscar contato, transferir fila)
- Usa Lovable AI para interpretar intenções e formular respostas

### 2. Edge Function: `elevenlabs-agent-token`
- Gera token de conversa para o agente ElevenLabs
- Requer um Agent ID configurado no painel ElevenLabs

### 3. Componente: `VoiceCopilotButton`
- Botão flutuante acessível de qualquer tela
- Animação de onda quando ativo
- Indicadores de status (ouvindo, processando, falando)
- Mostra transcrição em tempo real

### 4. Client Tools (executados no navegador)
- `searchContacts` - Busca contatos por nome/telefone
- `getConversationSummary` - Resume uma conversa
- `assignConversation` - Atribui conversa a agente
- `navigateTo` - Navega entre seções do sistema
- `getMetrics` - Retorna métricas do dashboard
- `createNote` - Cria nota em contato

## Requisito
- O usuário precisa criar um **ElevenLabs Agent** no painel da ElevenLabs e fornecer o **Agent ID**
- As client tools precisam ser configuradas no painel do agente ElevenLabs

## Fluxo
1. Usuário clica no botão do copiloto
2. Solicita permissão de microfone
3. Conecta ao agente ElevenLabs via WebRTC
4. Usuário fala → agente transcreve → processa via tools → responde por voz
5. Ações são executadas no sistema em tempo real
