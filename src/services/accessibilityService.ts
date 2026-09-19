import type { AccessibilityPreferences } from '../types/voice';

const PREFS_STORAGE_KEY = 'blindpay_accessibility_preferences_v1';

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  speechRate: 1.0,
  highContrast: false,
  fontSize: 'normal',
  reduceMotion: false,
  voiceFeedbackEnabled: true,
  language: 'en-IN',
};

/**
 * Service providing:
 * 1. Web Audio API synthesized earcons (accessible audio chimes without external audio file dependencies)
 * 2. Accessibility preferences storage and DOM class application
 */
class AccessibilityService {
  private audioCtx: AudioContext | null = null;
  private preferences: AccessibilityPreferences = { ...DEFAULT_PREFERENCES };

  constructor() {
    this.loadPreferences();
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Play earcon: Microphone listening started (gentle ascending double tone)
   */
  public playListenStart(): void {
    if (!this.preferences.voiceFeedbackEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.15); // ramp up

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Play earcon: Microphone listening stopped (gentle descending tone)
   */
  public playListenStop(): void {
    if (!this.preferences.voiceFeedbackEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.18);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Play earcon: Payment or action succeeded (bright major triad chord)
   */
  public playSuccess(): void {
    if (!this.preferences.voiceFeedbackEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  /**
   * Play earcon: Error / unparseable / validation fail (low double buzz)
   */
  public playError(): void {
    if (!this.preferences.voiceFeedbackEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.14].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + offset;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.13);
    });
  }

  /**
   * Play earcon: Caution / Blocked security policy (two distinct warning chimes)
   */
  public playBlocked(): void {
    if (!this.preferences.voiceFeedbackEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [320, 240].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.18;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.16);
    });
  }

  // PREFERENCES MANAGEMENT
  public loadPreferences(): AccessibilityPreferences {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PREFS_STORAGE_KEY);
        if (stored) {
          this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.warn('Could not read accessibility preferences:', e);
      }
    }
    this.applyToDOM();
    return this.preferences;
  }

  public savePreferences(updated: Partial<AccessibilityPreferences>): AccessibilityPreferences {
    this.preferences = { ...this.preferences, ...updated };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(this.preferences));
      } catch (e) {
        console.warn('Could not persist accessibility preferences:', e);
      }
    }
    this.applyToDOM();
    return this.preferences;
  }

  public getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }

  public applyToDOM(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // High Contrast Class
    if (this.preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font Size Classes
    root.classList.remove('font-size-normal', 'font-size-large', 'font-size-extra-large');
    root.classList.add(`font-size-${this.preferences.fontSize}`);

    // Reduce Motion
    if (this.preferences.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }
}

export const accessibilityService = new AccessibilityService();
