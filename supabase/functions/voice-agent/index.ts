import { handleCors, errorResponse, jsonResponse, requireEnv, Logger, getCorsHeaders } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const TranscriptSchema = z.object({
  transcript: z.string().min(1).max(2000),
});

const SYSTEM_PROMPT = `Você é um assistente de voz inteligente para um sistema de CRM e atendimento ao cliente via WhatsApp.
Sua função é interpretar comandos de voz e retornar uma ação estruturada.

CONTEXTO: Sistema completo de gestão de conversas (inbox), contatos, campanhas, equipe de agentes, filas de atendimento, análise de sentimento, chatbot builder, dashboards de métricas, base de conhecimento, automações, VoIP, grupos de WhatsApp e CRM 360°.

AÇÕES DISPONÍVEIS:
- search: Buscar contatos, conversas ou informações
- navigate: Navegar para uma seção do sistema
- filter: Filtrar conversas ou contatos por critérios
- sort: Ordenar listas por critérios específicos
- clear: Limpar filtros ou busca atual
- answer: Responder uma pergunta sobre o sistema ou dar informações gerais

ROTAS DISPONÍVEIS PARA NAVEGAÇÃO:
- inbox: Caixa de entrada de mensagens
- dashboard: Painel principal com métricas
- contacts: Lista de contatos
- campaigns: Campanhas de mensagens
- team: Gerenciamento de equipe
- settings: Configurações do sistema
- sentiment-alerts: Alertas de sentimento por IA
- chatbot-builder: Construtor de chatbot
- queues: Filas de atendimento
- knowledge-base: Base de conhecimento
- calls: Central de chamadas VoIP
- automations: Regras de automação
- groups: Grupos de WhatsApp
- tags: Gerenciamento de etiquetas
- wallet: Carteira de clientes
- crm360: CRM 360° completo
- reports: Relatórios e análises
- security: Painel de segurança

Responda SEMPRE usando a ferramenta execute_voice_command.
Seja conciso, amigável e responda em português brasileiro.
Máximo 2 frases na resposta.`;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("voice-agent");

  try {
    const LOVABLE_API_KEY = requireEnv('LOVABLE_API_KEY');

    const body = await req.json().catch(() => null);
    const parsed = TranscriptSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(JSON.stringify(parsed.error.flatten().fieldErrors), 400, req);
    }

    const { transcript } = parsed.data;
    log.info("Processing voice command", { transcript: transcript.substring(0, 100) });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: transcript },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'execute_voice_command',
            description: 'Execute a voice command from the user in the CRM system',
            parameters: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['search', 'filter', 'navigate', 'sort', 'clear', 'answer'],
                },
                response: {
                  type: 'string',
                  description: 'Friendly response to speak back in Portuguese (max 2 sentences)',
                },
                data: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query text' },
                    route: {
                      type: 'string',
                      description: 'Route to navigate to',
                      enum: [
                        'inbox', 'dashboard', 'contacts', 'campaigns', 'team', 'settings',
                        'sentiment-alerts', 'chatbot-builder', 'queues', 'knowledge-base',
                        'calls', 'automations', 'groups', 'tags', 'wallet', 'crm360',
                        'reports', 'security',
                      ],
                    },
                    sortBy: {
                      type: 'string',
                      description: 'Sort criterion',
                      enum: ['newest', 'oldest', 'name', 'priority'],
                    },
                    filters: {
                      type: 'object',
                      properties: {
                        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                        assigned: { type: 'boolean' },
                        unread: { type: 'boolean' },
                        contactType: { type: 'string' },
                        category: { type: 'string' },
                        status: { type: 'string' },
                      },
                    },
                  },
                },
              },
              required: ['action', 'response'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'execute_voice_command' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return errorResponse('Rate limit exceeded', 429, req);
      if (response.status === 402) return errorResponse('AI credits exhausted', 402, req);
      const errText = await response.text();
      log.error('AI gateway error', { status: response.status, detail: errText.substring(0, 300) });
      return errorResponse('AI processing failed', 500, req);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let result;
    if (toolCall?.function?.arguments) {
      try { result = JSON.parse(toolCall.function.arguments); } catch {
        result = { action: 'answer', response: 'Desculpe, não entendi o comando.', data: {} };
      }
    } else {
      const content = aiData.choices?.[0]?.message?.content || '';
      try { result = JSON.parse(content); } catch {
        result = { action: 'answer', response: content || 'Desculpe, não entendi.', data: {} };
      }
    }

    if (!result.action || !result.response) {
      result = { action: 'answer', response: result.response || 'Desculpe, ocorreu um erro.', data: {} };
    }

    log.done(200, { action: result.action });
    return jsonResponse(result, 200, req);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log.error('Unhandled error', { error: msg });
    return errorResponse(msg, 500, req);
  }
});
