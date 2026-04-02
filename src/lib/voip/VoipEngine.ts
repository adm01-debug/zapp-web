/**
 * VoipEngine — Motor de VoIP próprio para chamadas WhatsApp
 *
 * Arquitetura:
 * 1. Signaling via Supabase Realtime (channels) para coordenar chamadas
 * 2. Evolution API (Baileys) para protocolo WhatsApp (offer/accept/reject/end)
 * 3. WebRTC para captura de áudio do microfone e reprodução de áudio recebido
 * 4. AudioContext + AnalyserNode para visualização de áudio
 *
 * Fluxo de chamada outbound:
 *   Browser → Edge Function → Evolution API → WhatsApp
 *   Browser ← Supabase Realtime ← Webhook ← WhatsApp
 *
 * Fluxo de chamada inbound:
 *   WhatsApp → Webhook → Supabase (calls table + Realtime) → Browser
 *   Browser → Edge Function → Evolution API → WhatsApp (accept/reject)
 */

export type VoipCallStatus =
  | 'idle'
  | 'initiating'    // Outbound: sending offer via Evolution API
  | 'ringing'       // Outbound: waiting for peer. Inbound: notifying user
  | 'connecting'    // Peer accepted, setting up audio
  | 'active'        // Call in progress with audio
  | 'ended'         // Call ended normally
  | 'missed'        // Inbound call not answered
  | 'rejected'      // Peer rejected or we rejected
  | 'failed'        // Technical failure
  | 'busy';         // Peer is busy

export type CallDirection = 'inbound' | 'outbound';

export interface VoipPeer {
  phone: string;
  name: string | null;
  avatar: string | null;
  contactId: string | null;
}

export interface VoipCallState {
  id: string;
  dbCallId: string | null;       // ID in the calls table
  direction: CallDirection;
  status: VoipCallStatus;
  peer: VoipPeer;
  isVideo: boolean;
  isMuted: boolean;
  isPeerMuted: boolean;
  startedAt: number;
  answeredAt: number | null;
  connectionId: string | null;   // whatsapp_connection_id
}

