/**
 * Type declarations for experimental/vendor-prefixed Browser APIs.
 * Eliminates `as any` casts for navigator.connection, webkitAudioContext,
 * webkitSpeechRecognition, and deviceMemory.
 */

interface NetworkInformation extends EventTarget {
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  readonly saveData: boolean;
  readonly downlink: number;
  readonly rtt: number;
  onchange: ((this: NetworkInformation, ev: Event) => void) | null;
}

interface Navigator {
  readonly connection?: NetworkInformation;
  readonly deviceMemory?: number;
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
  SpeechRecognition?: typeof globalThis.SpeechRecognition;
  webkitSpeechRecognition?: typeof globalThis.SpeechRecognition;
}
