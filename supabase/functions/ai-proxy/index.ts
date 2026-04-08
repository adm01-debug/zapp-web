/**
 * AI Proxy Edge Function
 * Routes AI calls through the admin-configured provider (Lovable AI, OpenAI-compatible, Google Gemini, custom webhook/agent).
 * Falls back to Lovable AI if no provider is configured or if the configured provider fails.
 */
import { handleCors, errorResponse, jsonResponse, Logger, requireEnv } from "../_shared/validation.ts";
import { z, parseBody } from "../_shared/schemas.ts";
import { logAiUsage, extractTokenUsage, extractUserIdFromRequest } from "../_shared/ai-usage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const AiProxySchema = z.object({
  messages: z.array(z.object({
    role: z.string().max(50),
    content: z.string().max(50000),
  })).min(1).max(100),
  use_for: z.enum(['copilot', 'analysis', 'summary', 'tagging', 'auto_reply']).default('copilot'),
  provider_id: z.string().uuid().optional(),
  tools: z.any().optional(),
  tool_choice: z.any().optional(),
  stream: z.boolean().optional().default(false),
});

interface AiProvider {
  id: string;
  name: string;
  provider_type: string;
  api_endpoint: string | null;
  api_key_secret_name: string | null;
  model: string | null;
  system_prompt: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
}

async function getProvider(supabase: ReturnType<typeof createClient>, useFor: string, providerId?: string): Promise<AiProvider | null> {
  let query = supabase
    .from('ai_providers')
    .select('*')
    .eq('is_active', true);

  if (providerId) {
    query = query.eq('id', providerId);
  } else {
    query = query.contains('use_for', [useFor]).eq('is_default', true);
  }

  const { data } = await query.limit(1).maybeSingle();
  return data as AiProvider | null;
}

async function callLovableAI(params: {
  messages: Array<{ role: string; content: string }>;
  apiKey: string;
  model?: string;
  tools?: unknown;
  toolChoice?: unknown;
  stream?: boolean;
}): Promise<Response> {
  const body: Record<string, unknown> = {
    model: params.model || 'google/gemini-2.5-flash',
    messages: params.messages,
  };
  if (params.tools) body.tools = params.tools;
  if (params.toolChoice) body.tool_choice = params.toolChoice;
  if (params.stream) body.stream = true;

  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function callOpenAICompatible(params: {
  endpoint: string;
  apiKey: string;
  messages: Array<{ role: string; content: string }>;
  model?: string;
  tools?: unknown;
  toolChoice?: unknown;
  stream?: boolean;
  config?: Record<string, unknown>;
}): Promise<Response> {
  const body: Record<string, unknown> = {
    model: params.model || 'gpt-4o',
    messages: params.messages,
    ...params.config,
  };
  if (params.tools) body.tools = params.tools;
  if (params.toolChoice) body.tool_choice = params.toolChoice;
  if (params.stream) body.stream = true;

  return fetch(params.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
      ...(params.config?.headers as Record<string, string> || {}),
    },
    body: JSON.stringify(body),
  });
}

