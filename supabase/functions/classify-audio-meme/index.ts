import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AUDIO_CATEGORIES = [
  'risada', 'aplausos', 'suspense', 'vitória', 'falha',
  'surpresa', 'triste', 'raiva', 'romântico', 'medo',
  'deboche', 'narração', 'bordão', 'efeito sonoro', 'viral',
  'cumprimento', 'despedida', 'animação', 'drama', 'gospel', 'outros'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio_url, file_name } = await req.json();

    // Input validation — if both are empty/missing, skip AI call
    if (!audio_url && !file_name) {
      console.warn('[CLASSIFY-AUDIO] Empty input, defaulting to outros');
      return new Response(JSON.stringify({ category: 'outros' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('[CLASSIFY-AUDIO] LOVABLE_API_KEY not set');
      return new Response(JSON.stringify({ category: 'outros' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Você é um classificador de áudios meme/sons engraçados para uma biblioteca de atendimento via WhatsApp. 
Com base no nome do arquivo "${file_name || 'audio'}" e na URL "${audio_url}", classifique em EXATAMENTE UMA das categorias abaixo.
Responda APENAS com o nome da categoria, sem explicação.

Categorias: ${AUDIO_CATEGORIES.join(', ')}

Regras:
- "risada": gargalhada, LOL, KKKK, riso
- "aplausos": palmas, ovação, torcida
- "suspense": tensão, mistério, thriller
- "vitória": sucesso, ganhou, champion, win
- "falha": fail, erro, buzina de erro, wah wah
- "surpresa": wow, choque, plot twist
- "triste": choro, melancolia, violino triste
- "raiva": irritação, grito de raiva
- "romântico": amor, beijo, música romântica
- "medo": susto, grito de terror, jump scare
- "deboche": ironia, sarcasmo, "ain"
- "narração": narrador, Galvão, Cid Moreira
- "bordão": frase famosa, meme falado, catchphrase
- "efeito sonoro": boing, piu, explosion, coin
- "viral": TikTok, trend, meme viral atual
- "cumprimento": bom dia, oi, salve
- "despedida": tchau, bye, até logo
- "animação": empolgação, hype, let's go
- "drama": novela, exagero dramático
- "outros": nenhuma das anteriores`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: 20,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[CLASSIFY-AUDIO] API error ${response.status}:`, errText.substring(0, 200));
      return new Response(JSON.stringify({ category: 'outros' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const rawCategory = (result.choices?.[0]?.message?.content || 'outros')
      .trim()
      .toLowerCase()
      .replace(/[^a-záàãâéêíóôõúç ]/g, '')
      .trim();

    const category = AUDIO_CATEGORIES.includes(rawCategory) ? rawCategory : 'outros';

    console.log(`[CLASSIFY-AUDIO] ${file_name || audio_url?.substring(0, 60)}... → ${category}`);

    return new Response(JSON.stringify({ category }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[CLASSIFY-AUDIO] Error:', err);
    return new Response(JSON.stringify({ category: 'outros' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
