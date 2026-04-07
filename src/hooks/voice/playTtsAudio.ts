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

  const promise = (async () => {
    const timeout = setTimeout(() => controller.abort(), 10000);

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
        throw new Error(`TTS error: ${response.status}`);
      }

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
      audioElement = new Audio(objectUrl);

      await new Promise<void>((resolve, reject) => {
        if (!audioElement) return reject(new Error('No audio element'));
        audioElement.onended = () => resolve();
        audioElement.onerror = () => reject(new Error('Audio playback error'));
        audioElement.play().catch(reject);
      });
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  })();

  const stop = () => {
    controller.abort();
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };

  return { promise, stop };
}
