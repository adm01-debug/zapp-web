# Plano de Testes e Validação Operacional — ZAPP WEB

## Objetivo
Este documento organiza a rodada de validação pré-produção do ZAPP WEB com foco em:
- segurança do perímetro externo;
- integridade do fluxo de atendimento;
- estabilidade do inbox em alto volume;
- confiabilidade de webhooks e integrações;
- regressão funcional dos módulos operacionais;
- critérios claros de go-live.

---

## Critérios de Bloqueio (P0)

### P0-1 — Edge Functions sensíveis expostas sem JWT
**Sinal encontrado**
Funções sensíveis estão configuradas com `verify_jwt = false`, incluindo `evolution-api`, `bitrix-api`, `ai-suggest-reply`, `ai-conversation-summary`, `ai-conversation-analysis`, `ai-transcribe-audio`, `evolution-sync` e outras.

**Risco operacional**
- abuso de integrações pagas;
- uso indevido de service role por rotas públicas;
- execução não autenticada de ações administrativas.

**Critério para aprovar**
- todas as funções sensíveis devem exigir JWT;
- apenas webhooks públicos reais permanecem sem JWT.

### P0-2 — Webhook Evolution sem autenticação do emissor
**Sinal encontrado**
`evolution-webhook` processa eventos que alteram banco, mas não valida segredo/assinatura do emissor.

**Risco operacional**
- eventos falsos injetados no banco;
- corrupção de mensagens, contatos, tags e chamadas.

**Critério para aprovar**
- rejeitar POST sem segredo válido;
- registrar auditoria de rejeição.

### P0-3 — WhatsApp Cloud webhook sem validação de assinatura no POST
**Sinal encontrado**
`whatsapp-webhook` valida challenge de inscrição, mas não valida `X-Hub-Signature-256`.

**Risco operacional**
- POST forjado com eventos falsos.

**Critério para aprovar**
- verificar HMAC SHA-256 com `WHATSAPP_APP_SECRET` antes de processar.

### P0-4 — Risco de envio por conexão errada
**Sinal encontrado**
`sendMessage` cai para a última conexão conectada quando a conexão do contato não está ativa.

**Risco operacional**
- mensagem enviada pelo número errado;
- dano comercial e reputacional.

**Critério para aprovar**
- envio só pode ocorrer pela conexão do contato ou por fallback explicitamente permitido por regra de negócio;
- fallback genérico deve ser removido.

---

## Critérios Importantes (P1)

### P1-1 — Inbox global com limites rígidos
- `SEEDED_CONTACT_LIMIT = 500`
- `RECENT_MESSAGES_LIMIT = 1000`

**Risco**
Perda de cobertura do inbox em alto volume.

**Aprovação**
- paginação progressiva ou fetch incremental por janela de atividade;
- métricas de volume e fallback seguro.

### P1-2 — Corrida em troca rápida de conversa
`useMessages` não cancela fetch anterior nem usa request token.

**Risco**
Mensagens do contato anterior sobrescrevendo o atual.

**Aprovação**
- guard por request id/abort;
- ignorar resposta stale.

### P1-3 — Ausência de suíte de regressão operacional
`vitest` existe no projeto, mas não há script de teste nem suíte detectada.

**Aprovação**
- script `test`;
- smoke tests unitários e de hooks críticos;
- checklist manual de produção.

### P1-4 — Divergência entre inventário e realidade do projeto
O inventário funcional está defasado em relação ao número/configuração atual das functions e módulos.

**Aprovação**
- alinhar documentação técnica e superfície real do projeto.

---

## Matriz de Testes por Módulo

## 1. Autenticação e Perfis
### Cenários
1. Login com credenciais válidas.
2. Login com senha inválida.
3. Sessão restaurada após refresh.
4. Usuário autenticado sem linha em `profiles`.
5. Logout e limpeza de estado.
6. RefreshProfile após alteração de perfil.

### Resultado esperado
- sessão consistente;
- `profile` carregado ou erro claramente tratado;
- nenhum estado fantasma após logout.

### Severidade
P2

---

## 2. Inbox / Lista de Conversas
### Cenários
1. Carregar inbox com 10, 100, 500, 2.000 contatos.
2. Ordenação por última mensagem.
3. Contagem de não lidas coerente.
4. Contato sem mensagens ainda visível.
5. Realtime de nova mensagem reposicionando conversa para o topo.
6. Contato com mensagens fora do recorte inicial.

