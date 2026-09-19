import type { VoiceRecognitionError } from '../types/voice';

// Declare types for Web Speech API
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: VoiceRecognitionError) => void;
  onEnd?: () => void;
}

export interface ISpeechRecognitionProvider {
  isSupported(): boolean;
  start(callbacks: SpeechRecognitionCallbacks): void;
  stop(): void;
  isListening(): boolean;
}

/**
 * Web Speech API implementation of ISpeechRecognitionProvider.
 * Features:
 * - Prefix support (webkitSpeechRecognition)
 * - Safe error mapping
 * - Prevents runaway listening loops
 * - Clean teardown
 */
export class WebSpeechRecognitionProvider implements ISpeechRecognitionProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private listening = false;
  private currentLanguage = 'en-IN';

  constructor() {
    this.initRecognition();
  }

  public setLanguage(lang: string): void {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getRecognitionConstructor(): any {
    if (typeof window === 'undefined') return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
  }

  private initRecognition(): void {
    const Recon = this.getRecognitionConstructor();
    if (!Recon) return;

    try {
      this.recognition = new Recon();
      this.recognition.continuous = false; // Prevent unintended continuous recording
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.currentLanguage;
    } catch (e) {
      console.warn('Could not initialize SpeechRecognition engine:', e);
      this.recognition = null;
    }
  }

  public start(callbacks: SpeechRecognitionCallbacks): void {
    if (!this.isSupported()) {
      callbacks.onError?.({
        type: 'unsupported',
        message: 'Speech recognition is not supported in this browser. Please use the accessible text fallback.',
      });
      return;
    }

    if (this.listening) {
      this.stop();
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      callbacks.onError?.({
        type: 'unsupported',
        message: 'Unable to start speech recognition provider.',
      });
      return;
    }

    this.recognition.onstart = () => {
      this.listening = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        callbacks.onTranscript?.(finalTranscript.trim(), true);
      } else if (interimTranscript.trim()) {
        callbacks.onTranscript?.(interimTranscript.trim(), false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      this.listening = false;
      let errorType: VoiceRecognitionError['type'] = 'unknown';
      let message = 'An error occurred during speech recognition.';

      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorType = 'not_allowed';
          message = 'Microphone permission was denied. Please allow microphone access or use text input.';
          break;
        case 'no-speech':
          errorType = 'no_speech';
          message = 'No speech was detected. Please try speaking again.';
          break;
        case 'network':
          errorType = 'network';
          message = 'Network error during voice recognition. Please check your connection.';
          break;
        case 'aborted':
          errorType = 'aborted';
          message = 'Listening was stopped.';
          break;
        default:
          message = `Voice recognition error: ${event.error || 'Unknown error'}`;
      }

      callbacks.onError?.({ type: errorType, message });
    };

    this.recognition.onend = () => {
      this.listening = false;
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err) {
      this.listening = false;
      callbacks.onError?.({
        type: 'unknown',
        message: 'Failed to start microphone recording.',
      });
    }
  }

  public stop(): void {
    if (this.recognition && this.listening) {
      try {
        this.recognition.stop();
      } catch {
        // Safe catch
      }
    }
    this.listening = false;
  }

  public isListening(): boolean {
    return this.listening;
  }
}

export const speechRecognitionService = new WebSpeechRecognitionProvider();
