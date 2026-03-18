import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, contactName, contactId } = await req.json();
    
    if (!messages || messages.length < 5) {
      return new Response(
        JSON.stringify({ error: 'Conversation must have at least 5 messages for summary' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch contact context for richer analysis
    let contactContext = '';
    if (contactId) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('name, company, tags, ai_priority, ai_sentiment, notes')
        .eq('id', contactId)
        .maybeSingle();

      if (contact) {
        contactContext = `\nContexto: ${contact.name || 'Cliente'}, Empresa: ${contact.company || 'N/A'}, Tags: ${contact.tags?.join(', ') || 'Nenhuma'}`;
      }

      // Get previous analyses for trend detection
      const { data: prevAnalyses } = await supabase
        .from('conversation_analyses')
        .select('sentiment, summary, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (prevAnalyses && prevAnalyses.length > 0) {
        contactContext += `\nHistórico: ${prevAnalyses.map(a => `[${a.sentiment}] ${a.summary}`).join(' | ')}`;
      }
    }

    const conversationText = messages
      .map((msg: { sender: string; content: string; created_at: string }) => 
        `[${msg.sender === 'agent' ? 'Atendente' : contactName || 'Cliente'}]: ${msg.content}`
      )
      .join('\n');

    const systemPrompt = `Você é um analista de conversas de atendimento ao cliente com foco em insights acionáveis.
Analise a conversa e forneça uma análise estruturada e detalhada.
${contactContext}

Foque em:
- Identificar o problema/necessidade REAL do cliente (não apenas o que ele disse)
- Avaliar a qualidade do atendimento prestado
- Detectar oportunidades de venda ou melhoria
- Identificar riscos de churn/insatisfação
- Sugerir ações concretas e mensuráveis`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Conversa com ${contactName || 'Cliente'}:\n\n${conversationText}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_analysis",
              description: "Generate a comprehensive analysis of the conversation",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Brief summary (max 3 sentences)" },
                  status: { 
                    type: "string", 
                    enum: ["resolvido", "pendente", "aguardando_cliente", "aguardando_atendente", "escalado"],
                  },
                  keyPoints: { type: "array", items: { type: "string" }, description: "Key points (max 5)" },
                  nextSteps: { type: "array", items: { type: "string" }, description: "Actionable next steps" },
                  sentiment: { type: "string", enum: ["positivo", "neutro", "negativo", "critico"] },
                  sentimentScore: { type: "number", description: "Sentiment score 0-100 (100=very positive)" },
                  customerSatisfaction: { type: "number", description: "Estimated CSAT 1-5" },
                  agentPerformance: {
                    type: "object",
                    properties: {
                      empathy: { type: "number", description: "1-5 scale" },
                      clarity: { type: "number", description: "1-5 scale" },
                      efficiency: { type: "number", description: "1-5 scale" },
                      knowledge: { type: "number", description: "1-5 scale" },
                    },
                  },
                  churnRisk: { type: "string", enum: ["low", "medium", "high"] },
                  salesOpportunity: { type: "string", description: "Description of sales opportunity or null" },
                  topics: { type: "array", items: { type: "string" }, description: "Main topics discussed" },
                  urgency: { type: "string", enum: ["low", "normal", "high", "critical"] },
                },
                required: ["summary", "status", "keyPoints", "sentiment", "sentimentScore", "customerSatisfaction", "topics", "urgency"],
                additionalProperties: false,
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_analysis" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let analysisData;
    if (toolCall?.function?.arguments) {
      analysisData = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content;
      analysisData = { summary: content, status: 'pendente', keyPoints: [], sentiment: 'neutro', sentimentScore: 50, customerSatisfaction: 3, topics: [], urgency: 'normal' };
    }

    // Save analysis to database
    if (contactId) {
      await supabase.from('conversation_analyses').insert({
        contact_id: contactId,
        summary: analysisData.summary,
        sentiment: analysisData.sentiment,
        sentiment_score: analysisData.sentimentScore,
        customer_satisfaction: analysisData.customerSatisfaction,
        key_points: analysisData.keyPoints,
        next_steps: analysisData.nextSteps || [],
        topics: analysisData.topics,
        urgency: analysisData.urgency,
        status: analysisData.status,
        message_count: messages.length,
      });

      // Update contact AI metadata
      await supabase.from('contacts').update({
        ai_sentiment: analysisData.sentiment,
        ai_priority: analysisData.urgency === 'critical' ? 'urgent' : analysisData.urgency,
      }).eq('id', contactId);
    }

    return new Response(JSON.stringify(analysisData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