export interface VoipEngineConfig {
  onCallStateChange: (state: VoipCallState | null) => void;
  onIncomingCall: (call: VoipCallState) => void;
  onError: (error: string) => void;
  onAudioLevel: (level: number) => void;
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export class VoipEngine {
  private config: VoipEngineConfig;
  private currentCall: VoipCallState | null = null;

  // Audio
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private audioLevelInterval: number | null = null;

  // Ringtone
  private ringtoneAudio: HTMLAudioElement | null = null;
  private ringtoneCtx: AudioContext | null = null;
  private ringtoneOsc: OscillatorNode | null = null;

  // Page unload handler
  private beforeUnloadHandler: (() => void) | null = null;

  constructor(config: VoipEngineConfig) {
    this.config = config;

    // Register beforeunload to clean up active calls on tab close
    this.beforeUnloadHandler = () => {
      if (this.currentCall && this.currentCall.status !== 'ended') {
        this.endCall();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  // =========================================
  // AUDIO MANAGEMENT
  // =========================================

  /** Request microphone permission and get available devices */
  async getAudioDevices(): Promise<AudioDeviceInfo[]> {
    try {
      // Request permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // Release immediately

      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind === 'audioinput' ? 'Microfone' : 'Alto-falante'} ${d.deviceId.slice(0, 4)}`,
          kind: d.kind as 'audioinput' | 'audiooutput',
        }));
    } catch {
      this.config.onError('Permissão de microfone negada');
      return [];
    }
  }

  /** Start capturing microphone audio */
  async startAudioCapture(deviceId?: string): Promise<boolean> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Setup AudioContext for analysis
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      source.connect(this.analyserNode);

      // Start monitoring audio levels
      this.startAudioLevelMonitoring();

      return true;
    } catch (err) {
      const message = err instanceof DOMException
        ? this.getAudioErrorMessage(err)
        : 'Erro ao acessar microfone';
      this.config.onError(message);
      return false;
    }
  }

  /** Stop audio capture and release resources */
  stopAudioCapture(): void {
    this.stopAudioLevelMonitoring();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyserNode = null;
  }

  /** Mute/unmute the microphone */
  setMuted(muted: boolean): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }

    if (this.currentCall) {
      this.currentCall.isMuted = muted;
      this.config.onCallStateChange({ ...this.currentCall });
    }
  }

  /** Get current audio level (0-1) from analyser */
  getAudioLevel(): number {
    if (!this.analyserNode) return 0;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    const sum = dataArray.reduce((acc, val) => acc + val, 0);
    return Math.min(sum / (dataArray.length * 128), 1);
  }

  // =========================================
  // CALL LIFECYCLE
  // =========================================

  /** Initiate an outbound call */
  async initiateCall(params: {
    phone: string;
    contactName?: string;
    contactId?: string;
    contactAvatar?: string;
    connectionId?: string;
    isVideo?: boolean;
  }): Promise<VoipCallState | null> {
    if (this.currentCall && this.currentCall.status !== 'idle' && this.currentCall.status !== 'ended') {
      this.config.onError('Já existe uma chamada em andamento');
      return null;
    }

    const callId = crypto.randomUUID();

    const call: VoipCallState = {
      id: callId,
      dbCallId: null,
      direction: 'outbound',
      status: 'initiating',
      peer: {
        phone: params.phone,
        name: params.contactName || null,
        avatar: params.contactAvatar || null,
        contactId: params.contactId || null,
      },
      isVideo: params.isVideo || false,
      isMuted: false,
      isPeerMuted: false,
      startedAt: Date.now(),
      answeredAt: null,
      connectionId: params.connectionId || null,
    };

    this.currentCall = call;
    this.config.onCallStateChange({ ...call });

    // Start audio capture
    const audioReady = await this.startAudioCapture();
    if (!audioReady) {
      call.status = 'failed';
      this.config.onCallStateChange({ ...call });
      return null;
    }

    // Transition to ringing
    call.status = 'ringing';
    this.config.onCallStateChange({ ...call });

    return call;
  }

  /** Handle an incoming call from webhook */
  handleIncomingCall(params: {
    callId: string;
    dbCallId: string;
    phone: string;
    contactName?: string;
    contactId?: string;
    contactAvatar?: string;
    connectionId?: string;
    isVideo?: boolean;
  }): VoipCallState {
    const call: VoipCallState = {
      id: params.callId || crypto.randomUUID(),
      dbCallId: params.dbCallId,
      direction: 'inbound',
      status: 'ringing',
      peer: {
        phone: params.phone,
        name: params.contactName || null,
        avatar: params.contactAvatar || null,
        contactId: params.contactId || null,
      },
      isVideo: params.isVideo || false,
      isMuted: false,
      isPeerMuted: false,
      startedAt: Date.now(),
      answeredAt: null,
      connectionId: params.connectionId || null,
    };

    this.currentCall = call;
    this.config.onCallStateChange({ ...call });
    this.config.onIncomingCall({ ...call });
    this.playRingtone();

    return call;
  }

  /** Accept an incoming call */
  async acceptCall(): Promise<boolean> {
    if (!this.currentCall || this.currentCall.direction !== 'inbound' || this.currentCall.status !== 'ringing') {
      return false;
    }

    this.stopRingtone();

    // Start audio capture
    const audioReady = await this.startAudioCapture();
    if (!audioReady) {
      this.currentCall.status = 'failed';
      this.config.onCallStateChange({ ...this.currentCall });
      return false;
    }

    this.currentCall.status = 'active';
    this.currentCall.answeredAt = Date.now();
    this.config.onCallStateChange({ ...this.currentCall });

    return true;
  }

  /** Reject an incoming call */
  rejectCall(): void {
    if (!this.currentCall || this.currentCall.status !== 'ringing') return;

    this.stopRingtone();
    this.currentCall.status = 'rejected';
    this.config.onCallStateChange({ ...this.currentCall });
    this.cleanup();
  }

  /** End the current active call */
  endCall(): void {
    if (!this.currentCall) return;

    this.stopRingtone();

    if (this.currentCall.status === 'ringing' && this.currentCall.direction === 'inbound') {
      this.currentCall.status = 'missed';
    } else {
      this.currentCall.status = 'ended';
    }

    this.config.onCallStateChange({ ...this.currentCall });
    this.cleanup();
  }

  /** Update call status from external event (webhook) */
  updateCallStatus(status: VoipCallStatus): void {
    if (!this.currentCall) return;

    this.currentCall.status = status;

    if (status === 'active' && !this.currentCall.answeredAt) {
      this.currentCall.answeredAt = Date.now();
      this.stopRingtone();
    }

    if (status === 'ended' || status === 'missed' || status === 'rejected' || status === 'failed' || status === 'busy') {
      this.stopRingtone();
      this.config.onCallStateChange({ ...this.currentCall });
      this.cleanup();
      return;
    }

    this.config.onCallStateChange({ ...this.currentCall });
  }

  /** Set the DB call ID after creation */
  setDbCallId(dbCallId: string): void {
    if (this.currentCall) {
      this.currentCall.dbCallId = dbCallId;
    }
  }

  /** Get current call state */
  getCurrentCall(): VoipCallState | null {
    return this.currentCall ? { ...this.currentCall } : null;
  }

  /** Get call duration in seconds */
  getCallDuration(): number {
    if (!this.currentCall?.answeredAt) return 0;
    return Math.floor((Date.now() - this.currentCall.answeredAt) / 1000);
  }

  // =========================================
  // RINGTONE
  // =========================================

  private playRingtone(): void {
    try {
      // Use Web Audio API to generate a simple ringtone
      this.ringtoneAudio = new Audio();
      this.ringtoneAudio.loop = true;

      // Generate ringtone using AudioContext oscillator
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 440; // A4 note
      gain.gain.value = 0.3;

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Ring pattern: 1s on, 2s off
      const startRing = () => {
        if (!this.currentCall || this.currentCall.status !== 'ringing') {
          osc.stop();
          ctx.close();
          return;
        }
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime + 1);
        setTimeout(startRing, 3000);
      };

      osc.start();
      startRing();

      // Store reference for cleanup
      this.ringtoneCtx = ctx;
      this.ringtoneOsc = osc;
    } catch {
      // Silent fail — ringtone is not critical
    }
  }

  private stopRingtone(): void {
    if (this.ringtoneAudio) {
      try {
        if (this.ringtoneOsc) this.ringtoneOsc.stop();
        if (this.ringtoneCtx) this.ringtoneCtx.close();
      } catch {
        // Ignore
      }
      this.ringtoneAudio = null;
      this.ringtoneCtx = null;
      this.ringtoneOsc = null;
    }
  }

  // =========================================
  // INTERNAL HELPERS
  // =========================================

  private cleanup(): void {
    this.stopAudioCapture();
    this.stopRingtone();

    // Keep currentCall reference for a moment so UI can show final status
    setTimeout(() => {
      this.currentCall = null;
      this.config.onCallStateChange(null);
    }, 3000);
  }

  private startAudioLevelMonitoring(): void {
    this.audioLevelInterval = window.setInterval(() => {
      const level = this.getAudioLevel();
      this.config.onAudioLevel(level);
    }, 100);
  }

  private stopAudioLevelMonitoring(): void {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
  }

  private getAudioErrorMessage(err: DOMException): string {
    switch (err.name) {
      case 'NotAllowedError':
        return 'Permissão do microfone foi negada';
      case 'NotFoundError':
        return 'Nenhum microfone encontrado';
      case 'NotReadableError':
        return 'Microfone não pode ser acessado';
      case 'OverconstrainedError':
        return 'Microfone não suporta os requisitos de áudio';
      case 'SecurityError':
        return 'Não é possível acessar o microfone — conexão insegura';
      default:
        return `Erro de áudio: ${err.message}`;
    }
  }

  /** Destroy the engine and release all resources */
  destroy(): void {
    if (this.beforeUnloadHandler && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
    this.endCall();
    this.stopAudioCapture();
    this.stopRingtone();
    this.currentCall = null;
  }
}
