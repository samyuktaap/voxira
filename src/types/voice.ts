export type VoiceIntentType =
  | 'CREATE_PAYMENT'
  | 'CHECK_STATUS'
  | 'REPEAT_DETAILS'
  | 'CONFIRM_PAYMENT'
  | 'CHANGE_AMOUNT'
  | 'CHANGE_RECIPIENT'
  | 'CANCEL'
  | 'GO_BACK'
  | 'HELP'
  | 'UNKNOWN';

export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'REVIEWING'
  | 'WAITING_FOR_BACKEND'
  | 'AUTHENTICATION_REQUIRED'
  | 'CONFIRMATION_REQUIRED'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'ERROR'
  | 'CANCELLED';

export interface ParsedVoiceCommand {
  intent: VoiceIntentType;
  amount?: number;
  currency: string;
  recipient_name?: string;
  raw_transcript: string;
  confidence?: number;
  ambiguous?: boolean;
  ambiguity_reason?: string;
}

export interface VoiceRecognitionError {
  type: 'not_allowed' | 'no_speech' | 'network' | 'unsupported' | 'aborted' | 'unknown';
  message: string;
}

export interface SpeechSynthesisOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export interface AccessibilityPreferences {
  speechRate: number;
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
  reduceMotion: boolean;
  voiceFeedbackEnabled: boolean;
  language: 'en-IN' | 'en-US' | 'hi-IN' | 'kn-IN';
}
