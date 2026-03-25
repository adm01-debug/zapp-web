import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || '');
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }

  try {
    const { messages, contactName } = await req.json();
    
    if (!messages || messages.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Conversation must have at least 10 messages for summary' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Format messages for context
    const conversationText = messages
      .map((msg: { sender: string; content: string; created_at: string }) => 
        `[${msg.sender === 'agent' ? 'Atendente' : contactName || 'Cliente'}]: ${msg.content}`
      )
      .join('\n');

    const systemPrompt = `Você é um assistente especializado em resumir conversas de atendimento ao cliente.
Analise a conversa abaixo e forneça:
1. Um resumo conciso (máximo 3 frases) do assunto principal
2. O status atual da conversa (resolvido, pendente, aguardando cliente, aguardando atendente)
3. Pontos-chave discutidos (máximo 5 itens)
4. Próximos passos sugeridos (se houver)

Responda em português brasileiro de forma clara e objetiva.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversa com ${contactName || 'Cliente'}:\n\n${conversationText}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_summary",
              description: "Generate a structured summary of the conversation",
              parameters: {
                type: "object",
                properties: {
                  summary: { 
                    type: "string", 
                    description: "Brief summary of the main topic (max 3 sentences)" 
                  },
                  status: { 
                    type: "string", 
                    enum: ["resolvido", "pendente", "aguardando_cliente", "aguardando_atendente"],
                    description: "Current status of the conversation" 
                  },
                  keyPoints: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Key points discussed (max 5)" 
                  },
                  nextSteps: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Suggested next steps" 
                  },
                  sentiment: {
                    type: "string",
                    enum: ["positivo", "neutro", "negativo"],
                    description: "Overall customer sentiment"
                  }
                },
                required: ["summary", "status", "keyPoints", "sentiment"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_summary" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const summaryData = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(summaryData),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to content if no tool call
    const content = data.choices?.[0]?.message?.content;
    return new Response(
      JSON.stringify({ summary: content, status: 'pendente', keyPoints: [], sentiment: 'neutro' }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
