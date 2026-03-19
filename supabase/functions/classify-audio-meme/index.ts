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

REGRA IMPORTANTE: A categoria "viral" deve ser usada SOMENTE para sons que são tendências ATUAIS de TikTok/Reels (ex: "oh no", "emotional damage"). Memes brasileiros conhecidos, bordões de TV, frases famosas de celebridades devem ser classificados como "bordão". Sons cômicos e engraçados devem ser "risada" ou "deboche".

Regras de classificação (em ordem de prioridade):
1. "risada": gargalhada, LOL, KKKK, riso, laugh
2. "aplausos": palmas, ovação, torcida
3. "suspense": tensão, mistério, thriller
4. "vitória": sucesso, ganhou, champion, win, parabéns
5. "falha": fail, erro, buzina de erro, wah wah
6. "surpresa": wow, choque, plot twist
7. "triste": choro, melancolia, violino triste
8. "raiva": irritação, grito de raiva, xingamento
9. "romântico": amor, beijo, música romântica
10. "medo": susto, grito de terror, jump scare
11. "deboche": ironia, sarcasmo, "ain", zoeira, piada, humor, engraçado
12. "narração": narrador, Galvão, Cid Moreira, Datena
13. "bordão": frase famosa, meme falado, catchphrase, bordão de TV, celebridade brasileira, frase de novela, Chaves, Alborghetti, Silvio Santos, Faustão
14. "efeito sonoro": boing, piu, explosion, coin, beep, toque
15. "viral": APENAS tendências atuais de TikTok/Reels com hashtags virais recentes
16. "cumprimento": bom dia, oi, salve
17. "despedida": tchau, bye, até logo
18. "animação": empolgação, hype, let's go
19. "drama": novela, exagero dramático
20. "gospel": religioso, evangélico, Deus, oração, louvor, igreja, pastor, glória
21. "outros": nenhuma das anteriores

Se o nome do arquivo contém uma frase ou bordão brasileiro conhecido, classifique como "bordão" ou "deboche", NÃO como "viral".`;

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
