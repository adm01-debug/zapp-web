import { handleCors, errorResponse, jsonResponse, requireEnv, Logger, getCorsHeaders } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const TranscriptSchema = z.object({
  transcript: z.string().min(1).max(2000),
});

const SYSTEM_PROMPT = `Você é um assistente de voz inteligente para um sistema de CRM e atendimento ao cliente via WhatsApp.
Sua função é interpretar comandos de voz e retornar uma ação estruturada.

CONTEXTO: Sistema de gestão de conversas (inbox), contatos, campanhas, equipe de agentes, filas de atendimento, análise de sentimento, chatbot builder e dashboards de métricas.

AÇÕES DISPONÍVEIS:
- search: Buscar contatos, conversas ou informações
- navigate: Navegar para uma seção do sistema (inbox, dashboard, contacts, campaigns, team, settings, sentiment-alerts, chatbot-builder, queues, knowledge-base, calls, automations)
- filter: Filtrar conversas ou contatos
- answer: Responder uma pergunta sobre o sistema ou dar informações gerais
- clear: Limpar filtros ou busca atual

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
                  enum: ['search', 'filter', 'navigate', 'clear', 'answer'],
                },
                response: {
                  type: 'string',
                  description: 'Friendly response to speak back in Portuguese (max 2 sentences)',
                },
                data: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query' },
                    route: {
                      type: 'string',
                      description: 'Route to navigate to',
                      enum: ['inbox', 'dashboard', 'contacts', 'campaigns', 'team', 'settings', 'sentiment-alerts', 'chatbot-builder', 'queues', 'knowledge-base', 'calls', 'automations'],
                    },
                    filters: {
                      type: 'object',
                      properties: {
                        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                        assigned: { type: 'boolean' },
                        unread: { type: 'boolean' },
                        contactType: { type: 'string' },
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
