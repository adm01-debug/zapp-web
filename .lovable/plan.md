
# Plano: Consumo de IA por Usuário

## 1. Tabela `ai_usage_logs`
Criar tabela para registrar cada chamada de IA:
- `user_id` — quem fez a chamada
- `function_name` — qual edge function (ai-suggest-reply, ai-enhance-message, etc.)
- `model` — modelo usado (gemini-flash, gpt-5, etc.)
- `input_tokens` / `output_tokens` — tokens consumidos
- `duration_ms` — tempo de resposta
- `status` — sucesso ou erro
- `created_at` — quando ocorreu

## 2. Atualizar Edge Functions de IA
Adicionar logging de consumo nas 8 funções que usam LLM:
- `ai-suggest-reply`
- `ai-enhance-message`
- `ai-conversation-analysis`
- `ai-conversation-summary`
- `ai-auto-tag`
- `ai-transcribe-audio`
- `sentiment-alert`
- `chatbot-l1`

Cada chamada registrará tokens, modelo e duração automaticamente.

## 3. Dashboard Admin de Consumo
Criar painel em Configurações > Admin com:
- **Resumo geral** — total de chamadas, tokens e custo estimado
- **Ranking por usuário** — quem mais consome
- **Gráfico temporal** — uso ao longo do tempo
- **Filtros** — por período, função e usuário
- **Exportação** — CSV dos dados

## Resultado
O admin terá visibilidade total sobre o consumo de IA de cada agente do sistema.