### Resultado esperado
- lista não perde cobertura em alto volume;
- conversa certa sobe para o topo;
- contadores permanecem corretos.

### Severidade
P1

---

## 3. Mensagens / Detalhe da Conversa
### Cenários
1. Abrir contato com histórico pequeno.
2. Abrir contato com histórico longo (10k+ mensagens).
3. Trocar rapidamente A → B → C.
4. Receber mensagem enquanto conversa está aberta.
5. Atualização de status `sending → sent → delivered → read`.
6. Mensagem deletada no provedor refletida no banco/UI.
7. Mensagem com mídia e transcrição.

### Resultado esperado
- nenhuma troca de contexto incorreta;
- realtime coerente;
- status nunca regride;
- histórico completo carregado.

### Severidade
P1

---

## 4. Envio de Mensagens
### Cenários
1. Enviar texto simples.
2. Enviar imagem com legenda.
3. Enviar documento.
4. Enviar áudio.
5. Enviar localização.
6. Enviar sem conexão ativa.
7. Enviar quando contato possui conexão vinculada inativa.
8. Operação com múltiplas instâncias conectadas.

### Resultado esperado
- envio usa a conexão correta;
- falhas deixam mensagem como `failed` com trilha clara;
- nenhum fallback silencioso para outra instância.

### Severidade
P0

---

## 5. Tarefas Contextuais e Lembretes
### Cenários
1. Criar tarefa no detalhe do contato.
2. Criar lembrete no detalhe do contato.
3. Concluir tarefa.
4. Excluir tarefa.
5. Operador sem `profileId` ainda carregado tenta criar tarefa.
6. Realtime atualiza painel lateral após alteração.

### Resultado esperado
- UX não permite criação sem ownership definido;
- erros aparecem ao usuário;
- estado do painel é consistente.

### Severidade
P2/P1

---

## 6. Webhook Evolution
### Cenários
1. POST legítimo de `messages.upsert`.
2. POST sem segredo válido.
3. POST de `connection.update`.
4. POST de `messages.update` fora de ordem.
5. POST de `messages.delete` para mensagem inexistente.
6. POST com sticker, áudio, vídeo e documento.
7. POST com taxa alta para testar rate limit por instância.

### Resultado esperado
- emissor inválido é rejeitado;
- eventos legítimos processam normalmente;
- status não degradam;
- placeholders são reconciliados.

### Severidade
P0

---

## 7. WhatsApp Cloud Webhook
### Cenários
1. GET de challenge válido.
2. GET de challenge inválido.
3. POST com assinatura correta.
4. POST com assinatura inválida.
5. Status update para mensagem existente.
6. Status update para mensagem inexistente.

### Resultado esperado
- GET e POST validados corretamente;
- POST inválido recebe 403;
- eventos válidos atualizam status.

### Severidade
P0

---

## 8. Edge Functions de IA
### Cenários
1. Gerar sugestão de resposta com JWT válido.
2. Tentar chamar função sem JWT.
3. Exceder rate limit.
4. KB vazia.
5. Resposta do gateway sem JSON válido.
6. Transcrição de áudio válida.
7. Transcrição de áudio inválida/corrompida.

### Resultado esperado
- funções exigem autenticação;
- fallback amigável em falhas de IA;
- rate limit funciona.

### Severidade
P0/P1

---

## 9. Bitrix
### Cenários
1. Listar leads autenticado.
2. Criar lead autenticado.
3. Chamada sem JWT.
4. Erro de Bitrix retorna mensagem amigável.
5. Sync de contatos com duplicidade por telefone.

### Resultado esperado
- ações administrativas só com autenticação;
- duplicidade tratada;
- erros externos controlados.

### Severidade
P0/P1

---

## 10. Critérios de Go-Live
O sistema só pode entrar em produção quando:
1. todos os P0 estiverem corrigidos;
2. todos os cenários P0 tiverem evidência de teste aprovado;
3. houver suíte mínima de regressão para auth, inbox, sendMessage e webhooks;
4. documentação técnica estiver alinhada com a superfície atual do projeto;
5. fallback de conexão errada estiver eliminado.

---

## Evidências esperadas
- PR com correções P0/P1;
- checklist assinado de smoke tests;
- logs de rejeição de webhooks inválidos;
- prints/registro de cenários aprovados;
- validação final em ambiente staging.
