export interface TtsPlayback {
  promise: Promise<void>;
  stop: () => void;
}

export function playTtsAudio(
  text: string,
  supabaseUrl: string,
  supabaseKey: string
): TtsPlayback {
  const controller = new AbortController();
  let stopped = false;

  // Create Audio element SYNCHRONOUSLY in the user gesture context
  // This is critical for browser autoplay policy compliance
  const audioElement = new Audio();
  audioElement.preload = 'auto';

  const cleanup = () => {
    audioElement.pause();
    audioElement.removeAttribute('src');
    audioElement.load();
    if (audioElement.src && audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioElement.src);
    }
  };

  const promise = (async () => {
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        if (response.status === 401 || response.status === 403) {
          console.warn('[TTS] ElevenLabs API key invalid — skipping audio playback');
          return;
        }
        throw new Error(`TTS error: ${response.status} ${errorBody.substring(0, 100)}`);
      }

      if (stopped) return;

      const blob = await response.blob();
      if (stopped) return;

      const objectUrl = URL.createObjectURL(blob);
      audioElement.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        if (stopped) return resolve();
        audioElement.onended = () => {
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        audioElement.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          // Fallback to browser Speech Synthesis
          console.warn('[TTS] Audio playback failed, falling back to browser speech');
          try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.onend = () => resolve();
            utterance.onerror = () => reject(new Error('Browser speech also failed'));
            window.speechSynthesis.speak(utterance);
          } catch {
            reject(new Error('Audio playback error'));
          }
        };
        audioElement.play().catch((playErr) => {
          console.warn('[TTS] play() blocked, falling back to browser speech:', playErr);
          URL.revokeObjectURL(objectUrl);
          try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.onend = () => resolve();
            utterance.onerror = () => reject(new Error('Browser speech also failed'));
            window.speechSynthesis.speak(utterance);
          } catch {
            reject(new Error('Autoplay blocked'));
          }
        });
      });
    } catch (err) {
      if (stopped || controller.signal.aborted) return;
      throw err;
    } finally {
      clearTimeout(timeout);
      cleanup();
    }
  })();

  const stop = () => {
    stopped = true;
    controller.abort();
    window.speechSynthesis?.cancel();
    cleanup();
  };

  return { promise, stop };
}
