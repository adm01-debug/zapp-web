/** Browser-specific / experimental API type declarations */

interface NetworkInformation extends EventTarget {
  readonly effectiveType: string;
  readonly saveData: boolean;
  readonly downlink?: number;
  readonly rtt?: number;
  onchange?: ((this: NetworkInformation, ev: Event) => void) | null;
}

interface NavigatorNetworkInformation {
  readonly connection?: NetworkInformation;
  readonly deviceMemory?: number;
}

declare global {
  interface Navigator extends NavigatorNetworkInformation {}

  interface Window {
    webkitAudioContext: typeof AudioContext;
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export {};
