

## Plano: Mover controle de velocidade para dentro de cada mensagem de áudio/vídeo

### Contexto
Atualmente o `SpeedSelector` fica no **header do chat** (global), mas controla apenas o TTS (text-to-speech). As mensagens de áudio e vídeo recebidas **não têm controle de velocidade nenhum**. O correto é ter um mini-seletor de velocidade embutido em cada player.

### Mudanças

**1. AudioMessagePlayer — Adicionar speed inline**
- Adicionar estado local `playbackRate` (default 1.0) ao componente
- Criar um mini-botão compacto ao lado do botão de transcrição mostrando "1x", "1.5x", "2x"
- Ao clicar, cicla entre as velocidades: 1x → 1.25x → 1.5x → 1.75x → 2x → 0.5x → 0.75x → 1x
- Aplicar `audioRef.current.playbackRate = speed` sempre que mudar
- Estilo: botão pill compacto (`text-[10px]`, `h-6`, `px-1.5`) que se integra visualmente ao player

**2. VideoPreview / VideoFullscreen — Adicionar speed inline**
- No `VideoFullscreen`, adicionar botão de velocidade ao lado dos controles (mute, download, close)
- Mesma lógica de ciclo de velocidades
- Aplicar `playbackRate` ao elemento `<video>`

**3. Limpar o SpeedSelector do header (parcialmente)**
- **Manter** o `SpeedSelector` no header apenas para TTS (que é diferente — controla a velocidade do text-to-speech da ElevenLabs)
- Renomear label no header para "TTS Speed" para clarificar que é só para leitura de texto

### Detalhes técnicos

Arquivos modificados:
- `src/components/inbox/AudioMessagePlayer.tsx` — estado `playbackRate`, botão cycle, sync com `audioRef`
- `src/components/inbox/MediaPreview.tsx` — estado `playbackRate` no `VideoFullscreen`, botão no toolbar
- Sem mudanças em props ou interfaces externas — tudo é local ao player

O botão de velocidade será um componente inline mínimo:
```text
┌──────────────────────────────────────────┐
│ ▶  |||||||||||||||||||||||  0:25   📄 1x │
└──────────────────────────────────────────┘
                                        ↑ speed toggle
```

