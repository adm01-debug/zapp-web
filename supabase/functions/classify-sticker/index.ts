import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STICKER_CATEGORIES = [
  'comemoração', 'riso', 'chorando', 'amor', 'raiva',
  'surpresa', 'pensativo', 'cumprimento', 'despedida', 'concordância',
  'negação', 'sono', 'fome', 'medo', 'vergonha',
  'deboche', 'fofo', 'triste', 'animado', 'outros'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_url } = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ category: 'outros' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('[CLASSIFY-STICKER] LOVABLE_API_KEY not set');
      return new Response(JSON.stringify({ category: 'outros' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Analise esta figurinha/sticker e classifique em EXATAMENTE UMA das categorias abaixo. Responda APENAS com o nome da categoria, sem explicação.

Categorias: ${STICKER_CATEGORIES.join(', ')}

Regras:
- "comemoração": festejando, palmas, dança, troféu, fogos
- "riso": rindo, LOL, KKKK, gargalhada
- "chorando": lágrimas de tristeza, choro
- "amor": coração, beijo, abraço, carinho
- "raiva": irritado, bravo, furioso
- "surpresa": espantado, chocado, boca aberta
- "pensativo": pensando, dúvida, hmm
- "cumprimento": oi, olá, aceno, bom dia
- "despedida": tchau, adeus, até logo
- "concordância": ok, positivo, joia, polegar
- "negação": não, negando, recusando
- "sono": dormindo, cansado, bocejando
- "fome": comendo, com fome, comida
- "medo": assustado, com medo, tremendo
- "vergonha": envergonhado, tímido, escondendo o rosto
- "deboche": irônico, sarcástico, zoando
- "fofo": cute, meigo, gracinha, bebê, gatinho
- "triste": triste sem chorar, desanimado, cabisbaixo
- "animado": empolgado, energético, vibrante
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
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image_url } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        max_tokens: 20,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[CLASSIFY-STICKER] API error ${response.status}:`, errText.substring(0, 200));
      return new Response(JSON.stringify({ category: 'outros' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const rawCategory = (result.choices?.[0]?.message?.content || 'outros')
      .trim()
      .toLowerCase()
      .replace(/[^a-záàãâéêíóôõúç]/g, '')
      .trim();

    const category = STICKER_CATEGORIES.includes(rawCategory) ? rawCategory : 'outros';

    console.log(`[CLASSIFY-STICKER] ${image_url.substring(0, 60)}... → ${category}`);

    return new Response(JSON.stringify({ category }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[CLASSIFY-STICKER] Error:', err);
    return new Response(JSON.stringify({ category: 'outros' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
