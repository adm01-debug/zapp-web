import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMOJI_CATEGORIES = [
  'sorriso', 'riso', 'amor', 'triste', 'raiva',
  'surpresa', 'medo', 'nojo', 'pensativo', 'legal',
  'festa', 'comida', 'animal', 'natureza', 'esporte',
  'trabalho', 'música', 'tech', 'viagem', 'meme',
  'deboche', 'fofo', 'fantasía', 'bandeira', 'outros'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_url, file_name } = await req.json();

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('[CLASSIFY-EMOJI] LOVABLE_API_KEY not set');
      return new Response(JSON.stringify({ category: 'outros' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Você é um classificador de emojis/emoticons customizados para uma plataforma de atendimento via WhatsApp.
Analise a imagem e o nome do arquivo "${file_name || 'emoji'}" para classificar em EXATAMENTE UMA das categorias abaixo.
Responda APENAS com o nome da categoria, sem explicação.

Categorias: ${EMOJI_CATEGORIES.join(', ')}

Regras:
- "sorriso": emoji sorridente, feliz, contente
- "riso": gargalhada, LOL, KKKK, chorando de rir
- "amor": coração, beijo, apaixonado, romântico
- "triste": chorando, melancólico, decepcionado
- "raiva": irritado, bravo, furioso
- "surpresa": chocado, espantado, boquiaberto
- "medo": assustado, tremendo, apavorado
- "nojo": enojado, vômito, repulsa
- "pensativo": pensando, confuso, hmm
- "legal": óculos de sol, joinha, top, cool
- "festa": celebração, comemoração, fogos
- "comida": alimento, bebida, café
- "animal": bicho, pet, gato, cachorro
- "natureza": planta, flor, sol, lua, estrela
- "esporte": bola, troféu, corrida
- "trabalho": escritório, computador, reunião
- "música": nota musical, headphone, dança
- "tech": robô, computador, código, gaming
- "viagem": avião, mala, praia
- "meme": viral, referência a meme popular
- "deboche": irônico, sarcástico, desdém
- "fofo": kawaii, cute, adorável, fofinho
- "fantasía": fantasia, magia, unicórnio, fada
- "bandeira": país, orgulho, identidade
- "outros": nenhuma das anteriores`;

    const messages: any[] = [{ role: 'user', content: [] as any[] }];

    if (image_url) {
      messages[0].content.push({ type: 'image_url', image_url: { url: image_url } });
    }
    messages[0].content.push({ type: 'text', text: prompt });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 20,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[CLASSIFY-EMOJI] API error ${response.status}:`, errText.substring(0, 200));
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

    const category = EMOJI_CATEGORIES.includes(rawCategory) ? rawCategory : 'outros';

    console.log(`[CLASSIFY-EMOJI] ${file_name || image_url?.substring(0, 60)}... → ${category}`);

    return new Response(JSON.stringify({ category }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[CLASSIFY-EMOJI] Error:', err);
    return new Response(JSON.stringify({ category: 'outros' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