async function callCustomWebhook(params: {
  endpoint: string;
  apiKey?: string;
  messages: Array<{ role: string; content: string }>;
  config?: Record<string, unknown>;
}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(params.config?.headers as Record<string, string> || {}),
  };
  if (params.apiKey) {
    const authScheme = (params.config?.auth_scheme as string) || 'Bearer';
    headers.Authorization = `${authScheme} ${params.apiKey}`;
  }

  return fetch(params.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: params.messages,
      ...(params.config?.extra_body as Record<string, unknown> || {}),
    }),
  });
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("ai-proxy");
  const userId = extractUserIdFromRequest(req);

  try {
    const parsed = parseBody(AiProxySchema, await req.json());
    if (!parsed.success) return errorResponse(parsed.error, 400, req);

    const { messages, use_for, provider_id, tools, tool_choice, stream } = parsed.data;

    // Get Supabase client to fetch provider config
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Resolve provider
    const provider = await getProvider(supabase, use_for, provider_id);
    const providerType = provider?.provider_type || 'lovable_ai';
    const providerName = provider?.name || 'Lovable AI';

    log.info("Routing AI call", { provider: providerName, type: providerType, use_for });

    // Inject system prompt from provider if configured
    const finalMessages = [...messages];
    if (provider?.system_prompt) {
      const hasSystemMsg = finalMessages.some(m => m.role === 'system');
      if (hasSystemMsg) {
        finalMessages[0] = {
          role: 'system',
          content: provider.system_prompt + '\n\n' + finalMessages[0].content,
        };
      } else {
        finalMessages.unshift({ role: 'system', content: provider.system_prompt });
      }
    }

    let response: Response;
    const startTime = Date.now();

    switch (providerType) {
      case 'lovable_ai': {
        const apiKey = requireEnv("LOVABLE_API_KEY");
        response = await callLovableAI({
          messages: finalMessages,
          apiKey,
          model: provider?.model || undefined,
          tools,
          toolChoice: tool_choice,
          stream,
        });
        break;
      }

      case 'openai_compatible':
      case 'google_gemini': {
        if (!provider?.api_endpoint) {
          return errorResponse("Endpoint da API não configurado para este provedor.", 400, req);
        }
        const secretName = provider.api_key_secret_name;
        const apiKey = secretName ? Deno.env.get(secretName) : null;
        if (!apiKey) {
          return errorResponse(`Chave de API '${secretName}' não encontrada nos secrets.`, 400, req);
        }
        response = await callOpenAICompatible({
          endpoint: provider.api_endpoint,
          apiKey,
          messages: finalMessages,
          model: provider.model || undefined,
          tools,
          toolChoice: tool_choice,
          stream,
          config: provider.config || {},
        });
        break;
      }

      case 'custom_webhook':
      case 'custom_agent': {
        if (!provider?.api_endpoint) {
          return errorResponse("Endpoint não configurado para este agente/webhook.", 400, req);
        }
        const secretName2 = provider.api_key_secret_name;
        const apiKey2 = secretName2 ? Deno.env.get(secretName2) : undefined;
        response = await callCustomWebhook({
          endpoint: provider.api_endpoint,
          apiKey: apiKey2,
          messages: finalMessages,
          config: provider.config || {},
        });
        break;
      }

      default: {
        const apiKey = requireEnv("LOVABLE_API_KEY");
        response = await callLovableAI({ messages: finalMessages, apiKey, tools, toolChoice: tool_choice, stream });
      }
    }

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      log.error("Provider error", { status: response.status, provider: providerName, error: errText });

      if (response.status === 429) return errorResponse("Limite de requisições excedido. Tente novamente.", 429, req);
      if (response.status === 402) return errorResponse("Créditos insuficientes. Adicione créditos.", 402, req);

      // Log failure
      logAiUsage({
        functionName: 'ai-proxy',
        userId,
        model: provider?.model || null,
        durationMs,
        status: 'error',
        errorMessage: `${providerName}: HTTP ${response.status}`,
        metadata: { provider_id: provider?.id, provider_type: providerType },
      });

      return errorResponse(`Erro do provedor ${providerName}: ${response.status}`, 502, req);
    }

    // If streaming, pass through
    if (stream) {
      log.done(200, { provider: providerName, streaming: true });
      return new Response(response.body, {
        headers: { ...Object.fromEntries(response.headers), 'Content-Type': 'text/event-stream' },
      });
    }

    const data = await response.json();
    const { inputTokens, outputTokens, model } = extractTokenUsage(data);

    // Log success
    logAiUsage({
      functionName: 'ai-proxy',
      userId,
      model: model || provider?.model || null,
      inputTokens,
      outputTokens,
      durationMs,
      status: 'success',
      metadata: { provider_id: provider?.id, provider_type: providerType, use_for },
    });

    log.done(200, { provider: providerName, tokens: inputTokens + outputTokens });
    return jsonResponse(data, 200, req);

  } catch (error) {
    log.error("Proxy error", { error: error instanceof Error ? error.message : String(error) });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500, req);
  }
});
