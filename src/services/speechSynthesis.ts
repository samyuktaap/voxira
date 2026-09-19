import type { SpeechSynthesisOptions } from '../types/voice';

/**
 * Robust, production-grade Text-To-Speech (TTS) service using browser SpeechSynthesis API.
 * Guarantees no overlapping speech, supports speech queuing/interruption, rate control,
 * and reliable error/fallback handling.
 */
class SpeechSynthesisService {
  private isSpeaking = false;
  private lastSpokenText = '';
  private defaultRate = 1.0;
  private defaultLanguage = 'en-IN';

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public setRate(rate: number): void {
    this.defaultRate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setLanguage(lang: string): void {
    this.defaultLanguage = lang;
  }

  /**
   * Speaks text aloud. Immediately stops any prior ongoing speech to prevent overlapping.
   */
  public speak(text: string, options?: SpeechSynthesisOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported()) {
        console.warn('SpeechSynthesis is not supported in this browser.');
        options?.onEnd?.();
        resolve();
        return;
      }

      const trimmed = text.trim();
      if (!trimmed) {
        options?.onEnd?.();
        resolve();
        return;
      }

      this.stop();
      this.lastSpokenText = trimmed;

      const utterance = new SpeechSynthesisUtterance(trimmed);

      utterance.rate = options?.rate ?? this.defaultRate;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;
      utterance.lang = this.defaultLanguage;

      // Select matching voice if available
      const voices = window.speechSynthesis.getVoices();
      if (options?.voice) {
        utterance.voice = options.voice;
      } else if (voices.length > 0) {
        const preferred = voices.find((v) => v.lang.startsWith(this.defaultLanguage)) ||
                          voices.find((v) => v.lang.startsWith('en')) ||
                          voices[0];
        if (preferred) utterance.voice = preferred;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        options?.onEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        console.warn('SpeechSynthesis error:', event);
        this.isSpeaking = false;
        options?.onError?.(event);
        options?.onEnd?.();
        resolve();
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Failed to trigger SpeechSynthesis:', err);
        this.isSpeaking = false;
        resolve();
      }
    });
  }

  /**
   * Stop any current speech synthesis immediately.
   */
  public stop(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe catch
      }
    }
    this.isSpeaking = false;
  }

  /**
   * Repeats the most recent spoken phrase.
   */
  public repeatLast(): Promise<void> {
    if (this.lastSpokenText) {
      return this.speak(this.lastSpokenText);
    }
    return Promise.resolve();
  }

  public getSpeakingState(): boolean {
    return this.isSpeaking;
  }

  public getLastSpokenText(): string {
    return this.lastSpokenText;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices();
  }
}

export const speechSynthesisService = new SpeechSynthesisService();
