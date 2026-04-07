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
  let audioElement: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;
  let stopped = false;

  const cleanup = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.removeAttribute('src');
      audioElement.load(); // Release browser media resources
      audioElement = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  };

  const promise = (async () => {
    const timeout = setTimeout(() => controller.abort(), 12000);

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
        // Consume body to prevent leaks
        const errorBody = await response.text().catch(() => '');
        // Gracefully skip TTS on auth errors (invalid/missing API key)
        if (response.status === 401 || response.status === 403) {
          console.warn('[TTS] ElevenLabs API key invalid — skipping audio playback');
          return;
        }
        throw new Error(`TTS error: ${response.status} ${errorBody.substring(0, 100)}`);
      }

      if (stopped) return;

      const blob = await response.blob();
      if (stopped) return;

      objectUrl = URL.createObjectURL(blob);
      audioElement = new Audio(objectUrl);

      await new Promise<void>((resolve, reject) => {
        if (!audioElement || stopped) return resolve();
        audioElement.onended = () => resolve();
        audioElement.onerror = () => reject(new Error('Audio playback error'));
        audioElement.play().catch(reject);
      });
    } catch (err) {
      if (stopped || controller.signal.aborted) return; // Silently resolve on intentional stop
      throw err;
    } finally {
      clearTimeout(timeout);
      cleanup();
    }
  })();

  const stop = () => {
    stopped = true;
    controller.abort();
    cleanup();
  };

  return { promise, stop };
}
